import { sequelize } from "../configs/db.js";
import Gown from "../models/Gown.js";
import "dotenv/config";

// Connect to database
const connectDb = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Database Connected");
  } catch (error) {
    console.error("❌ Database connection error:", error);
    process.exit(1);
  }
};

// Verify all existing gowns
const verifyAllGowns = async () => {
  try {
    await connectDb();

    // Update all gowns to verified: true
    const [affectedCount] = await Gown.update(
      { verified: true },
      { 
        where: { 
          verified: false 
        } 
      }
    );

    console.log('✅ Successfully verified gowns!');
    console.log(`Updated ${affectedCount} gown(s) to verified: true`);
    
    // Show total verified gowns
    const verifiedCount = await Gown.count({ where: { verified: true } });
    const totalCount = await Gown.count();
    console.log(`\nTotal gowns: ${totalCount}`);
    console.log(`Verified gowns: ${verifiedCount}`);
    
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error verifying gowns:', error.message);
    process.exit(1);
  }
};

verifyAllGowns();
