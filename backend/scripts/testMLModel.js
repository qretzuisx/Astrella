/**
 * Test Script for ML Recommendation Model
 * Run this to verify your ML model is working
 * 
 * Usage: node scripts/testMLModel.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import mlModel from '../ml/recommendationModel.js';
import Booking from '../models/booking.js';
import Gown from '../models/Gown.js';
import User from '../models/User.js';

dotenv.config();

// Connect to database
const connectDb = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log(' Database connected');
    } catch (error) {
        console.error(' Database connection error:', error);
        process.exit(1);
    }
};

const testMLModel = async () => {
    console.log('\n Testing ML Recommendation Model...\n');

    try {
        // 1. Check database stats
        console.log(' Database Statistics:');
        const bookingCount = await Booking.countDocuments();
        const gownCount = await Gown.countDocuments({ available: true, verified: true });
        const userCount = await User.countDocuments();
        
        console.log(`   - Total bookings: ${bookingCount}`);
        console.log(`   - Available gowns: ${gownCount}`);
        console.log(`   - Total users: ${userCount}\n`);

        if (bookingCount === 0) {
            console.log('  Warning: No bookings in database. ML model needs data to learn!');
            console.log('   Create some test bookings first.\n');
        }

        // 2. Train the model
        console.log(' Training ML Model...');
        await mlModel.collaborativeModel.train();
        console.log(' Model trained successfully!\n');

        // 3. Check model statistics
        console.log(' Model Statistics:');
        console.log(`   - Users in matrix: ${mlModel.collaborativeModel.userItemMatrix.size}`);
        console.log(`   - Gowns in similarity matrix: ${mlModel.collaborativeModel.gownSimilarity.size}`);
        console.log(`   - Model trained: ${mlModel.collaborativeModel.trained}\n`);

        // 4. Test recommendations for a sample user
        if (userCount > 0) {
            const sampleUser = await User.findOne();
            console.log(`Testing recommendations for user: ${sampleUser.name}`);
            
            const preferences = {
                bodyType: 'Hourglass',
                skinTone: 'Warm',
                height: 'Medium',
                eventType: 'wedding',
                faceShape: 'Oval'
            };

            const recommendations = await mlModel.getRecommendations(
                sampleUser._id.toString(),
                preferences,
                5
            );

            console.log(`   Generated ${recommendations.length} recommendations\n`);

            if (recommendations.length > 0) {
                console.log('   Top 3 Recommendations:');
                recommendations.slice(0, 3).forEach((rec, idx) => {
                    console.log(`   ${idx + 1}. ${rec.gown.name}`);
                    console.log(`      Score: ${rec.score}/100`);
                    console.log(`      CF: ${rec.cfScore}, CB: ${rec.cbScore}, Pop: ${rec.popularityScore}`);
                    console.log(`      Reason: ${rec.matchReason}\n`);
                });
            }
        }

        // 5. Test similar user recommendations
        if (userCount > 1) {
            const userWithBookings = await Booking.findOne({ 
                status: { $in: ['confirmed', 'completed'] } 
            }).populate('user');

            if (userWithBookings && userWithBookings.user) {
                console.log(`👥 Testing similar user recommendations for: ${userWithBookings.user.name}`);
                const similarRecs = await mlModel.getSimilarUserRecommendations(
                    userWithBookings.user._id.toString(),
                    3
                );
                console.log(`   Found ${similarRecs.length} recommendations from similar users\n`);
            }
        }

        // 6. Test gown similarity
        if (gownCount > 1) {
            console.log('🔍 Testing Gown Similarity Calculation:');
            const gowns = await Gown.find({ available: true, verified: true }).limit(2);
            
            if (gowns.length === 2) {
                const similarity = mlModel.collaborativeModel.calculateAttributeSimilarity(
                    gowns[0],
                    gowns[1]
                );
                
                console.log(`   Gown A: ${gowns[0].name}`);
                console.log(`   Gown B: ${gowns[1].name}`);
                console.log(`   Similarity: ${(similarity * 100).toFixed(2)}%\n`);
            }
        }

        // 7. Performance test
        console.log('⚡ Performance Test:');
        const startTime = Date.now();
        await mlModel.getRecommendations('test_user_id', {
            bodyType: 'Pear',
            skinTone: 'Cool',
            eventType: 'prom'
        }, 20);
        const endTime = Date.now();
        console.log(`    Generated 20 recommendations in ${endTime - startTime}ms\n`);

        // Summary
        console.log('═══════════════════════════════════════════');
        console.log(' ML MODEL TEST COMPLETED SUCCESSFULLY!');
        console.log('═══════════════════════════════════════════\n');

        console.log(' Your ML model is ready to use!');
        console.log('   API endpoints:');
        console.log('   - GET /api/ml/recommendations');
        console.log('   - GET /api/ml/similar-users');
        console.log('   - GET /api/ml/stats');
        console.log('   - POST /api/ml/retrain\n');

    } catch (error) {
        console.error(' Test failed:', error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log(' Database connection closed');
    }
};

// Run the test
const main = async () => {
    await connectDb();
    await testMLModel();
};

main();
