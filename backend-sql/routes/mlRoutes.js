/**
 * ML Routes - Machine Learning Recommendation Endpoints (SQL Version)
 */

import express from 'express';
import { 
    getMLRecommendations,
    getSimilarUserRecommendations,
    retrainModel,
    getModelStats,
    getPersonalizedFeed
} from '../controllers/mlRecommendationController.js';
import { protect } from '../middleware/auth.js';

const mlRouter = express.Router();

// Public ML recommendations (works for guests and logged-in users)
mlRouter.get('/recommendations', getMLRecommendations);

// Protected routes (require login)
mlRouter.get('/similar-users', protect, getSimilarUserRecommendations);
mlRouter.get('/personalized-feed', protect, getPersonalizedFeed);

// Admin/Testing routes
mlRouter.post('/retrain', retrainModel);
mlRouter.get('/stats', getModelStats);

export default mlRouter;
