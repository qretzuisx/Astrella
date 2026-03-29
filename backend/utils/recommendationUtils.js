/**
 * [SECTION] RECOMMENDATION UTILITIES
 * [INFO] Centralized logic for calculating recommendation scores based on user preferences.
 * [FLOW] Used by the AI Stylist to rank apparel listings for individual users.
 */

import colorUtils from './colorUtils.js';
import fabricUtils from './fabricUtils.js';

// [SECTION] RECOMMENDATION CONFIGURATION
/** 
 * [INFO] Maps body types to recommended color families and fabrics.
 * [LOGIC] Curated based on standard fashion styling principles for each silhouette.
 */
const bodyTypeRecommendations = {
    'Hourglass': {
        families: ['blue', 'neutral', 'red', 'green'],
        fabrics: ['satin', 'silk', 'chiffon', 'wool', 'cotton', 'linen'],
    },
    'Pear': {
        families: ['neutral', 'blue', 'gray', 'dark'],
        fabrics: ['chiffon', 'tulle', 'organza', 'wool', 'structured'],
    },
    'Rectangle': {
        families: ['all', 'vibrant', 'earth'],
        fabrics: ['chiffon', 'tulle', 'organza', 'satin', 'denim', 'velvet', 'leather'],
    },
    'Diamond': {
        families: ['neutral', 'blue', 'gray'],
        fabrics: ['chiffon', 'tulle', 'wool', 'silk'],
    },
    'Inverted Triangle': {
        families: ['blue', 'neutral', 'gray', 'white', 'beige'],
        fabrics: ['wool', 'cotton', 'linen', 'structured', 'piña', 'jusi', 'silk', 'organza', 'satin'],
    },
    'Trapezoid': {
        families: ['all', 'blue', 'neutral', 'gray', 'red', 'green'],
        fabrics: ['wool', 'cotton', 'linen', 'structured', 'piña', 'jusi', 'silk', 'satin'],
    },
    'Oval': {
        families: ['blue', 'neutral', 'gray', 'red'],
        fabrics: ['wool', 'cotton', 'linen', 'structured', 'silk'],
    }
};

/** 
 * [INFO] Maps skin tones to warmth levels for color matching.
 */
const skinToneWarmthMap = {
    'Warm': 'Warm',
    'Cool': 'Cool',
    'Neutral': 'Neutral'
};

// [SECTION] SCORE CALCULATION ENGINE
/**
 * [INFO] Calculates a recommendation score (0-100) for a gown based on user preferences.
 * [LOGIC] 
 * 1. Event Type Match (30 pts) - Highest priority.
 * 2. Body Type Match (25 pts) - Color & Fabric synergy.
 * 3. Skin Tone Match (20 pts) - Color warmth compatibility.
 * 4. Height/Sex/Traditional Bonus (25 pts total) - Contextual boosts.
 */
export const calculateRecommendationScore = (gown, preferences) => {
    let score = 0;
    const maxScore = 100;

    if (!gown || !preferences) return 0;

    // 1. [LOGIC] Event Type Match (30 points) - STRICT MATCHING ONLY
    if (preferences.eventType) {
        const userEventType = preferences.eventType.toLowerCase().trim();
        
        if (Array.isArray(gown.eventType)) {
            const gownEventTypes = gown.eventType.map(e => e.toLowerCase().trim());
            if (gownEventTypes.includes(userEventType)) {
                score += 30;
            }
        } else {
            const gownEventType = gown.eventType?.toLowerCase().trim();
            if (gownEventType === userEventType) {
                score += 30;
            }
        }
    }

    // 2. [LOGIC] Body Type Recommendations (25 points)
    const colorProps = colorUtils.getColorProperties(gown.color);
    const fabricProps = fabricUtils.getFabricProperties(gown.fabric);

    if (preferences.bodyType && bodyTypeRecommendations[preferences.bodyType]) {
        const rec = bodyTypeRecommendations[preferences.bodyType];
        
        // Match color family
        if (rec.families.includes('all') || rec.families.includes(colorProps.family)) {
            score += 10;
        }
        
        // Dynamic fabric matching based on properties (light, heavy, structured)
        const matchesFabric = rec.fabrics.some(f => {
            if (f === 'light' && fabricProps.isLight) return true;
            if (f === 'heavy' && fabricProps.isHeavy) return true;
            if (f === 'structured' && fabricProps.isStructured) return true;
            return gown.fabric?.toLowerCase().includes(f);
        });

        if (matchesFabric) {
            score += 10;
        }
        score += 5; // Base score for body type match
    }

    // 3. [LOGIC] Skin Tone Color Recommendations (20 points)
    if (preferences.skinTone) {
        if (preferences.skinTone === 'Neutral') {
            score += 20; // Neutrals work with everything
        } else if (colorProps.warmth === skinToneWarmthMap[preferences.skinTone]) {
            score += 20;
        } else if (colorProps.warmth === 'Neutral') {
            score += 15; // Neutral colors are the safest secondary choice
        }
    }

    // 4. [LOGIC] Height Recommendations (15 points)
    if (preferences.height) {
        if (preferences.height === 'Small') {
            if (fabricProps.isLight) {
                score += 15;
            } else {
                score += 5;
            }
        } else if (preferences.height === 'Tall') {
            if (fabricProps.isHeavy || fabricProps.isStructured) {
                score += 15;
            } else {
                score += 10;
            }
        } else {
            score += 12;
        }
    }

    // 5. [LOGIC] Face Shape Recommendations (10 points - base consideration)
    if (preferences.faceShape) {
        score += 10;
    }

    // 6. [LOGIC] Sex Matching (Bonus for explicit match - 10 points)
    if (preferences.sex && gown.sex) {
        const userSex = preferences.sex.toLowerCase();
        const gownSex = gown.sex.toLowerCase();
        if (userSex === gownSex) {
            score += 10;
        } else if (gownSex === 'unisex') {
            score += 5;
        }
    }

    // 7. [LOGIC] Male-specific fabric/style preferences (Bonus - 10 points)
    if (preferences.sex === 'Male') {
        const gownName = gown.name?.toLowerCase();
        const maleFormalStyles = ['suit', 'tuxedo', 'blazer', 'barong', 'vest'];

        if (fabricProps.isStructured || ['wool', 'linen', 'cotton', 'piña', 'jusi'].some(f => gown.fabric?.toLowerCase().includes(f))) {
            score += 5;
        }
        if (maleFormalStyles.some(s => gownName?.includes(s))) {
            score += 5;
            // Additional bonus for Traditional events matching Barong
            if (preferences.eventType?.toLowerCase() === 'traditional' && gownName?.includes('barong')) {
                score += 10;
            }
        }
    }

    return Math.min(score, maxScore);
};

export default {
    calculateRecommendationScore
};
