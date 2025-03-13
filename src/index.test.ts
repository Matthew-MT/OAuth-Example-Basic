import assert from "node:assert";
import http from "node:http";
import test from "node:test";
import { api } from "./index.js";

// Wait for the endpoint to be available.
await new Promise(resolve => api.once("listening", resolve));

test("authorization endpoint", context => {
    const client_id = "test_client";
    const redirect_uri = "http://localhost:8081/app";
    const state = crypto.randomUUID();

    return new Promise(resolve => {
        http.get(`http://localhost:${process.env.PORT}/api/oauth/authorize?response_type=code&client_id=${client_id}&redirect_uri=${redirect_uri}&state=${state}`, async res => {
            await context.test("status", () => {
                assert.strictEqual(res.statusCode, 302, new Error(`Incorrect status: Expected 302, got ${res.statusCode}.`));
            });
            await context.test("location", () => {
                const url = new URL(res.headers.location);
                const path = url.origin + url.pathname;
                assert.strictEqual(path, redirect_uri, new Error(`Incorrect location: Expected ${redirect_uri}, got ${path}.`));
            });
            await context.test("code", () => {
                assert.ok((new URL(res.headers.location)).searchParams.get("code"), new Error("Code not present."));
            });
            await context.test("state", () => {
                const stateParam = (new URL(res.headers.location)).searchParams.get("state");
                assert.strictEqual(stateParam, state, new Error(`Incorrect state: Expected ${state}, got ${stateParam}.`));
            });
            resolve();
        });
    });
});

await test("token endpoint", async context => {
    // Test values derived from problem description
    const client_id = "test_client";
    const redirect_uri = "http://localhost:8081/app";
    const state = crypto.randomUUID();

    const codeResult: http.IncomingMessage = await new Promise(resolve => http.get(`http://localhost:${process.env.PORT}/api/oauth/authorize?response_type=code&client_id=${client_id}&redirect_uri=${redirect_uri}&state=${state}`, resolve));
    const code = (new URL(codeResult.headers.location)).searchParams.get("code");
    
    return await new Promise(resolve => {
        const tokenRequest = http.request({
            hostname: "localhost",
            port: process.env.PORT,
            path: "/api/oauth/token",
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
        }, async res => {
            let data = "";

            res.setEncoding("utf-8");

            res.on("data", chunk => data += chunk.toString());

            res.once("close", async () => {
                const json = JSON.parse(data);
                await context.test("access token", () => {
                    assert("access_token" in json && typeof json.access_token === "string", new Error("Invalid access token."));
                });
                await context.test("token type", () => {
                    assert("token_type" in json && typeof json.token_type === "string", new Error("Invalid token type."));
                });
                await context.test("expiration", () => {
                    assert("expires_in" in json && typeof json.expires_in === "number", new Error("Invalid expiration."));
                });
                await context.test("refresh token", () => {
                    assert("refresh_token" in json && typeof json.refresh_token === "string", new Error("Invalid refresh token."));
                });
                resolve();
            });
        });

        tokenRequest.write(`grant_type=authorization_code&code=${code}&client_id=${client_id}&redirect_uri=${redirect_uri}`);

        tokenRequest.end();
    });
});

process.exit();
