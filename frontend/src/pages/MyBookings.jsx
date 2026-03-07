import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/dist/style.css'
import { assets } from '../assets/assets'
import { API_URL, CURRENCY } from '../config'

const ALLOWED_TIMES = (() => {
  const times = []
  for (let h = 9; h <= 19; h++) {
    for (let m = 0; m < 60; m += 15) {
      if (h === 19 && m > 0) continue
      times.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    }
  }
  return times
})()

const MyBookings = ({ setShowLogin }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [showLoginRequired, setShowLoginRequired] = useState(false)

  const [editOpen, setEditOpen] = useState(false)
  const [editMode, setEditMode] = useState('reschedule') // reschedule | extend
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    pickupDate: '',
    returnDate: '',
    pickupTime: '09:00',
    returnTime: '09:00',
  })

  // Availability checking state for reschedule/extend
  const [availabilityStatus, setAvailabilityStatus] = useState({ loading: false, message: '', valid: false })
  const [calendarInfo, setCalendarInfo] = useState({ unavailableDates: [], trialTimeSlots: {}, laundryHoldDates: [] })

  const currency = CURRENCY

  // Helper functions for calendar
  const toIsoDate = (date) => {
    if (!date) return ''
    const d = new Date(date)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const isPastIsoDate = (isoDate) => {
    const today = toIsoDate(new Date())
    return isoDate < today
  }

  const blockedReasonForDate = (isoDate) => {
    if (calendarInfo.unavailableDates.includes(isoDate)) return { reason: 'reserved', message: 'Reserved date.' }
    
    // Check if there are booked trial time slots for this date
    const trialSlots = calendarInfo.trialTimeSlots[isoDate]
    if (trialSlots && trialSlots.length > 0) {
      const formatTimeAmPm = (t) => {
        if (!t) return ''
        const m = String(t).match(/^(\d{1,2}):(\d{2})$/)
        if (!m) return t
        let h = parseInt(m[1], 10)
        const ampm = h >= 12 ? 'pm' : 'am'
        if (h > 12) h -= 12
        if (h === 0) h = 12
        return `${h}:${m[2]} ${ampm}`
      }
      const bookedTimes = trialSlots.map(slot => {
        const start = formatTimeAmPm(slot.start)
        const end = formatTimeAmPm(slot.end)
        return (slot.start === slot.end) ? start : `${start} - ${end}`
      }).join(', ')
      return { reason: 'trial', message: `Currently trying at ${bookedTimes}. Apparel Expires 30 minutes after trying on!`, allowSelection: true }
    }
    
    if (calendarInfo.laundryHoldDates.includes(isoDate)) return { reason: 'laundry', message: 'Laundry/cleaning day.' }
    return null
  }

  const handleCalendarSelect = (range) => {
    if (!range) return
    const isTrial = (selectedBooking?.status || '').toLowerCase() === 'trial'
    
    if (isTrial || !range.from) {
      const singleDate = range.from || range
      setForm(prev => ({
        ...prev,
        pickupDate: toIsoDate(singleDate),
        returnDate: toIsoDate(singleDate)
      }))
    } else {
      setForm(prev => ({
        ...prev,
        pickupDate: toIsoDate(range.from),
        returnDate: range.to ? toIsoDate(range.to) : toIsoDate(range.from)
      }))
    }
  }

  // Check authentication on mount
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      setShowLoginRequired(true)
      return
    }
    setIsAuthenticated(true)
  }, [navigate])

  const fetchBookings = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      if (!token) {
        setBookings([])
        return
      }

      const response = await fetch(`${API_URL}/bookings/user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()
      if (data.success) {
        // merge any new booking passed via navigation state
        const initial = data.bookings || []
        if (location?.state?.newBooking) {
          const nb = location.state.newBooking
          const exists = initial.some(b => (b._id || b.id) == (nb._id || nb.id))
          if (!exists) initial.unshift(nb)
          try {
            window.history.replaceState({}, document.title)
          } catch (e) {}
        }
        setBookings(initial)
      } else {
        setBookings([])
      }
    } catch (e) {
      console.error('Error fetching bookings:', e)
      setError('Failed to load your bookings. Please try again.')
      setBookings([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      fetchBookings()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  const toDateInputValue = (dateString) => {
    if (!dateString) return ''
    const d = new Date(dateString)
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }

  const isEditableStatus = (booking) => ['pending', 'trial'].includes((booking?.status || '').toLowerCase())
  const canCancelStatus = (booking) => !['canceled', 'completed', 'expired'].includes((booking?.status || '').toLowerCase())

  const openEdit = async (booking, mode) => {
    const pickupTime = booking.pickupTime || '09:00'
    const returnTime = booking.returnTime || pickupTime

    setSelectedBooking(booking)
    setEditMode(mode)
    setForm({
      pickupDate: toDateInputValue(booking.pickupDate),
      returnDate: toDateInputValue(booking.returnDate),
      pickupTime,
      returnTime,
    })
    setError('')
    setSuccess('')
    setEditOpen(true)
    
    // Fetch calendar availability for the gown
    const gownId = booking.gown?._id || booking.gown?.id || booking.gown
    if (gownId) {
      await fetchCalendarAvailability(gownId)
    }
  }

  const fetchCalendarAvailability = async (gownId) => {
    try {
      const response = await fetch(`${API_URL}/bookings/calendar/${gownId}`)
      const data = await response.json()
      if (data.success) {
        setCalendarInfo({
          unavailableDates: data.calendar?.unavailableDates || [],
          trialTimeSlots: data.calendar?.trialTimeSlots || {},
          laundryHoldDates: data.calendar?.laundryHoldDates || []
        })
      }
    } catch (e) {
      console.error('Error fetching calendar:', e)
      setError('Failed to load calendar availability. Please try again.')
    }
  }

  const closeEdit = () => {
    setEditOpen(false)
    setSelectedBooking(null)
    setSaving(false)
  }

  const handleFormChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    
    // Trigger availability check when dates/times change
    if (['pickupDate', 'returnDate', 'pickupTime', 'returnTime'].includes(name)) {
      // Use setTimeout to wait for state to update
      setTimeout(() => checkAvailability(), 100)
    }
  }

  const checkAvailability = async () => {
    if (!selectedBooking || !form.pickupDate || !form.returnDate || !form.pickupTime || !form.returnTime) {
      setAvailabilityStatus({ loading: false, message: '', valid: false })
      return
    }

    const gownId = selectedBooking.gown?._id || selectedBooking.gown?.id || selectedBooking.gown
    if (!gownId) return

    setAvailabilityStatus({ loading: true, message: 'Checking availability...', valid: false })

    try {
      const isTrial = (selectedBooking.status || '').toLowerCase() === 'trial'
      const response = await fetch(`${API_URL}/bookings/check-availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gownId,
          pickupDate: form.pickupDate,
          returnDate: isTrial ? form.pickupDate : form.returnDate,
          pickupTime: form.pickupTime,
          returnTime: isTrial ? form.pickupTime : form.returnTime,
          excludeBookingId: selectedBooking._id || selectedBooking.id
        })
      })

      const data = await response.json()
      if (data.success) {
        setAvailabilityStatus({ 
          loading: false, 
          message: data.available ? '✓ Available' : data.message || 'Not available', 
          valid: data.available 
        })
      } else {
        setAvailabilityStatus({ 
          loading: false, 
          message: data.message || 'Unable to check availability', 
          valid: false 
        })
      }
    } catch (e) {
      console.error('Error checking availability:', e)
      setAvailabilityStatus({ loading: false, message: 'Error checking availability', valid: false })
    }
  }

  const submitReschedule = async () => {
    if (!selectedBooking) return

    try {
      setSaving(true)
      setError('')
      setSuccess('')

      const token = localStorage.getItem('token')
      if (!token) {
        setError('You must be logged in to update a booking.')
        return
      }

      // For extend mode, keep pickup values locked.
      const isTrial = (selectedBooking.status || '').toLowerCase() === 'trial' || (selectedBooking.bookingType || '').toLowerCase() === 'trial'

      const payload = {
        bookingId: selectedBooking._id || selectedBooking.id,
        action: editMode === 'extend' ? 'extend' : 'reschedule',
        pickupDate: editMode === 'extend' ? toDateInputValue(selectedBooking.pickupDate) : form.pickupDate,
        returnDate: isTrial ? (editMode === 'extend' ? toDateInputValue(selectedBooking.pickupDate) : form.pickupDate) : form.returnDate,
        pickupTime: editMode === 'extend' ? (selectedBooking.pickupTime || form.pickupTime) : form.pickupTime,
        returnTime: isTrial ? (editMode === 'extend' ? (selectedBooking.pickupTime || form.pickupTime) : form.pickupTime) : form.returnTime,
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

      // Update list in-place when backend returns booking.
      const updated = data.booking || data.Booking
      if (updated) {
        setBookings((prev) => prev.map((b) => ((b._id || b.id) === (updated._id || updated.id) ? updated : b)))
      } else {
        await fetchBookings()
      }

      setSuccess('Booking updated successfully')
      setTimeout(() => setSuccess(''), 3000)
      closeEdit()
    } catch (e) {
      console.error('Error updating booking:', e)
      setError('An error occurred. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const cancelBooking = async (booking) => {
    const id = booking?._id || booking?.id
    if (!id) return

    const ok = window.confirm('Cancel this reservation? This cannot be undone.')
    if (!ok) return

    try {
      setError('')
      setSuccess('')
      const token = localStorage.getItem('token')
      if (!token) {
        setError('You must be logged in to cancel a booking.')
        return
      }

      const response = await fetch(`${API_URL}/bookings/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ bookingId: id, action: 'cancel' }),
      })

      const data = await response.json()
      if (!data.success) {
        setError(data.message || 'Failed to cancel booking')
        return
      }

      // Remove canceled booking from the list immediately
      setBookings((prev) => prev.filter((b) => (b._id || b.id) !== id))

      setSuccess('Booking canceled')
      setTimeout(() => setSuccess(''), 3000)
    } catch (e) {
      console.error('Error canceling booking:', e)
      setError('An error occurred. Please try again.')
    }
  }

  const continueToBook = (booking) => {
    const gownId = booking?.gown?._id || booking?.gown?.id || booking?.gown
    if (!gownId) return
    navigate(`/gown-details/${gownId}`)
  }

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

  // Format 24h time (HH:MM or HH:MM:SS) for display as 12h
  const formatTime = (timeValue) => {
    if (!timeValue) return ''
    const parts = String(timeValue).trim().split(':')
    const hours = parseInt(parts[0], 10)
    const minutes = parts[1] ? parseInt(parts[1], 10) : 0
    if (Number.isNaN(hours)) return timeValue
    const period = hours >= 12 ? 'PM' : 'AM'
    const h12 = hours % 12 || 12
    return `${h12}:${String(minutes).padStart(2, '0')} ${period}`
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

  const allowedTimes = ALLOWED_TIMES

  // Show login required message if not authenticated
  if (showLoginRequired) {
    return (
      <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
        <div className='bg-white rounded-xl shadow-2xl max-w-md w-full p-6 sm:p-8 mx-4'>
          <div className='text-center mb-6'>
            <div className='w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4'>
              <svg className='w-8 h-8 text-blue-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' />
              </svg>
            </div>
            <h2 className='text-2xl font-bold text-gray-900 mb-3'>Login Required</h2>
            <p className='text-gray-600 mb-6'>
              Please log in first to view your bookings. Sign in with your account to access all your booking information and manage your reservations.
            </p>
          </div>

          <div className='space-y-3'>
            <button
              onClick={() => {
                setShowLoginRequired(false)
                setShowLogin(true)
              }}
              className='w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold'
            >
              Go to Login
            </button>
            <button
              onClick={() => navigate('/')}
              className='w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold'
            >
              Return to Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return null
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
      <h1 className='text-3xl sm:text-4xl font-bold text-gray-900 mb-4 sm:mb-6'>My Bookings</h1>

      {/* Success/Error */}
      {success && (
        <div className='mb-4 p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg'>
          <p className='text-green-800 text-sm sm:text-base'>{success}</p>
        </div>
      )}
      {error && (
        <div className='mb-4 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg'>
          <p className='text-red-800 text-sm sm:text-base'>{error}</p>
        </div>
      )}

      {bookings.length === 0 ? (
        <div className='text-center py-12 sm:py-16 px-4'>
          <p className='text-lg sm:text-xl text-gray-500 mb-3 sm:mb-4'>No bookings found</p>
          <p className='text-sm sm:text-base text-gray-400'>Start booking apparel to see them here!</p>
        </div>
      ) : (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6'>
          {bookings.map((booking) => {
            const editable = isEditableStatus(booking)
            const cancelable = canCancelStatus(booking)
            const isTrial = (booking.status || '').toLowerCase() === 'trial' || (booking.bookingType || '').toLowerCase() === 'trial'

            return (
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
                  <div className={`absolute top-3 right-3 sm:top-4 sm:right-4 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-base sm:text-lg font-bold border-2 ${getStatusColor(booking.status)}`}>
                    {booking.status?.toUpperCase() || 'PENDING'}
                  </div>
                </div>

                {/* Booking Details */}
                <div className='p-4 sm:p-6'>
                  <h3 className='text-lg sm:text-xl font-bold text-gray-900 mb-2'>
                    {booking.gown?.name || 'Gown Name'}
                  </h3>
                  <p className='text-sm sm:text-base text-gray-600 mb-3 sm:mb-4'>
                    by {booking.owner ? (typeof booking.owner === 'object' ? (booking.owner.shopName || booking.owner.name) : booking.owner) : 'Owner'}
                  </p>

                  {/* Rejection Reason Display */}
                  {(booking.status?.toLowerCase() === 'canceled' && booking.payment?.status?.toLowerCase() === 'rejected' && booking.payment?.rejectionReason) && (
                    <div className='mb-3 sm:mb-4 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg'>
                      <p className='text-xs sm:text-sm font-semibold text-red-800 mb-1'>Payment Rejected</p>
                      <p className='text-xs sm:text-sm text-red-700'>{booking.payment.rejectionReason}</p>
                    </div>
                  )}

                  {/* Date Information */}
                  <div className='space-y-2 sm:space-y-3 mb-3 sm:mb-4'>
                    <div className='flex items-center gap-2 text-gray-700'>
                      <img src={assets.calendar_icon_colored} alt='calendar' className='w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0' />
                      <div className='flex-1 min-w-0'>
                        <p className='text-xs sm:text-sm text-gray-500'>{isTrial ? 'Trial Date' : 'Pickup'}</p>
                        <p className='text-sm sm:text-base font-medium truncate'>
                          {formatDate(booking.pickupDate)}
                          {booking.pickupTime && <span className='text-gray-600 font-normal'> · {formatTime(booking.pickupTime)}</span>}
                        </p>
                      </div>
                    </div>

                    {!isTrial && (
                      <div className='flex items-center gap-2 text-gray-700'>
                        <img src={assets.calendar_icon_colored} alt='calendar' className='w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0' />
                        <div className='flex-1 min-w-0'>
                          <p className='text-xs sm:text-sm text-gray-500'>Return</p>
                          <p className='text-sm sm:text-base font-medium truncate'>
                            {formatDate(booking.returnDate)}
                            {(booking.returnTime || booking.pickupTime) && <span className='text-gray-600 font-normal'> · {formatTime(booking.returnTime || booking.pickupTime)}</span>}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Return reminder: when return date is today and return time reached, show 2-hour window message */}
                    {!isTrial && (booking.status || '').toLowerCase() === 'confirmed' && booking.returnDate && (() => {
                      const today = toIsoDate(new Date())
                      const retDate = toIsoDate(new Date(booking.returnDate))
                      if (retDate !== today) return null
                      const retTime = booking.returnTime || booking.pickupTime || '09:00'
                      const [h, m] = retTime.split(':').map(Number)
                      const returnMinutes = (h || 0) * 60 + (m || 0)
                      const now = new Date()
                      const nowMinutes = now.getHours() * 60 + now.getMinutes()
                      if (nowMinutes >= returnMinutes) {
                        return (
                          <div className='mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg'>
                            <p className='text-sm font-semibold text-amber-900'>You are given allocated 2 hours to return the apparel.</p>
                          </div>
                        )
                      }
                      return null
                    })()}

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

                  {/* Actions - Reschedule and Cancel aligned in one row */}
                  <div className='mt-4 flex flex-col gap-2'>
                    <div className='grid grid-cols-2 gap-2'>
                      <button
                        type='button'
                        onClick={() => openEdit(booking, 'reschedule')}
                        disabled={!editable}
                        className={`px-3 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                          editable
                            ? 'border-primary text-primary hover:bg-primary hover:text-white'
                            : 'border-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        Reschedule
                      </button>
                      <button
                        type='button'
                        onClick={() => cancelBooking(booking)}
                        disabled={!cancelable}
                        className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                          cancelable ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        {isTrial ? 'Cancel Booking' : 'Cancel Reservation'}
                      </button>
                    </div>
                    {isTrial && (
                      <button
                        type='button'
                        onClick={() => continueToBook(booking)}
                        className='w-full px-3 py-2 rounded-lg text-sm font-semibold bg-primary text-white hover:bg-primary-dull transition-colors'
                      >
                        Continue to Book
                      </button>
                    )}

                    {!editable && (
                      <p className='text-xs text-gray-500'>Editing is available only for Pending/Trial bookings.</p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Edit Modal */}
      {editOpen && selectedBooking && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4' onClick={closeEdit}>
          <div className='bg-white rounded-xl shadow-xl max-w-lg w-full p-4 sm:p-6' onClick={(e) => e.stopPropagation()}>
            <div className='flex items-start justify-between gap-4 mb-4'>
              <div>
                <h2 className='text-lg sm:text-xl font-bold text-gray-900'>
                  {editMode === 'extend' ? 'Extend Reservation' : 'Reschedule Reservation'}
                </h2>
                <p className='text-xs sm:text-sm text-gray-600'>
                  {selectedBooking.gown?.name || 'Booking'}
                </p>
              </div>
              <button className='text-gray-400 hover:text-gray-600 text-2xl leading-none' onClick={closeEdit}>
                ×
              </button>
            </div>

            <div className='space-y-4'>
              {/* Show Reserved/Blocked Dates Info */}
              {(calendarInfo.unavailableDates.length > 0 || Object.keys(calendarInfo.trialTimeSlots).length > 0 || calendarInfo.laundryHoldDates.length > 0) && (
                <div className='p-3 bg-gray-50 border border-gray-200 rounded-lg'>
                  <p className='text-xs font-semibold text-gray-700 mb-2'>Date Status:</p>
                  <div className='flex flex-wrap gap-2 text-xs'>
                    {calendarInfo.unavailableDates.length > 0 && (
                      <span className='flex items-center gap-1'>
                        <span className='w-3 h-3 rounded-full bg-red-500 inline-block'></span>
                        Reserved ({calendarInfo.unavailableDates.length})
                      </span>
                    )}
                    {Object.keys(calendarInfo.trialTimeSlots).length > 0 && (
                      <span className='flex items-center gap-1'>
                        <span className='w-3 h-3 rounded-full bg-yellow-500 inline-block'></span>
                        Partial Booking ({Object.keys(calendarInfo.trialTimeSlots).length})
                      </span>
                    )}
                    {calendarInfo.laundryHoldDates.length > 0 && (
                      <span className='flex items-center gap-1'>
                        <span className='w-3 h-3 rounded-full bg-blue-500 inline-block'></span>
                        Laundry ({calendarInfo.laundryHoldDates.length})
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* EXTEND MODE: Only show return date/time (pickup is locked) */}
              {editMode === 'extend' && (
                <div>
                  <div className='p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900 mb-4'>
                    <p className='font-semibold'>Extending Reservation</p>
                    <p className='text-xs mt-1'>Pickup date and time remain the same. Only update the return date/time.</p>
                    <p className='text-xs mt-2'>
                      <strong>Rules:</strong> Same-day extension allows max 1 hour later. 
                      Next-day extension allows earlier return times, but not more than 1 hour later than pickup time.
                    </p>
                  </div>
                  
                  {/* Show current pickup info */}
                  <div className='mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg'>
                    <p className='text-xs font-semibold text-gray-700 mb-2'>Current Pickup:</p>
                    <div className='flex gap-4 text-sm'>
                      <div>
                        <span className='text-gray-600'>Date:</span>
                        <span className='font-semibold ml-1'>{form.pickupDate}</span>
                      </div>
                      <div>
                        <span className='text-gray-600'>Time:</span>
                        <span className='font-semibold ml-1'>{formatTime(form.pickupTime)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Return date/time fields */}
                  {((selectedBooking.status || '').toLowerCase() !== 'trial') && (
                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                      <div>
                        <label className='block text-sm font-semibold text-gray-700 mb-1'>New Return Date</label>
                        <input
                          type='date'
                          name='returnDate'
                          value={form.returnDate}
                          onChange={handleFormChange}
                          min={form.pickupDate || new Date().toISOString().split('T')[0]}
                          className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none'
                        />
                      </div>
                      <div>
                        <label className='block text-sm font-semibold text-gray-700 mb-1'>New Return Time</label>
                        <select
                          name='returnTime'
                          value={form.returnTime}
                          onChange={handleFormChange}
                          className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none'
                        >
                          {allowedTimes.map((t) => {
                            const timeMinutes = parseInt(t.split(':')[0]) * 60 + parseInt(t.split(':')[1])
                            const originalReturnTime = selectedBooking.returnTime || selectedBooking.pickupTime || '09:00'
                            const originalReturnMinutes = parseInt(originalReturnTime.split(':')[0]) * 60 + parseInt(originalReturnTime.split(':')[1])
                            const originalReturnDate = toDateInputValue(selectedBooking.returnDate)
                            const originalPickupTime = selectedBooking.pickupTime || '09:00'
                            const originalPickupMinutes = parseInt(originalPickupTime.split(':')[0]) * 60 + parseInt(originalPickupTime.split(':')[1])
                            
                            // Same-day extension: only show times >= original return time and max 1 hour later
                            if (form.returnDate === originalReturnDate) {
                              if (timeMinutes < originalReturnMinutes) return null
                              if (timeMinutes > originalReturnMinutes + 60) return null
                            }
                            // Next-day extension: return time can be earlier but not more than 1 hour later than pickup time
                            else if (form.returnDate > originalReturnDate) {
                              // Allow earlier times, but not more than 1 hour later than pickup time
                              if (timeMinutes > originalPickupMinutes + 60) return null
                            }
                            
                            return <option key={t} value={t}>{formatTime(t)}</option>
                          })}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* RESCHEDULE MODE: Show calendar and time selection */}
              {editMode === 'reschedule' && (
                <div>
                  {/* Calendar Section */}
                  <div className='mb-4'>
                    <div className='flex items-center gap-2 mb-3'>
                      <svg className='w-5 h-5 text-gray-700' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' />
                      </svg>
                      <h3 className='text-base font-semibold text-gray-900'>Select Dates</h3>
                    </div>
                    
                    <div className='bg-white border border-gray-200 rounded-lg p-3'>
                      <div className='flex flex-wrap items-center justify-center gap-3 text-xs text-gray-600 mb-3'>
                        <span className='flex items-center gap-1'>
                          <span className='w-3 h-3 rounded-full bg-red-500 inline-block'></span>
                          Reserved
                        </span>
                        <span className='flex items-center gap-1'>
                          <span className='w-3 h-3 rounded-full bg-gray-500 inline-block'></span>
                          Trial
                        </span>
                        <span className='flex items-center gap-1'>
                          <span className='w-3 h-3 rounded-full bg-blue-500 inline-block'></span>
                          Laundry
                        </span>
                      </div>
                      
                      <div className='flex justify-center w-full'>
                        <DayPicker
                          mode={(selectedBooking.status || '').toLowerCase() === 'trial' ? 'single' : 'range'}
                          numberOfMonths={1}
                          selected={(selectedBooking.status || '').toLowerCase() === 'trial'
                            ? (form.pickupDate ? new Date(`${form.pickupDate}T00:00:00`) : undefined)
                            : {
                                from: form.pickupDate ? new Date(`${form.pickupDate}T00:00:00`) : undefined,
                                to: form.returnDate ? new Date(`${form.returnDate}T00:00:00`) : undefined,
                              }
                          }
                          onSelect={(sel) => {
                            if ((selectedBooking.status || '').toLowerCase() === 'trial') {
                              if (!sel) return
                              handleCalendarSelect({ from: sel, to: sel })
                            } else {
                              handleCalendarSelect(sel)
                            }
                            setTimeout(() => checkAvailability(), 100)
                          }}
                          disabled={(date) => {
                            const iso = toIsoDate(date)
                            if (isPastIsoDate(iso)) return true
                            const blocked = blockedReasonForDate(iso)
                            // Allow selection if it only has trial time slots (allowSelection flag)
                            if (blocked?.allowSelection) return false
                            return Boolean(blocked)
                          }}
                          modifiers={{
                            reserved: (date) => calendarInfo.unavailableDates.includes(toIsoDate(date)),
                            trial: (date) => Boolean(calendarInfo.trialTimeSlots[toIsoDate(date)]),
                            laundry: (date) => calendarInfo.laundryHoldDates.includes(toIsoDate(date)),
                          }}
                          modifiersClassNames={{
                            reserved: 'rdp-day_reserved',
                            trial: 'rdp-day_trial',
                            laundry: 'rdp-day_laundry',
                          }}
                        />
                      </div>
                      
                      <div className='mt-3 grid gap-2 text-center grid-cols-2'>
                        <div>
                          <p className='text-sm font-bold text-gray-900'>Pick-up</p>
                          <p className='text-sm font-bold text-gray-700 mt-0.5'>{form.pickupDate || '—'}</p>
                        </div>
                        {((selectedBooking.status || '').toLowerCase() !== 'trial') && (
                          <div>
                            <p className='text-sm font-bold text-gray-900'>Return</p>
                            <p className='text-sm font-bold text-gray-700 mt-0.5'>{form.returnDate || '—'}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Time Section */}
                  <div>
                    <div className='flex items-center gap-2 mb-3'>
                      <svg className='w-5 h-5 text-gray-700' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' />
                      </svg>
                      <h3 className='text-base font-semibold text-gray-900'>Time</h3>
                    </div>
                    
                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                      <div>
                        <label className='block text-sm font-medium text-gray-700 mb-1'>{(selectedBooking.status || '').toLowerCase() === 'trial' ? 'Try-on Time' : 'Pick-up Time'}</label>
                        <select
                          name='pickupTime'
                          value={form.pickupTime}
                          onChange={handleFormChange}
                          className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none'
                        >
                          {allowedTimes.map((t) => (
                            <option key={t} value={t}>{formatTime(t)}</option>
                          ))}
                        </select>
                      </div>
                      
                      {((selectedBooking.status || '').toLowerCase() !== 'trial') && (
                        <div>
                          <label className='block text-sm font-medium text-gray-700 mb-1'>Return Time</label>
                          <select
                            name='returnTime'
                            value={form.returnTime}
                            onChange={handleFormChange}
                            className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none'
                          >
                            {allowedTimes.map((t) => {
                              // If same day, only show times at least 1 hour after pickup
                              if (form.pickupDate === form.returnDate && form.pickupTime) {
                                const pickupMinutes = parseInt(form.pickupTime.split(':')[0]) * 60 + parseInt(form.pickupTime.split(':')[1])
                                const timeMinutes = parseInt(t.split(':')[0]) * 60 + parseInt(t.split(':')[1])
                                if (timeMinutes < pickupMinutes + 60) return null
                              }
                              return <option key={t} value={t}>{formatTime(t)}</option>
                            })}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Availability Status */}
              {(availabilityStatus.loading || availabilityStatus.message) && (
                <div className={`p-3 rounded-lg text-sm font-semibold ${
                  availabilityStatus.loading ? 'bg-blue-50 text-blue-800' :
                  availabilityStatus.valid ? 'bg-green-50 text-green-800' :
                  'bg-red-50 text-red-800'
                }`}>
                  {availabilityStatus.message}
                </div>
              )}

              {(selectedBooking.status || '').toLowerCase() === 'trial' && (
                <div className='p-3 bg-orange-50 border border-orange-200 rounded-lg text-xs sm:text-sm text-orange-900'>
                  Trial bookings are single-day appointments. Changing the trial date/time will update the schedule.
                </div>
              )}

              <div className='flex gap-2 pt-2'>
                <button
                  type='button'
                  onClick={submitReschedule}
                  disabled={saving || (availabilityStatus.message && !availabilityStatus.valid)}
                  className='flex-1 px-4 py-2.5 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dull disabled:bg-gray-400 disabled:cursor-not-allowed'
                >
                  {saving ? 'Saving...' : 'Save Changes'}
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
    </div>
  )
}

export default MyBookings
