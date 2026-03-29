/**
 * [SECTION] COLOR UTILITIES
 * [INFO] Handles dynamic mapping of color names to properties and similarity detection.
 * [FLOW] Used by the AI Stylist to match apparel colors with user skin tones.
 */

const COLOR_MAP = {
    // [LOGIC] REDS
    'red': { family: 'red', warmth: 'Warm', hex: '#EF4444' },
    'burgundy': { family: 'red', warmth: 'Warm', hex: '#800020' },
    'maroon': { family: 'red', warmth: 'Warm', hex: '#800000' },
    'crimson': { family: 'red', warmth: 'Warm', hex: '#DC143C' },
    'ruby': { family: 'red', warmth: 'Warm', hex: '#E0115F' },
    'rose': { family: 'red', warmth: 'Warm', hex: '#FF007F' },
    'wine': { family: 'red', warmth: 'Warm', hex: '#722F37' },
    'brick': { family: 'red', warmth: 'Warm', hex: '#B22222' },
    
    // [LOGIC] PINKS
    'pink': { family: 'pink', warmth: 'Cool', hex: '#EC4899' },
    'blush': { family: 'pink', warmth: 'Warm', hex: '#DE5D83' },
    'magenta': { family: 'pink', warmth: 'Cool', hex: '#FF00FF' },
    'fuchsia': { family: 'pink', warmth: 'Cool', hex: '#FF00FF' },
    'coral': { family: 'pink', warmth: 'Warm', hex: '#FF7F50' },
    'peach': { family: 'pink', warmth: 'Warm', hex: '#FFDAB9' },
    'salmon': { family: 'pink', warmth: 'Warm', hex: '#FA8072' },
    'hotpink': { family: 'pink', warmth: 'Cool', hex: '#FF69B4' },
    
    // [LOGIC] ORANGES/YELLOWS
    'orange': { family: 'orange', warmth: 'Warm', hex: '#F97316' },
    'rust': { family: 'orange', warmth: 'Warm', hex: '#B7410E' },
    'terracotta': { family: 'orange', warmth: 'Warm', hex: '#E2725B' },
    'yellow': { family: 'yellow', warmth: 'Warm', hex: '#EAB308' },
    'gold': { family: 'yellow', warmth: 'Warm', hex: '#FFD700' },
    'amber': { family: 'yellow', warmth: 'Warm', hex: '#FFBF00' },
    'mustard': { family: 'yellow', warmth: 'Warm', hex: '#FFDB58' },
    'canary': { family: 'yellow', warmth: 'Warm', hex: '#FFEF00' },
    
    // [LOGIC] GREENS
    'green': { family: 'green', warmth: 'Cool', hex: '#22C55E' },
    'emerald': { family: 'green', warmth: 'Cool', hex: '#50C878' },
    'mint': { family: 'green', warmth: 'Cool', hex: '#98FF98' },
    'teal': { family: 'green', warmth: 'Cool', hex: '#008080' },
    'olive': { family: 'green', warmth: 'Warm', hex: '#808000' },
    'jade': { family: 'green', warmth: 'Cool', hex: '#00A86B' },
    'sage': { family: 'green', warmth: 'Warm', hex: '#BCB88A' },
    'forest': { family: 'green', warmth: 'Cool', hex: '#228B22' },
    
    // [LOGIC] BLUES
    'blue': { family: 'blue', warmth: 'Cool', hex: '#3B82F6' },
    'navy': { family: 'blue', warmth: 'Cool', hex: '#000080' },
    'sky': { family: 'blue', warmth: 'Cool', hex: '#87CEEB' },
    'sapphire': { family: 'blue', warmth: 'Cool', hex: '#0F52BA' },
    'azure': { family: 'blue', warmth: 'Cool', hex: '#007FFF' },
    'cobalt': { family: 'blue', warmth: 'Cool', hex: '#0047AB' },
    'turquoise': { family: 'blue', warmth: 'Cool', hex: '#40E0D0' },
    'royal': { family: 'blue', warmth: 'Cool', hex: '#4169E1' },
    'cyan': { family: 'blue', warmth: 'Cool', hex: '#00FFFF' },
    
    // [LOGIC] PURPLES
    'purple': { family: 'purple', warmth: 'Cool', hex: '#A855F7' },
    'lavender': { family: 'purple', warmth: 'Cool', hex: '#E6E6FA' },
    'violet': { family: 'purple', warmth: 'Cool', hex: '#EE82EE' },
    'plum': { family: 'purple', warmth: 'Cool', hex: '#8E4585' },
    'indigo': { family: 'purple', warmth: 'Cool', hex: '#4B0082' },
    'lilac': { family: 'purple', warmth: 'Cool', hex: '#C8A2C8' },
    'mauve': { family: 'purple', warmth: 'Cool', hex: '#E0B0FF' },
    
    // [LOGIC] BROWNS
    'brown': { family: 'brown', warmth: 'Warm', hex: '#964B00' },
    'chocolate': { family: 'brown', warmth: 'Warm', hex: '#7B3F00' },
    'tan': { family: 'brown', warmth: 'Warm', hex: '#D2B48C' },
    'khaki': { family: 'brown', warmth: 'Warm', hex: '#C3B091' },
    
    // [LOGIC] NEUTRALS
    'white': { family: 'neutral', warmth: 'Neutral', hex: '#FFFFFF' },
    'ivory': { family: 'neutral', warmth: 'Warm', hex: '#FFFFF0' },
    'cream': { family: 'neutral', warmth: 'Warm', hex: '#FFFDD0' },
    'beige': { family: 'neutral', warmth: 'Warm', hex: '#F5F5DC' },
    'black': { family: 'neutral', warmth: 'Neutral', hex: '#000000' },
    'gray': { family: 'neutral', warmth: 'Neutral', hex: '#6B7280' },
    'grey': { family: 'neutral', warmth: 'Neutral', hex: '#6B7280' },
    'silver': { family: 'neutral', warmth: 'Cool', hex: '#C0C0C0' },
    'charcoal': { family: 'neutral', warmth: 'Neutral', hex: '#36454F' },
    'nude': { family: 'neutral', warmth: 'Warm', hex: '#E3BC9A' },
    'champagne': { family: 'neutral', warmth: 'Warm', hex: '#F7E7CE' }
};

/** 
 * [INFO] Extracts family and warmth properties from any color name string.
 * [LOGIC] 
 * 1. Sanitizes input string (lowercased, trimmed).
 * 2. Checks for exact matches in COLOR_MAP.
 * 3. Fallbacks to keyword matching for compound names (e.g., 'Dark Emerald Green').
 */
export const getColorProperties = (colorName) => {
    if (!colorName) return { family: 'unknown', warmth: 'Neutral', hex: '#CCCCCC' };
    
    const lower = colorName.toLowerCase().trim();
    
    // Check for exact matches first
    if (COLOR_MAP[lower]) return COLOR_MAP[lower];
    
    // [LOGIC] Partial matching for compound names
    const knownColors = Object.keys(COLOR_MAP).sort((a, b) => b.length - a.length);
    
    for (const known of knownColors) {
        if (lower.includes(known)) {
            return { ...COLOR_MAP[known] };
        }
    }
    
    return { family: 'unknown', warmth: 'Neutral', hex: '#CCCCCC' };
};

/** 
 * [INFO] Determines if two colors are functionally similar.
 * [LOGIC] Returns TRUE if both colors belong to the same family (e.g., 'Navy' and 'Sky Blue' both match 'Blue').
 */
export const areColorsSimilar = (colorA, colorB) => {
    if (!colorA || !colorB) return false;
    
    const propsA = getColorProperties(colorA);
    const propsB = getColorProperties(colorB);
    
    // [LOGIC] Same family is a strong match
    if (propsA.family !== 'unknown' && propsA.family === propsB.family) return true;
    
    // [LOGIC] Check for manual keyword overlap in complex strings
    const wordsA = colorA.toLowerCase().split(/[\s-]+/);
    const wordsB = colorB.toLowerCase().split(/[\s-]+/);
    const commonWords = wordsA.filter(w => wordsB.includes(w));
    const isCommon = commonWords.some(w => COLOR_MAP[w]);
    
    if (isCommon) return true;
    
    return false;
};

export default {
    getColorProperties,
    areColorsSimilar
};
