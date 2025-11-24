import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { assets } from '../assets/assets'
import PaymentModal from '../components/PaymentModal'
import ContractModal from '../components/ContractModal'

const GownDetails = () => {

  const {id} = useParams()
  const navigate = useNavigate()
  const [gown, setGown] = useState(null)
  const [loadingGown, setLoadingGown] = useState(true)
  const currency = import.meta.env.VITE_CURRENCY || '₱'
  const [measurements, setMeasurements] = useState({
    waist: '',
    hips: '',
    unit: 'inches' // default unit
  })
  const [pickupTime, setPickupTime] = useState('')
  const [pickupDate, setPickupDate] = useState('')
  const [returnDate, setReturnDate] = useState('')
  const [eventName, setEventName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [showContract, setShowContract] = useState(false)

  useEffect(() => {
    const fetchGown = async () => {
      try {
        setLoadingGown(true)
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
        const response = await fetch(`${API_URL}/owner/all-gowns`)
        const data = await response.json()
        
        if (data.success && data.gowns) {
          const foundGown = data.gowns.find(g => g._id === id)
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

  // Handle confirm reservation button click - show payment modal
  const handleConfirmReservation = () => {
    if (!pickupDate || !returnDate) {
      setError('Please select both pickup and return dates')
      return
    }

    // Check if user is logged in
    const token = localStorage.getItem('token')
    if (!token) {
      setError('Please login to book a gown')
      return
    }

    setError('')
    setShowPayment(true)
  }

  // Handle payment continue - show contract modal
  const handlePaymentContinue = () => {
    setShowPayment(false)
    setShowContract(true)
  }

  // Handle contract submit - create booking
  const handleContractSubmit = async () => {
    setShowContract(false)
    setLoading(true)
    setError('')

    try {
      const token = localStorage.getItem('token')
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
      
      const response = await fetch(`${API_URL}/bookings/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          gown: gown._id,
          pickupDate: new Date(pickupDate).toISOString(),
          returnDate: new Date(returnDate).toISOString(),
          pickupTime: pickupTime,
          measurements: {
            waist: measurements.waist || null,
            hips: measurements.hips || null,
            unit: measurements.unit || 'inches'
          }
        })
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

  // Calculate duration in days
  const calculateDuration = () => {
    if (pickupDate && returnDate) {
      const start = new Date(pickupDate)
      const end = new Date(returnDate)
      const diffTime = Math.abs(end - start)
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      return diffDays > 0 ? diffDays : 0
    }
    return 0
  }

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


  if (loadingGown) {
    return (
      <div className='px-6 md:px-16 lg:px-24 xl:px-32 mt-16 flex items-center justify-center min-h-[60vh]'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4'></div>
          <p className='text-xl text-gray-500'>Loading gown details...</p>
        </div>
      </div>
    )
  }

  if (!gown) {
    return (
      <div className='px-6 md:px-16 lg:px-24 xl:px-32 mt-16 flex items-center justify-center min-h-[60vh]'>
        <div className='text-center'>
          <p className='text-xl text-gray-500 mb-4'>Gown not found</p>
          <button
            onClick={() => navigate('/gowns')}
            className='px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dull transition-colors'
          >
            Back to Apparel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className='px-6 md:px-16 lg:px-24 xl:px-32 mt-16 mb-16'>
      {/* Back Button */}
      <button onClick={()=> navigate(-1)} className='flex items-center gap-2 mb-8 text-gray-500 cursor-pointer hover:text-gray-700 transition-colors'>
        <img src={assets.arrow_icon} alt="arrow" className='rotate-180 opacity-65'/>
        <span>Back to all apparel</span>
        </button> 

      {/* Main Content */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12'>
        {/* Left Column - Image and Measurements */}
        <div className='w-full flex flex-col gap-8'>
          {/* Image Section */}
          <div className='relative rounded-2xl overflow-hidden shadow-xl bg-gray-100'>
            <img 
              src={Array.isArray(gown.image) ? gown.image[0] : gown.image} 
              alt={gown.name}
              className='w-full h-auto max-h-[600px] object-contain'
            />
            {gown?.available && (
              <div className='absolute top-4 left-4 bg-green-500/90 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2'>
                <img src={assets.check_icon} alt="check" className='w-4 h-4' />
                Available Now
              </div>
            )}
            {!gown?.available && (
              <div className='absolute top-4 left-4 bg-red-500/90 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-medium'>
                Currently Unavailable
              </div>
            )}
          </div>

          {/* Size Measurement Section */}
          <div>
            <div className='flex justify-between items-center mb-4'>
              <h2 className='text-xl font-semibold text-gray-900'>Size Measurement</h2>
              <select
                value={measurements.unit}
                onChange={(e) => setMeasurements({...measurements, unit: e.target.value})}
                className='px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-sm'
              >
                <option value='inches'>Inches</option>
                <option value='cm'>Centimeters</option>
              </select>
            </div>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3'>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Waist (optional)
                </label>
                <div className='relative'>
                  <input
                    type='number'
                    value={measurements.waist}
                    onChange={(e) => setMeasurements({...measurements, waist: e.target.value})}
                    placeholder='Enter waist measurement'
                    className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all'
                  />
                  <span className='absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm'>
                    {measurements.unit}
                  </span>
                </div>
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Hips (optional)
                </label>
                <div className='relative'>
                  <input
                    type='number'
                    value={measurements.hips}
                    onChange={(e) => setMeasurements({...measurements, hips: e.target.value})}
                    placeholder='Enter hips measurement'
                    className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all'
                  />
                  <span className='absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm'>
                    {measurements.unit}
                  </span>
                </div>
              </div>
            </div>
            <p className='text-sm text-gray-500 italic'>
              Note: Measurements are preferably done in-person for the best fit.
            </p>
          </div>

          {/* Gown Details Grid - Moved here */}
          <div>
            <h2 className='text-xl font-semibold text-gray-900 mb-4'>Gown Details</h2>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
              {/* Fabric */}
              <div className='flex items-center gap-3 p-4 bg-gray-50 rounded-lg'>
                <div className='bg-white p-3 rounded-lg shadow-sm'>
                  <img src={assets.fabric_icon} alt="fabric" className='w-6 h-6' />
                </div>
                <div>
                  <p className='text-sm text-gray-500 mb-1'>Fabric</p>
                  <p className='text-base font-medium text-gray-900'>{gown.fabric}</p>
                </div>
              </div>

              {/* Size */}
              <div className='flex items-center gap-3 p-4 bg-gray-50 rounded-lg'>
                <div className='bg-white p-3 rounded-lg shadow-sm'>
                  <img src={assets.size_icon} alt="size" className='w-6 h-6' />
                </div>
                <div>
                  <p className='text-sm text-gray-500 mb-1'>Size</p>
                  <p className='text-base font-medium text-gray-900'>
                    {Array.isArray(gown.size) ? gown.size.join(', ') : gown.size}
                  </p>
                </div>
              </div>

              {/* Color */}
              <div className='flex items-center gap-3 p-4 bg-gray-50 rounded-lg'>
                <div className='bg-white p-3 rounded-lg shadow-sm'>
                  <img src={assets.color_icon} alt="color" className='w-6 h-6' />
                </div>
                <div>
                  <p className='text-sm text-gray-500 mb-1'>Color</p>
                  <p className='text-base font-medium text-gray-900'>{gown.color}</p>
                </div>
              </div>

              {/* Event Type */}
              <div className='flex items-center gap-3 p-4 bg-gray-50 rounded-lg'>
                <div className='bg-white p-3 rounded-lg shadow-sm'>
                  <img src={assets.event_icon} alt="event" className='w-6 h-6' />
                </div>
                <div>
                  <p className='text-sm text-gray-500 mb-1'>Event Type</p>
                  <p className='text-base font-medium text-gray-900 capitalize'>
                    {gown.eventtype || gown.eventType}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Details Section */}
        <div className='flex flex-col'>
          {/* Title and Owner */}
          <div className='mb-6'>
            <h1 className='text-4xl font-bold text-gray-900 mb-2'>{gown.name}</h1>
            <p className='text-lg text-gray-600'>by {gown.owner ? (typeof gown.owner === 'object' ? gown.owner.name : gown.owner) : 'Unknown'}</p>
          </div>

          {/* Price */}
          <div className='mb-6'>
            <p className='text-3xl font-bold text-primary'>
              {currency}{gown.pricePerDay?.toLocaleString() || gown.price?.toLocaleString()}
            </p>
          </div>

          {/* Location */}
          <div className='mb-8'>
            <h2 className='text-xl font-semibold text-gray-900 mb-3'>Location</h2>
            <p className='text-gray-600 leading-relaxed'>{gown.location || 'Location not specified'}</p>
          </div>

          {/* Contact Number */}
          <div className='mb-8'>
            <h2 className='text-xl font-semibold text-gray-900 mb-3'>Contact Number</h2>
            <p className='text-gray-600 leading-relaxed'>{gown.contactNumber || gown.contact || 'Contact not available'}</p>
          </div>

          {/* Category (if available) */}
          {gown.category && (
            <div className='mb-8'>
              <div className='inline-block px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium'>
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
          <div className='border border-gray-200 rounded-xl p-6 bg-gray-50'>
            <h2 className='text-xl font-semibold text-gray-900 mb-6'>Booking Details</h2>
            
            {/* Date Section */}
            <div className='mb-6'>
              <div className='flex items-center gap-2 mb-4'>
                <img src={assets.calendar_icon_colored} alt="calendar" className='w-5 h-5' />
                <h3 className='text-lg font-semibold text-gray-900'>Date</h3>
              </div>
              <div className='space-y-4'>
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Pick-up
                  </label>
                  <input
                    type='date'
                    value={pickupDate}
                    onChange={(e) => setPickupDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all bg-white'
                  />
                  {pickupDate && (
                    <p className='text-sm text-gray-600 mt-1'>{formatDateWithDay(pickupDate)}</p>
                  )}
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Return
                  </label>
                  <input
                    type='date'
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    min={pickupDate || new Date().toISOString().split('T')[0]}
                    className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all bg-white'
                  />
                  {returnDate && (
                    <p className='text-sm text-gray-600 mt-1'>{formatDateWithDay(returnDate)}</p>
                  )}
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
              <input
                type='time'
                value={pickupTime}
                onChange={(e) => setPickupTime(e.target.value)}
                className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all bg-white'
              />
            </div>

            {/* Summary */}
            {pickupDate && returnDate && (
              <div className='pt-4 border-t border-gray-300 space-y-2'>
                <div className='flex justify-between items-center'>
                  <span className='text-gray-600'>Duration:</span>
                  <span className='font-semibold text-gray-900'>
                    {calculateDuration()} {calculateDuration() === 1 ? 'day' : 'days'}
                  </span>
                </div>
                <div className='flex justify-between items-center'>
                  <span className='text-gray-600'>Total:</span>
                  <span className='text-xl font-bold text-primary'>
                    {currency}{(gown.pricePerDay || gown.price || 0).toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className='mt-6 space-y-3'>
            <button 
              onClick={handleConfirmReservation}
              className={`w-full py-4 rounded-lg font-semibold text-white transition-all duration-300 ${
                gown?.available && pickupDate && returnDate && !loading && !success
                  ? 'bg-primary hover:bg-primary-dull shadow-lg hover:shadow-xl' 
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
              disabled={!gown?.available || !pickupDate || !returnDate || loading || success || loadingGown}
            >
              {loading ? 'Processing...' : success ? 'Booking Confirmed!' : gown?.available ? 'Confirm Reservation' : 'Not Available'}
            </button>

            {/* Payment Modal */}
            <PaymentModal
              showPayment={showPayment}
              setShowPayment={setShowPayment}
              total={gown.pricePerDay || gown.price || 0}
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
                ? 'This gown is currently available for booking. Please select your preferred dates to proceed with the reservation.'
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