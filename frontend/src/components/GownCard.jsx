import React from 'react'
import { assets } from '../assets/assets'
import { useNavigate } from 'react-router-dom'

const GownCard = ({ gown, customClassName = "", useContainImage = false }) => {
  const currency = import.meta.env.VITE_CURRENCY
  const navigate = useNavigate()

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'available':
        return 'bg-green-500/90 text-white'
      case 'unavailable':
        return 'bg-orange-500/90 text-white'
      case 'in-laundry':
        return 'bg-[#3B82F6]/90 text-white'
      case 'reserved':
        return 'bg-red-500/90 text-white'
      case 'in-use':
        return 'bg-orange-600/90 text-white'
      default:
        return 'bg-gray-500/90 text-white'
    }
  }

  const renderColorSwatches = (colorValue) => {
    if (!colorValue) return <div className="w-4 h-4 rounded-full border border-gray-100 bg-gray-200" />;
    
    const colorMap = {
      'red': '#EF4444',
      'burgundy': '#800020',
      'maroon': '#800000',
      'crimson': '#DC143C',
      'ruby': '#E0115F',
      'rose': '#FF007F',
      'wine': '#722F37',
      'brick': '#B22222',
      'pink': '#EC4899',
      'blush': '#DE5D83',
      'magenta': '#FF00FF',
      'fuchsia': '#FF00FF',
      'coral': '#FF7F50',
      'peach': '#FFDAB9',
      'salmon': '#FA8072',
      'hotpink': '#FF69B4',
      'orange': '#F97316',
      'rust': '#B7410E',
      'terracotta': '#E2725B',
      'yellow': '#EAB308',
      'gold': '#FFD700',
      'amber': '#FFBF00',
      'mustard': '#FFDB58',
      'canary': '#FFEF00',
      'green': '#22C55E',
      'emerald': '#50C878',
      'mint': '#98FF98',
      'teal': '#008080',
      'olive': '#808000',
      'jade': '#00A86B',
      'sage': '#BCB88A',
      'forest': '#228B22',
      'blue': '#3B82F6',
      'navy': '#000080',
      'sky': '#87CEEB',
      'sapphire': '#0F52BA',
      'azure': '#007FFF',
      'cobalt': '#0047AB',
      'turquoise': '#40E0D0',
      'royal': '#4169E1',
      'cyan': '#00FFFF',
      'purple': '#A855F7',
      'lavender': '#E6E6FA',
      'violet': '#EE82EE',
      'plum': '#8E4585',
      'indigo': '#4B0082',
      'lilac': '#C8A2C8',
      'mauve': '#E0B0FF',
      'brown': '#964B00',
      'chocolate': '#7B3F00',
      'tan': '#D2B48C',
      'khaki': '#C3B091',
      'white': '#FFFFFF',
      'ivory': '#FFFFF0',
      'cream': '#FFFDD0',
      'beige': '#F5F5DC',
      'black': '#000000',
      'gray': '#6B7280',
      'grey': '#6B7280',
      'silver': '#C0C0C0',
      'charcoal': '#36454F',
      'nude': '#E3BC9A',
      'champagne': '#F7E7CE'
    };

    const getHex = (name) => {
      const lower = name.toLowerCase().trim();
      if (colorMap[lower]) return colorMap[lower];
      
      // Fuzzy match - find longest keyword match
      const keys = Object.keys(colorMap).sort((a,b) => b.length - a.length);
      for (const key of keys) {
        if (lower.includes(key)) return colorMap[key];
      }
      return '#CCCCCC'; // Fallback
    };

    let colors = [];
    if (Array.isArray(colorValue)) {
      colors = colorValue;
    } else if (typeof colorValue === 'string') {
      // Split by common separators: comma, slash, ampersand
      colors = colorValue.split(/[,/&]+/).map(c => c.trim()).filter(Boolean);
    } else {
      colors = [colorValue];
    }

    return (
      <div className="flex -space-x-1 overflow-hidden">
        {colors.map((color, idx) => {
          const normalized = color.toLowerCase();
          const hex = getHex(normalized);
          return (
            <div 
              key={idx}
              className={`w-4 h-4 rounded-full border-2 border-white shadow-sm transition-transform hover:scale-110 ${normalized === 'white' || normalized === 'off-white' || normalized === 'ivory' ? 'ring-1 ring-gray-100' : ''}`} 
              style={{ backgroundColor: hex }}
              title={color}
            />
          );
        })}
      </div>
    );
  };

  const statusText = gown.status || 'Available'

  return (
    <div onClick={() => { navigate(`/gown-details/${gown._id || gown.id}`); scrollTo(0, 0) }}
      className={`group overflow-hidden shadow-[0_10px_30px_rgba(1,62,141,0.04)] hover:shadow-[0_20px_50px_rgba(1,62,141,0.1)] hover:-translate-y-1 sm:hover:-translate-y-2 transition-all duration-500 cursor-pointer flex flex-col h-full bg-white border border-primary/5 ${customClassName || "rounded-[24px] sm:rounded-[32px]"}`}
    >

      <div className="relative overflow-hidden bg-white aspect-[3/4] sm:aspect-[2/3] w-full p-1 sm:p-2">
        <img
          src={Array.isArray(gown.image) ? gown.image[0] : gown.image}
          alt={gown.name}
          className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-105"
        />

        {/* Status Badge */}
        <div className={`absolute top-2 sm:top-4 left-2 sm:left-4 px-2 sm:px-4 py-1 sm:py-2 rounded-xl sm:rounded-2xl text-white font-black text-[8px] sm:text-[10px] uppercase tracking-[0.1em] sm:tracking-[0.2em] shadow-md sm:shadow-xl backdrop-blur-md border border-white/20 transition-all duration-700 group-hover:translate-x-1 ${
          gown.status === 'Available' ? 'bg-green-600/90' :
          gown.status === 'Unavailable' ? 'bg-secondary/90' :
          gown.status === 'In-Laundry' ? 'bg-primary/90' :
          gown.status === 'Reserved' ? 'bg-secondary/90' :
          'bg-gray-600/90'
        }`}>
          {gown.status || 'Available'}
        </div>

        <div className="absolute bottom-2 sm:bottom-4 right-2 sm:right-4 bg-primary/95 backdrop-blur-md text-white px-2 sm:px-4 py-1 sm:py-2 rounded-lg sm:rounded-xl shadow-lg transition-all duration-500 sm:group-hover:-translate-y-1">
          <div className="flex items-baseline gap-0.5 sm:gap-1">
            <span className="text-white text-[9px] sm:text-xs font-black">{currency}</span>
            <span className="font-black text-sm sm:text-lg">{(gown.pricePerDay || gown.price || 0).toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="p-3 sm:p-6 flex flex-col flex-grow bg-white">
        <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
          <div className="w-3 sm:w-5 h-0.5 sm:h-1 bg-secondary-light rounded-full opacity-60 group-hover:w-5 sm:group-hover:w-8 group-hover:opacity-100 transition-all duration-500"></div>
          <span className="text-[8px] sm:text-[9px] font-black text-secondary uppercase tracking-widest line-clamp-1">{gown.category || 'Apparel'}</span>
        </div>
        
        <h3 className="text-sm sm:text-xl font-black text-primary mb-1 sm:mb-2 transition-colors duration-500 line-clamp-2 leading-tight">{gown.name}</h3>
        
        <button
          onClick={(e) => {
            e.stopPropagation()
            const ownerId = typeof gown.owner === 'object' ? (gown.owner._id || gown.owner.id) : gown.owner
            navigate(`/owner-profile/${ownerId}`)
          }}
          className="text-gray-400 hover:text-primary text-[10px] sm:text-xs mb-3 sm:mb-5 font-bold text-left transition-colors flex items-center gap-1 sm:gap-2 touch-target w-fit -ml-1 sm:ml-0 px-1 sm:px-0"
        >
          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-gray-200 group-hover:bg-primary/20 transition-colors"></div>
          <span className="line-clamp-1 truncate block">{gown.owner ? (typeof gown.owner === 'object' ? (gown.owner.shopName || gown.owner.name) : 'Owner') : 'Boutique Partner'}</span>
        </button>

        {/* Details Section - Simplified for mobile, Full grid for desktop */}
        <div className="mt-auto pt-3 sm:pt-5 border-t border-gray-100 flex sm:grid sm:grid-cols-2 gap-2 sm:gap-x-4 sm:gap-y-4 justify-between sm:justify-start">
          
          {/* Colors - Always visible */}
          <div className="flex flex-col gap-1 items-start sm:items-start max-w-[45%] sm:max-w-none">
            <span className="text-[8px] sm:text-[9px] font-black text-secondary uppercase tracking-widest opacity-60 hidden sm:block">Colors</span>
            <div className="flex items-center gap-0 sm:gap-2">
              <div className="h-6 sm:h-8 flex pr-1 sm:pr-0 items-center justify-center">
                <div className="scale-75 sm:scale-100 origin-left">
                  {renderColorSwatches(gown.color)}
                </div>
              </div>
              <span className="text-[9px] sm:text-[10px] font-black text-primary/70 tracking-wide truncate group-hover:text-primary transition-colors duration-500 capitalize hidden sm:block">{Array.isArray(gown.color) ? gown.color[0] : (gown.color || 'Color')}</span>
            </div>
          </div>

          {/* Size - Always visible */}
          <div className="flex flex-col gap-1 items-end sm:items-start max-w-[45%] sm:max-w-none">
            <span className="text-[8px] sm:text-[9px] font-black text-secondary uppercase tracking-widest opacity-60 hidden sm:block">Size</span>
            <div className="flex items-center gap-1 sm:gap-2 bg-gray-50 sm:bg-transparent px-2 py-1 rounded-md sm:p-0 sm:rounded-none">
              <span className="text-[9px] sm:text-[10px] font-black text-primary/80 tracking-wide truncate group-hover:text-primary transition-colors duration-500">{Array.isArray(gown.size) ? (gown.size[0] || 'Size') : (gown.size || 'Size')}</span>
            </div>
          </div>

          {/* Fabric - Desktop only */}
          <div className="hidden sm:flex flex-col gap-1">
            <span className="text-[9px] font-black text-secondary uppercase tracking-widest opacity-60">Material</span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-primary/50 tracking-wide truncate group-hover:text-primary transition-colors duration-500">{gown.fabric || 'Fabric'}</span>
            </div>
          </div>

          {/* Best For - Desktop only */}
          <div className="hidden sm:flex flex-col gap-1">
            <span className="text-[9px] font-black text-secondary uppercase tracking-widest opacity-60">Best For</span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-primary/50 tracking-wide truncate group-hover:text-primary transition-colors duration-500 capitalize">
                {Array.isArray(gown.eventType) && gown.eventType.length > 0
                  ? gown.eventType[0]
                  : gown.eventtype || gown.eventType || 'Occasion'}
              </span>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

export default GownCard
