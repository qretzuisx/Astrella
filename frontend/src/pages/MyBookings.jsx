import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/dist/style.css'
import { assets } from '../assets/assets'
import { API_URL, CURRENCY } from '../config'
import { toIsoDate, formatDate, formatTime } from '../utils/dateUtils'



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
  const initialLoadRef = useRef(true)

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

  // Filtering state
  const [currentFilter, setCurrentFilter] = useState('All')
  
  // Custom Confirmation Modals
  const [cancelConfirmBooking, setCancelConfirmBooking] = useState(null)
  const [canceling, setCanceling] = useState(false)

  const currency = CURRENCY

  // Helper functions for calendar

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
      return { reason: 'trial', message: `Currently trying at ${bookedTimes}. (30-minute try-on slot)`, allowSelection: true }
    }

    if (calendarInfo.laundryHoldDates.includes(isoDate)) return { reason: 'laundry', message: 'Apparel not yet returned.' }
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
  }, [])

  const fetchBookings = async () => {
    try {
      setLoading(true)
      setError('')
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
          } catch (e) { }
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
      initialLoadRef.current = false
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
  const canCancelStatus = (booking) => {
    const status = (booking?.status || '').toLowerCase();
    // Only pending and trial can be canceled
    if (status !== 'pending' && status !== 'trial') return false;
    
    // Check if the pickup date is in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const pickupDate = new Date(booking.pickupDate);
    if (pickupDate < today) return false;

    return true;
  }

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

  const confirmCancel = async () => {
    if (!cancelConfirmBooking) return
    const id = cancelConfirmBooking._id || cancelConfirmBooking.id
    
    try {
      setCanceling(true)
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

      // Update local state in-place to reflect cancellation
      setBookings((prev) => 
        prev.map((b) => ((b._id || b.id) === id ? { ...b, status: 'canceled' } : b))
      )

      setSuccess('Booking canceled successfully')
      setTimeout(() => setSuccess(''), 3000)
      setCancelConfirmBooking(null)
    } catch (e) {
      console.error('Error canceling booking:', e)
      setError('An error occurred. Please try again.')
    } finally {
      setCanceling(false)
    }
  }

  const handleCancelClick = (booking) => {
    setCancelConfirmBooking(booking)
  }

  const continueToBook = (booking) => {
    const gownId = booking?.gown?._id || booking?.gown?.id || booking?.gown
    if (!gownId) return
    navigate(`/gown-details/${gownId}`)
  }



  // Get status badge color
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
      case 'completed':
        return 'bg-green-500/90 text-white'
      case 'pending':
        return 'bg-orange-500/90 text-white'
      case 'trial':
        return 'bg-gray-500/90 text-white'
      case 'canceled':
      case 'failed':
        return 'bg-red-500/90 text-white'
      default:
        return 'bg-gray-500/90 text-white'
    }
  }

  const allowedTimes = ALLOWED_TIMES

  // Show login required message if not authenticated
  if (showLoginRequired) {
    return (
      <div className='fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-[100] p-4 transition-all duration-300'>
        <div className='bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] max-w-md w-full p-8 sm:p-10 border border-white/40 relative overflow-hidden group'>
          {/* Decorative Background Elements */}
          <div className='absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-all duration-500'></div>
          <div className='absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-all duration-500'></div>

          <div className='relative z-10 text-center'>
            {/* Animated Icon Container */}
            <div className='w-20 h-20 bg-gradient-to-tr from-primary/10 to-blue-500/10 rounded-3xl flex items-center justify-center mx-auto mb-8 transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-sm border border-white/50'>
              <div className='w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-inner'>
                <svg className='w-8 h-8 text-primary' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' />
                </svg>
              </div>
            </div>

            <h2 className='text-3xl font-black text-gray-900 mb-4 tracking-tight leading-tight'>
              Login <span className='text-primary'>Required</span>
            </h2>
            <p className='text-gray-500 mb-10 leading-relaxed font-medium'>
              Unlock your personal boutique experience. Log in to view and manage your selected reservations.
            </p>

            <div className='flex flex-col gap-4'>
              <button
                onClick={() => {
                  setShowLoginRequired(false)
                  setShowLogin(true)
                }}
                className='w-full px-8 py-4 bg-primary text-white rounded-2xl hover:bg-primary/90 hover:shadow-[0_20px_40px_-12px_rgba(255,59,48,0.3)] transition-all duration-300 font-bold text-lg flex items-center justify-center group/btn active:scale-95'
              >
                Go to Login
                <svg className='w-5 h-5 ml-2 transform group-hover/btn:translate-x-1 transition-transform' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M13 7l5 5m0 0l-5 5m5-5H6' />
                </svg>
              </button>
              
              <button
                onClick={() => navigate('/')}
                className='w-full px-8 py-4 bg-white/50 text-gray-700 rounded-2xl border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all duration-300 font-bold text-lg active:scale-95'
              >
                Return to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return null
  }

  if (loading && initialLoadRef.current) {
    return (
      <div className='px-4 sm:px-6 md:px-16 lg:px-24 xl:px-32 mt-0 pt-3 sm:pt-4 flex items-center justify-center min-h-[60vh]'>
        <div className='text-center'>
          <p className='text-lg sm:text-xl text-gray-500 mb-4'>Loading your bookings...</p>
          <div className='animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-primary mx-auto'></div>
        </div>
      </div>
    )
  }

  return (
    <div className='px-4 sm:px-6 md:px-16 lg:px-24 xl:px-32 mt-0 pt-3 sm:pt-4 mb-12 sm:mb-16 pb-20 sm:pb-0 bg-[#FDFDFF] min-h-screen'>
      <div className='mb-10 lg:mb-12 flex flex-col sm:flex-row sm:items-end justify-between gap-4'>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-1 bg-primary rounded-full"></div>
            <span className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">Customer Space</span>
          </div>
          <div className="flex items-center justify-between sm:justify-start sm:gap-6">
            <h1 className='text-3xl sm:text-4xl md:text-5xl font-black text-primary-dull tracking-tight'>My Bookings</h1>
            {/* Refresh Button */}
            <button 
              onClick={() => {
                fetchBookings();
                const btn = document.getElementById('refresh-btn');
                if (btn) btn.classList.add('animate-spin-once');
                setTimeout(() => { if (btn) btn.classList.remove('animate-spin-once'); }, 1000);
              }}
              id="refresh-btn"
              className='p-2.5 sm:p-3 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:bg-gray-50 transition-all group'
              title="Refresh Bookings"
            >
              <svg className="w-5 h-5 text-primary group-hover:rotate-180 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
          <p className='text-sm sm:text-base text-gray-500 font-medium mt-2'>Track and manage your upcoming try-ons and reservations.</p>
        </div>
        <div className="hidden sm:flex items-center gap-3 bg-white p-2 rounded-2xl border border-gray-100 shadow-[0_10px_30px_rgba(1,62,141,0.05)] h-fit">
          <div className="p-2 bg-primary/5 rounded-xl">
             <img src={assets.calendar_icon_colored} alt="calendar" className="w-5 h-5" />
          </div>
          <div className="pr-4">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Current Date</p>
            <p className="text-xs font-bold text-primary-dull">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</p>
          </div>
        </div>
      </div>

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

      {/* Filter Tabs */}
      <div className='flex items-center gap-2 sm:gap-4 bg-white p-2 rounded-full border border-gray-100 shadow-[0_5px_15px_rgba(0,0,0,0.02)] mb-8 overflow-x-auto premium-scrollbar-yellow scroll-snap-x scroll-fade-edge focus:outline-none'>
        {['All', 'Trial', 'Pending', 'Confirmed', 'Completed', 'Canceled'].map((filter) => {
          const count = filter === 'All'
            ? bookings.length
            : bookings.filter(b => {
              const status = (b.status || '').toLowerCase()
              const type = (b.bookingType || '').toLowerCase()
              if (filter === 'Trial') return status === 'trial' || type === 'trial'
              return status === filter.toLowerCase()
            }).length

          const isActive = currentFilter === filter

          return (
            <button
              key={filter}
              onClick={() => setCurrentFilter(filter)}
              className={`flex-shrink-0 flex items-center gap-2 py-3 px-6 rounded-2xl transition-all duration-500 relative whitespace-nowrap font-black text-[10px] uppercase tracking-[0.15em] snap-start border ${isActive
                ? 'bg-white text-primary border-primary/20 shadow-[0_10px_25px_rgba(22,43,105,0.08)] hover:-translate-y-0.5'
                : 'bg-transparent text-gray-400 border-transparent hover:text-primary hover:bg-gray-50/50'
                }`}
            >
              <span>{filter}</span>
              {count > 0 && (
                <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black transition-colors duration-500 ${isActive
                  ? 'bg-primary/10 text-primary'
                  : 'bg-gray-100 text-gray-400 group-hover:bg-primary/5 group-hover:text-primary/60'
                  }`}>
                  {count}
                </span> 
              )}
            </button>
          )
        })}
      </div>

      {bookings.length === 0 ? (
        <div className='text-center py-12 sm:py-16 px-4'>
          <p className='text-lg sm:text-xl text-gray-500 mb-3 sm:mb-4'>No bookings found</p>
          <p className='text-sm sm:text-base text-gray-400'>Start booking apparel to see them here!</p>
        </div>
      ) : (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5'>
          {bookings
            .filter(booking => {
              if (currentFilter === 'All') return true
              const status = (booking.status || '').toLowerCase()
              const type = (booking.bookingType || '').toLowerCase()
              if (currentFilter === 'Trial') return status === 'trial' || type === 'trial'
              return status === currentFilter.toLowerCase()
            })
            .map((booking) => {
              const editable = isEditableStatus(booking)
              const cancelable = canCancelStatus(booking)
              const isTrial = (booking.status || '').toLowerCase() === 'trial' || (booking.bookingType || '').toLowerCase() === 'trial'

              return (
                <div
                  key={booking._id || booking.id}
                  className='bg-white rounded-[24px] sm:rounded-[32px] shadow-[0_10px_40px_rgba(0,0,0,0.04)] overflow-hidden hover:shadow-[0_20px_60px_rgba(1,62,141,0.12)] transition-all duration-500 group border border-blue-50/50 flex flex-col h-full'
                >
                  {/* Gown Image */}
                  <div
                    className='relative overflow-hidden bg-gray-50 cursor-pointer group'
                    onClick={() => continueToBook(booking)}
                  >
                    <img
                      src={Array.isArray(booking.gown?.image) ? booking.gown.image[0] : booking.gown?.image || assets.gown_image1}
                      alt={booking.gown?.name || 'Gown'}
                      loading="lazy"
                      className='w-full h-auto max-h-[110px] sm:max-h-[135px] md:max-h-[160px] object-contain p-2 sm:p-3 transition-transform duration-1000 group-hover:scale-110'
                    />
                    <div className={`absolute top-2.5 left-2.5 px-2.5 py-1.5 rounded-lg font-black text-[8px] sm:text-[9px] uppercase tracking-wider shadow-md backdrop-blur-md border border-white/20 transition-all duration-500 group-hover:translate-x-1 ${getStatusColor(booking.status)}`}>
                      {booking.status?.toUpperCase() || 'PENDING'}
                    </div>
                  </div>

                  {/* Booking Details */}
                  <div className='p-3 sm:p-4 flex flex-col flex-grow bg-white'>
                    <div className="mb-2">
                      <h3
                        className='text-base sm:text-lg font-black text-primary mb-0.5 break-words whitespace-normal leading-tight group-hover:text-secondary transition-colors duration-500 cursor-pointer'
                        onClick={() => continueToBook(booking)}
                      >
                        {booking.gown?.name || 'Gown Name'}
                      </h3>
                      <div className="flex items-center justify-between gap-2">
                        <p className='text-[8px] sm:text-[9px] font-bold text-gray-400 uppercase tracking-widest'>
                          by {booking.owner ? (typeof booking.owner === 'object' ? (booking.owner.shopName || booking.owner.name) : booking.owner) : 'Owner'}
                        </p>
                        <button
                          onClick={() => {
                            const ownerId = typeof booking.owner === 'object' ? (booking.owner._id || booking.owner.id) : booking.owner
                            if (ownerId) navigate(`/owner-profile/${ownerId}`)
                          }}
                          className="px-2.5 py-0.5 bg-primary/5 hover:bg-primary text-primary hover:text-white text-[8px] font-black uppercase tracking-tighter rounded-full border border-primary/10 transition-all shadow-sm shrink-0"
                        >
                          View Profile
                        </button>
                      </div>
                    </div>

                    {/* Rejection Reason Display */}
                    {(booking.status?.toLowerCase() === 'canceled' && booking.payment?.status?.toLowerCase() === 'rejected' && booking.payment?.rejectionReason) && (
                      <div className='mb-4 p-3 bg-red-50 border border-red-100 rounded-2xl'>
                        <p className='text-[8px] font-black text-red-800 uppercase tracking-widest mb-1'>Reason for rejection</p>
                        <p className='text-xs text-red-700 font-medium leading-relaxed'>{booking.payment.rejectionReason}</p>
                      </div>
                    )}

                    {/* Date/Status Information - Standardized Boxed Layout */}
                    <div className='space-y-3 mb-auto'>
                      {isTrial ? (
                        <div className='mb-4 p-4 rounded-2xl border bg-blue-50/50 border-blue-100 flex items-start gap-4 backdrop-blur-sm shadow-[0_5px_15px_rgba(1,62,141,0.03)]'>
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 shadow-sm mt-0.5">
                            <svg className='w-4 h-4 text-blue-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' />
                            </svg>
                          </div>
                          <div className='flex-1 min-w-0'>
                            <p className='text-[10px] sm:text-xs font-black uppercase tracking-widest text-blue-600/70 mb-1'>Try-on scheduled</p>
                            <p className='text-sm font-bold text-blue-900'>
                              {formatDate(booking.pickupDate)} at {formatTime(booking.pickupTime)}
                            </p>
                          </div>
                          <span className='text-[10px] sm:text-xs font-medium px-2 py-0.5 rounded-full bg-blue-200 text-blue-800'>
                            30 min slot
                          </span>
                        </div>
                      ) : (
                        <div className='bg-gray-50/50 rounded-2xl p-3.5 grid grid-cols-2 gap-x-4 border border-gray-100 relative overflow-hidden group/box'>
                          <div className='flex flex-col'>
                            <p className='text-[8px] font-black text-primary/30 uppercase tracking-widest mb-1'>Pickup</p>
                            <div className='flex items-center gap-2'>
                              <div className='min-w-0'>
                                <p className='text-[11px] font-black text-primary whitespace-nowrap leading-tight'>{formatDate(booking.pickupDate)}</p>
                                {booking.pickupTime && <p className='text-[9px] text-primary/40 font-bold uppercase tracking-wider mt-0.5'>{formatTime(booking.pickupTime)}</p>}
                              </div>
                            </div>
                          </div>
                          <div className='flex flex-col border-l border-gray-100 pl-4'>
                            <p className='text-[8px] font-black text-primary/30 uppercase tracking-widest mb-1'>Return</p>
                            <div className='flex items-center gap-2'>
                              <div className='min-w-0'>
                                <p className='text-[11px] font-black text-primary whitespace-nowrap leading-tight'>{formatDate(booking.returnDate)}</p>
                                {(booking.returnTime || booking.pickupTime) && <p className='text-[9px] text-secondary/40 font-bold uppercase tracking-wider mt-0.5'>{formatTime(booking.returnTime || booking.pickupTime)}</p>}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Return reminder */}
                      {!isTrial && (booking.status || '').toLowerCase() === 'confirmed' && booking.returnDate && (() => {
                        const today = toIsoDate(new Date())
                        const retDate = toIsoDate(new Date(booking.returnDate))
                        if (retDate !== today) return null
                        const retTime = booking.returnTime || booking.pickupTime || '09:00'
                        const now = new Date()
                        const nowMinutes = now.getHours() * 60 + now.getMinutes()
                        const [h, m] = retTime.split(':').map(Number)
                        const returnMinutes = (h || 0) * 60 + (m || 0)
                        
                        if (nowMinutes >= returnMinutes) {
                          return (
                            <div className='mt-4 p-4 bg-orange-50 border border-orange-100 rounded-2xl flex items-start gap-3'>
                              <svg className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                              <p className='text-xs font-bold text-orange-800 leading-relaxed'>Please return the apparel to the boutique within the next 2 hours.</p>
                            </div>
                          )
                        }
                        return null
                      })()}
                    </div>

                    {/* Footer Info: Price & Specific Actions */}
                    <div className='pt-3 border-t border-gray-50 mt-3'>
                      {!isTrial && (
                        <div className='flex justify-between items-center mb-3'>
                          <span className='text-[9px] font-black text-gray-400 uppercase tracking-widest'>Total Amount</span>
                          <span className='text-xl font-black text-primary flex items-baseline gap-0.5'>
                            <span className="text-xs opacity-40">{currency}</span>
                            {booking.price?.toLocaleString() || '0'}
                          </span>
                        </div>
                      )}

                      <div className='flex flex-col gap-2'>
                        {/* Status Specific Global Actions */}
                        <div className='grid grid-cols-2 gap-2'>
                          <button
                            type='button'
                            onClick={() => openEdit(booking, 'reschedule')}
                            disabled={!editable}
                            className={`h-11 rounded-xl text-xs font-black uppercase tracking-widest border transition-all ${editable
                              ? 'border-primary/20 text-primary bg-white hover:bg-primary hover:text-white hover:border-primary shadow-lg shadow-primary/5 active:scale-95'
                              : 'border-gray-100 text-gray-300 cursor-not-allowed bg-gray-50/50'
                              }`}
                          >
                            Reschedule
                          </button>
                          <button
                            type='button'
                            onClick={() => handleCancelClick(booking)}
                            disabled={!cancelable}
                            className={`h-11 rounded-xl text-xs font-black uppercase tracking-widest border transition-all ${cancelable 
                              ? 'border-red-100 text-red-500 bg-white hover:bg-red-500 hover:text-white hover:border-red-500 shadow-lg shadow-red-500/5 active:scale-95' 
                              : 'border-gray-100 text-gray-300 cursor-not-allowed bg-gray-50/50'
                              }`}
                          >
                            Cancel
                          </button>
                        </div>


                        {isTrial && (
                          <button
                            type='button'
                            onClick={() => continueToBook(booking)}
                            className='h-11 bg-primary text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all'
                          >
                            Continue to Book
                          </button>
                        )}

                        {!editable && !['canceled', 'expired'].includes((booking.status || '').toLowerCase()) && (
                          <div className='flex items-center justify-center gap-1.5 p-2 bg-gray-50 rounded-lg'>
                            <div className="w-1.5 h-1.5 rounded-full bg-gray-300"></div>
                            <p className='text-[9px] font-black text-gray-400 uppercase tracking-widest'>Viewing Only</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
        </div>
      )}

      {/* Edit Modal */}
      {editOpen && selectedBooking && (() => {
        const isTrial = (selectedBooking.status || '').toLowerCase() === 'trial'
        return (
          <div className='fixed inset-0 bg-primary/20 backdrop-blur-sm flex items-end sm:items-center justify-center z-[110] p-0 sm:p-4' onClick={closeEdit}>
            <div
              className='bg-white w-full sm:max-w-lg shadow-[0_30px_60px_rgba(1,62,141,0.15)] flex flex-col rounded-t-3xl sm:rounded-3xl max-h-[100dvh] sm:max-h-[90vh] overflow-hidden border border-white/50 relative mobile-full-modal'
              onClick={(e) => e.stopPropagation()}
            >
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2"></div>
              
              {/* Sticky Header */}
              <div className='flex items-center justify-between gap-4 px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-100 flex-shrink-0 bg-white/80 backdrop-blur-md'>
                <div className='min-w-0'>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-4 h-1 bg-primary rounded-full"></div>
                    <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">{editMode === 'extend' ? 'Time Management' : 'Booking Update'}</span>
                  </div>
                  <h2 className='text-xl font-black text-primary-dull truncate tracking-tight'>
                    {editMode === 'extend' ? 'Extend Reservation' : isTrial ? 'Reschedule Try-On' : 'Reschedule Reservation'}
                  </h2>
                </div>
                <button
                  className='w-10 h-10 flex items-center justify-center rounded-2xl hover:bg-gray-50 text-gray-400 hover:text-primary transition-colors flex-shrink-0 shadow-sm border border-transparent hover:border-gray-100'
                  onClick={closeEdit}
                >
                  <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M6 18L18 6M6 6l12 12' />
                  </svg>
                </button>
              </div>

              {/* Scrollable Body */}
              <div className='overflow-y-auto flex-1 min-h-0 px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6'>

                {/* EXTEND MODE */}
                {editMode === 'extend' && (
                  <>
                    <div className='p-3 bg-blue-50 border border-blue-100 rounded-lg'>
                      <p className='text-sm font-semibold text-blue-900'>Extending Reservation</p>
                      <p className='text-xs text-blue-700 mt-1'>Pickup stays the same. Only update return date/time.</p>
                      <p className='text-xs text-blue-600 mt-1'>
                        <strong>Rules:</strong> Same-day max 1 hour later. Next-day allows earlier times, max 1 hour after pickup.
                      </p>
                    </div>

                    {/* Current Pickup Info */}
                    <div className='flex items-center gap-3 p-3 bg-gray-50 rounded-lg'>
                      <div className='w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0'>
                        <svg className='w-4 h-4 text-gray-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' />
                        </svg>
                      </div>
                      <div className='min-w-0'>
                        <p className='text-xs text-gray-500'>Current Pickup</p>
                        <p className='text-sm font-semibold text-gray-900'>{form.pickupDate} · {formatTime(form.pickupTime)}</p>
                      </div>
                    </div>

                    {/* Return date/time fields */}
                    {!isTrial && (
                      <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                        <div>
                          <label className='block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5'>New Return Date</label>
                          <input
                            type='date'
                            name='returnDate'
                            value={form.returnDate}
                            onChange={handleFormChange}
                            min={form.pickupDate || new Date().toISOString().split('T')[0]}
                            className='w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none text-sm transition-colors'
                          />
                        </div>
                        <div>
                          <label className='block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5'>New Return Time</label>
                          <select
                            name='returnTime'
                            value={form.returnTime}
                            onChange={handleFormChange}
                            className='w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none text-sm transition-colors'
                          >
                            {allowedTimes.map((t) => {
                              const timeMinutes = parseInt(t.split(':')[0]) * 60 + parseInt(t.split(':')[1])
                              const originalReturnTime = selectedBooking.returnTime || selectedBooking.pickupTime || '09:00'
                              const originalReturnMinutes = parseInt(originalReturnTime.split(':')[0]) * 60 + parseInt(originalReturnTime.split(':')[1])
                              const originalReturnDate = toDateInputValue(selectedBooking.returnDate)
                              const originalPickupTime = selectedBooking.pickupTime || '09:00'
                              const originalPickupMinutes = parseInt(originalPickupTime.split(':')[0]) * 60 + parseInt(originalPickupTime.split(':')[1])

                              if (form.returnDate === originalReturnDate) {
                                if (timeMinutes < originalReturnMinutes) return null
                                if (timeMinutes > originalReturnMinutes + 60) return null
                              } else if (form.returnDate > originalReturnDate) {
                                if (timeMinutes > originalPickupMinutes + 60) return null
                              }

                              return <option key={t} value={t}>{formatTime(t)}</option>
                            })}
                          </select>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* RESCHEDULE MODE */}
                {editMode === 'reschedule' && (
                  <>
                    {/* Calendar */}
                    <div>
                      <div className='flex items-center gap-2 mb-3'>
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                          <svg className='w-3 h-3 text-primary' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' />
                          </svg>
                        </div>
                        <h3 className='text-sm font-black text-gray-900 uppercase tracking-widest'>{isTrial ? 'Select Date' : 'Select Dates'}</h3>
                      </div>

                      <div className='bg-white rounded-2xl sm:rounded-3xl p-3 sm:p-5 border border-gray-100 shadow-[0_10px_30px_rgba(0,0,0,0.03)]'>
                        {/* Legend */}
                        <div className='flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3 sm:mb-5'>
                          <span className='flex items-center gap-1.5'>
                            <span className='w-2 h-2 rounded-full bg-red-400 shadow-sm inline-block'></span>
                            Reserved
                          </span>
                          <span className='flex items-center gap-1.5'>
                            <span className='w-2 h-2 rounded-full bg-yellow-400 shadow-sm inline-block'></span>
                            Trial
                          </span>
                          <span className='flex items-center gap-1.5'>
                            <span className='w-2 h-2 rounded-full bg-blue-400 shadow-sm inline-block'></span>
                            Laundry
                          </span>
                        </div>

                        <div className='flex justify-center w-full'>
                          <DayPicker
                            mode={isTrial ? 'single' : 'range'}
                            numberOfMonths={1}
                            selected={isTrial
                              ? (form.pickupDate ? new Date(`${form.pickupDate}T00:00:00`) : undefined)
                              : {
                                from: form.pickupDate ? new Date(`${form.pickupDate}T00:00:00`) : undefined,
                                to: form.returnDate ? new Date(`${form.returnDate}T00:00:00`) : undefined,
                              }
                            }
                            onSelect={(sel) => {
                              if (isTrial) {
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

                        {/* Selected dates summary */}
                        <div className={`mt-3 sm:mt-5 grid gap-2 sm:gap-3 text-center ${isTrial ? 'grid-cols-1' : 'grid-cols-2'}`}>
                          <div className='bg-gray-50/80 rounded-xl sm:rounded-2xl py-2.5 sm:py-3 px-3 sm:px-4 border border-gray-100 shadow-inner'>
                            <p className='text-[9px] sm:text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-0.5 sm:mb-1'>{isTrial ? 'Trial Date' : 'Pick-up'}</p>
                            <p className='text-xs sm:text-base font-black text-gray-800'>{form.pickupDate || '—'}</p>
                          </div>
                          {!isTrial && (
                            <div className='bg-gray-50/80 rounded-xl sm:rounded-2xl py-2.5 sm:py-3 px-3 sm:px-4 border border-gray-100 shadow-inner'>
                              <p className='text-[9px] sm:text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-0.5 sm:mb-1'>Return</p>
                              <p className='text-xs sm:text-base font-black text-gray-800'>{form.returnDate || '—'}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Time Selection */}
                    <div>
                      <div className='flex items-center gap-2 mb-3'>
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                          <svg className='w-3 h-3 text-primary' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' />
                          </svg>
                        </div>
                        <h3 className='text-sm font-black text-gray-900 uppercase tracking-widest'>Time</h3>
                      </div>

                      <div className={`grid gap-3 sm:gap-4 ${isTrial ? 'grid-cols-1' : 'grid-cols-2'}`}>
                        <div>
                          <label className='block text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 sm:mb-1.5'>
                            {isTrial ? 'Try-on Time' : 'Pick-up Time'}
                          </label>
                          <select
                            name='pickupTime'
                            value={form.pickupTime}
                            onChange={handleFormChange}
                            className='w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-100 rounded-xl sm:rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none font-bold transition-all bg-gray-50/50 shadow-sm text-sm'
                          >
                            {allowedTimes.map((t) => (
                              <option key={t} value={t}>{formatTime(t)}</option>
                            ))}
                          </select>
                        </div>

                        {!isTrial && (
                          <div>
                            <label className='block text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 sm:mb-1.5'>Return Time</label>
                            <select
                              name='returnTime'
                              value={form.returnTime}
                              onChange={handleFormChange}
                              className='w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-100 rounded-xl sm:rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none font-bold transition-all bg-gray-50/50 shadow-sm text-sm'
                            >
                              {allowedTimes.map((t) => {
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

                    {/* Trial info */}
                    {isTrial && (
                      <div className='flex items-start gap-3 p-4 bg-amber-50/50 border border-amber-100 rounded-2xl backdrop-blur-sm shadow-[0_5px_15px_rgba(245,158,11,0.05)]'>
                        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 shadow-sm mt-0.5">
                          <svg className='w-4 h-4 text-amber-500' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' />
                          </svg>
                        </div>
                        <div>
                          <p className='text-[10px] font-black text-amber-600/70 uppercase tracking-widest mb-1'>Important</p>
                          <p className='text-sm font-bold text-amber-800 leading-relaxed'>
                            Trial bookings are single-day appointments. The try-on slot is 30 minutes long.
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Availability Status */}
                {(availabilityStatus.loading || availabilityStatus.message) && (
                  <div className={`p-4 rounded-2xl border flex items-center gap-3 shadow-sm backdrop-blur-sm transition-all duration-300 ${availabilityStatus.loading ? 'bg-blue-50/50 border-blue-100' :
                    availabilityStatus.valid ? 'bg-green-50/50 border-green-200 shadow-[0_5px_15px_rgba(34,197,94,0.05)]' :
                      'bg-red-50/50 border-red-200 shadow-[0_5px_15px_rgba(239,68,68,0.05)]'
                    }`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm mt-0.5 ${availabilityStatus.loading ? 'bg-blue-100 text-blue-600' :
                        availabilityStatus.valid ? 'bg-green-100 text-green-600' :
                          'bg-red-100 text-red-600'
                      }`}>
                      {availabilityStatus.loading && (
                        <div className='w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin'></div>
                      )}
                      {!availabilityStatus.loading && availabilityStatus.valid && (
                        <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M5 13l4 4L19 7' />
                        </svg>
                      )}
                      {!availabilityStatus.loading && !availabilityStatus.valid && (
                        <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M6 18L18 6M6 6l12 12' />
                        </svg>
                      )}
                    </div>
                    <div className='flex-1'>
                       <p className={`text-sm font-bold ${availabilityStatus.loading ? 'text-blue-800' :
                          availabilityStatus.valid ? 'text-green-800' : 'text-red-800'
                        }`}>
                        {availabilityStatus.message}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Sticky Footer */}
              <div className='flex gap-3 px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-100 flex-shrink-0 bg-white/80 backdrop-blur-md rounded-b-3xl pb-20 sm:pb-4'>
                <button
                  type='button'
                  onClick={closeEdit}
                  className='flex-1 px-4 py-3 border border-gray-200 text-gray-500 rounded-xl sm:rounded-2xl text-[10px] uppercase tracking-widest hover:bg-gray-50 hover:border-gray-300 transition-all font-black shadow-sm'
                >
                  Cancel
                </button>
                <button
                  type='button'
                  onClick={submitReschedule}
                  disabled={saving || (availabilityStatus.message && !availabilityStatus.valid)}
                  className='flex-[2] px-4 py-3 bg-primary text-white rounded-xl sm:rounded-2xl text-[10px] uppercase tracking-widest font-black shadow-[0_10px_30px_rgba(1,62,141,0.2)] hover:shadow-[0_15px_40px_rgba(1,62,141,0.3)] hover:bg-primary-dull disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none disabled:cursor-not-allowed transition-all'
                >
                  {saving ? 'Saving...' : 'Confirm Changes'}
                </button>
              </div>
            </div>
          </div>
        )
      })()}
      {/* Custom Cancellation Confirmation Modal */}
      {cancelConfirmBooking && (
        <div 
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-primary/20 backdrop-blur-md animate-fade-in"
          onClick={() => setCancelConfirmBooking(null)}
        >
          <div 
            className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl border border-white/50 relative overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Visual Decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2"></div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-3xl mb-6 flex items-center justify-center mx-auto shadow-inner">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              
              <h3 className="text-2xl font-black text-gray-800 mb-3 tracking-tight">Cancel Booking?</h3>
              <p className="text-gray-500 font-medium text-sm leading-relaxed mb-8">
                Are you sure you want to cancel your reservation for <span className="text-primary font-bold">{cancelConfirmBooking.gown?.name || 'this gown'}</span>? This cannot be undone.
              </p>
              
              <div className="flex flex-col gap-3">
                <button
                  onClick={confirmCancel}
                  disabled={canceling}
                  className="w-full py-4 bg-red-500 text-white rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-red-600 hover:shadow-lg hover:shadow-red-500/20 active:scale-95 transition-all text-center"
                >
                  {canceling ? 'Canceling...' : 'Yes, Cancel it'}
                </button>
                <button
                  onClick={() => setCancelConfirmBooking(null)}
                  disabled={canceling}
                  className="w-full py-4 bg-gray-50 text-gray-400 rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-gray-100 transition-all text-center"
                >
                  Go Back
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
