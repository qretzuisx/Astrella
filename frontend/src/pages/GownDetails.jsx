import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/dist/style.css'
import { assets } from '../assets/assets'
import { API_URL, CURRENCY, EXTRA_DAY_FEE } from '../config'
import PaymentModal from '../components/PaymentModal'
import ContractModal from '../components/ContractModal'

const INTERVAL_MINUTES = 15

const minutesToTimeString = (totalMinutes) => {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
}

const normalizeTimeInput = (rawValue, openMinutes = 540, closeMinutes = 1140) => {
  if (!rawValue) {
    return { valid: false, message: 'Time is required.' }
  }

  const sanitized = rawValue.replace(/[^\d:]/g, '')
  // Accept HH:MM or HH:MM:SS (e.g. from type="time" which may include seconds)
  const match = sanitized.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
  if (!match) {
    return { valid: false, message: 'Please use the HH:MM format.' }
  }

  let hours = parseInt(match[1], 10)
  let minutes = parseInt(match[2], 10)
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return { valid: false, message: 'Invalid time provided.' }
  }

  let totalMinutes = hours * 60 + minutes

  if (totalMinutes < openMinutes) {
    return { valid: true, time: minutesToTimeString(openMinutes), autoAdjusted: true }
  }

  if (totalMinutes > closeMinutes) {
    return { valid: true, time: minutesToTimeString(closeMinutes), autoAdjusted: true }
  }

  const remainder = totalMinutes % INTERVAL_MINUTES
  if (remainder !== 0) {
    const roundedUp = totalMinutes + (INTERVAL_MINUTES - remainder)
    const roundedDown = totalMinutes - remainder
    totalMinutes = roundedUp <= closeMinutes ? roundedUp : roundedDown
    return { valid: true, time: minutesToTimeString(totalMinutes), autoAdjusted: true }
  }

  return { valid: true, time: minutesToTimeString(totalMinutes), autoAdjusted: false }
}

const GownDetails = () => {

  const { id } = useParams()
  const navigate = useNavigate()
  const [gown, setGown] = useState(null)
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
              if (profileData.success && profileData.owner) {
                setShopProfile(profileData.owner)
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

  const combineDateAndTime = (dateValue, timeValue) => {
    if (!dateValue || !timeValue) return null
    return new Date(`${dateValue}T${timeValue}`)
  }

  const setFieldError = (field, message) => {
    setFormErrors(prev => ({ ...prev, [field]: message }))
  }

  const toIsoDate = (dateObj) => {
    if (!dateObj) return ''
    const d = dateObj instanceof Date ? dateObj : new Date(dateObj)
    if (Number.isNaN(d.getTime())) return ''
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
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
    // - Base price covers up to 3 reserved days (pickup/use/return flow).
    // - Extra reserved days beyond 3 are charged +50/day.
    const start = new Date(`${pickupDate}T00:00:00`)
    const end = new Date(`${returnDate}T00:00:00`)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      setDurationDays(0)
      setTotalAmount(0)
      return
    }

    setFieldError('returnDate', '')
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
  // NOTE: Only disable booking if gown status is 'Unavailable' (owner's manual toggle).
  // Temporary statuses (In-Use, In-Laundry, Reserved) should NOT block future bookings.
  // Date-based availability is checked through scheduleStatus.valid.
  const gownIsManuallyUnavailable = gown?.status === 'Unavailable'
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
        const response = await fetch(`${API_URL}/bookings/calendar/${gownId}`)
        const data = await response.json()
        if (ignore) return
        if (response.ok && data.success) {
          setCalendarInfo({
            unavailableDates: data.calendar?.unavailableDates || [],
            trialTimeSlots: data.calendar?.trialTimeSlots || {},
            laundryHoldDates: data.calendar?.laundryHoldDates || [],
            laundryDays: data.calendar?.laundryDays || 0
          })
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
      <div className='px-4 sm:px-6 md:px-16 lg:px-24 xl:px-32 mt-12 sm:mt-16 flex items-center justify-center min-h-[60vh]'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-primary mx-auto mb-4'></div>
          <p className='text-lg sm:text-xl text-gray-500'>Loading gown details...</p>
        </div>
      </div>
    )
  }

  if (!gown) {
    return (
      <div className='px-4 sm:px-6 md:px-16 lg:px-24 xl:px-32 mt-12 sm:mt-16 flex items-center justify-center min-h-[60vh]'>
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
    <div className='px-4 sm:px-6 md:px-16 lg:px-24 xl:px-32 mt-12 sm:mt-16 mb-12 sm:mb-16 bg-[#FDFDFF] min-h-screen text-gray-800'>
      {/* Back Button */}
      <button 
        onClick={() => navigate(-1)} 
        className='flex items-center gap-2 mb-10 text-primary hover:text-secondary font-black transition-all hover:-translate-x-1 group'
      >
        <svg className="w-5 h-5 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        <span className="uppercase tracking-widest text-xs">Back to Catalog</span>
      </button>

      {/* Main Content */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-8'>
        {/* Left Column - Image and Descriptions */}
        <div className='w-full flex flex-col gap-10'>
          {/* Image Section */}
          <div className='relative rounded-[40px] overflow-hidden shadow-[0_40px_100px_rgba(1,62,141,0.12)] border border-primary/5 bg-white group'>
            <img
              src={Array.isArray(gown.image) ? gown.image[0] : gown.image}
              alt={gown.name}
              className='w-full h-auto max-h-[700px] object-cover transition-transform duration-1000 group-hover:scale-105'
            />
            
            {/* Status Badge */}
            <div className={`absolute top-8 left-8 px-8 py-3.5 rounded-2xl text-white font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl backdrop-blur-xl border border-white/20 ${
              gown?.status === 'Available' ? 'bg-primary/80' :
              gown?.status === 'Unavailable' ? 'bg-orange-500/80' :
              gown?.status === 'In-Laundry' ? 'bg-secondary/80' :
              gown?.status === 'Reserved' ? 'bg-pink-500/80' :
              'bg-gray-600/80'
            }`}>
              {gown.status}
            </div>
          </div>

          {/* Title and Owner Information */}
          <div className='space-y-6'>
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="px-3 py-1 bg-[#FF3B30]/5 text-[#FF3B30] text-[10px] font-black uppercase tracking-widest rounded-full">{gown.category || 'Apparel'}</span>
                <span className="w-1 h-1 bg-gray-200 rounded-full"></span>
                <span className="text-gray-400 text-xs font-bold">ID: {gown._id?.slice(-6).toUpperCase()}</span>
              </div>
              <h1 className='text-4xl sm:text-5xl font-black text-primary tracking-tight leading-tight mb-4'>{gown.name}</h1>
              <div className='flex items-center gap-4 py-6 border-y border-primary/5'>
                <div className='w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-[0_10px_20px_rgba(1,62,141,0.2)]'>
                  {(gown.owner?.shopName || gown.owner?.name || 'A')?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className='text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1'>Handpicked by</p>
                  <button
                    onClick={() => {
                      const ownerId = typeof gown.owner === 'object' ? (gown.owner._id || gown.owner.id) : gown.owner
                      navigate(`/owner-profile/${ownerId}`)
                    }}
                    className='text-primary hover:text-[#FFD700] font-black text-lg transition-colors'
                  >
                    {gown.owner ? (typeof gown.owner === 'object' ? (gown.owner.shopName || gown.owner.name) : gown.owner) : 'Boutique Partner'}
                  </button>
                </div>
              </div>
            </div>

            {/* Price section */}
            <div className='p-8 bg-white border border-primary/5 rounded-[32px] text-primary flex items-center justify-between shadow-[0_20px_60px_rgba(1,62,141,0.08)] overflow-hidden relative group backdrop-blur-xl'>
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-secondary/5 opacity-50"></div>
              <div className="relative z-10">
                <p className='text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2'>Daily Rental rate</p>
                <div className='text-4xl font-black flex items-baseline gap-2'>
                  <span className="text-[#FF3B30]">{currency}</span>
                  <span className='text-primary'>{(gown.pricePerDay || gown.price || 0).toLocaleString()}</span>
                </div>
              </div>
              <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
            </div>
          </div>

          {/* Info Grid */}
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-6'>
            <div className='p-8 bg-white rounded-[32px] border border-primary/5 shadow-[0_10px_40px_rgba(1,62,141,0.05)] group hover:shadow-[0_15px_60px_rgba(1,62,141,0.08)] transition-all duration-500 backdrop-blur-md hover:border-primary/10'>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-1 bg-gradient-to-r from-[#FFD700] to-yellow-500 rounded-full shadow-[0_0_10px_rgba(255,215,0,0.2)]"></div>
                <h2 className='text-[10px] font-black text-gray-400 uppercase tracking-widest'>Boutique Location</h2>
              </div>
              <p className='text-primary font-black text-lg'>{gown.location || 'Visit our physical store'}</p>
            </div>
            <div className='p-8 bg-white rounded-[32px] border border-primary/5 shadow-[0_10px_40px_rgba(1,62,141,0.05)] group hover:shadow-[0_15px_60px_rgba(1,62,141,0.08)] transition-all duration-500 backdrop-blur-md hover:border-primary/10'>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-1 bg-gradient-to-r from-[#FFD700] to-yellow-500 rounded-full shadow-[0_0_10px_rgba(255,215,0,0.2)]"></div>
                <h2 className='text-[10px] font-black text-gray-400 uppercase tracking-widest'>Direct Contact</h2>
              </div>
              <p className='text-primary font-black text-lg'>{gown.contactNumber || gown.contact || 'Inquire via Boutique'}</p>
            </div>
          </div>



          {/* Gown Specifications */}
          <div className='bg-white rounded-[32px] border border-primary/5 p-8 shadow-[0_20px_60px_rgba(1,62,141,0.06)] backdrop-blur-xl relative overflow-hidden'>
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/5 to-transparent rounded-full blur-3xl -mr-32 -mt-32"></div>
            <h2 className='text-xl font-black text-primary mb-8 flex items-center gap-3 relative z-10'>
              <div className="w-8 h-8 bg-gradient-to-tr from-[#FFD700] to-yellow-500 rounded-xl flex items-center justify-center shadow-[0_5px_15px_rgba(255,215,0,0.2)]">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              Specifications
            </h2>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-6 relative z-10'>
              {/* Material */}
              <div className='flex items-center gap-6 p-8 bg-white rounded-[32px] border border-primary/5 shadow-[0_10px_30px_rgba(1,62,141,0.03)] hover:border-[#FF3B30]/20 hover:shadow-[0_20px_50px_rgba(255,59,48,0.08)] transition-all duration-500 group/item'>
                <div className='bg-[#FF3B30]/5 p-5 rounded-2xl flex-shrink-0 group-hover/item:bg-[#FF3B30] transition-all duration-500'>
                  <img src={assets.fabric_icon} alt="fabric" className='w-8 h-8 grayscale opacity-40 group-hover/item:grayscale-0 group-hover/item:opacity-100 group-hover/item:invert transition-all' />
                </div>
                <div className='min-w-0'>
                  <p className='text-[10px] font-black text-[#FF3B30] uppercase tracking-widest mb-1 opacity-60'>Material</p>
                  <p className='text-primary font-black text-xl truncate'>{gown.fabric || 'Premium Blends'}</p>
                </div>
              </div>

              {/* Size */}
              <div className='flex items-center gap-6 p-8 bg-white rounded-[32px] border border-primary/5 shadow-[0_10px_30px_rgba(1,62,141,0.03)] hover:border-[#FF3B30]/20 hover:shadow-[0_20px_50px_rgba(255,59,48,0.08)] transition-all duration-500 group/item'>
                <div className='bg-[#FF3B30]/5 p-5 rounded-2xl flex-shrink-0 group-hover/item:bg-[#FF3B30] transition-all duration-500'>
                  <img src={assets.size_icon} alt="size" className='w-8 h-8 grayscale opacity-40 group-hover/item:grayscale-0 group-hover/item:opacity-100 group-hover/item:invert transition-all' />
                </div>
                <div className='min-w-0'>
                  <p className='text-[10px] font-black text-[#FF3B30] uppercase tracking-widest mb-1 opacity-60'>Available Size</p>
                  <p className='text-primary font-black text-xl truncate'>
                    {Array.isArray(gown.size) ? gown.size.join(', ') : gown.size}
                  </p>
                </div>
              </div>

              {/* Color */}
              <div className='flex items-center gap-6 p-8 bg-white rounded-[32px] border border-primary/5 shadow-[0_10px_30px_rgba(1,62,141,0.03)] hover:border-[#FF3B30]/20 hover:shadow-[0_20px_50px_rgba(255,59,48,0.08)] transition-all duration-500 group/item'>
                <div className='bg-[#FF3B30]/5 p-5 rounded-2xl flex-shrink-0 group-hover/item:bg-[#FF3B30] transition-all duration-500'>
                  <img src={assets.color_icon} alt="color" className='w-8 h-8 grayscale opacity-40 group-hover/item:grayscale-0 group-hover/item:opacity-100 group-hover/item:invert transition-all' />
                </div>
                <div className='min-w-0'>
                  <p className='text-[10px] font-black text-[#FF3B30] uppercase tracking-widest mb-1 opacity-60'>Available Tones</p>
                  <div className="flex items-center gap-3">
                    {(() => {
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
                      
                      const colorValue = gown.color;
                      let colors = [];
                      if (Array.isArray(colorValue)) colors = colorValue;
                      else if (typeof colorValue === 'string') colors = colorValue.split(',').map(c => c.trim());
                      else colors = [colorValue || '#eee'];
                      
                      return (
                        <div className="flex -space-x-2">
                          {colors.map((c, i) => {
                            const normalized = c.toLowerCase();
                            const hex = colorMap[normalized] || normalized;
                            return (
                              <div 
                                key={i} 
                                className={`w-8 h-8 rounded-full border-2 border-white shadow-md transition-transform hover:scale-110 cursor-help ${normalized === 'white' || normalized === 'off-white' || normalized === 'ivory' ? 'ring-1 ring-gray-100' : ''}`} 
                                style={{ backgroundColor: hex }} 
                                title={c} 
                              />
                            );
                          })}
                        </div>
                      )
                    })()}
                    <p className='text-primary font-black text-xl truncate capitalize'>{Array.isArray(gown.color) ? gown.color[0] : (gown.color || 'Custom')}</p>
                  </div>
                </div>
              </div>

              {/* Event Types */}
              <div className='flex items-center gap-6 p-8 bg-white rounded-[32px] border border-primary/5 shadow-[0_10px_30px_rgba(1,62,141,0.03)] hover:border-[#FF3B30]/20 hover:shadow-[0_20px_50px_rgba(255,59,48,0.08)] transition-all duration-500 group/item'>
                <div className='bg-[#FF3B30]/5 p-5 rounded-2xl flex-shrink-0 group-hover/item:bg-[#FF3B30] transition-all duration-500'>
                  <img src={assets.event_icon} alt="event" className='w-8 h-8 grayscale opacity-40 group-hover/item:grayscale-0 group-hover/item:opacity-100 group-hover/item:invert transition-all' />
                </div>
                <div className='min-w-0'>
                  <p className='text-[10px] font-black text-[#FF3B30] uppercase tracking-widest mb-1 opacity-60'>Best for</p>
                  <p className='text-primary font-black text-xl capitalize truncate'>
                    {Array.isArray(gown.eventType) && gown.eventType.length > 0
                      ? gown.eventType.join(', ')
                      : gown.eventtype || gown.eventType || 'All Occasions'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Details Section (Right Column) */}
        <div className='flex flex-col gap-8'>
          {/* Success/Error Notifications */}
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

          {/* Booking Card */}
          <div className='bg-white rounded-[40px] shadow-[0_40px_100px_rgba(1,62,141,0.1)] border border-primary/5 p-8 sm:p-10 relative overflow-hidden backdrop-blur-xl'>
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
            
            <h2 className='text-2xl font-black text-primary mb-8'>Reserve this Gown</h2>

            {/* Booking Type Selection */}
            <div className='mb-10'>
              <label className='block text-xs font-black text-gray-400 uppercase tracking-widest mb-4'>Select Experience</label>
              <div className='grid grid-cols-2 gap-4'>
                <button 
                  onClick={() => setBookingType('reservation')}
                  className={`flex flex-col gap-3 p-5 rounded-3xl border-2 transition-all text-left ${
                    bookingType === 'reservation' 
                    ? 'border-primary bg-primary/5 shadow-[inner_0_0_20px_rgba(1,62,141,0.05)]' 
                    : 'border-primary/5 hover:border-primary/20 bg-[#FDFDFF]'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${bookingType === 'reservation' ? 'bg-primary text-white shadow-[0_5px_15px_rgba(1,62,141,0.3)]' : 'bg-white text-gray-400 border border-primary/5'}`}>
                    <svg className="w-4 h-4 text-current" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className={`font-black text-sm ${bookingType === 'reservation' ? 'text-primary' : 'text-gray-400'}`}>Reservation</p>
                    <p className='text-[10px] text-gray-400 font-bold'>Standard Rental</p>
                  </div>
                </button>

                <button 
                  onClick={() => setBookingType('trial')}
                  className={`flex flex-col gap-3 p-5 rounded-3xl border-2 transition-all text-left group/trial ${
                    bookingType === 'trial' 
                    ? 'border-secondary bg-secondary/5 shadow-[inner_0_0_20px_rgba(67,97,238,0.05)]' 
                    : 'border-primary/5 hover:border-primary/20 bg-[#FDFDFF]'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${bookingType === 'trial' ? 'bg-secondary text-white shadow-[0_5px_15px_rgba(67,97,238,0.3)]' : 'bg-gray-200 text-gray-600 border border-gray-300 group-hover/trial:border-secondary/20'}`}>
                    <svg className="w-4 h-4 text-current" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </div>
                  <div>
                    <p className={`font-black text-sm ${bookingType === 'trial' ? 'text-secondary' : 'text-gray-600'}`}>Visit & Try-on</p>
                    <p className='text-[10px] text-gray-500 font-bold'>View in Person</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Date Selection Section */}
            <div className='mb-10'>
              <div className="flex items-center justify-between mb-4">
                <label className='block text-xs font-black text-gray-500 uppercase tracking-widest'>Select Schedule</label>
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

              <div className='bg-[#FDFDFF] border border-primary/5 shadow-inner rounded-[32px] p-6 relative'>
                {calendarLoading ? (
                  <div className="py-12 flex flex-col items-center justify-center opacity-50">
                    <div className="w-8 h-8 border-2 border-primary border-b-transparent rounded-full animate-spin mb-3"></div>
                    <p className='text-[10px] font-black text-primary uppercase tracking-widest'>Syncing Calendar...</p>
                  </div>
                ) : calendarError ? (
                  <p className='text-sm text-red-500 font-bold p-4 text-center'>{calendarError}</p>
                ) : (
                  <div className='flex justify-center w-full scale-90 sm:scale-100 origin-top [&_.rdp]:text-primary [&_.rdp-day]:w-9 [&_.rdp-day]:h-9 sm:[&_.rdp-day]:w-10 sm:[&_.rdp-day]:h-10 [&_.rdp-day_button]:text-primary [&_.rdp-day_button:disabled]:text-gray-300 [&_.rdp-nav_button]:text-primary [&_.rdp-nav_button:hover]:bg-primary/5 [&_.rdp-head_cell]:text-gray-400'>
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
                    <p className='text-[10px] font-black text-red-500 uppercase tracking-widest mb-1'>Date Unavailable</p>
                    <p className="text-orange-600 text-xs font-bold">{blockedClick.message}</p>
                  </div>
                )}
              </div>

              {/* Selected Dates Display */}
              {pickupDate && (
                <div className='mt-6 grid grid-cols-2 gap-4 animate-fade-in'>
                  <div className='p-6 bg-primary rounded-[32px] text-white shadow-[0_20px_50px_rgba(1,62,141,0.15)] relative overflow-hidden'>
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -mr-12 -mt-12"></div>
                    <p className='text-[10px] font-black text-white/60 uppercase tracking-widest mb-2 relative z-10'>{bookingType === 'trial' ? 'Visit Date' : 'Pickup Date'}</p>
                    <p className='text-base font-black text-white drop-shadow-sm relative z-10'>
                      {formatDateWithDay(pickupDate).split(',')[0]}
                    </p>
                    <p className='text-[10px] font-black text-white/80 uppercase tracking-widest mt-1 relative z-10'>
                      {formatDateWithDay(pickupDate).split(',')[1]}
                    </p>
                  </div>
                  {bookingType !== 'trial' && (
                    <div className='p-6 bg-white border border-primary/5 rounded-[32px] shadow-sm relative overflow-hidden'>
                      <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl -mr-12 -mt-12"></div>
                      <p className='text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 relative z-10'>Return Date</p>
                      <p className='text-base font-black text-primary relative z-10'>
                        {returnDate ? formatDateWithDay(returnDate).split(',')[0] : '—'}
                      </p>
                      <p className='text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1 relative z-10'>
                        {returnDate ? formatDateWithDay(returnDate).split(',')[1] : '—'}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Time Slot Selection */}
            <div className='mb-10'>
              <label className='block text-xs font-black text-gray-500 uppercase tracking-widest mb-4'>Select Preferred Time</label>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                <div className="space-y-2">
                  <p className='text-[10px] font-black text-gray-500 uppercase tracking-widest pl-2'>{bookingType === 'trial' ? 'Trial' : 'Pickup'}</p>
                  <select
                    value={pickupTime}
                    onChange={(e) => {
                      setPickupTime(e.target.value)
                      setFieldError('pickupTime', '')
                    }}
                    className={`w-full px-5 py-4 bg-[#FDFDFF] border rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none font-bold transition-all text-primary ${
                      formErrors.pickupTime ? 'border-red-500' : 'border-primary/10 focus:border-primary'
                    } appearance-none relative`}
                    style={{ backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23013E8D%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1.25rem top 50%', backgroundSize: '0.65rem auto' }}
                  >
                    <option value='' className='bg-white'>Slot</option>
                    {allowedTimes.map(time => {
                      if (pickupDate === toIsoDate(new Date())) {
                        const currentTime = new Date().toTimeString().slice(0, 5)
                        if (time < currentTime) return null
                      }
                      return <option key={time} value={time} className='bg-white'>{formatTimeLabel(time)}</option>
                    })}
                  </select>
                </div>
                
                {bookingType !== 'trial' && (
                  <div className="space-y-2">
                    <p className='text-[10px] font-black text-gray-500 uppercase tracking-widest pl-2'>Return</p>
                      <select
                        value={returnTime}
                        onChange={(e) => {
                          setReturnTime(e.target.value)
                          setFieldError('returnTime', '')
                        }}
                        className={`w-full px-5 py-4 bg-[#FDFDFF] border rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none font-bold transition-all text-primary ${
                          formErrors.returnTime ? 'border-red-500' : 'border-primary/10 focus:border-primary'
                        } appearance-none relative`}
                        style={{ backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23013E8D%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1.25rem top 50%', backgroundSize: '0.65rem auto' }}
                      >
                        <option value='' className='bg-white'>Slot</option>
                        {allowedTimes.map(time => {
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
              <div className='pt-8 border-t border-primary/10 space-y-4 animate-fade-in'>
                <div className='flex justify-between items-center text-xs font-black text-gray-400 uppercase tracking-widest'>
                  <span>Rental Period</span>
                  <span className='text-secondary'>{durationDays} Days</span>
                </div>
                <div className='flex justify-between items-center'>
                  <span className='text-lg font-black text-primary'>Total Amount</span>
                  <div className='text-3xl font-black text-primary flex items-baseline gap-1'>
                    <span className="text-secondary text-sm">{currency}</span>
                    <span>{(totalAmount || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Final Action Button */}
            <div className='mt-10 overflow-hidden rounded-[24px]'>
              {confirmDisabled && !loading && !success && (
                <div className='text-center p-3 bg-gray-50 border border-primary/5 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 rounded-xl'>
                  {gown?.status === 'Unavailable' ? 'Apparel Unavailable' : !isFormComplete ? 'Select Dates & Time' : hasFieldErrors ? 'Check Highlighted Errors' : !scheduleStatus.valid ? 'Schedule Conflict' : 'Verifying...'}
                </div>
              )}
              <button
                onClick={handleConfirmBooking}
                className={`w-full py-6 rounded-[24px] font-black text-base uppercase tracking-widest transition-all duration-500 relative flex items-center justify-center gap-3 active:scale-95 ${!confirmDisabled
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

          {/* Secondary Modals */}
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
      </div>
    </div>
  )
}

export default GownDetails