import mongoose from "mongoose";

// connectDB.js - handles database connection logic, tries
// to connect on server start and exits if it fails
// import this in backend server and call connectDB() before starting the server
export const connectDB = async () => {
    try {
        // try to connect to MongoDB, throw an error if it fails
        await mongoose.connect("mongodb://localhost:27017/GreenFinance", {
            serverSelectionTimeoutMS: 5000     // timeout after 5 seconds instead of hanging forever
        })

        // console log success message if connected
        console.log("Connected to MongoDB")
    } catch (err) {
        // log error message and exit process if connection fails
        console.error("Failed to connect to MongoDB", err.message)
        process.exit(1)
    }
}