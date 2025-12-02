/**
 * ML-Powered Recommendation Controller (SQL Version)
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
        const { bodyType, skinTone, height, eventType, faceShape } = req.query;
        const userId = req.user?.id?.toString(); // Optional: works for both logged-in and guest users

        console.log('🤖 ML Recommendation request:', { userId, preferences: req.query });

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
        console.error('❌ ML Recommendation error:', error);
        res.json({ 
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
        const { id } = req.user;
        const userId = id.toString();
        const limit = parseInt(req.query.limit) || 10;

        console.log('👥 Similar user recommendations for:', userId);

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
        console.error('❌ Similar user recommendation error:', error);
        res.json({ 
            success: false, 
            message: 'Failed to generate similar user recommendations',
            error: error.message 
        });
    }
};

/**
 * Force retrain the ML model (admin/testing purposes)
 */
export const retrainModel = async (req, res) => {
    try {
        console.log('🔄 Manual model retraining initiated...');
        
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
        console.error('❌ Model retraining error:', error);
        res.json({ 
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
        res.json({ 
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
        const { id } = req.user;
        const userId = id.toString();

        // Get user's saved preferences (if any)
        const User = (await import('../models/User.js')).default;
        const user = await User.findByPk(id);
        
        // Use stored preferences or defaults
        const preferences = {
            bodyType: req.query.bodyType || user.preferences?.bodyType,
            skinTone: req.query.skinTone || user.preferences?.skinTone,
            height: req.query.height || user.preferences?.height,
            eventType: req.query.eventType,
            faceShape: req.query.faceShape || user.preferences?.faceShape
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
        res.json({ 
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
