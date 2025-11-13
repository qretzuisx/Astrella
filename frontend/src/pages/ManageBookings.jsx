import React, { useEffect, useState } from 'react'
import { assets } from '../assets/assets'
import OwnerSidebar from '../components/OwnerSidebar'

const ManageBookings = () => {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [filterStatus, setFilterStatus] = useState('all') // all, pending, confirmed, canceled
  const currency = import.meta.env.VITE_CURRENCY || '₱'

  useEffect(() => {
    fetchBookings()
  }, [])

  const fetchBookings = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      if (!token) {
        window.location.href = '/'
        return
      }

      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
      const response = await fetch(`${API_URL}/bookings/owner`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()
      
      if (data.success) {
        setBookings(data.bookings || [])
      } else {
        setError(data.message || 'Failed to load bookings')
      }
    } catch (error) {
      console.error('Error fetching bookings:', error)
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (bookingId, newStatus) => {
    try {
      const token = localStorage.getItem('token')
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
      
      const response = await fetch(`${API_URL}/bookings/change-status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ bookingId, status: newStatus })
      })

      const data = await response.json()
      
      if (data.success) {
        setSuccess(`Booking ${newStatus} successfully`)
        fetchBookings()
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.message || 'Failed to update booking status')
        setTimeout(() => setError(''), 3000)
      }
    } catch (error) {
      console.error('Error updating status:', error)
      setError('An error occurred. Please try again.')
      setTimeout(() => setError(''), 3000)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    })
  }

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

  // Filter bookings by status
  const filteredBookings = filterStatus === 'all' 
    ? bookings 
    : bookings.filter(booking => booking.status === filterStatus)

  if (loading) {
    return (
      <div className='flex min-h-screen'>
        <OwnerSidebar />
        <div className='flex-1 flex items-center justify-center'>
          <div className='text-center'>
            <p className='text-xl text-gray-500 mb-4'>Loading bookings...</p>
            <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto'></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='flex min-h-screen bg-gray-50'>
      <OwnerSidebar />
      
      <div className='flex-1 p-8'>
        <div className='max-w-7xl mx-auto'>
          {/* Header */}
          <div className='mb-8'>
            <h1 className='text-3xl font-bold text-gray-900 mb-2'>Manage Bookings</h1>
            <p className='text-gray-600'>View and manage all customer bookings for your gowns.</p>
          </div>

          {/* Success/Error Messages */}
          {success && (
            <div className='mb-6 p-4 bg-green-50 border border-green-200 rounded-lg'>
              <p className='text-green-800'>{success}</p>
            </div>
          )}

          {error && (
            <div className='mb-6 p-4 bg-red-50 border border-red-200 rounded-lg'>
              <p className='text-red-800'>{error}</p>
            </div>
          )}

          {/* Filter Tabs */}
          <div className='mb-6 flex gap-2 border-b border-gray-200'>
            {['all', 'pending', 'confirmed', 'canceled'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-6 py-3 font-semibold border-b-2 transition-colors ${
                  filterStatus === status
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
                {status !== 'all' && (
                  <span className='ml-2 px-2 py-0.5 text-xs bg-gray-100 rounded-full'>
                    {bookings.filter(b => b.status === status).length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Bookings List */}
          {filteredBookings.length === 0 ? (
            <div className='text-center py-16 bg-white rounded-xl border border-gray-200'>
              <img src={assets.listIcon} alt="bookings" className='w-16 h-16 mx-auto mb-4 opacity-50' />
              <p className='text-xl text-gray-500 mb-4'>
                {filterStatus === 'all' ? 'No bookings found' : `No ${filterStatus} bookings`}
              </p>
              <p className='text-gray-400'>Bookings will appear here when customers book your gowns.</p>
            </div>
          ) : (
            <div className='space-y-4'>
              {filteredBookings.map((booking) => (
                <div 
                  key={booking._id} 
                  className='bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow'
                >
                  <div className='flex flex-col lg:flex-row gap-6'>
                    {/* Gown Image and Details */}
                    <div className='flex gap-4 flex-1'>
                      <div className='w-32 h-32 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0'>
                        <img 
                          src={Array.isArray(booking.gown?.image) 
                            ? booking.gown.image[0] 
                            : booking.gown?.image || assets.gown_image1} 
                          alt={booking.gown?.name}
                          className='w-full h-full object-cover'
                        />
                      </div>
                      
                      <div className='flex-1'>
                        <h3 className='text-xl font-bold text-gray-900 mb-2'>
                          {booking.gown?.name || 'Gown'}
                        </h3>
                        <div className='space-y-2 text-sm text-gray-600'>
                          <div className='flex items-center gap-2'>
                            <img src={assets.calendar_icon_colored} alt="calendar" className='w-4 h-4' />
                            <span>
                              Pickup: <strong>{formatDate(booking.pickupDate)}</strong>
                            </span>
                          </div>
                          <div className='flex items-center gap-2'>
                            <img src={assets.calendar_icon_colored} alt="calendar" className='w-4 h-4' />
                            <span>
                              Return: <strong>{formatDate(booking.returnDate)}</strong>
                            </span>
                          </div>
                          <div className='flex items-center gap-2'>
                            <img src={assets.user_profile} alt="user" className='w-4 h-4 rounded-full' />
                            <span>
                              Customer: <strong>{booking.user?.name || 'N/A'}</strong>
                            </span>
                          </div>
                          <div className='flex items-center gap-2'>
                            <span className='text-gray-500'>Email:</span>
                            <span>{booking.user?.email || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Status and Actions */}
                    <div className='lg:w-64 flex flex-col gap-4'>
                      <div className='text-right'>
                        <div className={`inline-block px-4 py-2 rounded-full text-sm font-semibold border ${getStatusColor(booking.status)}`}>
                          {booking.status?.toUpperCase() || 'PENDING'}
                        </div>
                        <p className='text-2xl font-bold text-primary mt-3'>
                          {currency}{booking.price?.toLocaleString() || 0}
                        </p>
                      </div>

                      {/* Action Buttons */}
                      <div className='flex flex-col gap-2'>
                        {booking.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleStatusChange(booking._id, 'confirmed')}
                              className='w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold'
                            >
                              Confirm Booking
                            </button>
                            <button
                              onClick={() => handleStatusChange(booking._id, 'canceled')}
                              className='w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold'
                            >
                              Cancel Booking
                            </button>
                          </>
                        )}
                        {booking.status === 'confirmed' && (
                          <button
                            onClick={() => handleStatusChange(booking._id, 'canceled')}
                            className='w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold'
                          >
                            Cancel Booking
                          </button>
                        )}
                        {booking.status === 'canceled' && (
                          <button
                            onClick={() => handleStatusChange(booking._id, 'confirmed')}
                            className='w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold'
                          >
                            Re-confirm Booking
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ManageBookings

