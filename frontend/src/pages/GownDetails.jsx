import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/dist/style.css'
import { assets } from '../assets/assets'
import PaymentModal from '../components/PaymentModal'
import ContractModal from '../components/ContractModal'

const BUSINESS_OPEN_MINUTES = 9 * 60 // 09:00 AM
const BUSINESS_CLOSE_MINUTES = 19 * 60 // 07:00 PM
const INTERVAL_MINUTES = 15

const minutesToTimeString = (totalMinutes) => {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
}

const normalizeTimeInput = (rawValue) => {
  if (!rawValue) {
    return { valid: false, message: 'Time is required.' }
  }

  const sanitized = rawValue.replace(/[^\d:]/g, '')
  if (!/^\d{1,2}:\d{2}$/.test(sanitized)) {
    return { valid: false, message: 'Please use the HH:MM format.' }
  }

  let [hours, minutes] = sanitized.split(':').map(Number)
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return { valid: false, message: 'Invalid time provided.' }
  }

  let totalMinutes = hours * 60 + minutes

  if (totalMinutes < BUSINESS_OPEN_MINUTES) {
    return { valid: true, time: minutesToTimeString(BUSINESS_OPEN_MINUTES), autoAdjusted: true }
  }

  if (totalMinutes > BUSINESS_CLOSE_MINUTES) {
    return { valid: true, time: minutesToTimeString(BUSINESS_CLOSE_MINUTES), autoAdjusted: true }
  }

  const remainder = totalMinutes % INTERVAL_MINUTES
  if (remainder !== 0) {
    const roundedUp = totalMinutes + (INTERVAL_MINUTES - remainder)
    const roundedDown = totalMinutes - remainder
    totalMinutes = roundedUp <= BUSINESS_CLOSE_MINUTES ? roundedUp : roundedDown
    return { valid: true, time: minutesToTimeString(totalMinutes), autoAdjusted: true }
  }

  return { valid: true, time: minutesToTimeString(totalMinutes), autoAdjusted: false }
}

const GownDetails = () => {

  const {id} = useParams()
  const navigate = useNavigate()
  const [gown, setGown] = useState(null)
  const [loadingGown, setLoadingGown] = useState(true)
  const currency = import.meta.env.VITE_CURRENCY || '₱'
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
  const [measurements, setMeasurements] = useState({
    waist: '',
    hips: '',
    unit: 'inches' // default unit
  })
  const [pickupTime, setPickupTime] = useState('')
  // Return time is excluded from the user form. Backend will default it from pickupTime.
  const [pickupDate, setPickupDate] = useState('')
  const [returnDate, setReturnDate] = useState('')
  const [eventName, setEventName] = useState('')
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
  const [calendarInfo, setCalendarInfo] = useState({ unavailableDates: [], trialHoldDates: [], laundryHoldDates: [], laundryDays: 0 })
  const [calendarLoading, setCalendarLoading] = useState(false)
  const [calendarError, setCalendarError] = useState('')
  const [blockedClick, setBlockedClick] = useState(null) // { date: 'YYYY-MM-DD', message: string }

  useEffect(() => {
    const fetchGown = async () => {
      try {
        setLoadingGown(true)
        const response = await fetch(`${API_URL}/owner/all-gowns`)
        const data = await response.json()
        
        if (data.success && data.gowns) {
          // Support both MongoDB (_id) and SQL (id) backends
          const foundGown = data.gowns.find(g => g._id === id || g.id == id)
          if (foundGown) {
            setGown(foundGown)
          } else {
            setError('Gown not found')
            navigate('/gowns')
          }
        } else {
          setError('Failed to load gown details')
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

    if (id) {
      fetchGown()
    }
  }, [id, navigate])

  const allowedTimes = useMemo(() => {
    const times = []
    for (let minutes = BUSINESS_OPEN_MINUTES; minutes <= BUSINESS_CLOSE_MINUTES; minutes += INTERVAL_MINUTES) {
      times.push(minutesToTimeString(minutes))
    }
    return times
  }, [])

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
    if (calendarInfo.trialHoldDates.includes(isoDate)) return { reason: 'trial', message: 'Trial hold date.' }
    if (calendarInfo.laundryHoldDates.includes(isoDate)) return { reason: 'laundry', message: 'Laundry/cleaning day.' }
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
      setFieldError('pickupDate', `${reason.message} Please choose another date.`)
      return
    }

    setPickupDate(fromIso)
    setFieldError('pickupDate', '')

    // Trial: auto-set return date
    if (bookingType === 'trial') {
      const autoReturn = new Date(range.from)
      autoReturn.setDate(autoReturn.getDate() + 2)
      setReturnDate(toIsoDate(autoReturn))
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
      if (r) {
        setFieldError('returnDate', `${r.message} Range contains blocked dates.`)
        return
      }
      cursor.setDate(cursor.getDate() + 1)
    }

    setReturnDate(toIso)
    setFieldError('returnDate', '')
  }

  const handleTimeChange = (value, fieldSetter, fieldName) => {
    const result = normalizeTimeInput(value)
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
    if (!pickupDate || !returnDate || !pickupTime) {
      setError('Please complete pickup date, return date, and pickup time')
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
      const pickupDateTime = combineDateAndTime(pickupDate, pickupTime)
      const effectiveReturnTime = pickupTime
      const returnDateTime = combineDateAndTime(returnDate, effectiveReturnTime)
      const token = localStorage.getItem('token')

      // Calculate deposit and remaining balance (reservation only)
      const depositAmount = Math.round(totalAmount * 0.5)
      const remainingBalance = totalAmount - depositAmount

      // Create FormData for file upload
      const formData = new FormData()
      formData.append('gown', gown._id || gown.id)
      formData.append('pickupDate', pickupDateTime?.toISOString())
      formData.append('returnDate', returnDateTime?.toISOString())
      formData.append('pickupTime', pickupTime)
      formData.append('returnTime', pickupTime)
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
    // For trials, auto-set return date to pickup+2 days and compute totals as 0
    if (bookingType === 'trial') {
      if (pickupDate) {
        const pickup = new Date(`${pickupDate}T00:00:00`)
        const autoReturn = new Date(pickup)
        autoReturn.setDate(autoReturn.getDate() + 2)
        const autoReturnStr = autoReturn.toLocaleDateString('en-CA')
        if (returnDate !== autoReturnStr) {
          setReturnDate(autoReturnStr)
        }
      }
      setDurationDays(2)
      setTotalAmount(0)
      return
    }

    if (!pickupDate || !returnDate || !pickupTime) {
      setDurationDays(0)
      setTotalAmount(0)
      return
    }

    const pickupDateTime = combineDateAndTime(pickupDate, pickupTime)
    const returnDateTime = combineDateAndTime(returnDate, pickupTime)

    if (!pickupDateTime || !returnDateTime) {
      setDurationDays(0)
      setTotalAmount(0)
      return
    }

    if (returnDateTime <= pickupDateTime) {
      setDurationDays(0)
      setTotalAmount(0)
      setFieldError('returnDate', 'Return date/time cannot be earlier than pickup date/time.')
      return
    }

    setFieldError('returnDate', '')
    const diffMs = returnDateTime - pickupDateTime
    const diffDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
    setDurationDays(diffDays)
    const pricePerDay = gown?.pricePerDay || gown?.price || 0
    setTotalAmount(diffDays * pricePerDay)
  }, [pickupDate, returnDate, pickupTime, gown, bookingType])

  useEffect(() => {
    if (!(gown?._id || gown?.id) || !pickupDate || !returnDate || !pickupTime) {
      setScheduleStatus({ loading: false, message: 'Select pickup and return dates and pickup time to check availability.', valid: false })
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
            pickupDate,
            returnDate,
            pickupTime,
            returnTime: pickupTime
          })
        })
        const data = await response.json()
        if (!ignore) {
          if (response.ok && data.success) {
            setScheduleStatus({ loading: false, message: 'Schedule is available.', valid: true })
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
    formErrors.pickupDate,
    formErrors.returnDate,
    formErrors.pickupTime
  ])

  const hasFieldErrors = Object.values(formErrors).some(Boolean)
  const isFormComplete = Boolean(pickupDate && returnDate && pickupTime)
  const confirmDisabled = !gown?.available
    || !isFormComplete
    || hasFieldErrors
    || !scheduleStatus.valid
    || scheduleStatus.loading
    || loading
    || success
    || loadingGown

  const gownId = gown?._id || gown?.id || ''

  // Format date with day name (MM-DD-YYYY, dayname format)
  const formatDateWithDay = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
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
            trialHoldDates: data.calendar?.trialHoldDates || [],
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
    <div className='px-4 sm:px-6 md:px-16 lg:px-24 xl:px-32 mt-12 sm:mt-16 mb-12 sm:mb-16'>
      {/* Back Button */}
      <button onClick={()=> navigate(-1)} className='flex items-center gap-2 mb-6 sm:mb-8 text-sm sm:text-base text-gray-500 cursor-pointer hover:text-gray-700 transition-colors'>
        <img src={assets.arrow_icon} alt="arrow" className='rotate-180 opacity-65 w-4 h-4 sm:w-5 sm:h-5'/>
        <span>Back to all apparel</span>
        </button> 

      {/* Main Content */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12'>
        {/* Left Column - Image and Measurements */}
        <div className='w-full flex flex-col gap-6 sm:gap-8'>
          {/* Image Section */}
          <div className='relative rounded-xl sm:rounded-2xl overflow-hidden shadow-xl bg-gray-100'>
            <img 
              src={Array.isArray(gown.image) ? gown.image[0] : gown.image} 
              alt={gown.name}
              className='w-full h-auto max-h-[400px] sm:max-h-[600px] object-contain'
            />
            {gown?.available && (
              <div className='absolute top-3 left-3 sm:top-4 sm:left-4 bg-green-500/90 backdrop-blur-sm text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-medium flex items-center gap-1.5 sm:gap-2'>
                <img src={assets.check_icon} alt="check" className='w-3 h-3 sm:w-4 sm:h-4' />
                Available Now
              </div>
            )}
            {!gown?.available && (
              <div className='absolute top-3 left-3 sm:top-4 sm:left-4 bg-red-500/90 backdrop-blur-sm text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-medium'>
                Currently Unavailable
              </div>
            )}
          </div>

          {/* Size Measurement Section */}
          <div>
            <div className='flex justify-between items-center mb-3 sm:mb-4'>
              <h2 className='text-lg sm:text-xl font-semibold text-gray-900'>Size Measurement</h2>
              <select
                value={measurements.unit}
                onChange={(e) => setMeasurements({...measurements, unit: e.target.value})}
                className='px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-xs sm:text-sm'
              >
                <option value='inches'>Inches</option>
                <option value='cm'>Centimeters</option>
              </select>
            </div>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-3'>
              <div>
                <label className='block text-xs sm:text-sm font-medium text-gray-700 mb-2'>
                  Waist (optional)
                </label>
                <div className='relative'>
                  <input
                    type='number'
                    value={measurements.waist}
                    onChange={(e) => setMeasurements({...measurements, waist: e.target.value})}
                    placeholder='Enter waist'
                    className='w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all'
                  />
                  <span className='absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-gray-500 text-xs sm:text-sm'>
                    {measurements.unit}
                  </span>
                </div>
              </div>
              <div>
                <label className='block text-xs sm:text-sm font-medium text-gray-700 mb-2'>
                  Hips (optional)
                </label>
                <div className='relative'>
                  <input
                    type='number'
                    value={measurements.hips}
                    onChange={(e) => setMeasurements({...measurements, hips: e.target.value})}
                    placeholder='Enter hips'
                    className='w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all'
                  />
                  <span className='absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-gray-500 text-xs sm:text-sm'>
                    {measurements.unit}
                  </span>
                </div>
              </div>
            </div>
            <p className='text-xs sm:text-sm text-gray-500 italic'>
              Note: Measurements are preferably done in-person for the best fit.
            </p>
          </div>

          {/* Gown Details Grid - Moved here */}
          <div>
            <h2 className='text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4'>Gown Details</h2>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4'>
              {/* Fabric */}
              <div className='flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-gray-50 rounded-lg'>
                <div className='bg-white p-2 sm:p-3 rounded-lg shadow-sm flex-shrink-0'>
                  <img src={assets.fabric_icon} alt="fabric" className='w-5 h-5 sm:w-6 sm:h-6' />
                </div>
                <div className='min-w-0'>
                  <p className='text-xs sm:text-sm text-gray-500 mb-0.5 sm:mb-1'>Fabric</p>
                  <p className='text-sm sm:text-base font-medium text-gray-900 truncate'>{gown.fabric}</p>
                </div>
              </div>

              {/* Size */}
              <div className='flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-gray-50 rounded-lg'>
                <div className='bg-white p-2 sm:p-3 rounded-lg shadow-sm flex-shrink-0'>
                  <img src={assets.size_icon} alt="size" className='w-5 h-5 sm:w-6 sm:h-6' />
                </div>
                <div className='min-w-0'>
                  <p className='text-xs sm:text-sm text-gray-500 mb-0.5 sm:mb-1'>Size</p>
                  <p className='text-sm sm:text-base font-medium text-gray-900 truncate'>
                    {Array.isArray(gown.size) ? gown.size.join(', ') : gown.size}
                  </p>
                </div>
              </div>

              {/* Color */}
              <div className='flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-gray-50 rounded-lg'>
                <div className='bg-white p-2 sm:p-3 rounded-lg shadow-sm flex-shrink-0'>
                  <img src={assets.color_icon} alt="color" className='w-5 h-5 sm:w-6 sm:h-6' />
                </div>
                <div className='min-w-0'>
                  <p className='text-xs sm:text-sm text-gray-500 mb-0.5 sm:mb-1'>Color</p>
                  <p className='text-sm sm:text-base font-medium text-gray-900 truncate'>{gown.color}</p>
                </div>
              </div>

              {/* Event Types */}
              <div className='flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-gray-50 rounded-lg'>
                <div className='bg-white p-2 sm:p-3 rounded-lg shadow-sm flex-shrink-0'>
                  <img src={assets.event_icon} alt="event" className='w-5 h-5 sm:w-6 sm:h-6' />
                </div>
                <div className='min-w-0'>
                  <p className='text-xs sm:text-sm text-gray-500 mb-0.5 sm:mb-1'>Event Type</p>
                  <p className='text-sm sm:text-base font-medium text-gray-900 capitalize truncate'>
                    {Array.isArray(gown.eventType) && gown.eventType.length > 0
                      ? gown.eventType.join(', ')
                      : gown.eventtype || gown.eventType || 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Details Section */}
        <div className='flex flex-col'>
          {/* Title and Owner */}
          <div className='mb-4 sm:mb-6'>
            <h1 className='text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2'>{gown.name}</h1>
            <p className='text-base sm:text-lg text-gray-600'>
              by{' '}
              <button
                onClick={() => {
                  const ownerId = typeof gown.owner === 'object' ? (gown.owner._id || gown.owner.id) : gown.owner
                  navigate(`/owner-profile/${ownerId}`)
                }}
                className='text-primary hover:text-primary-dull font-semibold hover:underline transition-colors'
              >
                {gown.owner ? (typeof gown.owner === 'object' ? (gown.owner.shopName || gown.owner.name) : gown.owner) : 'Unknown'}
              </button>
            </p>
          </div>

          {/* Price */}
          <div className='mb-4 sm:mb-6'>
            <p className='text-2xl sm:text-3xl font-bold text-primary'>
              {currency}{gown.pricePerDay?.toLocaleString() || gown.price?.toLocaleString()}
            </p>
          </div>

          {/* Location */}
          <div className='mb-6 sm:mb-8'>
            <h2 className='text-lg sm:text-xl font-semibold text-gray-900 mb-2 sm:mb-3'>Location</h2>
            <p className='text-sm sm:text-base text-gray-600 leading-relaxed'>{gown.location || 'Location not specified'}</p>
          </div>

          {/* Contact Number */}
          <div className='mb-6 sm:mb-8'>
            <h2 className='text-lg sm:text-xl font-semibold text-gray-900 mb-2 sm:mb-3'>Contact Number</h2>
            <p className='text-sm sm:text-base text-gray-600 leading-relaxed'>{gown.contactNumber || gown.contact || 'Contact not available'}</p>
          </div>

          {/* Category (if available) */}
          {gown.category && (
            <div className='mb-6 sm:mb-8'>
              <div className='inline-block px-3 sm:px-4 py-1.5 sm:py-2 bg-primary/10 text-primary rounded-full text-xs sm:text-sm font-medium'>
                {gown.category}
              </div>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className='mb-6 p-4 bg-green-50 border border-green-200 rounded-lg'>
              <div className='flex items-center gap-2'>
                <img src={assets.check_icon} alt="check" className='w-5 h-5 text-green-600' />
                <p className='text-green-800 font-medium'>Booking confirmed! Redirecting to My Bookings...</p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className='mb-6 p-4 bg-red-50 border border-red-200 rounded-lg'>
              <p className='text-red-800'>{error}</p>
            </div>
          )}

          {/* Booking Section */}
          <div className='border border-gray-200 rounded-xl p-4 sm:p-6 bg-gray-50'>
            <h2 className='text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6'>Booking Details</h2>
            
            {/* Booking Type */}
            <div className='mb-4 sm:mb-6'>
              <div className='flex items-center gap-2 mb-3 sm:mb-4'>
                <span className='inline-block w-2.5 h-2.5 rounded-full bg-primary'></span>
                <h3 className='text-base sm:text-lg font-semibold text-gray-900'>Booking Type</h3>
              </div>
              <div className='flex flex-col sm:flex-row gap-3'>
                <label className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer bg-white ${bookingType === 'reservation' ? 'border-primary ring-2 ring-primary/20' : 'border-gray-200'}`}>
                  <input
                    type='radio'
                    name='bookingType'
                    value='reservation'
                    checked={bookingType === 'reservation'}
                    onChange={() => setBookingType('reservation')}
                  />
                  <div>
                    <p className='font-semibold text-gray-900'>Reservation</p>
                    <p className='text-xs text-gray-500'>Standard rental booking</p>
                  </div>
                </label>
                <label className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer bg-white ${bookingType === 'trial' ? 'border-primary ring-2 ring-primary/20' : 'border-gray-200'}`}>
                  <input
                    type='radio'
                    name='bookingType'
                    value='trial'
                    checked={bookingType === 'trial'}
                    onChange={() => setBookingType('trial')}
                  />
                  <div>
                    <p className='font-semibold text-gray-900'>2-day Trial</p>
                    <p className='text-xs text-gray-500'>Try the dress in-store (hold is temporary)</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Date Selection */}
            <div className='mb-4 sm:mb-6'>
              <div className='flex items-center gap-2 mb-3 sm:mb-4'>
                <img src={assets.calendar_icon_colored} alt="calendar" className='w-4 h-4 sm:w-5 sm:h-5' />
                <h3 className='text-base sm:text-lg font-semibold text-gray-900'>Select Dates</h3>
              </div>

              <div className='bg-white border border-gray-200 rounded-lg p-3 sm:p-4'>
                <div className='flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-gray-600 mb-3'>
                  <span className='flex items-center gap-1'>
                    <span className='w-3 h-3 rounded-full bg-red-500 inline-block'></span>
                    Reserved
                  </span>
                  <span className='flex items-center gap-1'>
                    <span className='w-3 h-3 rounded-full bg-orange-400 inline-block'></span>
                    Trial Hold
                  </span>
                  <span className='flex items-center gap-1'>
                    <span className='w-3 h-3 rounded-full bg-blue-500 inline-block'></span>
                    Laundry
                  </span>
                </div>

                {calendarLoading ? (
                  <p className='text-sm text-gray-500'>Loading calendar…</p>
                ) : calendarError ? (
                  <p className='text-sm text-red-600'>{calendarError}</p>
                ) : (
                  <DayPicker
                    mode={bookingType === 'trial' ? 'single' : 'range'}
                    numberOfMonths={1}
                    onDayClick={(day, modifiers) => {
                      // If a blocked day is clicked, show a badge message instead of changing selection
                      const iso = toIsoDate(day)
                      if (isPastIsoDate(iso)) {
                        setBlockedClick({
                          date: iso,
                          message: 'Past dates cannot be selected.',
                        })
                        return
                      }

                      const reason = blockedReasonForDate(iso)
                      if (reason) {
                        setBlockedClick({
                          date: iso,
                          message: `${reason.message} Please choose another date.`,
                        })
                      } else {
                        // clear badge when clicking a non-blocked day
                        if (blockedClick) setBlockedClick(null)
                      }
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
                      // Disable all past days (only today and future dates are clickable)
                      if (isPastIsoDate(iso)) return true
                      return Boolean(blockedReasonForDate(iso))
                    }}
                    modifiers={{
                      reserved: (date) => calendarInfo.unavailableDates.includes(toIsoDate(date)),
                      trial: (date) => calendarInfo.trialHoldDates.includes(toIsoDate(date)),
                      laundry: (date) => calendarInfo.laundryHoldDates.includes(toIsoDate(date)),
                    }}
                    modifiersClassNames={{
                      reserved: 'rdp-day_reserved',
                      trial: 'rdp-day_trial',
                      laundry: 'rdp-day_laundry',
                    }}
                  />
                )}

                {blockedClick && (
                  <div className='mt-3 mb-2 inline-flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm'>
                    <span className='font-semibold'>Blocked:</span>
                    <span>{blockedClick.message}</span>
                  </div>
                )}

                <div className='mt-3 space-y-1'>
                  <p className='text-sm text-gray-700'><strong>Pick-up:</strong> {pickupDate ? formatDateWithDay(pickupDate) : '—'}</p>
                  <p className='text-sm text-gray-700'><strong>Return:</strong> {returnDate ? formatDateWithDay(returnDate) : '—'}</p>
                  {formErrors.pickupDate && <p className='text-sm text-red-600'>{formErrors.pickupDate}</p>}
                  {formErrors.returnDate && <p className='text-sm text-red-600'>{formErrors.returnDate}</p>}
                </div>
              </div>
            </div>

            {/* Time Section */}
            <div className='mb-6'>
              <div className='flex items-center gap-2 mb-4'>
                <svg className='w-5 h-5 text-gray-700' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' />
                </svg>
                <h3 className='text-lg font-semibold text-gray-900'>Time</h3>
              </div>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-2'>Pick-up Time</label>
                  <input
                    type='time'
                    min='09:00'
                    max='19:00'
                    step='900'
                    list='allowed-times'
                    value={pickupTime}
                    onChange={(e) => handleTimeChange(e.target.value, setPickupTime, 'pickupTime')}
                    onBlur={(e) => handleTimeChange(e.target.value, setPickupTime, 'pickupTime')}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all bg-white ${formErrors.pickupTime ? 'border-red-400' : 'border-gray-300'}`}
                  />
                  {formErrors.pickupTime && (
                    <p className='text-sm text-red-600 mt-1'>{formErrors.pickupTime}</p>
                  )}
                </div>
              </div>
              <datalist id='allowed-times'>
                {allowedTimes.map(time => (
                  <option key={time} value={time}>{formatTimeLabel(time)}</option>
                ))}
              </datalist>
              {(scheduleStatus.loading || scheduleStatus.message) && (
                <p className={`text-sm mt-2 ${scheduleStatus.loading ? 'text-blue-600' : scheduleStatus.valid ? 'text-green-600' : 'text-red-600'}`}>
                  {scheduleStatus.loading ? 'Checking availability…' : scheduleStatus.message}
                </p>
              )}
            </div>

            {/* Summary */}
            {durationDays > 0 && (
              <div className='pt-4 border-t border-gray-300 space-y-2'>
                <div className='flex justify-between items-center'>
                  <span className='text-gray-600'>Duration:</span>
                  <span className='font-semibold text-gray-900'>
                    {durationDays} {durationDays === 1 ? 'day' : 'days'}
                  </span>
                </div>
                <div className='flex justify-between items-center'>
                  <span className='text-gray-600'>Total:</span>
                  <span className='text-xl font-bold text-primary'>
                    {currency}{(totalAmount || 0).toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className='mt-6 space-y-3'>
            <button 
              onClick={handleConfirmBooking}
              className={`w-full py-4 rounded-lg font-semibold text-white transition-all duration-300 ${
                !confirmDisabled
                  ? 'bg-primary hover:bg-primary-dull shadow-lg hover:shadow-xl'
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
              disabled={confirmDisabled}
            >
              {loading ? 'Processing...' : success ? 'Booking Confirmed!' : gown?.available ? 'Confirm Booking' : 'Not Available'}
            </button>

            {/* Payment Modal */}
            <PaymentModal
              showPayment={showPayment}
              setShowPayment={setShowPayment}
              total={totalAmount || (gown.pricePerDay || gown.price || 0)}
              onContinue={handlePaymentContinue}
            />

            {/* Contract Modal */}
            <ContractModal
              showContract={showContract}
              setShowContract={setShowContract}
              onSubmit={handleContractSubmit}
            />
          </div>
        </div>
      </div>

      {/* Additional Information Section */}
      <div className='mt-16 pt-8 border-t border-gray-200'>
        <h2 className='text-2xl font-bold text-gray-900 mb-6'>Additional Information</h2>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
          <div>
            <h3 className='text-lg font-semibold text-gray-900 mb-2'>Availability</h3>
            <p className='text-gray-600'>
              {gown?.available 
                ? 'This gown is currently available for booking. Please select your preferred dates to proceed with the booking.'
                : 'This gown is currently unavailable. Please check back later or contact the owner for more information.'}
            </p>
          </div>
          <div>
            <h3 className='text-lg font-semibold text-gray-900 mb-2'>Rental Terms</h3>
            <p className='text-gray-600'>
              Please ensure to return the gown in its original condition. 
              Contact the owner for specific rental terms and conditions.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GownDetails