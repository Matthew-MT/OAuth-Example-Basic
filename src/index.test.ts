import assert from "node:assert";
import http from "node:http";
import test from "node:test";
import { api } from "./index.js";

// Wait for the endpoint to be available.
await new Promise(resolve => api.once("listening", resolve));

await test("authorization endpoint", item => {
    const client_id = "test_client";
    const redirect_uri = "http://localhost:8081/app";
    const state = crypto.randomUUID();

    return new Promise(resolve => {
        http.get(`http://localhost:${process.env.PORT}/api/oauth/authorize?response_type=code&client_id=${client_id}&redirect_uri=${redirect_uri}&state=${state}`, async res => {
            await item.test("status", () => {
                assert.strictEqual(res.statusCode, 302, new Error(`Incorrect status: Expected 302, got ${res.statusCode}.`));
            });
            await item.test("location", () => {
                const url = new URL(res.headers.location);
                const path = url.origin + url.pathname;
                assert.strictEqual(path, redirect_uri, new Error(`Incorrect location: Expected ${redirect_uri}, got ${path}.`));
            });
            await item.test("code", () => {
                assert.ok((new URL(res.headers.location)).searchParams.get("code"), new Error("Code not present."));
            });
            await item.test("state", () => {
                const stateParam = (new URL(res.headers.location)).searchParams.get("state");
                assert.strictEqual(stateParam, state, new Error(`Incorrect state: Expected ${state}, got ${stateParam}.`));
            });
            resolve();
        });
    });
});

await test("token endpoint", async section => {
    // Test values derived from problem description
    const client_id = "test_client";
    const redirect_uri = "http://localhost:8081/app";
    const state = crypto.randomUUID();

    const codeResult: http.IncomingMessage = await new Promise(resolve => http.get(`http://localhost:${process.env.PORT}/api/oauth/authorize?response_type=code&client_id=${client_id}&redirect_uri=${redirect_uri}&state=${state}`, resolve));
    const code = (new URL(codeResult.headers.location)).searchParams.get("code");

    let refreshToken: string;

    await section.test("grant_type=authorization_code", item => new Promise(resolve => {
        const config = {
            hostname: "localhost",
            port: process.env.PORT,
            path: "/api/oauth/token",
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
        };

        const tokenRequest = http.request(config, async res => {
            let data = "";

            res.setEncoding("utf-8");

            res.on("data", chunk => data += chunk.toString());

            res.once("close", async () => {
                const json = JSON.parse(data);

                await item.test("access token", () => {
                    assert("access_token" in json && typeof json.access_token === "string", new Error("Invalid access token."));
                });
                await item.test("token type", () => {
                    assert("token_type" in json && typeof json.token_type === "string", new Error("Invalid token type."));
                });
                await item.test("expiration", () => {
                    assert("expires_in" in json && typeof json.expires_in === "number", new Error("Invalid expiration."));
                });
                await item.test("refresh token", () => {
                    assert("refresh_token" in json && typeof json.refresh_token === "string", new Error("Invalid refresh token."));
                });

                refreshToken = json.refresh_token;
                resolve();
            });
        });

        tokenRequest.write(`grant_type=authorization_code&code=${code}&client_id=${client_id}&redirect_uri=${redirect_uri}`);

        tokenRequest.end();
    }));

    await section.test("grant_type=refresh_token", item => new Promise(resolve => {
        const config = {
            hostname: "localhost",
            port: process.env.PORT,
            path: "/api/oauth/token",
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
        };

        const tokenRequest = http.request(config, async res => {
            let data = "";

            res.setEncoding("utf-8");

            res.on("data", chunk => data += chunk.toString());

            res.once("close", async () => {
                const json = JSON.parse(data);

                await item.test("access token", () => {
                    assert("access_token" in json && typeof json.access_token === "string", new Error("Invalid access token."));
                });
                await item.test("token type", () => {
                    assert("token_type" in json && typeof json.token_type === "string", new Error("Invalid token type."));
                });
                await item.test("expiration", () => {
                    assert("expires_in" in json && typeof json.expires_in === "number", new Error("Invalid expiration."));
                });
                await item.test("refresh token", () => {
                    assert("refresh_token" in json && typeof json.refresh_token === "string", new Error("Invalid refresh token."));
                });

                resolve(json.refresh_token);
            });
        });

        tokenRequest.write(`grant_type=refresh_token&refresh_token=${refreshToken}`);

        tokenRequest.end();
    }));
});

process.exit();
