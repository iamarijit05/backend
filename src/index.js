//require('dotenv').config({path: './env'}) //=> this is an inconsistent method, dont use instead do import
import dotenv from "dotenv"
import { app } from "./app.js"
import connectDB from "./db/index.js"

dotenv.config({
    path: './env'
})

connectDB()
.then(() => {
    app.listen(process.env.PORT || 8000, () => {
        console.log(`Server is Running at PORT: ${process.env.PORT}`);
    }) 
})
.catch((err) => {
    console.log("MongoDB Connection Failed !!!", err);
    
})




















/*//
//Import mongoose to connect Node.js with MongoDB database
import mongoose from "mongoose";

// Import database name from constants file
import { DB_NAME } from "./constant";

// Import express framework to create server/API
import express from "express";

// Create an express application instance
const app = express();

// IIFE (Immediately Invoked Function Expression)
// Runs immediately when the file executes
(async () => {
    try {

        // Connect to MongoDB database
        // process.env.MONGODB_URI comes from .env file
        // Example:
        // MONGODB_URI = mongodb://localhost:27017
        //
        // Final URL becomes:
        // mongodb://localhost:27017/database_name
        await mongoose.connect(
            `${process.env.MONGODB_URI}/${DB_NAME}`
        );

        // Listen for express app-related errors
        // Example: server crash, binding issue, etc.
        app.on("error", (error) => {

            // Print the error
            console.log("ERR: ", error);

            // Throw error to stop execution
            throw error;
        });

        // Start the server on the given port
        // PORT is taken from .env file
        // Example:
        // PORT=8000
        app.listen(process.env.PORT, () => {

            // Log message when server starts successfully
            console.log(
                `App is listening on port ${process.env.PORT}`
            );
        });

    } catch (error) {

        // Catch any error during DB connection
        // and print it
        console.error("ERROR: ", error);
    }
})();*/