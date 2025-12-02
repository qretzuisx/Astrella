/**
 * Create Owner Account Script
 * Creates a user account with owner role
 * 
 * Usage: node scripts/createOwnerAccount.js
 */

import bcrypt from 'bcrypt';
import { sequelize } from '../configs/db.js';
import User from '../models/User.js';
import dotenv from 'dotenv';

dotenv.config();

const createOwnerAccount = async () => {
    try {
        console.log('🔐 Creating Owner Account...\n');

        // Connect to database
        await sequelize.authenticate();
        console.log('✅ Database connected\n');

        // Sync models
        await sequelize.sync();

        // Account details
        const email = 'zynnascollection@mail.com';
        const password = '12345678';
        const name = "Zynna's Collection";

        // Check if user already exists
        const existingUser = await User.findOne({ where: { email } });
        
        if (existingUser) {
            console.log('⚠️  User already exists!');
            console.log(`Email: ${existingUser.email}`);
            console.log(`Name: ${existingUser.name}`);
            console.log(`Role: ${existingUser.role}`);
            console.log(`ID: ${existingUser.id}\n`);
            
            if (existingUser.role !== 'owner') {
                console.log('🔄 Updating role to owner...');
                existingUser.role = 'owner';
                await existingUser.save();
                console.log('✅ Role updated to owner!\n');
            }
        } else {
            // Hash password
            console.log('🔒 Hashing password...');
            const hashedPassword = await bcrypt.hash(password, 10);

            // Create owner account
            console.log('👤 Creating user...');
            const owner = await User.create({
                name: name,
                email: email,
                password: hashedPassword,
                role: 'owner',
                shopName: "Zynna's Collection",
                shopDescription: 'Premium gown rental service',
                verified: true
            });

            console.log('\n✅ Owner Account Created Successfully!\n');
            console.log('═══════════════════════════════════════');
            console.log('📧 Email:', owner.email);
            console.log('👤 Name:', owner.name);
            console.log('🔑 Password:', password);
            console.log('👔 Role:', owner.role);
            console.log('🏪 Shop Name:', owner.shopName);
            console.log('✅ Verified:', owner.verified);
            console.log('🆔 User ID:', owner.id);
            console.log('═══════════════════════════════════════\n');
        }

        console.log('🎉 Done! You can now login with:');
        console.log(`   Email: ${email}`);
        console.log(`   Password: ${password}\n`);

        await sequelize.close();
        process.exit(0);

    } catch (error) {
        console.error('❌ Error creating owner account:', error.message);
        console.error(error);
        process.exit(1);
    }
};

// Run the script
createOwnerAccount();
