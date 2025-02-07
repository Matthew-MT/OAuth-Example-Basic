/**
 * Basic Authorize and Token generation example using the OAuth documentation (https://datatracker.ietf.org/doc/html/rfc6749)
 * Author: Matthew Montoni-Tiller
 * Notes:
 * It's a security best practice to hide sensitive information and define configuration parameters in the project's .env file. I've added the dotenv dependency to manage it.
 */

import express from "express";
import authorize from "./endpoints/authorize.js";
import token from "./endpoints/token.js";

export const api = express();

api.use(express.urlencoded({ extended: true }));

api.get("/api/oauth/authorize", authorize);
api.post("/api/oauth/token", token);

api.listen(process.env.PORT, () => {
    console.log(`App is listening on port ${process.env.PORT}.`);
    // For testing purposes
    api.emit("listening");
});
