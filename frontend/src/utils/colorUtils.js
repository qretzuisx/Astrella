export const colorMap = {
  'red': '#EF4444', 'burgundy': '#800020', 'maroon': '#800000', 'crimson': '#DC143C', 'ruby': '#E0115F', 'rose': '#FF007F', 'wine': '#722F37', 'brick': '#B22222',
  'pink': '#EC4899', 'blush': '#DE5D83', 'magenta': '#FF00FF', 'fuchsia': '#FF00FF', 'coral': '#FF7F50', 'peach': '#FFDAB9', 'salmon': '#FA8072', 'hotpink': '#FF69B4',
  'orange': '#F97316', 'rust': '#B7410E', 'terracotta': '#E2725B', 'yellow': '#EAB308', 'gold': '#FFD700', 'amber': '#FFBF00', 'mustard': '#FFDB58', 'canary': '#FFEF00',
  'green': '#22C55E', 'emerald': '#50C878', 'mint': '#98FF98', 'teal': '#008080', 'olive': '#808000', 'jade': '#00A86B', 'sage': '#BCB88A', 'forest': '#228B22',
  'blue': '#3B82F6', 'navy': '#000080', 'sky': '#87CEEB', 'sapphire': '#0F52BA', 'azure': '#007FFF', 'cobalt': '#0047AB', 'turquoise': '#40E0D0', 'royal': '#4169E1', 'cyan': '#00FFFF',
  'purple': '#A855F7', 'lavender': '#E6E6FA', 'violet': '#EE82EE', 'plum': '#8E4585', 'indigo': '#4B0082', 'lilac': '#C8A2C8', 'mauve': '#E0B0FF',
  'brown': '#964B00', 'chocolate': '#7B3F00', 'tan': '#D2B48C', 'khaki': '#C3B091',
  'white': '#FFFFFF', 'ivory': '#FFFFF0', 'cream': '#FFFDD0', 'beige': '#F5F5DC', 'black': '#000000', 'gray': '#6B7280', 'grey': '#6B7280', 'silver': '#C0C0C0', 'charcoal': '#36454F', 'nude': '#E3BC9A', 'champagne': '#F7E7CE'
};

export const getColorHex = (colorName) => {
  if (!colorName) return '#CCCCCC';
  const lower = colorName.toLowerCase().trim();
  if (colorMap[lower]) return colorMap[lower];
  
  const keys = Object.keys(colorMap).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (lower.includes(key)) return colorMap[key];
  }
  return '#CCCCCC';
};

export const parseColors = (colorValue) => {
  if (Array.isArray(colorValue)) return colorValue;
  if (typeof colorValue === 'string') {
    return colorValue.split(/[,/&]+/).map(c => c.trim()).filter(Boolean);
  }
  return [colorValue || '#eee'];
};
