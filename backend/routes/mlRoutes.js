/**
 * ML Routes - Machine Learning Recommendation Endpoints
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
import { verifyOwner } from '../middleware/verify.js';

const mlRouter = express.Router();

// Public ML recommendations (works for guests and logged-in users)
mlRouter.get('/recommendations', getMLRecommendations);

// Protected routes (require login)
mlRouter.get('/similar-users', protect, getSimilarUserRecommendations);
mlRouter.get('/personalized-feed', protect, getPersonalizedFeed);

// Testing/utility routes (protected)
mlRouter.post('/retrain', protect, verifyOwner, retrainModel);
mlRouter.get('/stats', protect, getModelStats);

export default mlRouter;
