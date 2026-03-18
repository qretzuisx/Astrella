import mongoose from "mongoose";

const connectDb = async ()=>{
    try {
        mongoose.connection.on('connected', ()=> {});
        await mongoose.connect(`${process.env.MONGODB_URI}/gown-rental`)
    } catch (error) {
        // Handle connection error
    }
}

export default connectDb;