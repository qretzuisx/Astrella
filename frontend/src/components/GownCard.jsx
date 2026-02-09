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
      className="group rounded-xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.15)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.25)] hover:-translate-y-2
      transition-all duration-300 cursor-pointer flex flex-col h-full bg-white border border-gray-200"
    >

      <div className="relative overflow-hidden bg-gray-50">
        <img
          src={Array.isArray(gown.image) ? gown.image[0] : gown.image}
          alt={gown.name}
          className="w-full h-auto max-h-96 object-contain transition-transform duration-500 group-hover:scale-105"
        />

        {/* Status Badge */}
        {gown.status === 'Available' && (
          <div className="absolute top-4 left-4 bg-green-500/90 backdrop-blur-sm text-white px-4 py-2 rounded-full font-bold text-base shadow-lg">
            {gown.status}
          </div>
        )}
        {gown.status === 'Unavailable' && (
          <div className="absolute top-4 left-4 bg-orange-500/90 backdrop-blur-sm text-white px-4 py-2 rounded-full font-bold text-base shadow-lg">
            {gown.status}
          </div>
        )}
        {gown.status === 'In-Laundry' && (
          <div className="absolute top-4 left-4 bg-blue-500/90 backdrop-blur-sm text-white px-4 py-2 rounded-full font-bold text-base shadow-lg">
            {gown.status}
          </div>
        )}
        {gown.status === 'Reserved' && (
          <div className="absolute top-4 left-4 bg-red-500/90 backdrop-blur-sm text-white px-4 py-2 rounded-full font-bold text-base shadow-lg">
            {gown.status}
          </div>
        )}
        {gown.status === 'In-Use' && (
          <div className="absolute top-4 left-4 bg-gray-500/90 backdrop-blur-sm text-white px-4 py-2 rounded-full font-bold text-base shadow-lg">
            {gown.status}
          </div>
        )}

        <div className="absolute bottom-4 right-4 bg-white/90 text-gray-800 px-4 py-2 rounded-full border border-gray-200 shadow-md">
          <span className="font-bold">{currency}{gown.pricePerDay || gown.price || 0}</span>
        </div>
      </div>

      <div className="p-4 sm:p-5 flex flex-col flex-grow bg-white">
        <h3 className="text-lg font-bold text-gray-900">{gown.name}</h3>
        <button
          onClick={(e) => {
            e.stopPropagation()
            const ownerId = typeof gown.owner === 'object' ? (gown.owner._id || gown.owner.id) : gown.owner
            navigate(`/owner-profile/${ownerId}`)
          }}
          className="text-gray-700 hover:text-primary text-sm mb-2 font-medium text-left hover:underline transition-colors"
        >
          {gown.owner ? (typeof gown.owner === 'object' ? (gown.owner.shopName || gown.owner.name) : gown.owner) : 'Unknown'}
        </button>

        {/* Location Info */}
        {gown.location && (
          <div className="flex items-start gap-1 mb-4">
            <img src={assets.location_icon_colored} alt="location" className="h-4 w-4 mt-0.5 flex-shrink-0 opacity-70" />
            <span className="text-xs text-gray-600 line-clamp-1">{gown.location}</span>
          </div>
        )}

        <div className="mt-auto grid grid-cols-2 gap-y-2 text-gray-800">
          <div className="flex items-center text-sm font-semibold">
            <img src={assets.fabric_icon} alt="" className="h-4 mr-2 opacity-80" />
            <span>{gown.fabric}</span>
          </div>
          <div className="flex items-center text-sm font-semibold">
            <img src={assets.size_icon} alt="" className="h-4 mr-2 opacity-80" />
            <span>{Array.isArray(gown.size) ? gown.size.join(', ') : gown.size || 'N/A'}</span>
          </div>
          <div className="flex items-center text-sm font-semibold">
            <img src={assets.color_icon} alt="" className="h-4 mr-2 opacity-80" />
            <span>{gown.color}</span>
          </div>
          <div className="flex items-center text-sm font-semibold">
            <img src={assets.event_icon} alt="" className="h-4 mr-2 opacity-80" />
            <span className="capitalize">
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
