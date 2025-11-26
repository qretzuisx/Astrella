/**
 * Machine Learning Recommendation Model
 * Uses Collaborative Filtering and Content-Based Filtering
 * 
 * This is a hybrid recommendation system that:
 * 1. Learns from user booking history (Collaborative Filtering)
 * 2. Uses gown attributes and user preferences (Content-Based Filtering)
 * 3. Combines both approaches for better recommendations
 */

import Booking from '../models/booking.js';
import Gown from '../models/Gown.js';
import User from '../models/User.js';

/**
 * USER-ITEM MATRIX (Collaborative Filtering)
 * Creates a matrix where rows = users, columns = gowns
 * Values = interaction scores (bookings, views, etc.)
 */
class CollaborativeFilteringModel {
    constructor() {
        this.userItemMatrix = new Map(); // userId -> Map(gownId -> score)
        this.gownSimilarity = new Map(); // gownId -> Map(gownId -> similarity)
        this.trained = false;
    }

    /**
     * Train the model using historical booking data
     */
    async train() {
        console.log('🤖 Training ML Recommendation Model...');
        
        try {
            // Fetch all completed bookings (positive interactions)
            const bookings = await Booking.find({ 
                status: { $in: ['confirmed', 'completed'] } 
            }).populate('user gown');

            // Build user-item interaction matrix
            for (const booking of bookings) {
                if (!booking.user || !booking.gown) continue;

                const userId = booking.user._id.toString();
                const gownId = booking.gown._id.toString();

                // Initialize user map if not exists
                if (!this.userItemMatrix.has(userId)) {
                    this.userItemMatrix.set(userId, new Map());
                }

                // Calculate interaction score based on booking status
                let score = 0;
                if (booking.status === 'completed') score = 5; // High score for completed
                else if (booking.status === 'confirmed') score = 3; // Medium score for confirmed
                
                // Accumulate scores (user might book same gown multiple times)
                const currentScore = this.userItemMatrix.get(userId).get(gownId) || 0;
                this.userItemMatrix.get(userId).set(gownId, currentScore + score);
            }

            // Calculate item-item (gown-gown) similarity
            await this.calculateGownSimilarity();

            this.trained = true;
            console.log(`Model trained with ${bookings.length} bookings`);
            console.log(`Users in matrix: ${this.userItemMatrix.size}`);
            
        } catch (error) {
            console.error('❌ Training error:', error);
            throw error;
        }
    }

    /**
     * Calculate similarity between gowns based on attributes
     * Uses Cosine Similarity on gown features
     */
    async calculateGownSimilarity() {
        const gowns = await Gown.find({ available: true, verified: true });
        
        for (let i = 0; i < gowns.length; i++) {
            const gownA = gowns[i];
            const gownAId = gownA._id.toString();
            
            if (!this.gownSimilarity.has(gownAId)) {
                this.gownSimilarity.set(gownAId, new Map());
            }

            for (let j = 0; j < gowns.length; j++) {
                if (i === j) continue;
                
                const gownB = gowns[j];
                const gownBId = gownB._id.toString();
                
                // Calculate similarity score
                const similarity = this.calculateAttributeSimilarity(gownA, gownB);
                this.gownSimilarity.get(gownAId).set(gownBId, similarity);
            }
        }
    }

    /**
     * Calculate similarity between two gowns based on their attributes
     * Returns value between 0 (completely different) and 1 (identical)
     */
    calculateAttributeSimilarity(gownA, gownB) {
        let similarity = 0;
        let weights = 0;

        // Event Type similarity (weight: 0.3)
        const eventOverlap = this.calculateEventOverlap(gownA.eventType, gownB.eventType);
        similarity += eventOverlap * 0.3;
        weights += 0.3;

        // Color similarity (weight: 0.25)
        if (gownA.color === gownB.color) {
            similarity += 0.25;
        } else if (this.areColorsSimilar(gownA.color, gownB.color)) {
            similarity += 0.15; // Partial match for similar colors
        }
        weights += 0.25;

        // Fabric similarity (weight: 0.2)
        if (gownA.fabric === gownB.fabric) {
            similarity += 0.2;
        } else if (this.areFabricsSimilar(gownA.fabric, gownB.fabric)) {
            similarity += 0.1;
        }
        weights += 0.2;

        // Price similarity (weight: 0.15)
        const priceDiff = Math.abs(gownA.price - gownB.price);
        const avgPrice = (gownA.price + gownB.price) / 2;
        const priceSimScore = Math.max(0, 1 - (priceDiff / avgPrice));
        similarity += priceSimScore * 0.15;
        weights += 0.15;

        // Location similarity (weight: 0.1)
        if (gownA.location === gownB.location) {
            similarity += 0.1;
        }
        weights += 0.1;

        return weights > 0 ? similarity / weights : 0;
    }

    calculateEventOverlap(eventsA, eventsB) {
        if (!Array.isArray(eventsA) || !Array.isArray(eventsB)) return 0;
        if (eventsA.length === 0 || eventsB.length === 0) return 0;
        
        const setA = new Set(eventsA);
        const setB = new Set(eventsB);
        const intersection = new Set([...setA].filter(x => setB.has(x)));
        const union = new Set([...setA, ...setB]);
        
        return intersection.size / union.size; // Jaccard similarity
    }

    areColorsSimilar(colorA, colorB) {
        const colorGroups = {
            warm: ['red', 'orange', 'yellow', 'gold', 'peach', 'coral'],
            cool: ['blue', 'green', 'purple', 'teal', 'turquoise'],
            neutral: ['white', 'black', 'gray', 'beige', 'ivory', 'cream'],
            dark: ['black', 'navy', 'burgundy', 'maroon', 'dark']
        };

        for (const group of Object.values(colorGroups)) {
            const colorALower = colorA.toLowerCase();
            const colorBLower = colorB.toLowerCase();
            
            const aInGroup = group.some(c => colorALower.includes(c));
            const bInGroup = group.some(c => colorBLower.includes(c));
            
            if (aInGroup && bInGroup) return true;
        }
        return false;
    }

    areFabricsSimilar(fabricA, fabricB) {
        const fabricGroups = {
            light: ['chiffon', 'tulle', 'organza', 'lace'],
            heavy: ['satin', 'silk', 'velvet', 'brocade'],
            structured: ['taffeta', 'mikado', 'duchess']
        };

        for (const group of Object.values(fabricGroups)) {
            const fabricALower = fabricA.toLowerCase();
            const fabricBLower = fabricB.toLowerCase();
            
            const aInGroup = group.some(f => fabricALower.includes(f));
            const bInGroup = group.some(f => fabricBLower.includes(f));
            
            if (aInGroup && bInGroup) return true;
        }
        return false;
    }

    /**
     * Predict score for a user-gown pair using collaborative filtering
     */
    predictScore(userId, gownId) {
        if (!this.trained) return 0;

        const userInteractions = this.userItemMatrix.get(userId);
        
        // If user has no history, return 0 (will use content-based)
        if (!userInteractions) return 0;

        // Find similar gowns that user has interacted with
        const similarGowns = this.gownSimilarity.get(gownId);
        if (!similarGowns) return 0;

        let weightedSum = 0;
        let similaritySum = 0;

        // Calculate weighted average based on similar gowns
        for (const [similarGownId, similarity] of similarGowns.entries()) {
            const userScore = userInteractions.get(similarGownId);
            if (userScore) {
                weightedSum += similarity * userScore;
                similaritySum += similarity;
            }
        }

        return similaritySum > 0 ? weightedSum / similaritySum : 0;
    }

    /**
     * Get similar users based on booking patterns
     */
    findSimilarUsers(userId, topN = 5) {
        const targetUser = this.userItemMatrix.get(userId);
        if (!targetUser) return [];

        const similarities = [];

        for (const [otherUserId, otherUserInteractions] of this.userItemMatrix.entries()) {
            if (otherUserId === userId) continue;

            // Calculate user similarity using Cosine Similarity
            const similarity = this.calculateUserSimilarity(targetUser, otherUserInteractions);
            similarities.push({ userId: otherUserId, similarity });
        }

        // Sort by similarity and return top N
        return similarities
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, topN);
    }

    calculateUserSimilarity(userA, userB) {
        const commonGowns = new Set(
            [...userA.keys()].filter(gownId => userB.has(gownId))
        );

        if (commonGowns.size === 0) return 0;

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (const gownId of commonGowns) {
            const scoreA = userA.get(gownId);
            const scoreB = userB.get(gownId);
            dotProduct += scoreA * scoreB;
            normA += scoreA * scoreA;
            normB += scoreB * scoreB;
        }

        normA = Math.sqrt(normA);
        normB = Math.sqrt(normB);

        return normA > 0 && normB > 0 ? dotProduct / (normA * normB) : 0;
    }
}

/**
 * CONTENT-BASED FILTERING
 * Recommends based on gown attributes matching user preferences
 */
class ContentBasedModel {
    /**
     * Calculate content-based score using the existing rule-based algorithm
     */
    static calculateScore(gown, preferences) {
        // Use the existing sophisticated rule-based scoring
        return calculateRecommendationScore(gown, preferences);
    }
}

/**
 * HYBRID RECOMMENDATION MODEL
 * Combines Collaborative and Content-Based Filtering
 */
class HybridRecommendationModel {
    constructor() {
        this.collaborativeModel = new CollaborativeFilteringModel();
        this.lastTrainingTime = null;
        this.trainingInterval = 24 * 60 * 60 * 1000; // Retrain every 24 hours
    }

    /**
     * Train or retrain the model if needed
     */
    async ensureTrained() {
        const now = Date.now();
        
        // Train if never trained or if training interval has passed
        if (!this.collaborativeModel.trained || 
            !this.lastTrainingTime || 
            (now - this.lastTrainingTime) > this.trainingInterval) {
            
            await this.collaborativeModel.train();
            this.lastTrainingTime = now;
        }
    }

    /**
     * Get ML-powered recommendations for a user
     */
    async getRecommendations(userId, preferences, limit = 20) {
        await this.ensureTrained();

        // Get all available gowns
        const allGowns = await Gown.find({ available: true, verified: true })
            .populate('owner', 'name shopProfile');

        const scoredGowns = [];

        for (const gown of allGowns) {
            const gownId = gown._id.toString();

            // Skip gowns the user has already booked
            const alreadyBooked = await this.hasUserBookedGown(userId, gownId);
            if (alreadyBooked) continue;

            // 1. Collaborative Filtering Score (0-5 scale)
            const cfScore = this.collaborativeModel.predictScore(userId, gownId);

            // 2. Content-Based Score (0-100 scale)
            const cbScore = ContentBasedModel.calculateScore(gown, preferences);

            // 3. Popularity Score (based on total bookings)
            const popularityScore = await this.getPopularityScore(gownId);

            // Hybrid Score: Weighted combination
            // If user has history: 50% CF, 40% CB, 10% Popularity
            // If new user (no CF): 0% CF, 80% CB, 20% Popularity
            const hasHistory = this.collaborativeModel.userItemMatrix.has(userId);
            
            let finalScore;
            if (hasHistory && cfScore > 0) {
                // Normalize CF score to 0-100 scale (assuming max CF score is 5)
                const normalizedCF = (cfScore / 5) * 100;
                finalScore = (normalizedCF * 0.5) + (cbScore * 0.4) + (popularityScore * 0.1);
            } else {
                // New user: rely more on content and popularity
                finalScore = (cbScore * 0.8) + (popularityScore * 0.2);
            }

            scoredGowns.push({
                gown,
                score: Math.round(finalScore),
                cfScore: Math.round((cfScore / 5) * 100),
                cbScore: Math.round(cbScore),
                popularityScore: Math.round(popularityScore),
                matchReason: this.getMatchReason(finalScore, hasHistory)
            });
        }

        // Sort by final score
        scoredGowns.sort((a, b) => b.score - a.score);

        // Return top N recommendations
        return scoredGowns.slice(0, limit);
    }

    async hasUserBookedGown(userId, gownId) {
        if (!userId) return false;
        
        const booking = await Booking.findOne({
            user: userId,
            gown: gownId,
            status: { $in: ['pending', 'confirmed', 'completed'] }
        });
        
        return !!booking;
    }

    async getPopularityScore(gownId) {
        const bookingCount = await Booking.countDocuments({
            gown: gownId,
            status: { $in: ['confirmed', 'completed'] }
        });

        // Normalize to 0-100 scale (assume max 50 bookings = 100 score)
        return Math.min(100, (bookingCount / 50) * 100);
    }

    getMatchReason(score, hasHistory) {
        if (score >= 80) {
            return hasHistory 
                ? "Excellent match based on your preferences and similar users' choices"
                : "Excellent match based on your preferences";
        }
        if (score >= 60) {
            return hasHistory
                ? "Great match - users with similar taste loved this"
                : "Great match for your style preferences";
        }
        if (score >= 40) {
            return "Good match - worth considering";
        }
        return "Potential match";
    }

    /**
     * Get personalized recommendations based on similar users
     */
    async getSimilarUserRecommendations(userId, limit = 10) {
        await this.ensureTrained();

        const similarUsers = this.collaborativeModel.findSimilarUsers(userId);
        if (similarUsers.length === 0) return [];

        // Aggregate gowns that similar users liked
        const gownScores = new Map();

        for (const { userId: similarUserId, similarity } of similarUsers) {
            const userInteractions = this.collaborativeModel.userItemMatrix.get(similarUserId);
            if (!userInteractions) continue;

            for (const [gownId, score] of userInteractions.entries()) {
                // Skip if current user already booked this
                const alreadyBooked = await this.hasUserBookedGown(userId, gownId);
                if (alreadyBooked) continue;

                const weightedScore = score * similarity;
                const currentScore = gownScores.get(gownId) || 0;
                gownScores.set(gownId, currentScore + weightedScore);
            }
        }

        // Sort and get top recommendations
        const sortedGowns = [...gownScores.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit);

        // Fetch gown details
        const recommendations = [];
        for (const [gownId, score] of sortedGowns) {
            const gown = await Gown.findById(gownId).populate('owner', 'name shopProfile');
            if (gown && gown.available && gown.verified) {
                recommendations.push({
                    gown,
                    score: Math.round((score / 5) * 100),
                    matchReason: "Users with similar taste loved this"
                });
            }
        }

        return recommendations;
    }
}

// Import the existing rule-based function
const calculateRecommendationScore = (gown, preferences) => {
    let score = 0;
    const maxScore = 100;

    // Event Type Match (30 points)
    if (preferences.eventType) {
        const userEventType = preferences.eventType.toLowerCase();
        
        if (Array.isArray(gown.eventType)) {
            const gownEventTypes = gown.eventType.map(e => e.toLowerCase());
            if (gownEventTypes.includes(userEventType)) {
                score += 30;
            } else if (gownEventTypes.some(e => e.includes(userEventType) || userEventType.includes(e))) {
                score += 20;
            }
        } else {
            const gownEventType = gown.eventType?.toLowerCase();
            if (gownEventType === userEventType) {
                score += 30;
            } else if (gownEventType?.includes(userEventType) || userEventType.includes(gownEventType)) {
                score += 20;
            }
        }
    }

    // Body Type Recommendations (25 points)
    const bodyTypeRecommendations = {
        'Hourglass': {
            colors: ['Navy', 'Black', 'Burgundy', 'Emerald'],
            fabrics: ['Satin', 'Silk', 'Chiffon'],
        },
        'Pear': {
            colors: ['Dark', 'Navy', 'Black', 'Deep'],
            fabrics: ['Chiffon', 'Tulle', 'Organza'],
        },
        'Rectangle': {
            colors: ['All'],
            fabrics: ['Chiffon', 'Tulle', 'Organza', 'Satin'],
        },
        'Diamond': {
            colors: ['Dark', 'Navy', 'Black'],
            fabrics: ['Chiffon', 'Tulle'],
        }
    };

    if (preferences.bodyType && bodyTypeRecommendations[preferences.bodyType]) {
        const rec = bodyTypeRecommendations[preferences.bodyType];
        const gownColor = gown.color?.toLowerCase();
        const gownFabric = gown.fabric?.toLowerCase();
        
        if (rec.colors.some(c => gownColor?.includes(c.toLowerCase()))) {
            score += 10;
        }
        if (rec.fabrics.some(f => gownFabric?.includes(f.toLowerCase()))) {
            score += 10;
        }
        score += 5;
    }

    // Skin Tone Color Recommendations (20 points)
    const skinToneColors = {
        'Warm': ['Gold', 'Peach', 'Coral', 'Ivory', 'Warm White', 'Blush', 'Cream'],
        'Cool': ['Silver', 'Blue', 'Pink', 'Cool White', 'Lavender', 'Mint'],
        'Neutral': ['All colors work well'],
    };

    if (preferences.skinTone && skinToneColors[preferences.skinTone]) {
        const recommendedColors = skinToneColors[preferences.skinTone];
        const gownColor = gown.color?.toLowerCase();
        
        if (recommendedColors.some(c => gownColor?.includes(c.toLowerCase()))) {
            score += 20;
        } else if (recommendedColors[0] === 'All colors work well') {
            score += 15;
        }
    }

    // Height Recommendations (15 points)
    if (preferences.height) {
        const gownFabric = gown.fabric?.toLowerCase();
        if (preferences.height === 'Small') {
            if (['chiffon', 'tulle', 'organza'].some(f => gownFabric?.includes(f))) {
                score += 15;
            } else {
                score += 5;
            }
        } else if (preferences.height === 'Tall') {
            if (['satin', 'silk', 'velvet'].some(f => gownFabric?.includes(f))) {
                score += 15;
            } else {
                score += 10;
            }
        } else {
            score += 12;
        }
    }

    // Face Shape Recommendations (10 points)
    if (preferences.faceShape) {
        score += 10;
    }

    return Math.min(score, maxScore);
};

// Export singleton instance
const mlModel = new HybridRecommendationModel();
export default mlModel;
