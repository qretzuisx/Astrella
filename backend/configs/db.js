import mongoose from "mongoose";

const connectDb = async ()=>{
    try {
        mongoose.connection.on('connected', ()=> {
            console.log("MongoDB connected successfully");
        });
        await mongoose.connect(`${process.env.MONGODB_URI}/gown-rental`)
    } catch (error) {
        console.error("MongoDB connection error:", error);
        process.exit(1);
    }
}

export default connectDb;