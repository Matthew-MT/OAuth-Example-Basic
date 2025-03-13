import { Request, Response } from "express";
import crypto from "crypto";
import { validateUrl } from "../utility/utility.js";
import { requested } from "../utility/faux_database.js";

function getCode() {}

export default function authorize(req: Request, res: Response) {
    if (
        !("redirect_uri" in req.query)
        || typeof req.query.redirect_uri !== "string"
        || !validateUrl(req.query.redirect_uri)
        // ^ Above: Validate redirect_uri
    ) {
        res.status(400).send();
        return;
    }

    let state = undefined;

    if (
        "state" in req.query
        && typeof req.query.state === "string"
        && req.query.state.length > 0
    ) {
        // Optionally include state
        state = req.query.state;
    }

    try {
        if (
            !("response_type" in req.query)
            || typeof req.query.response_type !== "string"
            || req.query.response_type !== "code"
            // ^ Above: response_type=code required
            || !("client_id" in req.query)
            || typeof req.query.client_id !== "string"
            || req.query.client_id.length === 0
            // ^ Above: Section 2.2 (https://datatracker.ietf.org/doc/html/rfc6749#section-2.2) doesn't specify restrictions on client_id.
        ) {
            res.redirect(`${req.query.redirect_uri}?error=invalid_request${state ? `&state=${state}` : ""}`);
            return;
        }

        // Normally, I would probably use a hash constructed from the client_id, redirect_uri, and the SECRET environment variable.
        // However, to remain within the project instructions, the code is just generated as a random string.
        const code = crypto.randomBytes(32).toString("hex");

        // Note: If using a database implementation, this would instead set the auto-deletion time of the database record to 10 minutes from now,
        // as recommended by section 4.1.2 (https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.2).
        // In lieu of that, I've set a timer to delete the entry after 10 minutes.
        requested.set(code, {
            client_id: req.query.client_id,
            redirect_uri: req.query.redirect_uri,
        });
        setTimeout(() => requested.delete(code), 600000); // 600000 = 10 minutes * 60 seconds * 1000 milliseconds

        res.redirect(`${req.query.redirect_uri}?code=${code}${state ? `&state=${state}` : ""}`);
    } catch (error) {
        // Technically, there shouldn't be anything above that throws an error.
        // However, if one were to implement authentication and authorization and other content checks,
        // then error-handling will be required to catch errors and return an error code to the client,
        // as per section 4.1.2.1 (https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.2.1).
        res.redirect(`${req.query.redirect_uri}?error=server_error${state ? `&state=${state}` : ""}`);
    }
}
