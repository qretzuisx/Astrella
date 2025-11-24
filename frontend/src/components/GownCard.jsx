import React from 'react'
import { assets } from '../assets/assets'
import { useNavigate } from 'react-router-dom'

const GownCard = ({ gown }) => {
  const currency = import.meta.env.VITE_CURRENCY
  const navigate = useNavigate()

  return (
    <div onClick={()=> {navigate(`/gown-details/${gown._id}`); scrollTo(0,0)}}
      className="group rounded-xl overflow-hidden shadow-lg hover:-translate-y-1
      transition-all duration-500 cursor-pointer flex flex-col h-full"
    >

      <div className="relative overflow-hidden bg-gray-100">
        <img
          src={Array.isArray(gown.image) ? gown.image[0] : gown.image}
          alt={gown.name}
          className="w-full h-auto max-h-96 object-contain transition-transform duration-500 group-hover:scale-105"
        />

        {gown.available && (
          <p className="absolute top-4 left-4 bg-primary/90 text-white text-xs px-2.5 py-1 rounded-full">
            Available Now
          </p>
        )}

        <div className="absolute bottom-4 right-4 bg-black/80 backdrop-blur-sm text-white px-3 py-2 rounded-lg">
          <span className="font-semibold">{currency}{gown.pricePerDay || gown.price || 0}</span>
        </div>
      </div>

      <div className="p-4 sm:p-5 flex flex-col flex-grow">
        <h3 className="text-lg font-medium">{gown.name}</h3>
        <p className="text-gray-400 text-sm mb-4">{gown.owner ? (typeof gown.owner === 'object' ? gown.owner.name : gown.owner) : 'Unknown'}</p>

        <div className="mt-auto grid grid-cols-2 gap-y-2 text-gray-600">
          <div className="flex items-center text-sm">
            <img src={assets.fabric_icon} alt="" className="h-4 mr-2" />
            <span>{gown.fabric}</span>
          </div>
          <div className="flex items-center text-sm">
            <img src={assets.size_icon} alt="" className="h-4 mr-2" />
            <span>{Array.isArray(gown.size) ? gown.size.join(', ') : gown.size || 'N/A'}</span>
          </div>
          <div className="flex items-center text-sm">
            <img src={assets.color_icon} alt="" className="h-4 mr-2" />
            <span>{gown.color}</span>
          </div>
          <div className="flex items-center text-sm">
            <img src={assets.event_icon} alt="" className="h-4 mr-2" />
            <span className="capitalize">{gown.eventtype || gown.eventType || 'N/A'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GownCard
