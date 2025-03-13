import crypto from "crypto";
import * as jose from "jose";
import { Request, Response } from "express";
import { validateUrl } from "../utility/utility.js";
import { active, requested } from "../utility/faux_database.js";

export default async function token(req: Request, res: Response) {
    if (
        req.headers["content-type"]?.toLowerCase() !== "application/x-www-form-urlencoded"
        // ^ Above: Require Content-Type: application/x-www-form-urlencoded body
        || !("grant_type" in req.body)
        || (
            req.body.grant_type !== "authorization_code"
            && req.body.grant_type !== "refresh_token"
        )
        // ^ Above: Require grant_type=authorization_code or grant_type=refresh_token
    ) {
        res.status(401).send();
        return;
    }

    switch (req.body.grant_type) {
        case "authorization_code": {
            if (
                !("code" in req.body)
                || typeof req.body.code !== "string"
                || req.body.code.length === 0
                // ^ Above: Require code
                || !("client_id" in req.body)
                || typeof req.body.client_id !== "string"
                || req.body.client_id.length === 0
                // ^ Above: Require client_id
                || !("redirect_uri" in req.body)
                || typeof req.body.redirect_uri !== "string"
                || !validateUrl(req.body.redirect_uri)
                // ^ Above: Validate redirect_uri
            ) {
                res.status(401).send();
                return;
            }

            const found = requested.get(req.body.code);
            if (!found) {
                console.log("Not found:", req.body.code);
                console.log(requested);
                res.status(400).send();
                return;
            }
            requested.delete(req.body.code);

            if (
                found.client_id !== req.body.client_id
                || found.redirect_uri !== req.body.redirect_uri
            ) {
                res.status(400).send();
                return;
            }

            const token
                = await new jose.EncryptJWT({ "read": true })
                // Default config
                .setProtectedHeader({ alg: 'dir', enc: 'A128CBC-HS256' })
                .setIssuedAt()
                .setExpirationTime("1h")
                .encrypt(Buffer.from(process.env.SECRET, "base64"));

            // Similar to the code generated in the authorize endpoint,
            // I would normally generate this from a hash of the user's credentials and the SECRET environment variable.
            const refreshToken = crypto.randomBytes(32).toString("hex");

            active.set(req.body.code, token);
            res
                .status(200)
                .setHeader("Content-Type", "application/json;charset=UTF-8")
                // Cache-Control: no-store and Pragma: no-cache are required per section 5.1 (https://datatracker.ietf.org/doc/html/rfc6749#section-5.1).
                .setHeader("Cache-Control", "no-store")
                .setHeader("Pragma", "no-cache")
                .send(JSON.stringify({
                    "access_token": token,
                    "token_type": "bearer",
                    "expires_in": 3600, // 3600 = 60 minutes * 60 seconds
                    "refresh_token": refreshToken,
                }));
            return;
        }
        case "refresh_token": {
            if (
                !("refresh_token" in req.body)
                || typeof req.body.refresh_token !== "string"
                || req.body.refresh_token.length === 0
                // ^ Above: Require refresh_token
            ) {
                res.status(401).send();
                return;
            }
            return;
        }
    }
}
