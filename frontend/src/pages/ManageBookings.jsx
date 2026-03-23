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
          <div className='mb-10 overflow-x-auto premium-scrollbar-yellow -mx-3 px-3 pb-2'>
            <div className='inline-flex items-center gap-2 p-1 bg-gray-100/50 rounded-2xl min-w-full'>
              {['all', 'trial', 'pending', 'confirmed', 'completed', 'canceled'].map((status) => {
                const count = status === 'all' 
                  ? bookings.length 
                  : bookings.filter(b => b.status === status).length;
                
                // Ensure critical tabs are always visible

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
                  <div className='p-4 sm:p-6 lg:p-8 flex flex-col xl:flex-row xl:items-center justify-between gap-6 sm:gap-8'>
                    {/* Item and Client Info */}
                    <div className='flex items-center gap-6 flex-1'>
                      <div className="relative flex-shrink-0">
                        <img 
                          src={booking.gown?.image?.[0] || booking.gown?.image || assets.gown_image1} 
                          alt={booking.gown?.name} 
                          loading="lazy"
                          className='w-20 h-20 sm:w-32 sm:h-32 object-contain bg-white rounded-2xl sm:rounded-[2rem] shadow-lg group-hover:scale-105 transition-transform duration-700'
                        />
                         <div className={`absolute -bottom-1 -right-1 w-8 h-8 rounded-xl flex items-center justify-center border-4 border-white shadow-md ${
                            booking.status === 'confirmed' || booking.status === 'completed' ? 'bg-green-500' : 
                            booking.status === 'pending' ? 'bg-orange-500' :
                            booking.status === 'trial' ? 'bg-gray-500' : 'bg-red-500'
                          }`}>
                            <div className="w-2.5 h-2.5 rounded-full bg-white"></div>
                          </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                            <span className={`px-3 py-1 rounded-full text-[11px] font-black tracking-widest uppercase ${
                                booking.status === 'confirmed' || booking.status === 'completed' ? 'bg-green-50 text-green-700' : 
                                booking.status === 'pending' ? 'bg-orange-50 text-orange-600' : 
                                booking.status === 'trial' ? 'bg-gray-100 text-gray-600' : 
                                'bg-red-50 text-red-600'
                            }`}>
                                {booking.status}
                            </span>
                             <span className="text-xs font-bold text-gray-400">ID: #{(booking._id || booking.id)?.slice(-6).toUpperCase()}</span>
                        </div>
                        <h3 className='text-xl sm:text-2xl font-black text-primary-dull group-hover:text-primary transition-colors leading-tight mb-3'>
                            {booking.gown?.name || 'Gown Name'}
                        </h3>
                         <div className="flex flex-wrap items-center gap-y-2 gap-x-4 sm:gap-x-5">
                             <div className="flex items-center gap-2">
                                 <div className="p-1.5 bg-gray-50 rounded-lg">
                                      <svg className="w-3.5 h-3.5 opacity-40" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                                      </svg>
                                 </div>
                                 <div className="min-w-0">
                                     <p className="text-[10px] sm:text-xs font-black text-gray-400 uppercase tracking-widest">Client</p>
                                     <p className="text-xs font-bold text-gray-700 truncate">{booking.user?.name || 'User Name'}</p>
                                 </div>
                             </div>
                             <div className="flex items-center gap-2">
                                 <div className="p-1.5 bg-gray-50 rounded-lg">
                                      <svg className="w-3.5 h-3.5 opacity-40" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                                      </svg>
                                 </div>
                                 <div className="min-w-0">
                                     <p className="text-[10px] sm:text-xs font-black text-gray-400 uppercase tracking-widest">Contact</p>
                                     <p className="text-xs font-bold text-gray-700 truncate">{booking.contactNumber || 'N/A'}</p>
                                 </div>
                             </div>
                         </div>
                      </div>
                    </div>

                    {/* Schedule, Payment & Actions */}
                    <div className='flex flex-wrap xl:flex-nowrap items-center gap-6 xl:border-l xl:border-gray-50 xl:pl-8'>
                      <div className="grid grid-cols-2 gap-3 sm:gap-4 overflow-hidden">
                        {booking.status === 'trial' ? (
                          <div className="bg-primary/5 p-3 sm:p-4 rounded-2xl border border-primary/10 min-w-[140px] col-span-2">
                            <p className="text-[10px] sm:text-xs font-black text-primary uppercase tracking-widest mb-1.5">Try-on Schedule</p>
                            <p className="text-sm sm:text-base font-black text-primary-dull">{formatDate(booking.pickupDate)}</p>
                            <p className="text-[10px] sm:text-xs font-bold text-primary/60 mt-0.5">{booking.pickupTime || '09:00'}</p>
                          </div>
                        ) : (
                          <>
                            <div className="bg-gray-50/50 p-3 sm:p-4 rounded-2xl border border-gray-50 min-w-0">
                               <p className="text-[10px] sm:text-xs font-black text-primary/40 uppercase tracking-widest mb-1.5">Pickup</p>
                               <p className="text-xs sm:text-sm font-black text-primary-dull truncate">{formatDate(booking.pickupDate)}</p>
                               <p className="text-[10px] sm:text-[11px] font-bold text-gray-400 mt-0.5">{booking.pickupTime || '09:00'}</p>
                            </div>
                             <div className="bg-gray-50/50 p-3 sm:p-4 rounded-2xl border border-gray-50 min-w-0">
                               <p className="text-[10px] sm:text-xs font-black text-primary/40 uppercase tracking-widest mb-1.5">Return</p>
                               <p className="text-xs sm:text-sm font-black text-primary-dull truncate">{formatDate(booking.returnDate)}</p>
                               <p className="text-[10px] sm:text-[11px] font-bold text-gray-400 mt-0.5">{booking.returnTime || '09:00'}</p>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Value & Actions */}
                      {booking.status !== 'trial' && (
                        <div className="flex flex-col items-center xl:items-end justify-center min-w-[140px]">
                           <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Total Value</p>
                          <p className='text-3xl font-black text-primary-dull flex items-baseline gap-1'>
                            <span className="text-sm opacity-40">₱</span>
                            {booking.price?.toLocaleString()}
                          </p>
                          
                          {/* Status Badge Secondary */}
                          {booking.payment && (
                              <div className={`mt-3 px-3 py-1 rounded-xl text-[11px] font-bold uppercase tracking-wider ${
                                  booking.payment.status === 'verified' ? 'bg-green-50 text-green-700' :
                                  booking.payment.status === 'pending' ? 'bg-orange-50 text-orange-600' : 'bg-red-50 text-red-600'
                              }`}>
                                  {booking.payment.method === 'gcash' ? 'GCash' : 'Cash'} • {booking.payment.status}
                              </div>
                          )}
                        </div>
                      )}

                      {/* Control Actions */}
                      <div className='flex flex-col sm:flex-row xl:flex-col gap-2.5 w-full xl:w-auto'>
                        {/* Trial Actions */}
                        {booking.status === 'trial' && (
                          <button
                            onClick={() => handleStatusChange(booking._id || booking.id, 'canceled')}
                            className='flex-1 xl:w-44 h-14 bg-red-50 text-red-600 border border-red-100 rounded-2xl font-black text-base uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all flex items-center justify-center gap-2 px-8'
                          >
                            Cancel
                          </button>
                        )}

                        {/* Payment Verification */}
                        {booking.status === 'pending' && booking.payment?.status === 'pending' && (
                          <button
                            onClick={() => openPaymentModal(booking)}
                            className='flex-1 xl:w-48 h-14 bg-primary text-white rounded-2xl font-black text-base uppercase tracking-widest hover:shadow-2xl hover:shadow-primary/30 active:scale-95 transition-all flex items-center justify-center gap-2 px-8'
                          >
                            Verify
                          </button>
                        )}

                        {/* Confirm/Complete Actions */}
                        {booking.status === 'pending' && (booking.payment?.status === 'verified' || booking.payment?.status === 'paid' || !booking.payment) && (
                           <button
                             onClick={() => handleStatusChange(booking._id || booking.id, 'confirmed')}
                             className='flex-1 xl:w-48 h-14 bg-primary text-white rounded-2xl font-black text-base uppercase tracking-widest hover:shadow-2xl hover:shadow-primary/30 active:scale-95 transition-all flex items-center justify-center gap-2 px-8'
                           >
                             Confirm pickup
                           </button>
                        )}

                        {booking.status === 'confirmed' && (
                          <button
                            onClick={() => handleStatusChange(booking._id || booking.id, 'completed')}
                            className='flex-1 xl:w-48 h-14 bg-green-600 text-white rounded-2xl font-black text-base uppercase tracking-widest hover:shadow-2xl hover:shadow-green-500/30 active:scale-95 transition-all flex items-center justify-center gap-2 px-8'
                          >
                            Completed
                          </button>
                        )}

                         {/* Global Cancel for uncompleted bookings */}
                         {['pending', 'confirmed'].includes(booking.status) && (
                            <button
                              onClick={() => handleStatusChange(booking._id || booking.id, 'canceled')}
                              className='flex-1 xl:w-48 h-12 sm:h-14 bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-600 rounded-2xl font-black text-xs sm:text-base uppercase tracking-widest transition-all flex items-center justify-center gap-2 px-8'
                            >
                              <img src={assets.delete_icon} className="w-5 h-5 sm:w-6 sm:h-6 opacity-40 group-hover:opacity-100 group-hover:brightness-0 group-hover:invert transition-all" alt="cancel" />
                              Cancel
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
                  <label className='block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1'>Customer</label>
                  <p className='text-sm font-black text-primary'>{selectedPayment.user?.name}</p>
                </div>
                <div>
                  <label className='block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1'>Gown</label>
                  <p className='text-sm font-black text-primary'>{selectedPayment.gown?.name}</p>
                </div>
                <div>
                  <label className='block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1'>Total Price</label>
                  <p className='text-lg font-black text-primary'>{currency}{selectedPayment.price?.toLocaleString()}</p>
                </div>
                {selectedPayment.payment?.method === 'gcash' && (
                  <div>
                    <label className='block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1'>Deposit (50%)</label>
                    <p className='text-lg font-black text-green-600'>{currency}{selectedPayment.payment?.depositAmount?.toLocaleString()}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Payment Details - Only show for GCash */}
            {selectedPayment.payment?.method === 'gcash' && (
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
            )}

            {/* Screenshot - Only for GCash */}
            {selectedPayment.payment?.method === 'gcash' && (
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
            )}

            {/* Warning - Conditional based on payment method */}
            {selectedPayment.payment?.method === 'gcash' && (
            <div className='mb-4 sm:mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4'>
              <p className='text-xs sm:text-sm text-yellow-800'>
                <strong>Important:</strong> Please verify that the reference number matches the GCash transaction and the amount is correct before approving.
              </p>
            </div>
            )}

            {selectedPayment.payment?.method === 'in_store' && (
            <div className='mb-4 sm:mb-6 bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4'>
              <p className='text-xs sm:text-sm text-green-800'>
                <strong>Cash Payment:</strong> The customer will pay ₱{selectedPayment.price?.toLocaleString()} in full at the shop during pickup.

              </p>
            </div>
            )}

            {/* Rejection Reason - Only for GCash */}
            {selectedPayment.payment?.method === 'gcash' && (
            <div className='mb-4 sm:mb-6' id='rejectionReasonField'>
              <label className='block text-sm font-semibold text-gray-700 mb-2'>
                Rejection Reason (mandatory if rejecting)
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder='Explain why you are rejecting this payment. This message will be shown to the customer.'
                rows={3}
                className='w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none resize-none'
              />
              <p className='text-xs text-gray-500 mt-1'>The customer will see this reason when they check their booking.</p>
            </div>
            )}

            {/* Action Buttons - Conditional rendering based on payment method */}
            {selectedPayment.payment?.method === 'gcash' && (
            <div className='flex flex-col sm:flex-row gap-3 sm:gap-4'>
              <button
                onClick={() => handleVerifyPayment(selectedPayment._id || selectedPayment.id, 'approve')}
                className='flex-1 px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold'
              >
                Approve Payment
              </button>
              <button
                onClick={() => handleVerifyPayment(selectedPayment._id || selectedPayment.id, 'reject')}
                disabled={rejectingPayment}
                className='flex-1 px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold disabled:bg-red-400 disabled:cursor-not-allowed'
              >
                {rejectingPayment ? 'Rejecting...' : 'Reject Payment'}
              </button>
            </div>
            )}

            {selectedPayment.payment?.method === 'in_store' && (
            <div className='flex flex-col sm:flex-row gap-3 sm:gap-4'>
              <button
                onClick={() => handleVerifyPayment(selectedPayment._id || selectedPayment.id, 'approve')}
                className='flex-1 px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold'
              >
                Confirm Cash Payment Received
              </button>
              <button
                onClick={() => setShowPaymentModal(false)}
                className='flex-1 px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition-colors font-semibold'
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

