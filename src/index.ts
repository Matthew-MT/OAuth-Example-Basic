import express from "express";
import authorize from "./authorize.js";

export const api = express();

api.get("/api/oauth/authorize", authorize);

api.listen(process.env.PORT, () => {
    console.log(`App is listening on port ${process.env.PORT}.`);
    // For testing purposes
    api.emit("listening");
});
