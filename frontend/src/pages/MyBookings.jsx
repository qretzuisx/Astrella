import React, { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { assets } from '../assets/assets'

const MyBookings = () => {
  const location = useLocation()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const currency = import.meta.env.VITE_CURRENCY || '₱'

  useEffect(() => {
    // Fetch bookings from API
    const fetchBookings = async () => {
      try {
        const token = localStorage.getItem('token')
        if (token) {
          const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
          const response = await fetch(`${API_URL}/bookings/user`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          })
          const data = await response.json()
          if (data.success) {
            // merge any new booking passed via navigation state
            const initial = data.bookings || []
            if (location?.state?.newBooking) {
              const nb = location.state.newBooking
              const exists = initial.some(b => (b._id || b.id) == (nb._id || nb.id))
              if (!exists) initial.unshift(nb)
              // Clear navigation state so it doesn't reapply on future visits
              try { window.history.replaceState({}, document.title) } catch(e){}
            }
            setBookings(initial)
          } else {
            // API returned no bookings
            setBookings([])
          }
        } else {
          // Not logged in - show empty list
          setBookings([])
        }
      } catch (error) {
        console.error('Error fetching bookings:', error)
        setBookings([])
      } finally {
        setLoading(false)
      }
    }

    fetchBookings()
  }, [])

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    })
  }

  // Get status badge color
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'canceled':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  if (loading) {
    return (
      <div className='px-4 sm:px-6 md:px-16 lg:px-24 xl:px-32 mt-12 sm:mt-16 flex items-center justify-center min-h-[60vh]'>
        <div className='text-center'>
          <p className='text-lg sm:text-xl text-gray-500 mb-4'>Loading your bookings...</p>
          <div className='animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-primary mx-auto'></div>
        </div>
      </div>
    )
  }

  return (
    <div className='px-4 sm:px-6 md:px-16 lg:px-24 xl:px-32 mt-12 sm:mt-16 mb-12 sm:mb-16'>
      <h1 className='text-3xl sm:text-4xl font-bold text-gray-900 mb-6 sm:mb-8'>My Bookings</h1>

      {bookings.length === 0 ? (
        <div className='text-center py-12 sm:py-16 px-4'>
          <p className='text-lg sm:text-xl text-gray-500 mb-3 sm:mb-4'>No bookings found</p>
          <p className='text-sm sm:text-base text-gray-400'>Start booking apparel to see them here!</p>
        </div>
      ) : (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6'>
          {bookings.map((booking) => (
            <div 
              key={booking._id || booking.id} 
              className='bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300'
            >
              {/* Gown Image */}
              <div className='relative overflow-hidden bg-gray-100'>
                <img 
                  src={Array.isArray(booking.gown?.image) ? booking.gown.image[0] : booking.gown?.image || assets.gown_image1} 
                  alt={booking.gown?.name || 'Gown'}
                  className='w-full h-auto max-h-64 sm:max-h-80 md:max-h-96 object-contain'
                />
                <div className={`absolute top-3 right-3 sm:top-4 sm:right-4 px-2.5 sm:px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(booking.status)}`}>
                  {booking.status?.toUpperCase() || 'PENDING'}
                </div>
              </div>

              {/* Booking Details */}
              <div className='p-4 sm:p-6'>
                <h3 className='text-lg sm:text-xl font-bold text-gray-900 mb-2'>
                  {booking.gown?.name || 'Gown Name'}
                </h3>
                <p className='text-sm sm:text-base text-gray-600 mb-3 sm:mb-4'>by {booking.owner ? (typeof booking.owner === 'object' ? (booking.owner.shopName || booking.owner.name) : booking.owner) : 'Owner'}</p>

                {/* Date Information */}
                <div className='space-y-2 sm:space-y-3 mb-3 sm:mb-4'>
                  <div className='flex items-center gap-2 text-gray-700'>
                    <img src={assets.calendar_icon_colored} alt="calendar" className='w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0' />
                    <div className='flex-1 min-w-0'>
                      <p className='text-xs sm:text-sm text-gray-500'>Pickup</p>
                      <p className='text-sm sm:text-base font-medium truncate'>{formatDate(booking.pickupDate)}</p>
                    </div>
                  </div>
                  <div className='flex items-center gap-2 text-gray-700'>
                    <img src={assets.calendar_icon_colored} alt="calendar" className='w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0' />
                    <div className='flex-1 min-w-0'>
                      <p className='text-xs sm:text-sm text-gray-500'>Return</p>
                      <p className='text-sm sm:text-base font-medium truncate'>{formatDate(booking.returnDate)}</p>
                    </div>
                  </div>
                </div>

                {/* Price */}
                <div className='pt-3 sm:pt-4 border-t border-gray-200'>
                  <div className='flex justify-between items-center'>
                    <span className='text-sm sm:text-base text-gray-600'>Total Price:</span>
                    <span className='text-xl sm:text-2xl font-bold text-primary'>
                      {currency}{booking.price?.toLocaleString() || '0'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default MyBookings
