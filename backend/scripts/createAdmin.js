import mongoose from "mongoose";
import bcrypt from 'bcrypt';
import User from "../models/User.js";
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

// Create admin user
const createAdmin = async () => {
  try {
    await connectDb();

    const adminEmail = process.argv[2] || 'admin@astrella.com';
    const adminPassword = process.argv[3] || 'admin123456';
    const adminName = process.argv[4] || 'Admin User';

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin) {
      if (existingAdmin.role === 'admin') {
        console.log('✅ Admin user already exists!');
        console.log(`Email: ${adminEmail}`);
        console.log(`Role: ${existingAdmin.role}`);
        process.exit(0);
      } else {
        // Update existing user to admin
        existingAdmin.role = 'admin';
        await existingAdmin.save();
        console.log('✅ Updated existing user to admin!');
        console.log(`Email: ${adminEmail}`);
        console.log(`Role: ${existingAdmin.role}`);
        process.exit(0);
      }
    }

    // Create new admin user
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    const admin = await User.create({
      name: adminName,
      email: adminEmail,
      password: hashedPassword,
      role: 'admin'
    });

    console.log('✅ Admin user created successfully!');
    console.log(`Name: ${admin.name}`);
    console.log(`Email: ${admin.email}`);
    console.log(`Role: ${admin.role}`);
    console.log(`\n⚠️  IMPORTANT: Change the password after first login!`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin:', error.message);
    process.exit(1);
  }
};

createAdmin();

