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
        families: ['blue', 'neutral', 'red', 'green', 'pink', 'black', 'white', 'gold'],
        fabrics: ['satin', 'silk', 'chiffon', 'wool', 'cotton', 'linen', 'lace', 'jersey'],
        keywords: ['mermaid', 'sheath', 'bodycon', 'wrap', 'fitted', 'belted', 'v-neck', 'sweetheart'],
        silhouettes: ['Mermaid', 'Sheath', 'Wrap', 'Trumpet']
    },
    'Pear': {
        families: ['neutral', 'blue', 'gray', 'dark', 'purple', 'teal', 'burgundy'],
        fabrics: ['chiffon', 'tulle', 'organza', 'wool', 'structured', 'crepe', 'lace'],
        keywords: ['a-line', 'empire', 'ball gown', 'off-the-shoulder', 'boat neck', 'wide leg', 'flared'],
        silhouettes: ['A-Line', 'Empire', 'Ball Gown']
    },
    'Rectangle': {
        families: ['all', 'vibrant', 'earth', 'pastels', 'bright', 'patterns'],
        fabrics: ['chiffon', 'tulle', 'organza', 'satin', 'denim', 'velvet', 'leather', 'ruffles'],
        keywords: ['peplum', 'layered', 'sweetheart', 'cut-out', 'structured shoulders', 'pleated', 'ruched'],
        silhouettes: ['Sheath', 'Wrap', 'Peplum', 'A-Line']
    },
    'Diamond': {
        families: ['neutral', 'blue', 'gray', 'dark', 'olive', 'navy'],
        fabrics: ['chiffon', 'tulle', 'wool', 'silk', 'cotton', 'soft'],
        keywords: ['empire', 'shift', 'v-neck', 'vertical', 'tunic', 'flowy', 'wrap'],
        silhouettes: ['Empire', 'Shift', 'Wrap', 'A-Line']
    },
    'Inverted Triangle': {
        families: ['blue', 'neutral', 'gray', 'white', 'beige', 'navy', 'green'],
        fabrics: ['wool', 'cotton', 'linen', 'structured', 'piña', 'jusi', 'silk', 'organza', 'satin'],
        keywords: ['v-neck', 'halter', 'full skirt', 'a-line', 'wide leg', 'dark top', 'raglan'],
        silhouettes: ['A-Line', 'Ball Gown', 'Empire']
    },
    'Trapezoid': {
        families: ['all', 'blue', 'neutral', 'gray', 'red', 'green', 'vibrant'],
        fabrics: ['wool', 'cotton', 'linen', 'structured', 'piña', 'jusi', 'silk', 'satin', 'twill'],
        keywords: ['tailored', 'slim fit', 'blazer', 'structured', 'classic', 'tapered'],
        silhouettes: ['Sheath', 'A-Line', 'Wrap']
    },
    'Oval': {
        families: ['blue', 'neutral', 'gray', 'red', 'dark', 'monochrome'],
        fabrics: ['wool', 'cotton', 'linen', 'structured', 'silk', 'soft drape'],
        keywords: ['empire', 'shift', 'vertical stripes', 'v-neck', 'unstructured', 'longline'],
        silhouettes: ['Empire', 'Shift', 'Wrap']
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

/**
 * [INFO] Maps face shapes to recommended necklines.
 */
const faceShapeNecklines = {
    'Oval': ['v-neck', 'sweetheart', 'off-the-shoulder', 'scoop', 'halter', 'boat neck', 'square'],
    'Round': ['v-neck', 'sweetheart', 'queen anne', 'empire', 'scoop', 'cowl'],
    'Square': ['v-neck', 'sweetheart', 'scoop', 'cowl', 'halter'],
    'Heart': ['sweetheart', 'off-the-shoulder', 'v-neck', 'empire', 'scoop'],
    'Long': ['boat neck', 'off-the-shoulder', 'high neck', 'square', 'cowl'],
    'Triangle': ['scoop', 'sweetheart', 'halter', 'v-neck', 'off-the-shoulder'],
    'Diamond': ['v-neck', 'sweetheart', 'scoop', 'cowl', 'halter'],
    'Rectangle': ['scoop', 'sweetheart', 'v-neck', 'cowl']
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

    // 5. [LOGIC] Face Shape Neckline Matching (10 points)
    if (preferences.faceShape) {
        score += 5; // Base points
        const recNecklines = faceShapeNecklines[preferences.faceShape];
        if (recNecklines) {
            const searchText = `${gown.name} ${gown.description || ''}`.toLowerCase();
            const matchedNeckline = recNecklines.some(neck => searchText.includes(neck));
            if (matchedNeckline) {
                score += 5; // Neckline match bonus
            }
        }
    }

    // 6. [LOGIC] Silhouette / Keyword Silhouette Matching (Bonus - 20 points)
    if (preferences.bodyType && bodyTypeRecommendations[preferences.bodyType]) {
        const rec = bodyTypeRecommendations[preferences.bodyType];
        
        let silhouetteMatched = false;
        if (gown.silhouette && rec.silhouettes) {
            const normalizedSil = gown.silhouette.trim().toLowerCase();
            silhouetteMatched = rec.silhouettes.map(s => s.toLowerCase()).includes(normalizedSil);
        }
        
        if (silhouetteMatched) {
            score += 20;
        } else {
            const searchText = `${gown.name} ${gown.description || ''}`.toLowerCase();
            const matchedKeywords = rec.keywords.filter(keyword => searchText.includes(keyword.toLowerCase()));
            if (matchedKeywords.length > 0) {
                score += 20;
            }
        }
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
