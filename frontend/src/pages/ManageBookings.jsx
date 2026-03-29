import React, { useState, useEffect } from 'react'
import { assets } from '../assets/assets'
import { API_URL, CURRENCY } from '../config'
import OwnerSidebar from '../components/OwnerSidebar'
import { useSearchParams } from 'react-router-dom'
import { toIsoDate, formatDate } from '../utils/dateUtils'

const ManageBookings = () => {
  const [bookings, setBookings] = useState([])
  const [filteredBookings, setFilteredBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterEventType, setFilterEventType] = useState('all') // Filter by event type
  const [searchTerm, setSearchTerm] = useState('')
  const currency = CURRENCY
  const [selectedPayment, setSelectedPayment] = useState(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [rejectingPayment, setRejectingPayment] = useState(false)

  // Get URL search params for gown filtering and highlighting
  const [searchParams] = useSearchParams()
  const initialGownFilter = searchParams.get('gownId') || 'all'
  const highlightId = searchParams.get('highlightId')

  // Set initial filters from URL
  useEffect(() => {
    const statusParam = searchParams.get('status')
    if (statusParam && ['trial', 'pending', 'confirmed', 'completed', 'canceled'].includes(statusParam)) {
      setFilterStatus(statusParam)
    }
    
    if (initialGownFilter !== 'all') {
      // For now, if a gownId is passed, we might still want to filter by that specific gown
      // but the UI only allows filtering by Event Type.
      // Re-evaluating: user said "instead of name filter". 
      // I will keep the state as filterEventType but handle the legacy param if needed by finding the gown's event.
    }
  }, [searchParams, initialGownFilter])

  // Handle auto-scrolling and highlighting
  useEffect(() => {
    if (highlightId && !loading && filteredBookings.length > 0) {
      const timer = setTimeout(() => {
        const element = document.getElementById(`booking-${highlightId}`)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
          element.classList.add('ring-4', 'ring-primary/30', 'bg-primary/5')
          setTimeout(() => {
            element.classList.remove('ring-4', 'ring-primary/30', 'bg-primary/5')
          }, 5000)
        }
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [highlightId, loading, filteredBookings])

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

  // Availability checking state for reschedule/extend
  const [availabilityStatus, setAvailabilityStatus] = useState({ loading: false, message: '', valid: false })
  const [calendarInfo, setCalendarInfo] = useState({ unavailableDates: [], trialTimeSlots: {}, laundryHoldDates: [] })

  useEffect(() => {
    fetchBookings()
  }, [])

  // Filter bookings when filterStatus or filterEventType changes
  useEffect(() => {
    let filtered = [...bookings]

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(booking => booking.status === filterStatus)
    }

    // Filter by event type
    if (filterEventType !== 'all') {
      filtered = filtered.filter(booking => {
        const gownEvents = booking.gown?.eventType || [];
        const eventArr = Array.isArray(gownEvents) ? gownEvents : [gownEvents];
        // Support search by event type (case-insensitive)
        return eventArr.some(e => e.toLowerCase() === filterEventType.toLowerCase());
      });
    }

    // Filter by search term
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(booking => {
        const customerName = (booking.user?.name || '').toLowerCase();
        const gownName = (booking.gown?.name || '').toLowerCase();
        const contactNumber = (booking.contactNumber || '').toLowerCase();
        const transactionRef = (booking.payment?.transactionRef || '').toLowerCase();
        
        return customerName.includes(term) || 
               gownName.includes(term) || 
               contactNumber.includes(term) || 
               transactionRef.includes(term);
      });
    }

    setFilteredBookings(filtered)
  }, [bookings, filterStatus, filterEventType, searchTerm])

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
        // Filter out bookings with deleted/missing gown data
        const validBookings = (data.bookings || []).filter(booking => booking.gown && booking.gown._id)
        setBookings(validBookings)
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

  const openEdit = async (booking, mode) => {
    const pickupTime = booking.pickupTime || '09:00'
    const returnTime = booking.returnTime || pickupTime

    setSelectedBooking(booking)
    setEditMode(mode)
    setEditForm({
      pickupDate: toIsoDate(booking.pickupDate),
      returnDate: toIsoDate(booking.returnDate),
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
        const cal = data.calendar || {}
        setCalendarInfo({
          unavailableDates: cal.unavailableDates || [],
          trialTimeSlots: cal.trialTimeSlots || {},
          laundryHoldDates: cal.laundryHoldDates || []
        })
      }
    } catch (e) {
      console.error('Error fetching calendar:', e)
    }
  }

  const closeEdit = () => {
    setEditOpen(false)
    setSelectedBooking(null)
    setSavingEdit(false)
  }

  const handleEditFormChange = (e) => {
    const { name, value } = e.target
    setEditForm((prev) => ({ ...prev, [name]: value }))
    
    // Trigger availability check when dates/times change
    if (['pickupDate', 'returnDate', 'pickupTime', 'returnTime'].includes(name)) {
      setTimeout(() => checkAvailability(), 100)
    }
  }

  const checkAvailability = async () => {
    if (!selectedBooking || !editForm.pickupDate || !editForm.returnDate || !editForm.pickupTime || !editForm.returnTime) {
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
          pickupDate: editForm.pickupDate,
          returnDate: isTrial ? editForm.pickupDate : editForm.returnDate,
          pickupTime: editForm.pickupTime,
          returnTime: isTrial ? editForm.pickupTime : editForm.returnTime,
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
        pickupDate: editMode === 'extend' ? toIsoDate(selectedBooking.pickupDate) : editForm.pickupDate,
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
      // For reject action, validate that rejection reason is provided
      if (action === 'reject') {
        if (!rejectionReason.trim()) {
          setError('Please provide a reason for rejecting the payment')
          return
        }
        setRejectingPayment(true)
      }

      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL}/bookings/verify-payment`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          BookingId: bookingId, 
          action, // 'approve' or 'reject'
          rejectionReason: action === 'reject' ? rejectionReason : undefined
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setSuccess(`Payment ${action === 'approve' ? 'approved' : 'rejected'} successfully`)
        setShowPaymentModal(false)
        setSelectedPayment(null)
        setRejectionReason('')
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
    } finally {
      setRejectingPayment(false)
    }
  }

  const openPaymentModal = (booking) => {
    setSelectedPayment(booking)
    setRejectionReason('')
    setShowPaymentModal(true)
  }

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
    <div className='flex min-h-screen bg-[#FDFDFF] max-w-full overflow-x-hidden'>
      <OwnerSidebar />
      <div className='flex-1 min-w-0 p-3 sm:p-6 lg:p-10 transition-all duration-500 font-geist'>
        <div className='max-w-7xl mx-auto'>
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 mt-16 sm:mt-10 lg:mt-0">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-1 bg-primary rounded-full"></div>
                  <span className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">Operations</span>
                </div>
                <h1 className='text-3xl sm:text-4xl font-black text-primary-dull tracking-tight mb-2'>Manage Bookings</h1>
                <p className='text-sm sm:text-base text-gray-500 font-medium'>Oversee and process your client reservations and appointments.</p>
              </div>

              {/* Search Bar */}
              <div className="w-full md:w-80 relative group">
                <input
                  type="text"
                  placeholder="Search clients, gowns, or refs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-white/50 backdrop-blur-md border border-gray-100 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm group-hover:shadow-md"
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                   <img src={assets.search_icon} className="w-5 h-5 opacity-40 group-focus-within:opacity-100 transition-opacity" alt="search" />
                </div>
              </div>
              {/* Event Type Filter Dropdown */}
              <div className="w-full md:w-64 relative group">
                <select
                  value={filterEventType}
                  onChange={(e) => setFilterEventType(e.target.value)}
                  className="w-full pl-6 pr-10 py-4 bg-white/50 backdrop-blur-md border border-gray-100 rounded-2xl text-sm font-black text-primary/70 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm appearance-none cursor-pointer"
                >
                  <option value="all">All Occasions</option>
                  <option value="wedding">Wedding</option>
                  <option value="traditional">Traditional</option>
                  <option value="prom">Prom</option>
                  <option value="formal">Formal</option>
                  <option value="themed">Themed</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

          {/* Success/Error Messages */}
          {success && (
            <div className='mb-8 p-4 bg-green-50 border border-green-100 rounded-3xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-500'>
               <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-lg font-bold">✓</div>
               <p className='text-green-800 font-bold text-sm'>{success}</p>
            </div>
          )}

          {error && (
            <div className='mb-8 p-4 bg-red-50 border border-red-100 rounded-3xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-500'>
               <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white text-lg font-bold">!</div>
               <p className='text-red-800 font-bold text-sm'>{error}</p>
            </div>
          )}

          {/* Status Filter Tabs - Modern Segmented Control */}
          <div className='mb-6 overflow-x-auto premium-scrollbar-yellow -mx-3 px-3 pb-2'>
            <div className='inline-flex items-center gap-2 p-1 bg-gray-100/50 rounded-2xl min-w-full'>
              {['all', 'trial', 'pending', 'confirmed', 'completed', 'canceled'].map((status) => {
                const count = status === 'all' 
                  ? bookings.length 
                  : bookings.filter(b => b.status === status).length;
                
                return (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`px-3 py-2 sm:px-5 sm:py-2.5 rounded-xl font-bold text-[10px] sm:text-xs transition-all duration-300 relative whitespace-nowrap ${
                      filterStatus === status
                        ? 'bg-white text-primary shadow-sm scale-105'
                        : 'text-gray-500 hover:text-gray-900 hover:bg-white/50'
                    }`}
                  >
                    <span className="flex items-center gap-2 whitespace-nowrap">
                      {status === 'all' ? 'All Requests' : status.charAt(0).toUpperCase() + status.slice(1)}
                      <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${filterStatus === status ? 'bg-primary/10 text-primary' : 'bg-gray-200 text-gray-500'}`}>
                          {count}
                      </span>
                    </span>
                  </button>
                )
              })}
              <div className='w-4 flex-shrink-0 sm:hidden' />
            </div>
          </div>

          {/* Bookings List */}
          <div className='space-y-6 pb-20'>
            {filteredBookings.length > 0 ? (
              filteredBookings.map((booking) => (
                <div
                  key={booking._id || booking.id}
                  id={`booking-${booking._id || booking.id}`}
                  className={`group bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden hover:shadow-2xl hover:shadow-primary/5 hover:border-primary/10 transition-all duration-500 font-geist ${(booking._id || booking.id) === highlightId && (booking.status === 'trial' || (booking.status === 'pending' && booking.payment?.status === 'pending')) ? 'ring-2 ring-primary border-primary/20 bg-primary/5' : ''}`}
                >
                  {/* Card Content Interior */}
                  <div className='p-5 sm:p-7'>
                    {/* Top Row: ID and Status Tags */}
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black text-gray-400 bg-gray-50 px-3 py-1.5 rounded-lg tracking-widest border border-gray-100">
                          ID: #{(booking._id || booking.id)?.slice(-6).toUpperCase()}
                        </span>
                        <span className={`px-4 py-1.5 rounded-full text-[11px] font-black tracking-widest uppercase border ${
                            booking.status === 'confirmed' || booking.status === 'completed' ? 'bg-green-50 text-green-700 border-green-100' : 
                            booking.status === 'pending' ? 'bg-orange-50 text-orange-600 border-orange-100' : 
                            booking.status === 'trial' ? 'bg-gray-50 text-gray-500 border-gray-200' : 
                            'bg-red-50 text-red-600 border-red-100'
                        }`}>
                          {booking.status}
                        </span>
                      </div>
                      
                      {/* Payment Info Badge */}
                      {booking.payment && (
                        <div className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase border ${
                            booking.payment.status === 'verified' ? 'bg-green-50/50 text-green-600 border-green-100/50' : 
                            booking.payment.status === 'pending' ? 'bg-orange-50/50 text-orange-500 border-orange-100/50' : 
                            'bg-red-50/50 text-red-500 border-red-100/50'
                        }`}>
                          {booking.payment.method} • {booking.payment.status}
                        </div>
                      )}
                    </div>

                    {/* Main Content: Responsive Flex/Grid Wrapping */}
                    <div className="flex flex-col xl:flex-row xl:items-center gap-6 sm:gap-10">
                      
                      {/* Section 1: Apparel & Client (Strong Base Width) */}
                      <div className="flex items-center gap-5 sm:gap-6 min-w-0 xl:w-[400px]">
                        <div className="relative flex-shrink-0">
                          <img 
                            src={booking.gown?.image?.[0] || booking.gown?.image || assets.gown_image1} 
                            alt={booking.gown?.name} 
                            className='w-24 h-24 sm:w-32 sm:h-32 object-contain bg-white rounded-[2rem] shadow-sm border border-gray-100 group-hover:scale-105 transition-all duration-700'
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className='text-lg sm:text-2xl font-black text-primary-dull group-hover:text-primary transition-colors leading-tight mb-2 break-words whitespace-normal'>
                              {booking.gown?.name || 'Gown Name'}
                          </h3>
                          <div className="space-y-1.5">
                            <div className="flex flex-col">
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Client Name</p>
                              <p className="text-sm font-bold text-gray-700 break-words whitespace-normal leading-snug">
                                {booking.user?.name || 'Client Name'}
                              </p>
                              {booking.user?.email && (
                                <p className="text-[10px] font-medium text-gray-400 break-words -mt-0.5 leading-tight">{booking.user.email}</p>
                              )}
                            </div>
                            <div className="flex flex-col pt-1 border-t border-gray-50">
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Contact Number</p>
                                <p className="text-base font-black text-primary break-words whitespace-normal leading-tight">
                                <p className="text-base font-black text-primary break-words whitespace-normal leading-tight">
                                  {(booking.contactNumber && booking.contactNumber !== 'N/A') 
                                    ? booking.contactNumber 
                                    : (booking.user?.contactNumber && booking.user.contactNumber !== 'N/A' 
                                      ? booking.user.contactNumber 
                                      : 'N/A')}
                                </p>
                                </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Section 2: Schedule (Clear Boxed Areas) */}
                      <div className="flex flex-wrap sm:flex-nowrap gap-4 w-full xl:w-auto xl:flex-1">
                        {booking.status === 'trial' ? (
                          <div className="flex-1 bg-gray-50/80 p-5 rounded-3xl border border-gray-100/50 min-w-[160px]">
                            <p className="text-[10px] font-black text-primary/40 uppercase tracking-widest mb-1.5">Try-On Appointment</p>
                            <p className="text-base font-black text-primary-dull break-words whitespace-normal leading-tight">{formatDate(booking.pickupDate)}</p>
                            <p className="text-[11px] font-bold text-gray-400 mt-1">{booking.pickupTime || '09:00'}</p>
                          </div>
                        ) : (
                          <>
                            <div className="flex-1 bg-gray-50/80 p-5 rounded-3xl border border-gray-100/50 min-w-[140px]">
                              <p className="text-[10px] font-black text-primary/40 uppercase tracking-widest mb-1.5">Pickup Date</p>
                              <p className="text-base font-black text-primary-dull whitespace-normal">{formatDate(booking.pickupDate)}</p>
                              <p className="text-[11px] font-bold text-gray-400 mt-1">{booking.pickupTime || '09:00'}</p>
                            </div>
                            <div className="flex-1 bg-gray-50/80 p-5 rounded-3xl border border-gray-100/50 min-w-[140px]">
                              <p className="text-[10px] font-black text-primary/40 uppercase tracking-widest mb-1.5">Return Date</p>
                              <p className="text-base font-black text-primary-dull whitespace-normal">{formatDate(booking.returnDate)}</p>
                              <p className="text-[11px] font-bold text-gray-400 mt-1">{booking.returnTime || '09:00'}</p>
                            </div>
                          </>
                        )}
                        
                        {/* Section 3: Value (Only for non-trial) */}
                        {booking.status !== 'trial' && (
                          <div className="flex-1 sm:flex-none xl:w-40 flex flex-col justify-center bg-white p-5 rounded-3xl border border-gray-100/50 xl:border-0">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Value</p>
                            <p className='text-3xl font-black text-primary-dull flex items-baseline gap-1'>
                              <span className="text-sm opacity-40 mr-0.5">₱</span>
                              {booking.price?.toLocaleString()}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Section 4: Vertical Action Column (One Size) */}
                      <div className="flex flex-col gap-3 w-full sm:w-56 xl:border-l xl:border-gray-50 xl:pl-10">
                         {/* Payment Verification */}
                         {(booking.status === 'pending' || booking.status === 'trial') && booking.payment?.status === 'pending' && (
                           <button
                             onClick={() => openPaymentModal(booking)}
                             className='h-14 bg-primary text-white rounded-2xl font-black text-base uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all'
                           >
                             Verify
                           </button>
                         )}

                         {/* Confirm Pickup */}
                         {(booking.status === 'pending' || booking.status === 'trial') && (booking.payment?.status === 'verified' || booking.payment?.status === 'paid' || !booking.payment) && (
                            <button
                              onClick={() => handleStatusChange(booking._id || booking.id, 'confirmed')}
                              className='h-14 bg-primary text-white rounded-2xl font-black text-base uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all'
                            >
                              Confirm
                            </button>
                         )}

                         {/* Mark Completed status === 'confirmed' */}
                         {booking.status === 'confirmed' && (
                           <button
                             onClick={() => handleStatusChange(booking._id || booking.id, 'completed')}
                             className='h-14 bg-green-600 text-white rounded-2xl font-black text-base uppercase tracking-widest shadow-xl shadow-green-600/20 hover:scale-105 active:scale-95 transition-all'
                           >
                             Complete
                           </button>
                         )}

                         {/* Cancel Action (Only Pending/Confirmed/Trial) */}
                         {['pending', 'confirmed', 'trial'].includes(booking.status) && (
                            <button
                              onClick={() => handleStatusChange(booking._id || booking.id, 'canceled')}
                              className='h-14 bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-500 rounded-2xl font-black text-xs uppercase tracking-widest border border-transparent hover:border-red-100 transition-all flex items-center justify-center gap-3 group/cancel'
                            >
                              <div className="p-2 bg-white rounded-lg group-hover/cancel:bg-red-100 transition-colors">
                                <svg className="w-4 h-4 opacity-40 group-hover/cancel:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </div>
                              Cancel Request
                            </button>
                         )}

                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className='text-center py-32 bg-gray-50/50 rounded-[3rem] border-2 border-dashed border-gray-100'>
                <div className="p-6 bg-white inline-block rounded-[2rem] shadow-sm mb-6">
                    <img src={assets.calendar_icon_colored} className="w-10 h-10 opacity-20" />
                </div>
                <p className='text-xl font-black text-gray-400'>No results found</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Booking Modal */}
      {editOpen && selectedBooking && (
        <div
          className='fixed inset-0 bg-primary/20 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in'
          onClick={closeEdit}
        >
          <div
            className='bg-white rounded-[40px] shadow-[0_40px_100px_rgba(1,62,141,0.15)] max-w-lg w-full p-8 sm:p-10 max-h-[90vh] overflow-y-auto border border-blue-50 relative'
            onClick={(e) => e.stopPropagation()}
          >
            <div className='flex items-start justify-between gap-6 mb-10'>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-1 bg-primary rounded-full"></div>
                  <span className="text-[10px] font-black text-primary uppercase tracking-widest">{editMode} mode</span>
                </div>
                <h2 className='text-3xl font-black text-primary tracking-tight leading-tight'>
                  {editMode === 'extend' ? 'Extend Stay' : 'Update Schedule'}
                </h2>
                <p className='text-sm text-gray-500 font-bold mt-1'>{selectedBooking.gown?.name}</p>
              </div>
              <button
                onClick={closeEdit}
                className='w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-primary/40 hover:text-primary hover:bg-primary/5 transition-all group'
              >
                <svg className="w-6 h-6 transition-transform group-hover:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className='space-y-8'>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-6'>
                <div className="space-y-2">
                  <label className='block text-[10px] font-black text-primary/40 uppercase tracking-widest pl-2'>Pickup Date</label>
                  <input
                    type='date'
                    name='pickupDate'
                    value={editForm.pickupDate}
                    onChange={handleEditFormChange}
                    disabled={editMode === 'extend'}
                    min={new Date().toISOString().split('T')[0]}
                    className='w-full px-5 py-4 bg-gray-50/50 border border-gray-100 rounded-2xl text-sm font-black text-primary transition-all focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none disabled:bg-gray-100/50'
                  />
                </div>
                <div className="space-y-2">
                  <label className='block text-[10px] font-black text-primary/40 uppercase tracking-widest pl-2'>Pickup Slot</label>
                  <select
                    name='pickupTime'
                    value={editForm.pickupTime}
                    onChange={handleEditFormChange}
                    disabled={editMode === 'extend'}
                    className='w-full px-5 py-4 bg-gray-50/50 border border-gray-100 rounded-2xl text-sm font-black text-primary transition-all focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none disabled:bg-gray-100/50 appearance-none'
                  >
                    {allowedTimes.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className='grid grid-cols-1 sm:grid-cols-2 gap-6'>
                <div className="space-y-2">
                  <label className='block text-[10px] font-black text-primary/40 uppercase tracking-widest pl-2'>Return Date</label>
                  <input
                    type='date'
                    name='returnDate'
                    value={editForm.returnDate}
                    onChange={handleEditFormChange}
                    min={editForm.pickupDate || new Date().toISOString().split('T')[0]}
                    className='w-full px-5 py-4 bg-gray-50/50 border border-gray-100 rounded-2xl text-sm font-black text-primary transition-all focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none'
                  />
                </div>
                <div className="space-y-2">
                  <label className='block text-[10px] font-black text-primary/40 uppercase tracking-widest pl-2'>Return Slot</label>
                  <select
                    name='returnTime'
                    value={editForm.returnTime}
                    onChange={handleEditFormChange}
                    className='w-full px-5 py-4 bg-gray-50/50 border border-gray-100 rounded-2xl text-sm font-black text-primary transition-all focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none appearance-none'
                  >
                    {allowedTimes.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Availability Status */}
              {(availabilityStatus.loading || availabilityStatus.message) && (
                <div className={`p-5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${
                  availabilityStatus.loading ? 'bg-blue-50 text-blue-500' :
                  availabilityStatus.valid ? 'bg-green-50 text-green-500' :
                  'bg-red-50 text-red-500'
                }`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    availabilityStatus.loading ? 'bg-blue-500 animate-pulse' :
                    availabilityStatus.valid ? 'bg-green-500' :
                    'bg-red-500'
                  }`}></div>
                  {availabilityStatus.message}
                </div>
              )}

              <div className='flex gap-4 pt-6'>
                 <button
                  type='button'
                  onClick={closeEdit}
                  className='flex-1 py-5 border-2 border-primary/10 text-primary rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-gray-50 transition-all active:scale-95'
                >
                  Discard
                </button>
                <button
                  type='button'
                  onClick={submitEdit}
                  disabled={savingEdit || (availabilityStatus.message && !availabilityStatus.valid)}
                  className='flex-[2] py-5 bg-primary text-white rounded-3xl font-black text-xs uppercase tracking-widest shadow-[0_15px_40px_rgba(1,62,141,0.2)] hover:shadow-[0_20px_50px_rgba(1,62,141,0.3)] hover:-translate-y-1 transition-all disabled:bg-gray-100 disabled:text-gray-300 disabled:shadow-none disabled:translate-y-0 active:scale-95'
                >
                  {savingEdit ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Screenshot Modal */}
      {showPaymentModal && selectedPayment && (
        <div 
          className='fixed inset-0 bg-primary/20 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in'
          onClick={() => setShowPaymentModal(false)}
        >
          <div 
            className='bg-white rounded-[40px] shadow-[0_40px_100px_rgba(1,62,141,0.15)] max-w-2xl w-full p-8 sm:p-10 max-h-[90vh] overflow-y-auto border border-blue-50 relative'
            onClick={(e) => e.stopPropagation()}
          >
            <div className='flex items-start justify-between gap-6 mb-10'>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-1 bg-primary rounded-full"></div>
                  <span className="text-[10px] font-black text-primary uppercase tracking-widest">Verification</span>
                </div>
                <h2 className='text-3xl font-black text-primary tracking-tight leading-tight'>
                  {selectedPayment.payment?.method === 'in_store' ? 'Confirm Cash' : 'Verify Payment'}
                </h2>
                <p className='text-sm text-gray-500 font-bold mt-1'>
                  {selectedPayment.payment?.method === 'in_store' 
                    ? 'Confirm in-store cash transaction' 
                    : 'Review customer deposit record'}
                </p>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                className='w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-primary/40 hover:text-primary hover:bg-primary/5 transition-all group'
              >
                <svg className="w-6 h-6 transition-transform group-hover:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Customer & Booking Info */}
            <div className='bg-gray-50/50 border border-gray-100 rounded-3xl p-6 mb-8'>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-6'>
                <div>
                  <label className='block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1'>Customer</label>
                  <p className='text-sm font-black text-primary'>{selectedPayment.user?.name}</p>
                </div>
                <div>
                  <label className='block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1'>Gown</label>
                  <p className='text-sm font-black text-primary'>{selectedPayment.gown?.name}</p>
                </div>
                <div>
                  <label className='block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1'>Total Price</label>
                  <p className='text-lg font-black text-primary'>{currency}{selectedPayment.price?.toLocaleString()}</p>
                </div>
                {selectedPayment.payment?.method === 'gcash' && (
                  <div>
                    <label className='block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1'>Deposit (50%)</label>
                    <p className='text-lg font-black text-green-600'>{currency}{selectedPayment.payment?.depositAmount?.toLocaleString()}</p>
                  </div>
                )}
                <div>
                  <label className='block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1'>Contact Number</label>
                  <p className="text-sm font-black text-primary">
                    {(selectedPayment.contactNumber && selectedPayment.contactNumber !== 'N/A') 
                      ? selectedPayment.contactNumber 
                      : (selectedPayment.user?.contactNumber && selectedPayment.user.contactNumber !== 'N/A' 
                        ? selectedPayment.user.contactNumber : 'N/A')}
                  </p>
                </div>
              </div>
            </div>

            {/* Payment Details - Only show for GCash */}
            {selectedPayment.payment?.method === 'gcash' && (
            <div className='mb-8'>
              <h3 className='text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4'>Deposit Payment Details</h3>
              <div className='bg-primary/5 border border-primary/10 rounded-[2rem] p-6 shadow-inner'>
                <div className='space-y-4 text-sm'>
                  <div className='flex justify-between items-center'>
                    <span className='text-gray-500 font-bold'>Payment Method</span>
                    <span className='font-black text-primary'>GCash Pay</span>
                  </div>
                  <div className='flex justify-between items-center bg-white/50 p-3 rounded-xl border border-white'>
                    <span className='text-gray-500 font-bold'>Reference Code</span>
                    <span className='font-mono font-black text-primary text-xs tracking-wider break-all'>{selectedPayment.payment?.transactionRef}</span>
                  </div>
                  <div className='pt-4 border-t border-primary/10 flex justify-between items-end'>
                    <span className='text-primary font-black uppercase text-[10px] tracking-widest mb-1'>Deposit Amount</span>
                    <span className='text-3xl font-black text-primary'>{currency}{selectedPayment.payment?.depositAmount?.toLocaleString()}</span>
                  </div>
                </div>
              </div>
              <p className='text-[10px] font-bold text-gray-400 mt-3 text-center'>
                Note: Remaining balance {currency}{(selectedPayment.price - (selectedPayment.payment?.depositAmount || 0)).toLocaleString()} will be collected during pickup
              </p>
            </div>
            )}

            {/* Screenshot - Only for GCash */}
            {selectedPayment.payment?.method === 'gcash' && (
            <div className='mb-8'>
              <h3 className='text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4'>Transaction Screenshot</h3>
              <div className='rounded-[2.5rem] overflow-hidden bg-gray-50 border-4 border-white shadow-xl ring-1 ring-gray-100'>
                {selectedPayment.payment.screenshot ? (
                  <img 
                    src={selectedPayment.payment.screenshot} 
                    alt="Payment Screenshot" 
                    className='w-full h-auto max-h-[500px] object-contain hover:scale-105 transition-transform duration-700'
                  />
                ) : (
                  <div className='flex flex-col items-center justify-center p-12 text-gray-300'>
                    <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-xs font-bold uppercase tracking-widest">No receipt provided</p>
                  </div>
                )}
              </div>
            </div>
            )}

            {/* Warning - Conditional based on payment method */}
            {selectedPayment.payment?.method === 'gcash' && (
            <div className='mb-8 bg-amber-50/40 backdrop-blur-md border border-amber-100/50 rounded-[2rem] p-6 relative overflow-hidden group/warn shadow-[0_10px_30px_rgba(245,158,11,0.05)]'>
              <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-400 opacity-20 group-hover/warn:opacity-40 transition-opacity"></div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-200/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover/warn:bg-amber-200/20 transition-all duration-500"></div>
              <div className="flex items-center gap-5 relative z-10 pl-2">
                <div className="w-12 h-12 rounded-2xl bg-amber-100/80 flex items-center justify-center text-amber-600 flex-shrink-0 shadow-sm">
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <p className='text-[10px] font-black text-amber-700/60 uppercase tracking-[0.2em] mb-1'>Verification Checklist</p>
                  <p className='text-sm text-amber-950 font-bold leading-relaxed'>
                    Verify the <span className="bg-amber-100/50 px-1.5 py-0.5 rounded-md border border-amber-200/50">reference number</span> against your GCash merchant dashboard.
                  </p>
                </div>
              </div>
            </div>
            )}

            {selectedPayment.payment?.method === 'in_store' && (
            <div className='mb-10 p-6 bg-green-50/50 border border-green-100 rounded-[2.5rem] flex items-center gap-4 group/info overflow-hidden relative'>
              <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-green-500/10 transition-all duration-500"></div>
              <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-green-600 flex-shrink-0">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="relative z-10">
                <p className='text-[10px] font-black text-green-700/50 uppercase tracking-[0.2em] mb-1'>Payment Agreement</p>
                <p className='text-sm font-bold text-green-800 leading-relaxed'>
                  The customer will pay <span className="font-black">₱{selectedPayment.price?.toLocaleString()}</span> in full at the shop during pickup.
                </p>
              </div>
            </div>
            )}

            {/* Rejection Reason - Only for GCash */}
            {selectedPayment.payment?.method === 'gcash' && (
            <div className='mb-8' id='rejectionReasonField'>
              <div className="flex items-center justify-between mb-3 px-2">
                <label className='text-[10px] font-black text-gray-500 uppercase tracking-widest'>
                  Rejection Reason <span className="text-red-500 opacity-60 ml-1">(Required for rejection)</span>
                </label>
                <div className="flex items-center gap-1.5 text-[9px] font-black text-primary/60 uppercase tracking-tight">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Client Preview
                </div>
              </div>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder='E.g., Reference number not found in our records. Please re-upload a clear screenshot.'
                rows={4}
                className='w-full px-7 py-6 bg-gray-50/80 border-2 border-gray-100 rounded-[2.5rem] text-sm font-bold text-primary transition-all focus:border-primary/20 focus:bg-white focus:ring-12 focus:ring-primary/5 outline-none resize-none placeholder:text-gray-400 shadow-inner'
              />
              <p className='text-[10px] font-black text-gray-500 mt-4 px-4 flex items-center gap-2'>
                <div className="w-1.5 h-1.5 bg-primary/20 rounded-full"></div>
                This message will be visible to the customer on their booking details page.
              </p>
            </div>
            )}

            {/* Action Buttons - Conditional rendering based on payment method */}
            {selectedPayment.payment?.method === 'gcash' && (
            <div className='flex flex-col sm:flex-row gap-5'>
              <button
                onClick={() => handleVerifyPayment(selectedPayment._id || selectedPayment.id, 'approve')}
                className='flex-[1.8] h-20 bg-[#00A859] text-white rounded-3xl font-black text-xs sm:text-sm uppercase tracking-[0.2em] hover:bg-green-700 hover:shadow-[0_25px_60px_rgba(0,168,89,0.35)] hover:-translate-y-1.5 active:scale-95 transition-all duration-500 flex items-center justify-center gap-4 group shadow-[0_15px_35px_rgba(0,168,89,0.2)]'
              >
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span>Verify & Approve</span>
              </button>
              <button
                onClick={() => handleVerifyPayment(selectedPayment._id || selectedPayment.id, 'reject')}
                disabled={rejectingPayment}
                className='flex-1 h-20 bg-white text-red-500 border-2 border-red-50 rounded-3xl font-black text-xs sm:text-sm uppercase tracking-[0.2em] hover:bg-red-50 hover:border-red-100/50 hover:text-red-700 shadow-sm active:scale-95 transition-all duration-500 flex items-center justify-center gap-3 group'
              >
                {rejectingPayment ? (
                  <div className='flex items-center gap-2'>
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
                    <span>Processing...</span>
                  </div>
                 ) : (
                  <>
                    <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center transition-colors group-hover:bg-red-100">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    <span>Reject</span>
                  </>
                )}
              </button>
            </div>
            )}

            {selectedPayment.payment?.method === 'in_store' && (
            <div className='flex flex-col sm:flex-row gap-4'>
              <button
                onClick={() => handleVerifyPayment(selectedPayment._id || selectedPayment.id, 'approve')}
                className='flex-[2] h-16 bg-primary text-white rounded-2xl font-black text-xs sm:text-sm uppercase tracking-widest hover:bg-primary-dull hover:shadow-[0_20px_40px_rgba(1,62,141,0.25)] hover:-translate-y-1 active:scale-95 transition-all duration-300 flex items-center justify-center gap-2 group'
              >
                <span>Confirm Cash Received</span>
                <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
              <button
                onClick={() => setShowPaymentModal(false)}
                className='flex-1 h-16 bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-widest active:scale-95 transition-all duration-300'
              >
                Close
              </button>
            </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default ManageBookings

