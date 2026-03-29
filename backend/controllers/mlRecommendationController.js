/**
 * ML-Powered Recommendation Controller
 * Uses the trained machine learning model for personalized recommendations
 */

import mlModel from '../ml/recommendationModel.js';
import Gown from '../models/Gown.js';

/**
 * Get ML-powered recommendations for a user
 * Uses hybrid approach: Collaborative Filtering + Content-Based Filtering
 */
export const getMLRecommendations = async (req, res) => {
    try {
        const userId = req.user?._id?.toString(); // Optional: works for both logged-in and guest users
        const { bodyType, skinTone, height, eventType, faceShape } = req.query;

        // Build preferences object
        const preferences = {
            bodyType,
            skinTone,
            height,
            eventType,
            faceShape
        };

        // Get ML-powered recommendations
        const recommendations = await mlModel.getRecommendations(
            userId,
            preferences,
            20 // Get top 20 recommendations
        );

        // Add metadata about the ML approach used
        const hasUserHistory = userId && mlModel.collaborativeModel.userItemMatrix.has(userId);
        
        res.json({
            success: true,
            recommendations,
            preferences,
            totalMatches: recommendations.length,
            mlMetadata: {
                modelTrained: mlModel.collaborativeModel.trained,
                lastTrainingTime: mlModel.lastTrainingTime,
                approachUsed: hasUserHistory ? 'Hybrid (CF + CB)' : 'Content-Based + Popularity',
                hasUserHistory,
                description: hasUserHistory 
                    ? 'Recommendations based on your booking history and similar users'
                    : 'Recommendations based on your preferences and popular choices'
            }
        });

    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Failed to generate recommendations',
            error: error.message 
        });
    }
};

/**
 * Get recommendations based on similar users (pure collaborative filtering)
 */
export const getSimilarUserRecommendations = async (req, res) => {
    try {
        const { _id } = req.user;
        const userId = _id.toString();
        const limit = parseInt(req.query.limit) || 10;

        // Get recommendations from similar users
        const recommendations = await mlModel.getSimilarUserRecommendations(userId, limit);

        if (recommendations.length === 0) {
            return res.json({
                success: true,
                recommendations: [],
                message: "Not enough booking history yet. Try more rentals to get personalized recommendations!"
            });
        }

        res.json({
            success: true,
            recommendations,
            message: `Based on users with similar taste`,
            totalMatches: recommendations.length
        });

    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Failed to generate similar user recommendations',
            error: error.message 
        });
    }
};

/**
 * Force retrain the ML model (testing/utility purposes)
 */
export const retrainModel = async (req, res) => {
    try {
        
        await mlModel.collaborativeModel.train();
        mlModel.lastTrainingTime = Date.now();

        res.json({
            success: true,
            message: 'Model retrained successfully',
            metadata: {
                trainingTime: new Date(mlModel.lastTrainingTime).toISOString(),
                usersInMatrix: mlModel.collaborativeModel.userItemMatrix.size,
                modelTrained: mlModel.collaborativeModel.trained
            }
        });

    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Failed to retrain model',
            error: error.message 
        });
    }
};

/**
 * Get model statistics and health check
 */
export const getModelStats = async (req, res) => {
    try {
        const stats = {
            modelTrained: mlModel.collaborativeModel.trained,
            lastTrainingTime: mlModel.lastTrainingTime 
                ? new Date(mlModel.lastTrainingTime).toISOString() 
                : null,
            usersInMatrix: mlModel.collaborativeModel.userItemMatrix.size,
            gownsInSimilarity: mlModel.collaborativeModel.gownSimilarity.size,
            nextTrainingIn: mlModel.lastTrainingTime 
                ? Math.max(0, mlModel.trainingInterval - (Date.now() - mlModel.lastTrainingTime))
                : 0,
            modelType: 'Hybrid (Collaborative Filtering + Content-Based Filtering)',
            algorithms: [
                'Item-Item Collaborative Filtering',
                'Cosine Similarity',
                'Jaccard Similarity',
                'Rule-Based Content Matching',
                'Popularity-Based Ranking'
            ]
        };

        res.json({
            success: true,
            stats,
            description: 'ML model combines user behavior patterns with gown attributes for personalized recommendations'
        });

    } catch (error) {
        console.error('❌ Stats error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to get model stats',
            error: error.message 
        });
    }
};

/**
 * Get personalized recommendations for logged-in user's homepage
 * Shows "Recommended for You" section
 */
export const getPersonalizedFeed = async (req, res) => {
    try {
        const { _id } = req.user;
        const userId = _id.toString();

        // Get user's saved preferences (if any)
        const user = await (await import('../models/User.js')).default.findById(_id);
        
        // Use query params for preferences
        const preferences = {
            bodyType: req.query.bodyType || undefined,
            skinTone: req.query.skinTone || undefined,
            height: req.query.height || undefined,
            eventType: req.query.eventType || undefined,
            faceShape: req.query.faceShape || undefined
        };

        // Get hybrid recommendations
        const recommendations = await mlModel.getRecommendations(userId, preferences, 12);

        res.json({
            success: true,
            recommendations,
            message: 'Personalized recommendations based on your style and preferences'
        });

    } catch (error) {
        console.error('❌ Personalized feed error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to generate personalized feed',
            error: error.message 
        });
    }
};

export default {
    getMLRecommendations,
    getSimilarUserRecommendations,
    retrainModel,
    getModelStats,
    getPersonalizedFeed
};
