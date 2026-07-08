import mongoose from "mongoose";

const connectDb = async () => {
    try {
        mongoose.connection.on('connected', () => {
            console.log("MongoDB connected successfully");
        });
        await mongoose.connect(`${process.env.MONGODB_URI}/gown-rental`);
    } catch (error) {
        console.error("MongoDB connection error:", error.message);
        console.error("⚠️  Server starting without DB — update MONGODB_URI in .env with a valid connection string.");
        // Do NOT exit — let the server start so other routes remain accessible
    }
}

export default connectDb;