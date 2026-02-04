import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
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

const MyBookings = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

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

  const currency = CURRENCY

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
      setBookings([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBookings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  const openEdit = (booking, mode) => {
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
  }

  const closeEdit = () => {
    setEditOpen(false)
    setSelectedBooking(null)
    setSaving(false)
  }

  const handleFormChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
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
        action: 'reschedule',
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

      const updated = data.booking || data.Booking
      if (updated) {
        setBookings((prev) => prev.map((b) => ((b._id || b.id) === id ? updated : b)))
      } else {
        await fetchBookings()
      }

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
                  <div className={`absolute top-3 right-3 sm:top-4 sm:right-4 px-2.5 sm:px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(booking.status)}`}>
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

                    {isTrial && booking.trialExpiresAt && (
                      <div className='mt-2 p-2.5 bg-orange-50 border border-orange-200 rounded-lg text-xs sm:text-sm text-orange-900'>
                        <p className='font-semibold'>Trial Hold</p>
                        <p>Expires: <strong>{formatDate(booking.trialExpiresAt)}</strong> (no payment required)</p>
                      </div>
                    )}
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

                  {/* Actions */}
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

                      {isTrial ? (
                        <button
                          type='button'
                          onClick={() => continueToBook(booking)}
                          className='px-3 py-2 rounded-lg text-sm font-semibold bg-primary text-white hover:bg-primary-dull transition-colors'
                        >
                          Continue to Book
                        </button>
                      ) : (
                        <button
                          type='button'
                          onClick={() => openEdit(booking, 'extend')}
                          disabled={!editable}
                          className={`px-3 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                            editable
                              ? 'border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white'
                              : 'border-gray-200 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          Extend
                        </button>
                      )}
                    </div>

                    <button
                      type='button'
                      onClick={() => cancelBooking(booking)}
                      disabled={!cancelable}
                      className={`w-full px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                        cancelable ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      {isTrial ? 'Cancel Booking' : 'Cancel Reservation'}
                    </button>

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
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                <div>
                  <label className='block text-sm font-semibold text-gray-700 mb-1'>{(selectedBooking.status || '').toLowerCase() === 'trial' ? 'Trial Date' : 'Pickup Date'}</label>
                  <input
                    type='date'
                    name='pickupDate'
                    value={form.pickupDate}
                    onChange={handleFormChange}
                    disabled={editMode === 'extend'}
                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none disabled:bg-gray-100'
                  />
                </div>
                <div>
                  <label className='block text-sm font-semibold text-gray-700 mb-1'>Pickup Time</label>
                  <select
                    name='pickupTime'
                    value={form.pickupTime}
                    onChange={handleFormChange}
                    disabled={editMode === 'extend'}
                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none disabled:bg-gray-100'
                  >
                    {allowedTimes.map((t) => (
                      <option key={t} value={t}>{formatTime(t)}</option>
                    ))}
                  </select>
                </div>
              </div>

              {((selectedBooking.status || '').toLowerCase() !== 'trial') && (
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                  <div>
                    <label className='block text-sm font-semibold text-gray-700 mb-1'>Return Date</label>
                    <input
                      type='date'
                      name='returnDate'
                      value={form.returnDate}
                      onChange={handleFormChange}
                      className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none'
                    />
                  </div>
                  <div>
                    <label className='block text-sm font-semibold text-gray-700 mb-1'>Return Time</label>
                    <select
                    name='returnTime'
                    value={form.returnTime}
                    onChange={handleFormChange}
                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none'
                  >
                    {allowedTimes.map((t) => (
                      <option key={t} value={t}>{formatTime(t)}</option>
                    ))}
                  </select>
                  </div>
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
                  disabled={saving}
                  className='flex-1 px-4 py-2.5 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dull disabled:bg-gray-400'
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
