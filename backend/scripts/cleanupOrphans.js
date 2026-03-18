import mongoose from 'mongoose';
import Gown from '../models/Gown.js';
import User from '../models/User.js';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = `${process.env.MONGODB_URI}/gown-rental`;

async function cleanupOrphanedGowns() {
    try {
        console.log('--- ORPHAN CLEANUP START ---');
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        const totalGownsCount = await Gown.countDocuments();
        console.log(`Total gowns in database: ${totalGownsCount}`);

        const gowns = await Gown.find({});
        
        let orphanedCount = 0;
        for (const gown of gowns) {
            if (!gown.owner) {
                console.log(`[ORPHAN] Gown ${gown._id} (${gown.name}) has no owner ID. Deleting...`);
                await Gown.findByIdAndDelete(gown._id);
                orphanedCount++;
                continue;
            }

            const ownerExists = await User.exists({ _id: gown.owner });
            if (!ownerExists) {
                console.log(`[ORPHAN] Gown ${gown._id} (${gown.name}) owner ${gown.owner} NOT FOUND. Deleting...`);
                await Gown.findByIdAndDelete(gown._id);
                orphanedCount++;
            }
        }

        console.log(`Cleanup complete. Removed ${orphanedCount} orphaned gowns.`);
        console.log('--- ORPHAN CLEANUP END ---');
        await mongoose.disconnect();
    } catch (error) {
        console.error('ERROR during cleanup:', error);
        process.exit(1);
    }
}

cleanupOrphanedGowns();
