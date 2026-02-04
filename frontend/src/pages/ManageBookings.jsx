import React, { useEffect, useState } from 'react'
import { assets } from '../assets/assets'
import { API_URL, CURRENCY } from '../config'
import OwnerSidebar from '../components/OwnerSidebar'

const ManageBookings = () => {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [filterStatus, setFilterStatus] = useState('all') 
  const currency = CURRENCY
  const [selectedPayment, setSelectedPayment] = useState(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)

  // Reschedule / Extend modal state
  const [editOpen, setEditOpen] = useState(false)
  const [editMode, setEditMode] = useState('reschedule') // reschedule | extend
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [editForm, setEditForm] = useState({
    pickupDate: '',
    returnDate: '',
    pickupTime: '09:00',
    returnTime: '09:00',
  })

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
      // Use unified update endpoint for cancel (instant release for trials)
      if (newStatus === 'canceled') {
        const response = await fetch(`${API_URL}/bookings/update`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ bookingId, action: 'cancel' })
        })

        const data = await response.json()
        if (data.success) {
          setSuccess('Booking canceled successfully')
          fetchBookings()
          setTimeout(() => setSuccess(''), 3000)
        } else {
          setError(data.message || 'Failed to cancel booking')
          setTimeout(() => setError(''), 3000)
        }
        return
      }

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

  const toDateInputValue = (dateString) => {
    if (!dateString) return ''
    const d = new Date(dateString)
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }

  const allowedTimes = React.useMemo(() => {
    const times = []
    for (let h = 9; h <= 19; h++) {
      for (let m = 0; m < 60; m += 15) {
        if (h === 19 && m > 0) continue
        times.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
      }
    }
    return times
  }, [])

  const isEditableStatus = (booking) => ['pending', 'trial'].includes((booking?.status || '').toLowerCase())

  const openEdit = (booking, mode) => {
    const pickupTime = booking.pickupTime || '09:00'
    const returnTime = booking.returnTime || pickupTime

    setSelectedBooking(booking)
    setEditMode(mode)
    setEditForm({
      pickupDate: toDateInputValue(booking.pickupDate),
      returnDate: toDateInputValue(booking.returnDate),
      pickupTime,
      returnTime,
    })
    setError('')
    setSuccess('')
    setEditOpen(true)
  }

  const closeEdit = () => {
    setEditOpen(false)
    setSelectedBooking(null)
    setSavingEdit(false)
  }

  const handleEditFormChange = (e) => {
    const { name, value } = e.target
    setEditForm((prev) => ({ ...prev, [name]: value }))
  }

  const submitEdit = async () => {
    if (!selectedBooking) return

    try {
      setSavingEdit(true)
      setError('')
      setSuccess('')

      const token = localStorage.getItem('token')
      const payload = {
        bookingId: selectedBooking._id || selectedBooking.id,
        action: 'reschedule',
        pickupDate: editMode === 'extend' ? toDateInputValue(selectedBooking.pickupDate) : editForm.pickupDate,
        returnDate: editForm.returnDate,
        pickupTime: editMode === 'extend' ? (selectedBooking.pickupTime || editForm.pickupTime) : editForm.pickupTime,
        returnTime: editForm.returnTime,
      }

      const response = await fetch(`${API_URL}/bookings/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()
      if (!data.success) {
        setError(data.message || 'Failed to update booking')
        return
      }

      setSuccess('Booking updated successfully')
      fetchBookings()
      setTimeout(() => setSuccess(''), 3000)
      closeEdit()

    } catch (e) {
      console.error('Error updating booking:', e)
      setError('An error occurred. Please try again.')
      setTimeout(() => setError(''), 3000)
    } finally {
      setSavingEdit(false)
    }
  }

  const handleFinalizeTrial = async (bookingId) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL}/bookings/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ bookingId, action: 'convert_to_reservation' })
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('Trial finalized as reservation')
        fetchBookings()
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.message || 'Failed to finalize trial')
        setTimeout(() => setError(''), 3000)
      }
    } catch (error) {
      console.error('Error finalizing trial:', error)
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
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'trial':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'pending':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'canceled':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const handleVerifyPayment = async (bookingId, action) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL}/bookings/verify-payment`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          bookingId, 
          action, // 'approve' or 'reject'
          rejectionReason: action === 'reject' ? 'Payment verification failed' : undefined
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setSuccess(`Payment ${action === 'approve' ? 'approved' : 'rejected'} successfully`)
        setShowPaymentModal(false)
        setSelectedPayment(null)
        fetchBookings()
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.message || `Failed to ${action} payment`)
        setTimeout(() => setError(''), 3000)
      }
    } catch (error) {
      console.error('Error verifying payment:', error)
      setError('An error occurred. Please try again.')
      setTimeout(() => setError(''), 3000)
    }
  }

  const openPaymentModal = (booking) => {
    setSelectedPayment(booking)
    setShowPaymentModal(true)
  }

  // Filter bookings by status
  const filteredBookings = filterStatus === 'all' 
    ? bookings 
    : bookings.filter(booking => booking.status === filterStatus)

  if (loading) {
    return (
      <div className='flex min-h-screen'>
        <OwnerSidebar />
        <div className='flex-1 flex items-center justify-center px-4'>
          <div className='text-center'>
            <p className='text-lg sm:text-xl text-gray-500 mb-4'>Loading bookings...</p>
            <div className='animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-primary mx-auto'></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='flex min-h-screen bg-white lg:bg-gray-50'>
      <OwnerSidebar />
      
      <div className='flex-1 p-4 sm:p-6 lg:p-8 bg-white lg:bg-transparent'>
        <div className='max-w-7xl mx-auto'>
          {/* Header */}
          <div className='mb-6 sm:mb-8 mt-12 lg:mt-0'>
            <h1 className='text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2'>Manage Bookings</h1>
            <p className='text-sm sm:text-base text-gray-600'>View and manage all customer bookings for your apparel.</p>
          </div>

          {/* Success/Error Messages */}
          {success && (
            <div className='mb-4 sm:mb-6 p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg'>
              <p className='text-green-800 text-sm sm:text-base'>{success}</p>
            </div>
          )}

          {error && (
            <div className='mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg'>
              <p className='text-red-800 text-sm sm:text-base'>{error}</p>
            </div>
          )}

          {/* Filter Tabs */}
          <div className='mb-4 sm:mb-6 flex gap-1 sm:gap-2 border-b border-gray-200 overflow-x-auto pb-px'>
            {['all', 'trial', 'pending', 'confirmed', 'completed', 'canceled'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                  filterStatus === status
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
                {status !== 'all' && (
                  <span className='ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 text-xs bg-gray-100 rounded-full'>
                    {bookings.filter(b => b.status === status).length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Bookings List */}
          {filteredBookings.length === 0 ? (
            <div className='text-center py-12 sm:py-16 bg-gray-50 lg:bg-white rounded-xl border border-gray-200 px-4'>
              <img src={assets.listIcon} alt="bookings" className='w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 opacity-50' />
              <p className='text-lg sm:text-xl text-gray-500 mb-3 sm:mb-4'>
                {filterStatus === 'all' ? 'No bookings found' : `No ${filterStatus} bookings`}
              </p>
              <p className='text-sm sm:text-base text-gray-400'>Bookings will appear here when customers book your apparel.</p>
            </div>
          ) : (
            <div className='space-y-3 sm:space-y-4'>
              {filteredBookings.map((booking) => (
                <div 
                  key={booking._id || booking.id} 
                  className='bg-white rounded-xl shadow-sm lg:shadow-md border border-gray-200 p-4 sm:p-6 hover:shadow-lg transition-shadow'
                >
                  <div className='flex flex-col lg:flex-row gap-4 sm:gap-6'>
                    {/* Gown Image and Details */}
                    <div className='flex gap-3 sm:gap-4 flex-1'>
                      <div className='w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0'>
                        <img 
                          src={Array.isArray(booking.gown?.image) 
                            ? booking.gown.image[0] 
                            : booking.gown?.image || assets.gown_image1} 
                          alt={booking.gown?.name}
                          className='w-full h-full object-cover'
                        />
                      </div>
                      
                      <div className='flex-1 min-w-0'>
                        <h3 className='text-base sm:text-lg md:text-xl font-bold text-gray-900 mb-2 truncate'>
                          {booking.gown?.name || 'Gown'}
                        </h3>
                        <div className='space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-gray-600'>
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
                          {booking.pickupTime && (
                            <div className='flex items-center gap-2'>
                              <svg className='w-4 h-4 text-gray-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' />
                              </svg>
                              <span>
                                Time: <strong>{booking.pickupTime}</strong>
                              </span>
                            </div>
                          )}
                          <div className='flex items-center gap-2'>
                            <img src={assets.user_profile} alt="user" className='w-4 h-4 flex-shrink-0 rounded-full' />
                            <span className='truncate'>
                              Customer: <strong>{booking.user?.name || 'N/A'}</strong>
                            </span>
                          </div>
                          <div className='flex items-center gap-2'>
                            <span className='text-gray-500 flex-shrink-0'>Email:</span>
                            <span className='truncate'>{booking.user?.email || 'N/A'}</span>
                          </div>
                          <div className='flex items-center gap-2'>
                            <svg className='w-4 h-4 text-gray-600 flex-shrink-0' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z' />
                            </svg>
                            <span className='text-gray-500 flex-shrink-0'>Contact:</span>
                            <span className='truncate'><strong>{booking.contactNumber || 'Not provided'}</strong></span>
                          </div>
                          {(booking.measurements?.waist || booking.measurements?.hips) && (
                            <div className='flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mt-2 pt-2 border-t border-gray-200'>
                              <div className='flex items-center gap-2'>
                                <img src={assets.size_icon} alt="measurements" className='w-4 h-4 flex-shrink-0' />
                                <span className='font-semibold text-gray-700'>Measurements:</span>
                              </div>
                              <div className='flex flex-wrap items-center gap-1 sm:gap-2 pl-6 sm:pl-0'>
                                {booking.measurements?.waist && (
                                  <span className='whitespace-nowrap'>Waist: <strong>{booking.measurements.waist} {booking.measurements?.unit || 'inches'}</strong></span>
                                )}
                                {booking.measurements?.waist && booking.measurements?.hips && (
                                  <span className='hidden sm:inline mx-1'>|</span>
                                )}
                                {booking.measurements?.hips && (
                                  <span className='whitespace-nowrap'>Hips: <strong>{booking.measurements.hips} {booking.measurements?.unit || 'inches'}</strong></span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Status and Actions */}
                    <div className='lg:w-64 flex flex-col gap-3 sm:gap-4'>
                      <div className='lg:text-right'>
                        <div className={`inline-block px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold border ${getStatusColor(booking.status)}`}>
                          {booking.status?.toUpperCase() || 'PENDING'}
                        </div>
                        <p className='text-xl sm:text-2xl font-bold text-primary mt-2 sm:mt-3'>
                          {currency}{booking.price?.toLocaleString() || 0}
                        </p>
                        
                        {/* Payment Info */}
                        {booking.payment && (
                          <div className='mt-2 sm:mt-3 text-xs sm:text-sm text-left bg-green-50 rounded-lg p-2.5 sm:p-3 border border-green-200'>
                            <p className='font-semibold text-gray-700 mb-1.5 sm:mb-2'>Deposit Paid:</p>
                            <p className='text-xl sm:text-2xl font-bold text-green-600 mb-1.5 sm:mb-2'>
                              {currency}{booking.payment.depositAmount?.toLocaleString()}
                            </p>
                            <p className='text-gray-600 text-xs mb-1.5 sm:mb-2 break-all'>
                              Ref: <span className='font-mono'>{booking.payment.transactionRef}</span>
                            </p>
                            {booking.payment.status !== 'pending' && (
                              <div className={`mt-1.5 sm:mt-2 px-2 py-1 rounded text-xs font-semibold ${
                                booking.payment.status === 'verified' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {booking.payment.status?.toUpperCase()}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Action Buttons: Manage Booking (pickup/return) */}
                      <div className='flex flex-col gap-2'>
                        {/* Owner Edit Actions (pending/trial only) */}
                        {isEditableStatus(booking) && (
                          <div className='grid grid-cols-2 gap-2'>
                            <button
                              onClick={() => openEdit(booking, 'reschedule')}
                              className='px-3 sm:px-4 py-2 text-sm sm:text-base border border-primary text-primary rounded-lg hover:bg-primary hover:text-white transition-colors font-semibold'
                            >
                              Reschedule
                            </button>
                            <button
                              onClick={() => openEdit(booking, 'extend')}
                              className='px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-900 text-gray-900 rounded-lg hover:bg-gray-900 hover:text-white transition-colors font-semibold'
                            >
                              Extend
                            </button>
                          </div>
                        )}

                        {/* Trial Actions */}
                        {booking.status === 'trial' && (
                          <div className='space-y-2'>
                            {booking.trialExpiresAt && (
                              <div className='p-3 bg-orange-50 border border-orange-200 rounded-lg text-xs sm:text-sm text-orange-900'>
                                <p className='font-semibold'>Trial Hold</p>
                                <p>Expires: <strong>{formatDate(booking.trialExpiresAt)}</strong> (no payment required)</p>
                              </div>
                            )}
                            <button
                              onClick={() => handleFinalizeTrial(booking._id || booking.id)}
                              className='w-full py-2 px-4 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors'
                            >
                              Finalize Trial (Convert to Reservation)
                            </button>
                            <button
                              onClick={() => handleStatusChange(booking._id || booking.id, 'canceled')}
                              className='w-full py-2 px-4 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors'
                            >
                              Cancel Trial
                            </button>
                          </div>
                        )}

                        {/* Payment Verification - Only for pending status with pending payment */}
                        {booking.status === 'pending' && booking.payment?.status === 'pending' && (
                          <>
                            <button
                              onClick={() => openPaymentModal(booking)}
                              className='w-full px-3 sm:px-4 py-2 text-sm sm:text-base bg-primary text-white rounded-lg hover:bg-primary-dull transition-colors font-semibold'
                            >
                              Review Payment
                            </button>
                            <button
                              onClick={() => handleStatusChange(booking._id || booking.id, 'canceled')}
                              className='w-full px-3 sm:px-4 py-2 text-sm sm:text-base bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold'
                            >
                              Cancel Booking
                            </button>
                          </>
                        )}

                        {/* After payment verified - show confirm pickup button */}
                        {booking.status === 'pending' && booking.payment?.status === 'verified' && (
                          <>
                            <button
                              onClick={() => handleStatusChange(booking._id || booking.id, 'confirmed')}
                              className='w-full px-3 sm:px-4 py-2 text-sm sm:text-base bg-primary text-white rounded-lg hover:bg-primary-dull transition-colors font-semibold'
                            >
                              Confirm Pick-up
                            </button>
                            <button
                              onClick={() => handleStatusChange(booking._id || booking.id, 'canceled')}
                              className='w-full px-3 sm:px-4 py-2 text-sm sm:text-base bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold'
                            >
                              Cancel Booking
                            </button>
                          </>
                        )}

                        {/* For bookings without payment (old bookings) */}
                        {booking.status === 'pending' && !booking.payment && (
                          <>
                            <button
                              onClick={() => handleStatusChange(booking._id || booking.id, 'confirmed')}
                              className='w-full px-3 sm:px-4 py-2 text-sm sm:text-base bg-primary text-white rounded-lg hover:bg-primary-dull transition-colors font-semibold'
                            >
                              Confirm Pick-up
                            </button>
                            <button
                              onClick={() => handleStatusChange(booking._id || booking.id, 'canceled')}
                              className='w-full px-3 sm:px-4 py-2 text-sm sm:text-base bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold'
                            >
                              Cancel Booking
                            </button>
                          </>
                        )}

                        {booking.status === 'confirmed' && (
                          <>
                            <button
                              onClick={() => handleStatusChange(booking._id || booking.id, 'completed')}
                              className='w-full px-3 sm:px-4 py-2 text-sm sm:text-base bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold'
                            >
                              Confirm Return
                            </button>
                            <button
                              onClick={() => handleStatusChange(booking._id || booking.id, 'canceled')}
                              className='w-full px-3 sm:px-4 py-2 text-sm sm:text-base bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold'
                            >
                              Cancel Booking
                            </button>
                          </>
                        )}
                        
                        {booking.status === 'canceled' && (
                          <button
                            onClick={() => handleStatusChange(booking._id || booking.id, 'confirmed')}
                            className='w-full px-3 sm:px-4 py-2 text-sm sm:text-base bg-primary text-white rounded-lg hover:bg-primary-dull transition-colors font-semibold'
                          >
                            Re-confirm & Mark For Pick-up
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

      {/* Edit Booking Modal */}
      {editOpen && selectedBooking && (
        <div
          className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'
          onClick={closeEdit}
        >
          <div
            className='bg-white rounded-xl shadow-xl max-w-lg w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto'
            onClick={(e) => e.stopPropagation()}
          >
            <div className='flex items-start justify-between gap-4 mb-4'>
              <div>
                <h2 className='text-lg sm:text-xl font-bold text-gray-900'>
                  {editMode === 'extend' ? 'Extend Booking' : 'Reschedule Booking'}
                </h2>
                <p className='text-xs sm:text-sm text-gray-600'>{selectedBooking.gown?.name}</p>
              </div>
              <button
                onClick={closeEdit}
                className='text-gray-400 hover:text-gray-600 text-2xl leading-none'
              >
                ×
              </button>
            </div>

            <div className='space-y-4'>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                <div>
                  <label className='block text-sm font-semibold text-gray-700 mb-1'>Pickup Date</label>
                  <input
                    type='date'
                    name='pickupDate'
                    value={editForm.pickupDate}
                    onChange={handleEditFormChange}
                    disabled={editMode === 'extend'}
                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none disabled:bg-gray-100'
                  />
                </div>
                <div>
                  <label className='block text-sm font-semibold text-gray-700 mb-1'>Pickup Time</label>
                  <select
                    name='pickupTime'
                    value={editForm.pickupTime}
                    onChange={handleEditFormChange}
                    disabled={editMode === 'extend'}
                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none disabled:bg-gray-100'
                  >
                    {allowedTimes.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                <div>
                  <label className='block text-sm font-semibold text-gray-700 mb-1'>Return Date</label>
                  <input
                    type='date'
                    name='returnDate'
                    value={editForm.returnDate}
                    onChange={handleEditFormChange}
                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none'
                  />
                </div>
                <div>
                  <label className='block text-sm font-semibold text-gray-700 mb-1'>Return Time</label>
                  <select
                    name='returnTime'
                    value={editForm.returnTime}
                    onChange={handleEditFormChange}
                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none'
                  >
                    {allowedTimes.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              {(selectedBooking.status || '').toLowerCase() === 'trial' && (
                <div className='p-3 bg-orange-50 border border-orange-200 rounded-lg text-xs sm:text-sm text-orange-900'>
                  Trial bookings always reserve a 2-day fitting window. Changing pickup date/time will auto-adjust return.
                </div>
              )}

              <div className='flex gap-2 pt-2'>
                <button
                  type='button'
                  onClick={submitEdit}
                  disabled={savingEdit}
                  className='flex-1 px-4 py-2.5 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dull disabled:bg-gray-400'
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type='button'
                  onClick={closeEdit}
                  className='px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50'
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Screenshot Modal */}
      {showPaymentModal && selectedPayment && (
        <div 
          className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'
          onClick={() => setShowPaymentModal(false)}
        >
          <div 
            className='bg-white rounded-xl sm:rounded-2xl shadow-xl max-w-3xl w-full p-4 sm:p-6 lg:p-8 relative max-h-[90vh] overflow-y-auto'
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setShowPaymentModal(false)}
              className='absolute top-3 right-3 sm:top-4 sm:right-4 text-gray-400 hover:text-gray-600 text-xl sm:text-2xl'
            >
              ×
            </button>

            {/* Header */}
            <div className='mb-4 sm:mb-6 pr-8'>
              <h2 className='text-xl sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-2'>Payment Verification</h2>
              <p className='text-sm sm:text-base text-gray-600'>Review and verify the payment screenshot submitted by the customer.</p>
            </div>

            {/* Customer & Booking Info */}
            <div className='bg-gray-50 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6'>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm'>
                <div>
                  <p className='text-gray-500'>Customer:</p>
                  <p className='font-semibold'>{selectedPayment.user?.name}</p>
                </div>
                <div>
                  <p className='text-gray-500'>Gown:</p>
                  <p className='font-semibold'>{selectedPayment.gown?.name}</p>
                </div>
                <div>
                  <p className='text-gray-500'>Total Booking:</p>
                  <p className='font-semibold text-primary'>{currency}{selectedPayment.price?.toLocaleString()}</p>
                </div>
                <div>
                  <p className='text-gray-500'>Deposit (50%):</p>
                  <p className='font-semibold text-green-600'>{currency}{selectedPayment.payment?.depositAmount?.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Payment Details */}
            <div className='mb-4 sm:mb-6'>
              <h3 className='text-base sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-3'>Deposit Payment Details</h3>
              <div className='bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4'>
                <div className='space-y-2 sm:space-y-3 text-xs sm:text-sm'>
                  <div className='flex justify-between items-center'>
                    <span className='text-gray-700'>Payment Method:</span>
                    <span className='font-semibold'>GCash</span>
                  </div>
                  <div className='flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0'>
                    <span className='text-gray-700'>Reference Number:</span>
                    <span className='font-mono font-semibold text-xs sm:text-sm break-all'>{selectedPayment.payment?.transactionRef}</span>
                  </div>
                  <div className='flex justify-between items-center pt-2 border-t border-blue-300'>
                    <span className='text-gray-700 font-semibold'>Deposit Amount:</span>
                    <span className='text-lg sm:text-xl font-bold text-green-600'>{currency}{selectedPayment.payment?.depositAmount?.toLocaleString()}</span>
                  </div>
                </div>
              </div>
              <p className='text-xs text-gray-500 mt-2'>
                Note: Balance will be collected during pickup
              </p>
            </div>

            {/* Screenshot */}
            <div className='mb-4 sm:mb-6'>
              <h3 className='text-base sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-3'>Transaction Screenshot</h3>
              <div className='border border-gray-300 rounded-lg overflow-hidden bg-gray-100'>
                {selectedPayment.payment?.screenshot ? (
                  <img 
                    src={selectedPayment.payment.screenshot} 
                    alt="Payment Screenshot" 
                    className='w-full h-auto max-h-[300px] sm:max-h-[500px] object-contain'
                  />
                ) : (
                  <div className='flex items-center justify-center h-48 sm:h-64 text-gray-400 text-sm sm:text-base'>
                    No screenshot available
                  </div>
                )}
              </div>
            </div>

            {/* Warning */}
            <div className='mb-4 sm:mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4'>
              <p className='text-xs sm:text-sm text-yellow-800'>
                <strong>Important:</strong> Please verify that the reference number matches the GCash transaction and the amount is correct before approving.
              </p>
            </div>

            {/* Action Buttons */}
            <div className='flex flex-col sm:flex-row gap-3 sm:gap-4'>
              <button
                onClick={() => handleVerifyPayment(selectedPayment._id || selectedPayment.id, 'approve')}
                className='flex-1 px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold'
              >
                Approve Payment
              </button>
              <button
                onClick={() => handleVerifyPayment(selectedPayment._id || selectedPayment.id, 'reject')}
                className='flex-1 px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold'
              >
                Reject Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ManageBookings

