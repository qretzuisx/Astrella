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
      const keys = Object.keys(colorMap).sort((a, b) => b.length - a.length);
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
      className={`group overflow-hidden shadow-[0_20px_60px_rgba(1,62,141,0.08)] hover:shadow-[0_40px_100px_rgba(1,62,141,0.18)] hover:-translate-y-2 transition-all duration-700 cursor-pointer flex flex-col h-full bg-white/40 backdrop-blur-xl border border-white/40 ${customClassName || "rounded-[24px] sm:rounded-[36px]"}`}
    >

      <div className="relative overflow-hidden bg-white/10 aspect-square sm:aspect-[4/5] w-full p-2">
        <img
          src={Array.isArray(gown.image) ? gown.image[0] : gown.image}
          alt={gown.name}
          loading="lazy"
          className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-105"
        />

        {/* Status Pill Overlay */}
        <div className={`absolute top-3 sm:top-4 left-3 sm:left-4 px-3 sm:px-2.5 py-1.5 sm:py-2.5 rounded-xl sm:rounded-[20px] font-black text-[9px] sm:text-[10px] uppercase tracking-[0.2em] shadow-xl backdrop-blur-md border border-white/20 transition-all duration-500 group-hover:translate-x-1 z-10 ${getStatusColor(statusText)}`}>
          {statusText}
        </div>



        <div className="absolute bottom-3 sm:bottom-4 right-3 sm:right-4 bg-white/60 backdrop-blur-xl text-primary px-3 sm:px-4 py-1.5 sm:py-2.5 rounded-xl sm:rounded-[20px] shadow-[0_10px_30px_rgba(0,0,0,0.05)] border border-white/40 transition-all duration-500 sm:group-hover:-translate-y-2 flex items-center gap-2">
          <div className="flex items-baseline gap-1">
            <span className="text-secondary text-[9px] sm:text-[10px] font-black">{currency}</span>
            <span className="font-black text-sm sm:text-lg text-primary">{(gown.pricePerDay || gown.price || 0).toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="p-2 sm:p-4 flex flex-col flex-grow bg-white/30 backdrop-blur-md">
        <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
          <div className="w-3 sm:w-5 h-0.5 sm:h-1 bg-secondary-light rounded-full opacity-60 group-hover:w-5 sm:group-hover:w-8 group-hover:opacity-100 transition-all duration-500"></div>
          <span className="text-[9px] font-black text-secondary uppercase tracking-widest line-clamp-1">{gown.category || 'Apparel'}</span>
        </div>

        <h3 className="text-[12px] sm:text-base font-black text-primary mb-0.5 transition-colors duration-500 line-clamp-2 leading-tight">{gown.name}</h3>

        <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
          <button
            onClick={(e) => {
              e.stopPropagation()
              const ownerId = typeof gown.owner === 'object' ? (gown.owner._id || gown.owner.id) : gown.owner
              navigate(`/owner-profile/${ownerId}`)
            }}
            className="text-gray-400 hover:text-primary text-[9px] sm:text-[10px] font-bold text-left transition-colors flex items-center gap-1 sm:gap-2 touch-target w-fit -ml-0.5 sm:ml-0 px-1 sm:px-0"
          >
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-gray-200 group-hover:bg-primary/20 transition-colors"></div>
            <span className="line-clamp-1 truncate block">{gown.owner ? (typeof gown.owner === 'object' ? (gown.owner.shopName || gown.owner.name) : 'Owner') : 'Partner'}</span>
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation()
              const ownerId = typeof gown.owner === 'object' ? (gown.owner._id || gown.owner.id) : gown.owner
              if (ownerId) navigate(`/owner-profile/${ownerId}`)
            }}
            className="text-secondary hover:text-primary text-[8px] sm:text-[9px] font-black uppercase tracking-widest transition-colors whitespace-nowrap"
          >
            View Profile
          </button>
        </div>

        {/* Details Section - Consistent 4-detail grid for all devices */}
        <div className="mt-auto pt-2 sm:pt-3 border-t border-gray-100/50 grid grid-cols-2 gap-x-2 sm:gap-x-3 gap-y-1.5 sm:gap-y-2">

          {/* Colors */}
          <div className="flex flex-col gap-0.5">
            <span className="text-[8px] sm:text-[9px] font-black text-secondary uppercase tracking-widest opacity-80">Colors</span>
            <div className="flex items-center gap-0 sm:gap-2">
              <div className="h-6 sm:h-8 flex pr-1 sm:pr-0 items-center justify-center">
                <div className="scale-75 sm:scale-100 origin-left">
                  {renderColorSwatches(gown.color)}
                </div>
              </div>
              <span className="text-[9px] sm:text-[10px] font-black text-primary/80 tracking-wide truncate group-hover:text-primary transition-colors duration-500 capitalize">{Array.isArray(gown.color) ? gown.color[0] : (gown.color || 'Color')}</span>
            </div>
          </div>

          {/* Size */}
          <div className="flex flex-col gap-0.5">
            <span className="text-[8px] sm:text-[9px] font-black text-secondary uppercase tracking-widest opacity-80">Size</span>
            <div className="flex items-center gap-1 sm:gap-2">
              <span className="text-[9px] sm:text-[10px] font-black text-primary/80 tracking-wide truncate group-hover:text-primary transition-colors duration-500">{Array.isArray(gown.size) ? (gown.size[0] || 'Size') : (gown.size || 'Size')}</span>
            </div>
          </div>

          {/* Material */}
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] font-black text-secondary uppercase tracking-widest opacity-80">Material</span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-primary/70 tracking-wide truncate group-hover:text-primary transition-colors duration-500">{gown.fabric || 'Fabric'}</span>
            </div>
          </div>

          {/* Best For */}
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] font-black text-secondary uppercase tracking-widest opacity-80">Best For</span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-primary/70 tracking-wide truncate group-hover:text-primary transition-colors duration-500 capitalize">
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
