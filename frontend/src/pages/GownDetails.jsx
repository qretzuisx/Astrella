import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/dist/style.css'
import { assets } from '../assets/assets'
import { API_URL, CURRENCY, EXTRA_DAY_FEE } from '../config'
import PaymentModal from '../components/PaymentModal'
import ContractModal from '../components/ContractModal'
import { toIsoDate, formatDate, combineDateAndTime } from '../utils/dateUtils'
import { getColorHex, parseColors } from '../utils/colorUtils'

const INTERVAL_MINUTES = 15

// Simple client-side cache for gown calendar data (30s TTL)
const calendarCache = new Map();
const CACHE_TTL = 30000; 

/**
 * Converts total minutes from start of day to "HH:MM" string format.
 * Primarily used for generating selectable trial time slots within business hours.
 */
const minutesToTimeString = (totalMinutes) => {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

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


const GownDetails = () => {

  const { id } = useParams()
  const navigate = useNavigate()
  const [gown, setGown] = useState(null)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [loadingGown, setLoadingGown] = useState(true)
  const currency = CURRENCY
  const [measurements, setMeasurements] = useState({
    waist: '',
    hips: '',
    unit: 'inches' // default unit
  })
  const [pickupTime, setPickupTime] = useState('')
  const [returnTime, setReturnTime] = useState('')
  const [pickupDate, setPickupDate] = useState('')
  const [returnDate, setReturnDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [showContract, setShowContract] = useState(false)
  // State to store payment data
  const [paymentData, setPaymentData] = useState(null)
  const [formErrors, setFormErrors] = useState({})
  const [scheduleStatus, setScheduleStatus] = useState({ loading: false, message: '', valid: false })
  const [durationDays, setDurationDays] = useState(0)
  const [totalAmount, setTotalAmount] = useState(0)
  const [bookingType, setBookingType] = useState('reservation')
  const [calendarInfo, setCalendarInfo] = useState({ unavailableDates: [], trialTimeSlots: {}, laundryHoldDates: [], laundryDays: 0 })
  const [calendarLoading, setCalendarLoading] = useState(false)
  const [calendarError, setCalendarError] = useState('')
  const [blockedClick, setBlockedClick] = useState(null) // { date: 'YYYY-MM-DD', message: string }
  const [shopHours, setShopHours] = useState({
    openingTime: '09:00',
    closingTime: '19:00',
    availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  })
  const [shopProfile, setShopProfile] = useState(null)
  const [ownerContactNumber, setOwnerContactNumber] = useState('')
  const [ownerAddress, setOwnerAddress] = useState('')
  const [ownerName, setOwnerName] = useState('')

  useEffect(() => {
    const fetchGown = async () => {
      try {
        setLoadingGown(true)
        const response = await fetch(`${API_URL}/owner/gowns/${id}`)
        const data = await response.json()
        if (data.success && data.gown) {
          setGown(data.gown)
          // Fetch shop hours after setting the gown
          const ownerId = typeof data.gown.owner === 'object' ? (data.gown.owner._id || data.gown.owner.id) : data.gown.owner
          if (ownerId) {
            try {
              const hoursResponse = await fetch(`${API_URL}/user/operating-hours/${ownerId}`)
              const hoursData = await hoursResponse.json()
              if (hoursData.success && hoursData.operatingHours) {
                setShopHours({
                  openingTime: hoursData.operatingHours.openingTime || '09:00',
                  closingTime: hoursData.operatingHours.closingTime || '19:00',
                  availableDays: hoursData.operatingHours.availableDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
                })
              }
            } catch (hoursError) {
              console.error('Error fetching shop hours:', hoursError)
            }
            // Fetch full shop profile
            try {
              const profileResponse = await fetch(`${API_URL}/user/shop-profile/${ownerId}`)
              const profileData = await profileResponse.json()
              if (profileData.success) {
                setShopProfile(profileData.shopProfile)
                setOwnerName(profileData.ownerName || '')
                setOwnerContactNumber(profileData.ownerContactNumber || '')
                setOwnerAddress(profileData.shopProfile?.address || '')
              }
            } catch (profileError) {
              console.error('Error fetching shop profile:', profileError)
            }
          }
        } else {
          setError(data.message || 'Gown not found')
          navigate('/gowns')
        }
      } catch (error) {
        console.error('Error fetching gown:', error)
        setError('Failed to load gown details')
        navigate('/gowns')
      } finally {
        setLoadingGown(false)
      }
    }
    if (id) fetchGown()
  }, [id, navigate, API_URL])

  const allowedTimes = useMemo(() => {
    const openParts = shopHours.openingTime.split(':')
    const closeParts = shopHours.closingTime.split(':')
    const openMinutes = parseInt(openParts[0]) * 60 + parseInt(openParts[1])
    const closeMinutes = parseInt(closeParts[0]) * 60 + parseInt(closeParts[1])
    const times = []
    for (let minutes = openMinutes; minutes <= closeMinutes; minutes += INTERVAL_MINUTES) {
      times.push(minutesToTimeString(minutes))
    }
    return times
  }, [shopHours.openingTime, shopHours.closingTime])

  const formatTimeLabel = (timeValue) => {
    if (!timeValue) return ''
    const [hourString, minuteString] = timeValue.split(':')
    let hour = parseInt(hourString, 10)
    const minutes = parseInt(minuteString, 10)
    const period = hour >= 12 ? 'PM' : 'AM'
    hour = hour % 12 || 12
    return `${hour.toString().padStart(2, '0')}:${minuteString} ${period}`
  }


  const setFieldError = (field, message) => {
    setFormErrors(prev => ({ ...prev, [field]: message }))
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
      const bookedTimes = (trialSlots || []).map(slot => {
        const start = formatTimeAmPm(slot.start)
        const end = formatTimeAmPm(slot.end)
        return (slot.start === slot.end) ? start : `${start} - ${end}`
      }).join(', ')
      return { reason: 'trial', message: `Currently trying at ${bookedTimes}. (30-minute try-on slot)`, allowSelection: true }
    }

    if (calendarInfo.laundryHoldDates.includes(isoDate)) return { reason: 'laundry', message: 'Apparel not yet returned.' }
    return null
  }

  const isPastIsoDate = (isoDate) => {
    if (!isoDate) return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const d = new Date(`${isoDate}T00:00:00`)
    if (Number.isNaN(d.getTime())) return false
    return d < today
  }

  const handleCalendarSelect = (range) => {
    // clear any previous blocked click message when selecting valid dates
    if (blockedClick) setBlockedClick(null)
    // range can be undefined or { from, to }
    if (!range?.from) {
      setPickupDate('')
      setReturnDate('')
      setFieldError('pickupDate', 'Pick-up date is required.')
      return
    }

    const fromIso = toIsoDate(range.from)
    const reason = blockedReasonForDate(fromIso)
    if (reason) {
      if (reason.allowSelection) {
        // Trial time slots exist on this date, but the user can still book a different time.
        // Show the info via blockedClick (informational only), NOT via formErrors
        // (formErrors would block the availability validation from running).
        setBlockedClick({ date: fromIso, message: reason.message })
        // Fall through to normal selection logic below — the backend will check time-slot overlap.
      } else {
        // For reserved/laundry dates, show error and don't allow selection
        setFieldError('pickupDate', `${reason.message} Please choose another date.`)
        return
      }
    }

    setPickupDate(fromIso)
    setFieldError('pickupDate', '')

    // Trial: single-day appointment (no pickup/return range)
    if (bookingType === 'trial') {
      setReturnDate(fromIso)
      setFieldError('returnDate', '')
      return
    }

    if (!range.to) {
      setReturnDate(fromIso)
      setFieldError('returnDate', '')
      return
    }

    const toIso = toIsoDate(range.to)
    // Validate all dates in selected range are not blocked
    const cursor = new Date(range.from)
    const end = new Date(range.to)
    while (cursor <= end) {
      const iso = toIsoDate(cursor)
      const r = blockedReasonForDate(iso)
      // Skip dates that only have trial time slots (allowSelection) — backend handles time overlap
      if (r && !r.allowSelection) {
        setFieldError('returnDate', r.message)
        return
      }
      cursor.setDate(cursor.getDate() + 1)
    }

    setReturnDate(toIso)
    setFieldError('returnDate', '')
  }

  const handleTimeChange = (value, fieldSetter, fieldName) => {
    const result = normalizeTimeInput(value, businessHours.openMinutes, businessHours.closeMinutes)
    if (!result.valid) {
      fieldSetter('')
      setFieldError(fieldName, result.message)
      return
    }

    fieldSetter(result.time)
    setFieldError(fieldName, '')
    setError('')
  }

  // Handle confirm booking button click - show payment modal
  const handleConfirmBooking = () => {
    if (!pickupDate || !pickupTime || (bookingType !== 'trial' && !returnDate)) {
      setError(bookingType === 'trial'
        ? 'Please complete the trial date and time'
        : 'Please complete pickup date, return date, and pickup time')
      return
    }

    if (formErrors.pickupDate || formErrors.returnDate || formErrors.pickupTime) {
      setError('Please resolve the highlighted errors before continuing')
      return
    }

    if (!scheduleStatus.valid) {
      setError(scheduleStatus.message || 'Schedule conflicts with another booking')
      return
    }

    // Check if user is logged in
    const token = localStorage.getItem('token')
    if (!token) {
      setError('Please login to book a gown')
      return
    }

    setError('')

    // Trial booking: no payment, proceed directly to create booking
    if (bookingType === 'trial') {
      handleContractSubmit()
      return
    }

    setShowPayment(true)
  }

  // Handle payment continue - show contract modal
  const handlePaymentContinue = (paymentInfo) => {
    setPaymentData(paymentInfo)
    setShowPayment(false)
    setShowContract(true)
  }

  // Handle contract submit - create booking with payment data
  const handleContractSubmit = async () => {
    setShowContract(false)
    setLoading(true)
    setError('')

    try {
      const token = localStorage.getItem('token')

      // For trials, backend derives returnDate/returnTime automatically.
      // For reservations, we still provide returnDate (returnTime is assumed to match pickupTime).
      const pickupDateTime = combineDateAndTime(pickupDate, pickupTime)
      const returnDateTime = bookingType === 'trial'
        ? null
        : combineDateAndTime(returnDate, pickupTime)

      // Calculate deposit and remaining balance (reservation only)
      const depositAmount = Math.round(totalAmount * 0.5)
      const remainingBalance = totalAmount - depositAmount

      // Create FormData for file upload
      const formData = new FormData()
      formData.append('gown', gown._id || gown.id)
      // Use the chosen calendar date strings to avoid timezone shifting.
      formData.append('pickupDate', pickupDate)
      formData.append('pickupTime', pickupTime)

      if (bookingType !== 'trial') {
        formData.append('returnDate', returnDate)
        // Use returnTime if specified, otherwise default to pickupTime
        formData.append('returnTime', returnTime || pickupTime)
      }
      formData.append('measurements', JSON.stringify({
        waist: measurements.waist || null,
        hips: measurements.hips || null,
        unit: measurements.unit || 'inches'
      }))

      formData.append('bookingType', bookingType)

      // Reservation only: include payment information
      if (bookingType !== 'trial') {
        if (!paymentData) {
          throw new Error('Payment details are missing. Please complete payment to continue.')
        }
        const paymentMethod = paymentData.method || 'gcash'
        formData.append('payment', JSON.stringify({
          method: paymentMethod,
          depositAmount: depositAmount,
          totalAmount: totalAmount,
          remainingBalance: remainingBalance,
          transactionRef: paymentMethod === 'gcash' ? (paymentData?.referenceNumber || '') : undefined,
          status: 'pending'
        }))

        if (paymentMethod === 'gcash' && paymentData?.screenshot) {
          formData.append('paymentScreenshot', paymentData.screenshot)
        }
      }

      const response = await fetch(`${API_URL}/bookings/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
          // Don't set Content-Type for FormData, browser will set it with boundary
        },
        body: formData
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(true)
        // Navigate to My Bookings immediately and pass the created booking
        navigate('/my-bookings', { state: { newBooking: data.booking } })
      } else {
        setError(data.message || 'Failed to create booking')
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
      console.error('Booking error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Trials are single-day appointments; total is always 0
    if (bookingType === 'trial') {
      if (pickupDate && returnDate !== pickupDate) {
        setReturnDate(pickupDate)
      }
      setDurationDays(pickupDate ? 1 : 0)
      setTotalAmount(0)
      return
    }

    if (!pickupDate || !returnDate || !pickupTime) {
      setDurationDays(0)
      setTotalAmount(0)
      return
    }

    // Pricing model:
    // - Base price covers up to 3 reserved days (standard pickup, use, and return cycle).
    // - Extra reserved days beyond the initial 3 incur an extra fee per day.
    // - Note: Trial bookings are single-day appointments and have zero total amount.
    const start = new Date(`${pickupDate}T00:00:00`)
    const end = new Date(`${returnDate}T00:00:00`)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      setDurationDays(0)
      setTotalAmount(0)
      return
    }

    setFieldError('returnDate', '')
    // Calculate inclusive number of days in the rental range
    const diffDays = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1)
    setDurationDays(diffDays)

    const basePrice = gown?.pricePerDay || gown?.price || 0
    const extraDays = Math.max(0, diffDays - 3)
    setTotalAmount((basePrice || 0) + extraDays * EXTRA_DAY_FEE)
  }, [pickupDate, returnDate, pickupTime, returnTime, gown, bookingType])

  // Auto-populate return time when pickup time changes
  useEffect(() => {
    if (pickupTime && !returnTime) {
      setReturnTime(pickupTime)
    }
  }, [pickupTime, returnTime])

  useEffect(() => {
    const effectiveReturnDate = bookingType === 'trial' ? pickupDate : returnDate
    if (!(gown?._id || gown?.id) || !pickupDate || !effectiveReturnDate || !pickupTime) {
      setScheduleStatus({ loading: false, message: bookingType === 'trial' ? 'Select a trial date and pickup time to check availability.' : 'Select pickup and return dates and pickup time to check availability.', valid: false })
      return
    }

    if (formErrors.pickupDate || formErrors.returnDate || formErrors.pickupTime) {
      setScheduleStatus({ loading: false, message: 'Resolve date and time errors to check availability.', valid: false })
      return
    }

    let ignore = false
    const validateSchedule = async () => {
      setScheduleStatus({ loading: true, message: 'Checking availability…', valid: false })
      try {
        const response = await fetch(`${API_URL}/bookings/check-availability`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gownId: gown._id || gown.id,
            bookingType,
            pickupDate,
            ...(bookingType !== 'trial' ? { returnDate } : {}),
            pickupTime,
            ...(bookingType !== 'trial' ? { returnTime: returnTime || pickupTime } : {})
          })
        })
        const data = await response.json()
        if (!ignore) {
          if (response.ok && data.success) {
            // Backend returns { success: true, available: true/false }
            // success = API call worked; available = time slot is actually free
            if (data.available === false) {
              setScheduleStatus({
                loading: false,
                message: data.message || 'This time slot conflicts with an existing booking.',
                valid: false
              })
            } else {
              setScheduleStatus({ loading: false, message: 'Schedule is available.', valid: true })
            }
          } else {
            setScheduleStatus({
              loading: false,
              message: data.message || 'Schedule conflict found.',
              valid: false
            })
          }
        }
      } catch (err) {
        if (!ignore) {
          setScheduleStatus({ loading: false, message: 'Unable to verify schedule. Please try again.', valid: false })
        }
      }
    }

    validateSchedule()

    return () => {
      ignore = true
    }
  }, [
    API_URL,
    gown,
    pickupDate,
    returnDate,
    pickupTime,
    bookingType,
    formErrors.pickupDate,
    formErrors.returnDate,
    formErrors.pickupTime
  ])

  const hasFieldErrors = Object.values(formErrors).some(Boolean)
  const isFormComplete = bookingType === 'trial'
    ? Boolean(pickupDate && pickupTime)
    : Boolean(pickupDate && returnDate && pickupTime)
  // NOTE: Only disable booking if gown status is 'Unavailable' or 'Sold Out' (owner's manual toggle).
  // Temporary statuses (In-Use, In-Laundry, Reserved) should NOT block future bookings.
  // Date-based availability is checked through scheduleStatus.valid.
  const gownIsManuallyUnavailable = gown?.status === 'Unavailable' || gown?.status === 'Sold Out'
  const confirmDisabled = gownIsManuallyUnavailable
    || !isFormComplete
    || hasFieldErrors
    || !scheduleStatus.valid
    || scheduleStatus.loading
    || loading
    || success
    || loadingGown

  const gownId = gown?._id || gown?.id || ''

  // Format date with day name (MM-DD-YYYY, dayname). Parse date-only (YYYY-MM-DD) as local to avoid timezone shift.
  const formatDateWithDay = (dateString) => {
    if (!dateString) return ''
    const str = String(dateString).trim()
    const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/)
    const date = isoMatch
      ? new Date(parseInt(isoMatch[1], 10), parseInt(isoMatch[2], 10) - 1, parseInt(isoMatch[3], 10))
      : new Date(dateString)
    if (Number.isNaN(date.getTime())) return ''
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const dayName = days[date.getDay()]
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const year = date.getFullYear()
    return `${month}-${day}-${year}, ${dayName}`
  }

  const formatShortDate = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }

  useEffect(() => {
    if (!gownId) return
    let ignore = false
    const fetchCalendar = async () => {
      try {
        setCalendarLoading(true)
        setCalendarError('')
        
        // Check cache first
        const cached = calendarCache.get(gownId);
        if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
          setCalendarInfo(cached.data);
          setCalendarLoading(false);
          return;
        }

        const response = await fetch(`${API_URL}/bookings/calendar/${gownId}`)
        const data = await response.json()
        if (ignore) return
        if (response.ok && data.success) {
          const info = {
            unavailableDates: data.calendar?.unavailableDates || [],
            trialTimeSlots: data.calendar?.trialTimeSlots || {},
            laundryHoldDates: data.calendar?.laundryHoldDates || [],
            laundryDays: data.calendar?.laundryDays || 0
          };
          setCalendarInfo(info)
          // Store in cache
          calendarCache.set(gownId, { data: info, timestamp: Date.now() });
        } else {
          setCalendarError(data.message || 'Unable to load availability highlights.')
        }
      } catch (err) {
        if (!ignore) {
          setCalendarError('Unable to load availability highlights. Please try again later.')
        }
      } finally {
        if (!ignore) {
          setCalendarLoading(false)
        }
      }
    }

    fetchCalendar()
    return () => {
      ignore = true
    }
  }, [API_URL, gownId])


  if (loadingGown) {
    return (
      <div className='px-4 sm:px-6 md:px-16 lg:px-24 xl:px-32 mt-0 pt-12 sm:pt-16 flex items-center justify-center min-h-[60vh]'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-primary mx-auto mb-4'></div>
          <p className='text-lg sm:text-xl text-gray-500'>Loading gown details...</p>
        </div>
      </div>
    )
  }

  if (!gown) {
    return (
      <div className='px-4 sm:px-6 md:px-16 lg:px-24 xl:px-32 mt-0 pt-12 sm:pt-16 flex items-center justify-center min-h-[60vh]'>
        <div className='text-center'>
          <p className='text-lg sm:text-xl text-gray-500 mb-4'>Gown not found</p>
          <button
            onClick={() => navigate('/gowns')}
            className='px-5 sm:px-6 py-2 text-sm sm:text-base bg-primary text-white rounded-lg hover:bg-primary-dull transition-colors'
          >
            Back to Apparel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className='px-4 sm:px-8 lg:px-16 mt-0 pt-3 sm:pt-4 mb-8 sm:mb-12 pb-24 sm:pb-0 bg-[#FDFDFF] min-h-screen text-gray-800'>
      {/* ── Image Lightbox ── */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(10px)', animation: 'fadeIn 0.2s ease' }}
          onClick={() => setLightboxOpen(false)}
          onKeyDown={(e) => e.key === 'Escape' && setLightboxOpen(false)}
          tabIndex={-1}
        >
          {/* Close button */}
          <button
            className="absolute top-4 right-4 sm:top-6 sm:right-6 w-10 h-10 sm:w-12 sm:h-12 bg-white/10 hover:bg-white/25 border border-white/20 rounded-full flex items-center justify-center text-white transition-all duration-200 hover:scale-110 z-10"
            onClick={(e) => { e.stopPropagation(); setLightboxOpen(false); }}
            aria-label="Close image viewer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Gown name badge */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-white text-xs font-black uppercase tracking-widest whitespace-nowrap">
            {gown.name}
          </div>

          {/* Full-size image */}
          <img
            src={Array.isArray(gown.image) ? gown.image[0] : gown.image}
            alt={gown.name}
            className="max-w-[90vw] max-h-[85vh] w-auto h-auto object-contain rounded-2xl shadow-2xl select-none"
            style={{ animation: 'zoomIn 0.25s cubic-bezier(0.22,1,0.36,1)' }}
            onClick={(e) => e.stopPropagation()}
            draggable={false}
          />

          {/* Hint */}
          <p className="absolute bottom-5 left-1/2 -translate-x-1/2 text-white/40 text-[10px] font-bold uppercase tracking-widest">
            Click outside or press Esc to close
          </p>

          <style>{`
            @keyframes fadeIn  { from { opacity: 0 } to { opacity: 1 } }
            @keyframes zoomIn  { from { opacity: 0; transform: scale(0.88) } to { opacity: 1; transform: scale(1) } }
          `}</style>
        </div>
      )}
      {/* Back Button */}
      <button 
        onClick={() => navigate(-1)} 
        className='flex items-center gap-2 mb-3 sm:mb-4 text-primary hover:text-secondary font-black transition-all hover:-translate-x-1 group'
      >
        <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        <span className="uppercase tracking-widest text-[10px] sm:text-xs">Back to Catalog</span>
      </button>

      {/* Main Content */}
      <div className='flex flex-col lg:flex-row gap-4 lg:gap-6 relative lg:items-start'>
        {/* Left Column - Image and Descriptions */}
        <div className='w-full lg:w-1/2 flex flex-col gap-3 sm:gap-4'>
          {/* Image Section */}
          <div
            className='relative rounded-[24px] sm:rounded-[40px] overflow-hidden shadow-[0_40px_100px_rgba(1,62,141,0.12)] border border-primary/5 bg-white group cursor-zoom-in'
            onClick={() => setLightboxOpen(true)}
            title="Click to view full size"
          >
            <img
              src={Array.isArray(gown.image) ? gown.image[0] : gown.image}
              alt={gown.name}
              loading="lazy"
              className='w-full h-auto max-h-[350px] sm:max-h-[420px] object-contain transition-transform duration-1000 group-hover:scale-105'
            />

            {/* Status Pill Overlay */}
            <div className={`absolute top-3 left-3 sm:top-5 sm:left-5 px-3 sm:px-5 py-1.5 sm:py-2.5 rounded-xl sm:rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-[0.15em] shadow-xl backdrop-blur-md border border-white/20 transition-all duration-500 group-hover:translate-x-1 z-10 ${getStatusColor(gown.status || 'Available')}`}>
              {gown.status || 'Available'}
            </div>

            {/* Zoom hint overlay */}
            <div className="absolute bottom-3 right-3 sm:bottom-5 sm:right-5 flex items-center gap-1.5 bg-black/40 backdrop-blur-md text-white text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0zm-6-3v6m-3-3h6" />
              </svg>
              View Full Size
            </div>
          </div>

          {/* Title name and Price */}
          <div className="mb-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 bg-secondary/5 text-secondary text-[8px] font-black uppercase tracking-widest rounded-full">{gown.category || 'Apparel'}</span>
              <span className="w-1.5 h-1.5 bg-gray-200 rounded-full"></span>
              <span className="text-gray-400 text-[10px] font-bold">ID: {gown._id?.slice(-6).toUpperCase()}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <h1 className='text-xl sm:text-2xl font-black text-primary tracking-tight leading-tight'>{gown.name}</h1>
              <div className='text-xl font-black text-primary flex items-baseline gap-1 shrink-0 text-right'>
                <span className="text-secondary text-xs sm:text-sm">{currency}</span>
                <span>{(gown.pricePerDay || gown.price || 0).toLocaleString()}<span className="text-gray-400 text-[9px] sm:text-[10px] uppercase font-bold tracking-wider sm:ml-1">/ Day</span></span>
              </div>
            </div>
          </div>

          {/* Owner Information */}
          <div className='space-y-3 sm:space-y-4'>
            <div className='flex items-center justify-between py-2.5 sm:py-3 border-y border-primary/5'>
              <div className="flex items-center gap-3">
                <div className='w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center text-white font-black text-base shadow-[0_8px_16px_rgba(1,62,141,0.2)]'>
                  {(gown.owner?.shopName || gown.owner?.name || 'A')?.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col">
                  <p className='text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1'>by</p>
                  <button
                    onClick={() => {
                      const ownerId = typeof gown.owner === 'object' ? (gown.owner._id || gown.owner.id) : gown.owner
                      navigate(`/owner-profile/${ownerId}`)
                    }}
                    className='text-primary hover:text-secondary-light font-black text-sm sm:text-base transition-colors text-left'
                  >
                    {gown.owner ? (typeof gown.owner === 'object' ? (gown.owner.shopName || gown.owner.name) : gown.owner) : 'Boutique Partner'}
                  </button>
                </div>
              </div>
              
              <button
                onClick={() => {
                  const ownerId = typeof gown.owner === 'object' ? (gown.owner._id || gown.owner.id) : gown.owner
                  navigate(`/owner-profile/${ownerId}`)
                }}
                className='px-5 py-2.5 bg-primary/5 hover:bg-primary text-primary hover:text-white text-[10px] font-black uppercase tracking-widest rounded-full border border-primary/10 hover:border-primary transition-all flex items-center justify-center gap-2 group shadow-sm shrink-0'
              >
                View Profile
                <svg className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Info Cards - Compact Layout */}
          <div className='flex flex-col sm:flex-row gap-4'>
            <div className='flex-1 p-3 sm:p-4 bg-white rounded-2xl border border-primary/5 shadow-sm hover:shadow-md transition-all'>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-0.5 bg-secondary-light rounded-full"></div>
                <h2 className='text-[8px] sm:text-[9px] font-black text-gray-400 uppercase tracking-widest'>Location</h2>
              </div>
              <p className='text-primary font-black text-sm'>{ownerAddress || shopProfile?.address || gown.owner?.shopProfile?.address || gown.location || 'Physical Store'}</p>
            </div>
            <div className='flex-1 p-3 sm:p-4 bg-white rounded-2xl border border-primary/5 shadow-sm hover:shadow-md transition-all'>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-0.5 bg-secondary-light rounded-full"></div>
                <h2 className='text-[8px] sm:text-[9px] font-black text-gray-400 uppercase tracking-widest'>Contact</h2>
              </div>
              <p className='text-primary font-black text-sm'>{ownerContactNumber || shopProfile?.contactNumber || gown.owner?.shopProfile?.contactNumber || gown.owner?.contactNumber || gown.contactNumber || gown.contact || 'Inquire'}</p>
            </div>
          </div>



          {/* Gown Specifications */}
          <div className='bg-white rounded-2xl border border-primary/5 p-2.5 sm:p-3.5 shadow-sm relative overflow-hidden'>
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/5 to-transparent rounded-full blur-3xl -mr-32 -mt-32"></div>
            <h2 className='text-xs sm:text-sm font-black text-primary mb-2 flex items-center gap-2 relative z-10'>
              <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-tr from-secondary-light to-yellow-500 rounded-lg sm:rounded-xl flex items-center justify-center shadow-[0_5px_15px_rgba(221,175,41,0.2)]">
                <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              Specifications
            </h2>
            <div className='grid grid-cols-2 gap-2 relative z-10'>
              {/* Material */}
              <div className='flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2.5 p-2 sm:p-2.5 bg-white rounded-lg sm:rounded-xl border border-primary/5 shadow-[0_10px_30px_rgba(1,62,141,0.03)] hover:border-secondary/20 hover:shadow-[0_20px_50px_rgba(172,32,33,0.08)] transition-all duration-500 group/item'>
                <div className='bg-secondary/5 p-1.5 sm:p-2 rounded-lg flex-shrink-0 w-fit group-hover/item:bg-secondary transition-all duration-500'>
                  <img src={assets.fabric_icon} alt="fabric" className='w-4.5 h-4.5 sm:w-5 sm:h-5 grayscale opacity-40 group-hover/item:grayscale-0 group-hover/item:opacity-100 group-hover/item:invert transition-all' />
                </div>
                <div className='min-w-0'>
                  <p className='text-[9px] font-black text-secondary uppercase tracking-widest mb-0.5 opacity-60'>Material</p>
                  <p className='text-primary font-black text-xs sm:text-sm break-words leading-none'>{gown.fabric || 'Premium Blends'}</p>
                </div>
              </div>

              {/* Size */}
              <div className='flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2.5 p-2 sm:p-2.5 bg-white rounded-lg sm:rounded-xl border border-primary/5 shadow-[0_10px_30px_rgba(1,62,141,0.03)] hover:border-secondary/20 hover:shadow-[0_20px_50px_rgba(172,32,33,0.08)] transition-all duration-500 group/item'>
                <div className='bg-secondary/5 p-1.5 sm:p-2 rounded-lg flex-shrink-0 w-fit group-hover/item:bg-secondary transition-all duration-500'>
                  <img src={assets.size_icon} alt="size" className='w-4.5 h-4.5 sm:w-5 sm:h-5 grayscale opacity-40 group-hover/item:grayscale-0 group-hover/item:opacity-100 group-hover/item:invert transition-all' />
                </div>
                <div className='min-w-0'>
                  <p className='text-[9px] font-black text-secondary uppercase tracking-widest mb-0.5 opacity-60'>Available Size</p>
                  <p className='text-primary font-black text-xs sm:text-sm break-words leading-none'>
                    {Array.isArray(gown.size) ? gown.size.join(', ') : gown.size}
                  </p>
                </div>
              </div>

              {/* Color */}
              <div className='flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2.5 p-2 sm:p-2.5 bg-white rounded-lg sm:rounded-xl border border-primary/5 shadow-[0_10px_30px_rgba(1,62,141,0.03)] hover:border-secondary/20 hover:shadow-[0_20px_50px_rgba(172,32,33,0.08)] transition-all duration-500 group/item'>
                <div className='bg-secondary/5 p-1.5 sm:p-2 rounded-lg flex-shrink-0 w-fit group-hover/item:bg-secondary transition-all duration-500'>
                  <img src={assets.color_icon} alt="color" className='w-4.5 h-4.5 sm:w-5 sm:h-5 grayscale opacity-40 group-hover/item:grayscale-0 group-hover/item:opacity-100 group-hover/item:invert transition-all' />
                </div>
                <div className='min-w-0 overflow-hidden'>
                  <p className='text-[9px] font-black text-secondary uppercase tracking-widest mb-0.5 opacity-60'>Available Tones</p>
                  <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                      {(() => {
                        const colors = parseColors(gown.color);
                        return (
                          <div className="flex -space-x-1.5 flex-shrink-0">
                            {(colors || []).map((c, i) => {
                              const normalized = (c || '').toString().toLowerCase();
                              const hex = getColorHex(normalized);
                              return (
                                <div 
                                  key={i} 
                                  className={`w-5 h-5 rounded-full border border-white shadow-md transition-transform hover:scale-110 cursor-help ${normalized === 'white' || normalized === 'off-white' || normalized === 'ivory' ? 'ring-1 ring-gray-100' : ''}`} 
                                  style={{ backgroundColor: hex }} 
                                  title={c} 
                                />
                              );
                            })}
                          </div>
                        );
                      })()}
                    <p className='text-primary font-black text-xs sm:text-sm capitalize break-words leading-none'>{Array.isArray(gown.color) ? gown.color.join(', ') : (gown.color || 'Custom')}</p>
                  </div>
                </div>
              </div>

              {/* Event Types */}
              <div className='flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2.5 p-2 sm:p-2.5 bg-white rounded-lg sm:rounded-xl border border-primary/5 shadow-[0_10px_30px_rgba(1,62,141,0.03)] hover:border-secondary/20 hover:shadow-[0_20px_50px_rgba(172,32,33,0.08)] transition-all duration-500 group/item'>
                <div className='bg-secondary/5 p-1.5 sm:p-2 rounded-lg flex-shrink-0 w-fit group-hover/item:bg-secondary transition-all duration-500'>
                  <img src={assets.event_icon} alt="event" className='w-4.5 h-4.5 sm:w-5 sm:h-5 grayscale opacity-40 group-hover/item:grayscale-0 group-hover/item:opacity-100 group-hover/item:invert transition-all' />
                </div>
                <div className='min-w-0'>
                  <p className='text-[9px] font-black text-[#FF3B30] uppercase tracking-widest mb-0.5 opacity-60'>Best for</p>
                  <p className='text-primary font-black text-xs sm:text-sm capitalize break-words leading-none'>
                    {Array.isArray(gown.eventType) && gown.eventType.length > 0
                      ? gown.eventType.join(', ')
                      : gown.eventtype || gown.eventType || 'All Occasions'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Details Section (Right Column) Sticky on Desktop, Static/Bottom on Mobile */}
        <div className='w-full lg:w-1/2 flex flex-col gap-3 sm:gap-4 lg:sticky lg:top-4 h-fit pb-28 sm:pb-24 lg:pb-0'>
          {/* Success/Error Notifications */}
          {(success || error) && (
            <div className="space-y-4">
              {success && (
                <div className='p-6 bg-green-50 border border-green-200 rounded-[24px] animate-fade-in backdrop-blur-md'>
                  <div className='flex items-center gap-3'>
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white shadow-[0_5px_15px_rgba(34,197,94,0.3)]">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className='text-green-700 font-black'>Success! Redirecting to your dashboard...</p>
                  </div>
                </div>
              )}

              {error && (
                <div className='p-6 bg-red-50 border border-red-100 rounded-[24px] animate-shake backdrop-blur-md'>
                  <div className='flex items-center gap-3'>
                    <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white shadow-[0_5px_15px_rgba(239,68,68,0.3)]">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    <p className='text-red-700 font-black'>{error}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Booking Card - More compact padding */}
          <div className='bg-white rounded-[24px] shadow-lg border border-primary/5 p-4 sm:p-6 relative overflow-hidden'>
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
            <h2 className='text-lg sm:text-xl font-black text-primary mb-4 sm:mb-5'>Reserve this Apparel</h2>

            {/* Booking Type Selection */}
            <div className='mb-4 sm:mb-5'>
              <label className='block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 sm:mb-3'>Booking type</label>
              <div className='grid grid-cols-2 gap-2.5'>
                <button 
                  onClick={() => setBookingType('reservation')}
                  className={`flex flex-row items-center gap-2 p-2 sm:p-2.5 rounded-xl border-2 transition-all text-left ${
                    bookingType === 'reservation' 
                    ? 'border-primary bg-primary/5 shadow-[inner_0_0_20px_rgba(1,62,141,0.05)]' 
                    : 'border-primary/5 hover:border-primary/20 bg-[#FDFDFF]'
                  }`}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${bookingType === 'reservation' ? 'bg-primary text-white shadow-[0_5px_15px_rgba(1,62,141,0.3)]' : 'bg-white text-gray-400 border border-primary/5'}`}>
                    <svg className="w-3.5 h-3.5 text-current" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className={`font-black text-xs leading-tight mb-0.5 ${bookingType === 'reservation' ? 'text-primary' : 'text-gray-400'}`}>Reservation</p>
                    <p className='text-[9px] text-gray-400 font-bold leading-none'>Standard Rental</p>
                  </div>
                </button>

                <button 
                  onClick={() => setBookingType('trial')}
                  className={`flex flex-row items-center gap-2 p-2 sm:p-2.5 rounded-xl border-2 transition-all text-left group/trial ${
                    bookingType === 'trial' 
                    ? 'border-secondary bg-secondary/5 shadow-[inner_0_0_20px_rgba(67,97,238,0.05)]' 
                    : 'border-primary/5 hover:border-primary/20 bg-[#FDFDFF]'
                  }`}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${bookingType === 'trial' ? 'bg-secondary text-white shadow-[0_5px_15px_rgba(67,97,238,0.3)]' : 'bg-gray-200 text-gray-600 border border-gray-300 group-hover/trial:border-secondary/20'}`}>
                    <svg className="w-3.5 h-3.5 text-current" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className={`font-black text-xs leading-tight mb-0.5 ${bookingType === 'trial' ? 'text-secondary' : 'text-gray-600'}`}>Visit & Try-on</p>
                    <p className='text-[9px] text-gray-500 font-bold leading-none'>View in Person</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Date Selection Section */}
            <div className='mb-4 sm:mb-5'>
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <label className='block text-[10px] font-black text-gray-500 uppercase tracking-widest'>Select Schedule</label>
                <div className='flex items-center gap-4 text-[10px] font-black uppercase tracking-widest'>
                  <span className='flex items-center gap-1.5 text-[#EF4444]'>
                    <span className='w-2 h-2 rounded-full bg-[#EF4444] shadow-[0_0_5px_rgba(239,68,68,0.5)]'></span>
                    Reserved
                  </span>
                  <span className='flex items-center gap-1.5 text-[#6B7280]'>
                    <span className='w-2 h-2 rounded-full bg-[#6B7280] shadow-[0_0_5px_rgba(107,114,128,0.5)]'></span>
                    Trial
                  </span>
                  <span className='flex items-center gap-1.5 text-[#3B82F6]'>
                    <span className='w-2 h-2 rounded-full bg-[#3B82F6] shadow-[0_0_5px_rgba(59,130,246,0.5)]'></span>
                    Laundry
                  </span>
                </div>
              </div>

              <div className='bg-[#FDFDFF] border border-primary/5 shadow-inner rounded-2xl p-3 sm:p-4 relative'>
                {calendarLoading ? (
                  <div className="py-12 flex flex-col items-center justify-center opacity-50">
                    <div className="w-8 h-8 border-2 border-primary border-b-transparent rounded-full animate-spin mb-3"></div>
                    <p className='text-[10px] font-black text-primary uppercase tracking-widest'>Syncing Calendar...</p>
                  </div>
                ) : calendarError ? (
                  <p className='text-sm text-red-500 font-bold p-4 text-center'>{calendarError}</p>
                ) : (
                  <div className='flex justify-center w-full scale-80 sm:scale-90 origin-top [&_.rdp]:text-primary [&_.rdp-day]:w-7 [&_.rdp-day]:h-7 sm:[&_.rdp-day]:w-8 sm:[&_.rdp-day]:h-8 [&_.rdp-day_button]:text-primary [&_.rdp-day_button:disabled]:text-gray-300 [&_.rdp-nav_button]:text-primary [&_.rdp-nav_button:hover]:bg-primary/5 [&_.rdp-head_cell]:text-gray-400 [&_.rdp]:m-0 [&_.rdp-month]:gap-2 [&_.rdp-caption]:h-8 [&_.rdp-caption_label]:text-xs [&_.rdp-head_cell]:text-[10px] [&_.rdp-day]:text-[10px]'>
                    <DayPicker
                      mode={bookingType === 'trial' ? 'single' : 'range'}
                      numberOfMonths={1}
                      onDayClick={(day, modifiers) => {
                        const iso = toIsoDate(day)
                        if (isPastIsoDate(iso)) {
                          setBlockedClick({ date: iso, message: 'Select a future date.' })
                          return
                        }
                        const reason = blockedReasonForDate(iso)
                        if (reason && !reason.allowSelection) {
                          setBlockedClick({ date: iso, message: reason.message })
                        } else if (blockedClick) setBlockedClick(null)
                      }}
                      selected={bookingType === 'trial'
                        ? (pickupDate ? new Date(`${pickupDate}T00:00:00`) : undefined)
                        : {
                          from: pickupDate ? new Date(`${pickupDate}T00:00:00`) : undefined,
                          to: returnDate ? new Date(`${returnDate}T00:00:00`) : undefined,
                        }
                      }
                      onSelect={(sel) => {
                        if (bookingType === 'trial') {
                          if (!sel) return
                          handleCalendarSelect({ from: sel, to: sel })
                        } else {
                          handleCalendarSelect(sel)
                        }
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
                )}

                {blockedClick && (
                  <div className='mt-4 p-4 bg-red-50 border border-red-100 rounded-2xl animate-fade-in backdrop-blur-md'>
                    <p className='text-[10px] font-black text-secondary uppercase tracking-widest mb-1'>Date Unavailable</p>
                    <p className="text-orange-600 text-xs font-bold">{blockedClick.message}</p>
                  </div>
                )}
              </div>

              {/* Selected Dates Display */}
              {pickupDate && (
                <div className='mt-4 grid grid-cols-2 gap-3 animate-fade-in'>
                  <div className='p-3.5 sm:p-4 bg-primary rounded-2xl text-white shadow-[0_20px_50px_rgba(1,62,141,0.15)] relative overflow-hidden'>
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -mr-12 -mt-12"></div>
                    <p className='text-[10px] font-black text-white/60 uppercase tracking-widest mb-1 relative z-10'>{bookingType === 'trial' ? 'Visit Date' : 'Pickup Date'}</p>
                    <p className='text-sm sm:text-base font-black text-white drop-shadow-sm relative z-10'>
                      {formatDateWithDay(pickupDate).split(',')[0]}
                    </p>
                    <p className='text-[10px] font-black text-white/80 uppercase tracking-widest mt-0.5 relative z-10'>
                      {formatDateWithDay(pickupDate).split(',')[1]}
                    </p>
                  </div>
                  {bookingType !== 'trial' && (
                    <div className='p-3.5 sm:p-4 bg-white border border-primary/5 rounded-2xl shadow-sm relative overflow-hidden'>
                      <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl -mr-12 -mt-12"></div>
                      <p className='text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 relative z-10'>Return Date</p>
                      <p className='text-sm sm:text-base font-black text-primary relative z-10'>
                        {returnDate ? formatDateWithDay(returnDate).split(',')[0] : '—'}
                      </p>
                      <p className='text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5 relative z-10'>
                        {returnDate ? formatDateWithDay(returnDate).split(',')[1] : '—'}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Time Slot Selection */}
            <div className='mb-4 sm:mb-5'>
              <label className='block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2'>Select Preferred Time</label>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                <div className="space-y-1">
                  <p className='text-[10px] font-black text-gray-500 uppercase tracking-widest pl-2'>{bookingType === 'trial' ? 'Trial' : 'Pickup'}</p>
                  <select
                    value={pickupTime}
                    onChange={(e) => {
                      setPickupTime(e.target.value)
                      setFieldError('pickupTime', '')
                    }}
                    className={`w-full px-4 py-2.5 bg-[#FDFDFF] border rounded-xl focus:ring-4 focus:ring-primary/10 outline-none font-bold transition-all text-primary ${
                      formErrors.pickupTime ? 'border-secondary' : 'border-primary/10 focus:border-primary'
                    } appearance-none relative`}
                    style={{ backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23162B69%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1.25rem top 50%', backgroundSize: '0.65rem auto' }}
                  >
                    <option value='' className='bg-white'>Slot</option>
                    {(allowedTimes || []).map(time => {
                      if (pickupDate === toIsoDate(new Date())) {
                        const currentTime = new Date().toTimeString().slice(0, 5)
                        if (time < currentTime) return null
                      }
                      return <option key={time} value={time} className='bg-white'>{formatTimeLabel(time)}</option>
                    })}
                  </select>
                </div>
                
                {bookingType !== 'trial' && (
                  <div className="space-y-1">
                    <p className='text-[10px] font-black text-gray-500 uppercase tracking-widest pl-2'>Return</p>
                      <select
                        value={returnTime}
                        onChange={(e) => {
                          setReturnTime(e.target.value)
                          setFieldError('returnTime', '')
                        }}
                        className={`w-full px-4 py-2.5 bg-[#FDFDFF] border rounded-xl focus:ring-4 focus:ring-primary/10 outline-none font-bold transition-all text-primary ${
                          formErrors.returnTime ? 'border-red-500' : 'border-primary/10 focus:border-primary'
                        } appearance-none relative`}
                        style={{ backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23162B69%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem top 50%', backgroundSize: '0.6rem auto' }}
                      >
                        <option value='' className='bg-white'>Slot</option>
                        {(allowedTimes || []).map(time => {
                          if (pickupDate === returnDate && pickupTime && time < pickupTime) return null
                          if (returnDate === toIsoDate(new Date())) {
                            const currentTime = new Date().toTimeString().slice(0, 5)
                            if (time < currentTime) return null
                          }
                          return <option key={time} value={time} className='bg-white'>{formatTimeLabel(time)}</option>
                        })}
                      </select>
                  </div>
                )}
              </div>
              
              {(scheduleStatus.loading || scheduleStatus.message) && (
                <div className={`mt-4 p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 backdrop-blur-md ${
                    scheduleStatus.loading ? 'bg-primary/5 text-primary border border-primary/10' :
                    scheduleStatus.valid ? 'bg-green-50 text-green-700 border border-green-100' :
                    'bg-red-50 text-red-700 border border-red-100'
                  }`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    scheduleStatus.loading ? 'bg-primary animate-pulse' :
                    scheduleStatus.valid ? 'bg-green-500' :
                    'bg-red-500'
                  }`}></div>
                  {scheduleStatus.loading ? 'Verifying Availability...' : scheduleStatus.message}
                </div>
              )}
            </div>

            {/* Price Summary */}
            {bookingType !== 'trial' && durationDays > 0 && (
              <div className='pt-4 border-t border-primary/10 space-y-2 animate-fade-in'>
                <div className='flex justify-between items-center text-[10px] font-black text-gray-400 uppercase tracking-widest'>
                  <span>Rental Period</span>
                  <span className='text-secondary'>{durationDays} Days</span>
                </div>
                <div className='flex justify-between items-center'>
                  <span className='text-base font-black text-primary'>Total Amount</span>
                  <div className='text-2xl font-black text-primary flex items-baseline gap-1'>
                    <span className="text-secondary text-xs">{currency}</span>
                    <span>{(totalAmount || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Final Action Button */}
            <div className='mt-6 overflow-hidden rounded-xl sm:sticky sm:relative fixed bottom-20 sm:bottom-auto left-4 right-4 sm:left-auto sm:right-auto z-30 sm:z-auto'>
              {confirmDisabled && !loading && !success && (
                <div className='text-center p-2.5 bg-gray-50 border border-primary/5 text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 rounded-lg'>
                  {gown?.status === 'Unavailable' ? 'Apparel Unavailable' : !isFormComplete ? 'Select Dates & Time' : hasFieldErrors ? 'Check Highlighted Errors' : !scheduleStatus.valid ? 'Schedule Conflict' : 'Verifying...'}
                </div>
              )}
              <button
                onClick={handleConfirmBooking}
                className={`w-full py-3.5 sm:py-4.5 rounded-xl font-black text-sm uppercase tracking-widest transition-all duration-500 relative flex items-center justify-center gap-3 active:scale-95 ${!confirmDisabled
                    ? 'bg-primary text-white shadow-[0_15px_30px_rgba(1,62,141,0.2)] hover:shadow-[0_20px_40px_rgba(1,62,141,0.3)] hover:-translate-y-1 hover:bg-secondary'
                    : 'bg-gray-100 text-gray-400 border border-primary/5 cursor-not-allowed'
                  }`}
                disabled={confirmDisabled}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-b-white rounded-full animate-spin"></div>
                ) : success ? (
                  'Confirmed'
                ) : (
                  <>
                    <span>Confirm Booking</span>
                    {!confirmDisabled && (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    )}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Modals - Moved to Root to fix stacking context */}
      <PaymentModal
        showPayment={showPayment}
        setShowPayment={setShowPayment}
        total={totalAmount || (gown.pricePerDay || gown.price || 0)}
        onContinue={handlePaymentContinue}
      />
      <ContractModal
        showContract={showContract}
        setShowContract={setShowContract}
        onSubmit={handleContractSubmit}
      />
    </div>
  )
}

export default GownDetails