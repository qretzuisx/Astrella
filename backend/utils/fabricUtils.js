/**
 * [SECTION] FABRIC UTILITIES
 * [INFO] Handles dynamic mapping of fabric names to properties and similarity detection.
 * [FLOW] Used by the AI Stylist to recommend apparel based on weight and drape.
 */

const FABRIC_GROUPS = {
    light: ['chiffon', 'tulle', 'organza', 'lace', 'net', 'voile', 'georgette'],
    heavy: ['satin', 'silk', 'velvet', 'brocade', 'taffeta', 'mikado', 'duchess', 'shantung', 'gabardine'],
    stretchy: ['jersey', 'spandex', 'lycra', 'knit', 'mesh'],
    structured: ['taffeta', 'mikado', 'duchess', 'neoprene', 'scuba', 'linen', 'cotton']
};

/** 
 * [INFO] Categorizes a fabric name string into weight and structure properties.
 * [LOGIC] 
 * 1. Matches keywords (e.g., 'tulle') against predefined density groups.
 * 2. Returns boolean flags to simplify scoring logic in `recommendationUtils.js`.
 */
export const getFabricProperties = (fabricName) => {
    if (!fabricName) return { category: 'unknown', weight: 'Medium' };
    
    const lower = fabricName.toLowerCase().trim();
    
    // [LOGIC] Determine category based on keyword density
    let category = 'unknown';
    if (FABRIC_GROUPS.light.some(f => lower.includes(f))) category = 'Light';
    else if (FABRIC_GROUPS.heavy.some(f => lower.includes(f))) category = 'Heavy';
    else if (FABRIC_GROUPS.stretchy.some(f => lower.includes(f))) category = 'Stretchy';
    else if (FABRIC_GROUPS.structured.some(f => lower.includes(f))) category = 'Structured';
    
    return {
        category,
        isLight: category === 'Light',
        isHeavy: category === 'Heavy',
        isStructured: category === 'Structured' || category === 'Heavy'
    };
};

/** 
 * [INFO] Determines if two fabrics share similar functional properties.
 * [LOGIC] Checks if both fabric names fall into the same group (e.g., silk and satin).
 */
export const areFabricsSimilar = (fabricA, fabricB) => {
    if (!fabricA || !fabricB) return false;
    
    const lowerA = fabricA.toLowerCase();
    const lowerB = fabricB.toLowerCase();
    
    // Check if they are in the same functional group
    for (const [groupName, fabrics] of Object.entries(FABRIC_GROUPS)) {
        const aInGroup = fabrics.some(f => lowerA.includes(f));
        const bInGroup = fabrics.some(f => lowerB.includes(f));
        
        if (aInGroup && bInGroup) return true;
    }
    
    return false;
};

export default {
    getFabricProperties,
    areFabricsSimilar
};
