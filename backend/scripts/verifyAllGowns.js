import mongoose from "mongoose";
import Gown from "../models/Gown.js";
import "dotenv/config";

// Connect to database
const connectDb = async () => {
  try {
    mongoose.connection.on('connected', () => console.log("Database Connected"));
    await mongoose.connect(`${process.env.MONGODB_URI}/gown-rental`);
  } catch (error) {
    console.error("Database connection error:", error);
    process.exit(1);
  }
};

// Verify all existing gowns
const verifyAllGowns = async () => {
  try {
    await connectDb();

    // Update all gowns to verified: true
    const result = await Gown.updateMany(
      { verified: { $ne: true } }, // Find all gowns that are not verified
      { $set: { verified: true } }
    );

    console.log('✅ Successfully verified gowns!');
    console.log(`Updated ${result.modifiedCount} gown(s) to verified: true`);
    
    // Show total verified gowns
    const verifiedCount = await Gown.countDocuments({ verified: true });
    const totalCount = await Gown.countDocuments({});
    console.log(`\nTotal gowns: ${totalCount}`);
    console.log(`Verified gowns: ${verifiedCount}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error verifying gowns:', error.message);
    process.exit(1);
  }
};

verifyAllGowns();

