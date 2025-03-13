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
