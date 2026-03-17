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
      'off-white': '#FAF9F6',
      'ivory': '#FFFFF0',
      'champagne': '#F7E7CE',
      'cream': '#FFFDD0',
      'nude': '#E3BC9A',
      'peach': '#FFDAB9',
      'blush': '#FE828C',
      'sky blue': '#87CEEB',
      'royal blue': '#4169E1',
      'wine red': '#722F37',
      'maroon': '#800000',
      'gold': '#FFD700',
      'silver': '#C0C0C0',
      'white': '#FFFFFF',
      'black': '#000000',
      'navy': '#000080',
      'emerald': '#50C878',
      'sage': '#BCB88A',
      'sage green': '#BCB88A',
      'dusty rose': '#DCAE96',
      'rose gold': '#B76E79',
      'burgundy': '#800020',
      'mocha': '#967969',
      'lavender': '#E6E6FA',
      'lilac': '#C8A2C8',
      'mint': '#98FF98',
      'teal': '#008080',
      'rust': '#B7410E',
      'terracotta': '#E2725B',
      'mustard': '#FFDB58',
      'olive': '#808000'
    };

    let colors = [];
    if (Array.isArray(colorValue)) {
      colors = colorValue;
    } else if (typeof colorValue === 'string') {
      colors = colorValue.split(',').map(c => c.trim());
    } else {
      colors = [colorValue];
    }

    return (
      <div className="flex -space-x-1 overflow-hidden">
        {colors.map((color, idx) => {
          const normalized = color.toLowerCase();
          const hex = colorMap[normalized] || normalized;
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
      className={`group overflow-hidden shadow-[0_20px_60px_rgba(1,62,141,0.06)] hover:shadow-[0_40px_100px_rgba(1,62,141,0.15)] hover:-translate-y-2 transition-all duration-700 cursor-pointer flex flex-col h-full bg-white border border-primary/5 ${customClassName || "rounded-[40px]"}`}
    >

      <div className={`relative overflow-hidden bg-white ${useContainImage ? 'aspect-[4/5] bg-gray-50/30' : ''}`}>
        <img
          src={Array.isArray(gown.image) ? gown.image[0] : gown.image}
          alt={gown.name}
          className={`w-full h-full transition-transform duration-1000 group-hover:scale-105 ${useContainImage ? 'object-contain p-4' : 'h-auto max-h-48 sm:max-h-64 md:max-h-80 lg:max-h-96 object-cover group-hover:scale-110'}`}
        />

        {/* Status Badge */}
        <div className={`absolute top-6 left-6 px-6 py-3 rounded-2xl text-white font-black text-[11px] uppercase tracking-[0.2em] shadow-xl backdrop-blur-md border border-white/20 transition-all duration-700 group-hover:translate-x-1 ${
          gown.status === 'Available' ? 'bg-green-500/90' :
          gown.status === 'Unavailable' ? 'bg-orange-500/90' :
          gown.status === 'In-Laundry' ? 'bg-[#3B82F6]/90' :
          gown.status === 'Reserved' ? 'bg-red-500/90' :
          'bg-gray-500/90'
        }`}>
          {gown.status || 'Available'}
        </div>

        <div className="absolute bottom-4 right-4 bg-primary text-white px-5 py-2.5 rounded-2xl shadow-xl transition-all duration-500 group-hover:-translate-y-1">
          <div className="flex items-baseline gap-1.5">
            <span className="text-white text-xl font-black">{currency}</span>
            <span className="font-black text-xl">{(gown.pricePerDay || gown.price || 0).toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="p-8 flex flex-col flex-grow bg-white">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-5 h-1 bg-[#FFD700] rounded-full opacity-60 group-hover:w-8 group-hover:opacity-100 transition-all duration-700"></div>
          <span className="text-[10px] font-black text-[#FF3B30] uppercase tracking-widest">{gown.category || 'Apparel'}</span>
        </div>
        
        <h3 className="text-2xl font-black text-primary mb-2 transition-colors duration-700">{gown.name}</h3>
        
        <button
          onClick={(e) => {
            e.stopPropagation()
            const ownerId = typeof gown.owner === 'object' ? (gown.owner._id || gown.owner.id) : gown.owner
            navigate(`/owner-profile/${ownerId}`)
          }}
          className="text-gray-400 hover:text-primary text-xs mb-6 font-bold text-left transition-colors flex items-center gap-2"
        >
          <div className="w-2 h-2 rounded-full bg-gray-200 group-hover:bg-primary/20 transition-colors"></div>
          {gown.owner ? (typeof gown.owner === 'object' ? (gown.owner.shopName || gown.owner.name) : gown.owner) : 'Boutique Partner'}
        </button>

        {/* Details Section - 4-item Grid with Red Labels */}
        <div className="mt-auto pt-6 border-t border-gray-100 grid grid-cols-2 gap-x-4 gap-y-4">
          {/* Material */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-black text-[#FF3B30] uppercase tracking-widest opacity-60">Material</span>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white shadow-[0_4px_12px_rgba(0,0,0,0.05)] border border-blue-50/50 flex items-center justify-center group-hover:shadow-[0_8px_20px_rgba(1,62,141,0.1)] group-hover:border-primary/10 transition-all duration-500">
                <img src={assets.fabric_icon} alt="" className="h-4 w-4 opacity-40 group-hover:opacity-100 transition-all duration-500" />
              </div>
              <span className="text-[10px] font-black text-primary/50 tracking-wide truncate group-hover:text-primary transition-colors duration-500">{gown.fabric || 'Fabric'}</span>
            </div>
          </div>

          {/* Size */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-black text-[#FF3B30] uppercase tracking-widest opacity-60">Size</span>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white shadow-[0_4px_12px_rgba(0,0,0,0.05)] border border-blue-50/50 flex items-center justify-center group-hover:shadow-[0_8px_20px_rgba(1,62,141,0.1)] group-hover:border-primary/10 transition-all duration-500">
                <img src={assets.size_icon} alt="" className="h-4 w-4 opacity-40 group-hover:opacity-100 transition-all duration-500" />
              </div>
              <span className="text-[10px] font-black text-primary/50 tracking-wide truncate group-hover:text-primary transition-colors duration-500">{Array.isArray(gown.size) ? (gown.size[0] || 'Size') : (gown.size || 'Size')}</span>
            </div>
          </div>

          {/* Colors */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-black text-[#FF3B30] uppercase tracking-widest opacity-60">Colors</span>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white shadow-[0_4px_12px_rgba(0,0,0,0.05)] border border-blue-50/50 flex items-center justify-center group-hover:shadow-[0_8px_20px_rgba(1,62,141,0.1)] group-hover:border-primary/10 transition-all duration-500">
                {renderColorSwatches(gown.color)}
              </div>
              <span className="text-[10px] font-black text-primary/50 tracking-wide truncate group-hover:text-primary transition-colors duration-500 capitalize">{Array.isArray(gown.color) ? gown.color[0] : (gown.color || 'Color')}</span>
            </div>
          </div>

          {/* Best For */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-black text-[#FF3B30] uppercase tracking-widest opacity-60">Best For</span>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white shadow-[0_4px_12px_rgba(0,0,0,0.05)] border border-blue-50/50 flex items-center justify-center group-hover:shadow-[0_8px_20px_rgba(1,62,141,0.1)] group-hover:border-primary/10 transition-all duration-500">
                <img src={assets.event_icon || assets.star_blue} alt="" className="h-4 w-4 opacity-40 group-hover:opacity-100 transition-all duration-500" />
              </div>
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
