import { api } from "./index.js";
import assert from "node:assert";
import http from "node:http";
import test from "node:test";

// Wait for the endpoint to be available.
await new Promise(resolve => api.once("listening", resolve));

test("authorization endpoint", context => {
    const client_id = "test_client";
    const redirect_uri = "http://localhost:8081/app";
    const state = crypto.randomUUID();

    return new Promise(resolve => {
        http.get(`http://localhost:8080/api/oauth/authorize?response_type=code&client_id=${client_id}&redirect_uri=${redirect_uri}&state=${state}`, async res => {
            await context.test("status", () => {
                assert(res.statusCode === 302, new Error("Incorrect status."));
            });
            await context.test("location", () => {
                assert((new URL(res.headers.location)).pathname === redirect_uri, new Error("Incorrect location."));
            });
            await context.test("state", () => {
                assert((new URL(res.headers.location)).searchParams.get("state") === state, new Error("Incorrect state."));
            });
            resolve();
        });
    });
});

process.exit();
