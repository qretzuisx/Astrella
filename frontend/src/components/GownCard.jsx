import React from 'react'
import { assets } from '../assets/assets'
import { useNavigate } from 'react-router-dom'

const GownCard = ({ gown }) => {
  const currency = import.meta.env.VITE_CURRENCY
  const navigate = useNavigate()

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'available':
        return 'bg-green-100 text-green-800'
      case 'unavailable':
        return 'bg-red-100 text-red-800'
      case 'in-laundry':
        return 'bg-yellow-100 text-yellow-800'
      case 'reserved':
        return 'bg-blue-100 text-blue-800'
      case 'in-use':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const statusText = gown.status || 'Available'

  return (
    <div onClick={()=> {navigate(`/gown-details/${gown._id || gown.id}`); scrollTo(0,0)}}
      className="group rounded-lg sm:rounded-xl overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.1)] sm:shadow-[0_4px_20px_rgba(0,0,0,0.15)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.25)] hover:-translate-y-1 sm:hover:-translate-y-2
      transition-all duration-300 cursor-pointer flex flex-col h-full bg-white border border-gray-200"
    >

      <div className="relative overflow-hidden bg-gray-50">
        <img
          src={Array.isArray(gown.image) ? gown.image[0] : gown.image}
          alt={gown.name}
          className="w-full h-auto max-h-48 sm:max-h-64 md:max-h-80 lg:max-h-96 object-contain transition-transform duration-500 group-hover:scale-105"
        />

        {/* Status Badge */}
        {gown.status === 'Available' && (
          <div className="absolute top-2 left-2 sm:top-3 sm:left-3 bg-green-500/90 backdrop-blur-sm text-white px-2 py-1 sm:px-3 sm:py-1.5 rounded-full font-bold text-xs sm:text-sm shadow-lg">
            {gown.status}
          </div>
        )}
        {gown.status === 'Unavailable' && (
          <div className="absolute top-2 left-2 sm:top-3 sm:left-3 bg-orange-500/90 backdrop-blur-sm text-white px-2 py-1 sm:px-3 sm:py-1.5 rounded-full font-bold text-xs sm:text-sm shadow-lg">
            {gown.status}
          </div>
        )}
        {gown.status === 'In-Laundry' && (
          <div className="absolute top-2 left-2 sm:top-3 sm:left-3 bg-blue-500/90 backdrop-blur-sm text-white px-2 py-1 sm:px-3 sm:py-1.5 rounded-full font-bold text-xs sm:text-sm shadow-lg">
            {gown.status}
          </div>
        )}
        {gown.status === 'Reserved' && (
          <div className="absolute top-2 left-2 sm:top-3 sm:left-3 bg-red-500/90 backdrop-blur-sm text-white px-2 py-1 sm:px-3 sm:py-1.5 rounded-full font-bold text-xs sm:text-sm shadow-lg">
            {gown.status}
          </div>
        )}
        {gown.status === 'In-Use' && (
          <div className="absolute top-2 left-2 sm:top-3 sm:left-3 bg-gray-500/90 backdrop-blur-sm text-white px-2 py-1 sm:px-3 sm:py-1.5 rounded-full font-bold text-xs sm:text-sm shadow-lg">
            {gown.status}
          </div>
        )}

        <div className="absolute bottom-2 right-2 sm:bottom-3 sm:right-3 bg-white/95 backdrop-blur-sm text-primary px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-full border-2 border-primary/30 shadow-lg">
          <span className="font-extrabold text-sm sm:text-base">{currency}{gown.pricePerDay || gown.price || 0}</span>
          <span className="text-xs text-primary/70 ml-0.5 sm:ml-1">/day</span>
        </div>
      </div>

      <div className="p-3 sm:p-4 md:p-5 flex flex-col flex-grow bg-white">
        <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 mb-1 line-clamp-1">{gown.name}</h3>
        <button
          onClick={(e) => {
            e.stopPropagation()
            const ownerId = typeof gown.owner === 'object' ? (gown.owner._id || gown.owner.id) : gown.owner
            navigate(`/owner-profile/${ownerId}`)
          }}
          className="text-gray-600 hover:text-primary text-xs sm:text-sm mb-2 sm:mb-3 font-medium text-left hover:underline transition-colors line-clamp-1"
        >
          {gown.owner ? (typeof gown.owner === 'object' ? (gown.owner.shopName || gown.owner.name) : gown.owner) : 'Unknown'}
        </button>

        {/* Details - Clean list without grid lines */}
        <div className="mt-auto space-y-1.5 sm:space-y-2">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <img src={assets.fabric_icon} alt="" className="h-3.5 w-3.5 sm:h-4 sm:w-4 opacity-70 flex-shrink-0" />
            <span className="text-xs sm:text-sm font-semibold text-gray-800 line-clamp-1">{gown.fabric}</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <img src={assets.size_icon} alt="" className="h-3.5 w-3.5 sm:h-4 sm:w-4 opacity-70 flex-shrink-0" />
            <span className="text-xs sm:text-sm font-semibold text-gray-800 line-clamp-1">{Array.isArray(gown.size) ? gown.size.join(', ') : gown.size || 'N/A'}</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <img src={assets.color_icon} alt="" className="h-3.5 w-3.5 sm:h-4 sm:w-4 opacity-70 flex-shrink-0" />
            <span className="text-xs sm:text-sm font-semibold text-gray-800 line-clamp-1">{gown.color}</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <img src={assets.event_icon} alt="" className="h-3.5 w-3.5 sm:h-4 sm:w-4 opacity-70 flex-shrink-0" />
            <span className="text-xs sm:text-sm font-semibold text-gray-800 capitalize line-clamp-1">
              {Array.isArray(gown.eventType) && gown.eventType.length > 0
                ? gown.eventType.join(', ')
                : gown.eventtype || gown.eventType || 'N/A'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GownCard
