import mongoose from 'mongoose';
import Gown from '../models/Gown.js';
import User from '../models/User.js';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = `${process.env.MONGODB_URI}/gown-rental`;

async function diagnose() {
    try {
        console.log('Connecting...');
        await mongoose.connect(MONGO_URI);
        console.log('Connected.');

        const totalGowns = await Gown.countDocuments();
        const totalUsers = await User.countDocuments();
        const totalOwners = await User.countDocuments({ role: 'owner' });

        console.log(`Total Users: ${totalUsers}`);
        console.log(`Total Owners: ${totalOwners}`);
        console.log(`Total Gowns: ${totalGowns}`);

        const owners = await User.find({ role: 'owner' });
        for (const owner of owners) {
            const gownCount = await Gown.countDocuments({ owner: owner._id });
            console.log(`Owner: ${owner.name} (${owner.email}) - Gowns: ${gownCount}`);
        }

        // Check for gowns with non-existent owners
        const allGowns = await Gown.find({});
        let orphaned = 0;
        for (const gown of allGowns) {
            const owner = await User.findById(gown.owner);
            if (!owner) {
                orphaned++;
                console.log(`Orphaned Gown: ${gown._id} (${gown.name}) - Owner ID in DB: ${gown.owner}`);
            }
        }
        console.log(`Total orphaned gowns found: ${orphaned}`);

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

diagnose();
