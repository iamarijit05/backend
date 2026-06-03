// Import mongoose package
import mongoose from "mongoose";

// Import database name constant
import { DB_NAME } from "../constant.js";

// Function to connect database
const connectDB = async () => {
    try {

        // Connect to MongoDB
        // Returns a connection object if successful
        const connectionInstance = await mongoose.connect(
            `${process.env.MONGODB_URI}/${DB_NAME}`
        );

        // Print success message
        // connection.host gives MongoDB host name
        // Example: localhost or cluster0.mongodb.net
        console.log(
            `\n MongoDB Connected! DB Host: ${connectionInstance.connection.host}`
        );

    } catch (error) {

        // Print connection error
        console.log("MONGODB CONN ERROR", error);

        // Stop the Node.js process with failure code
        // 1 means abnormal termination (error)
        process.exit(1);
    }
};

// Export function so it can be used in other files
export default connectDB;