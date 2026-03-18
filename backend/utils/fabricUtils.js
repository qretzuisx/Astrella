/**
 * Fabric Utilities for Astrella
 * Handles dynamic mapping of fabric names to properties and similarity detection
 */

const FABRIC_GROUPS = {
    light: ['chiffon', 'tulle', 'organza', 'lace', 'net', 'voile', 'georgette'],
    heavy: ['satin', 'silk', 'velvet', 'brocade', 'taffeta', 'mikado', 'duchess', 'shantung', 'gabardine'],
    stretchy: ['jersey', 'spandex', 'lycra', 'knit', 'mesh'],
    structured: ['taffeta', 'mikado', 'duchess', 'neoprene', 'scuba', 'linen', 'cotton']
};

/**
 * Categorizes a fabric name string
 */
export const getFabricProperties = (fabricName) => {
    if (!fabricName) return { category: 'unknown', weight: 'Medium' };
    
    const lower = fabricName.toLowerCase().trim();
    
    // Determine category based on keywords
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
 * Determines if two fabrics are similar
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
