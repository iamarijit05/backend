 // Import Express framework
// Used to create backend server and APIs
import express from "express";

// Import CORS middleware
// Helps frontend communicate with backend
import cors from "cors";

// Import cookie-parser middleware
// Used to read, parse, and manipulate cookies
import cookieParser from "cookie-parser";


// Create express app instance
const app = express();


// Enable CORS (Cross-Origin Resource Sharing)
app.use(
    cors({

        // Allow requests only from frontend URL
        // Example:
        // CORS_ORIGIN=http://localhost:3000
        origin: process.env.CORS_ORIGIN,

        // Allow sending cookies/auth headers
        credentials: true
    })
);


// Middleware to accept JSON data
// Example:
// {
//   "name": "Arijit",
//   "age": 21
// }
//
// limit: "16kb" prevents huge JSON payload attacks
app.use(
    express.json({
        limit: "16kb"
    })
);


// Middleware to parse form data
// Used when data comes from forms
//
// extended: true
// allows nested objects
//
// Example:
// user[name]=Arijit
//
// limit protects against large requests
app.use(
    express.urlencoded({
        extended: true,
        limit: "16kb"
    })
);


// Serve static files from "public" folder
//
// Example:
// public/image.png
//
// Access in browser:
// localhost:8000/image.png
app.use(express.static("public"));


// Middleware to parse cookies
//
// Example:
// req.cookies.token
//
// Useful for JWT authentication
app.use(cookieParser());


//routes import
import userRouter  from './routes/user.routes.js'
import videoRouter from './routes/video.routes.js'


//routes declaration
app.use("/api/v1/users", userRouter)
app.use("/api/v1/videos", videoRouter)
//http://localhost:8000/api/v1/users/register
// Export app so it can be used in index.js
export { app };