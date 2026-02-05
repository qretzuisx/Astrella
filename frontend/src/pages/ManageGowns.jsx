import React, { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { assets } from '../assets/assets'
import { API_URL, CURRENCY } from '../config'
import OwnerSidebar from '../components/OwnerSidebar'

const ManageGowns = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [gowns, setGowns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [laundryForm, setLaundryForm] = useState({})
  const [laundrySaving, setLaundrySaving] = useState(null)
  const currency = CURRENCY

  // Edit modal state
  const [editOpen, setEditOpen] = useState(false)
  const [selectedGown, setSelectedGown] = useState(null)
  const [editSaving, setEditSaving] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    price: '',
    description: '',
    size: [],
    eventType: [],
    fabric: '',
    color: '',
    ageGroup: '',
    gender: '',
    status: 'Available'
  })

  useEffect(() => {
    fetchGowns()
    // Clear location state after refresh
    if (location.state?.refresh) {
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location.state])

  const fetchGowns = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      if (!token) {
        window.location.href = '/'
        return
      }

      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
      const response = await fetch(`${API_URL}/owner/gowns`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()
      
      if (data.success) {
        const gownsList = data.gowns || []
        setGowns(gownsList)
        const laundryMap = gownsList.reduce((acc, gown) => {
          acc[gown._id || gown.id] = String(typeof gown.laundryDays === 'number' ? gown.laundryDays : 0)
          return acc
        }, {})
        setLaundryForm(laundryMap)
      } else {
        setError(data.message || 'Failed to load gowns')
      }
    } catch (error) {
      console.error('Error fetching gowns:', error)
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleAvailability = async (gownId) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL}/owner/toogle-gown`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ gownID: gownId })
      })

      const data = await response.json()
      
      if (data.success || data.sucess) {
        setSuccess('Availability updated successfully')
        // Refresh gowns list
        fetchGowns()
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.message || 'Failed to update availability')
        setTimeout(() => setError(''), 3000)
      }
    } catch (error) {
      console.error('Error toggling availability:', error)
      setError('An error occurred. Please try again.')
      setTimeout(() => setError(''), 3000)
    }
  }

  const handleDeleteGown = async (gownId) => {
    if (!window.confirm('Are you sure you want to delete this gown? This action cannot be undone.')) {
      return
    }

    try {
      const token = localStorage.getItem('token')
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
      
      const response = await fetch(`${API_URL}/owner/delete-gown`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ gownID: gownId })
      })

      const data = await response.json()
      
      if (data.success || data.sucess) {
        setSuccess('Gown deleted successfully')
        // Refresh gowns list
        fetchGowns()
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.message || 'Failed to delete gown')
        setTimeout(() => setError(''), 3000)
      }
    } catch (error) {
      console.error('Error deleting gown:', error)
      setError('An error occurred. Please try again.')
      setTimeout(() => setError(''), 3000)
    }
  }

  const handleLaundryInputChange = (gownId, value) => {
    setLaundryForm(prev => ({ ...prev, [gownId]: value }))
  }

  const handleSaveLaundryDays = async (gownId) => {
    const rawValue = laundryForm[gownId]
    const parsedValue = Number(rawValue)

    if (!Number.isFinite(parsedValue) || parsedValue < 0) {
      setError('Laundry days must be 0 or greater.')
      setTimeout(() => setError(''), 3000)
      return
    }

    try {
      setLaundrySaving(gownId)
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL}/owner/gown/laundry-days`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ gownID: gownId, laundryDays: parsedValue })
      })

      const data = await response.json()
      if (data.success || data.sucess) {
        setSuccess('Laundry days updated successfully')
        setGowns(prev => prev.map(g => (g._id || g.id) == gownId ? { ...g, laundryDays: data.laundryDays } : g))
        setLaundryForm(prev => ({ ...prev, [gownId]: String(data.laundryDays ?? parsedValue) }))
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.message || 'Failed to update laundry days')
        setTimeout(() => setError(''), 3000)
      }
    } catch (err) {
      console.error('Error updating laundry days:', err)
      setError('An error occurred. Please try again.')
      setTimeout(() => setError(''), 3000)
    } finally {
      setLaundrySaving(null)
    }
  }

  const openEditModal = (gown) => {
    setSelectedGown(gown)
    setEditForm({
      name: gown.name || '',
      price: String(gown.price || ''),
      description: gown.description || '',
      size: Array.isArray(gown.size) ? gown.size : [gown.size || 'Free Size'],
      eventType: Array.isArray(gown.eventType) ? gown.eventType : [gown.eventType || ''],
      fabric: gown.fabric || '',
      color: gown.color || '',
      ageGroup: gown.ageGroup || '',
      gender: gown.gender || '',
      status: gown.status || 'Available'
    })
    setError('')
    setSuccess('')
    setEditOpen(true)
  }

  const closeEditModal = () => {
    setEditOpen(false)
    setSelectedGown(null)
    setEditSaving(false)
  }

  const handleEditFormChange = (e) => {
    const { name, value } = e.target
    setEditForm(prev => ({ ...prev, [name]: value }))
  }

  const handleSizeToggle = (size) => {
    setEditForm(prev => {
      if (prev.size.includes(size)) {
        return { ...prev, size: prev.size.filter(s => s !== size) }
      } else {
        return { ...prev, size: [...prev.size, size] }
      }
    })
  }

  const handleEventTypeToggle = (eventType) => {
    setEditForm(prev => {
      if (prev.eventType.includes(eventType)) {
        return { ...prev, eventType: prev.eventType.filter(e => e !== eventType) }
      } else {
        return { ...prev, eventType: [...prev.eventType, eventType] }
      }
    })
  }

  const submitEditGown = async () => {
    if (!selectedGown) return

    // Validation
    if (!editForm.name || !editForm.fabric || !editForm.price || !editForm.color) {
      setError('Please fill in all required fields')
      return
    }

    if (editForm.size.length === 0) {
      setError('Please select at least one size')
      return
    }

    if (editForm.eventType.length === 0) {
      setError('Please select at least one event type')
      return
    }

    try {
      setEditSaving(true)
      setError('')
      setSuccess('')

      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL}/owner/gown/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          gownID: selectedGown._id || selectedGown.id,
          name: editForm.name,
          price: parseFloat(editForm.price),
          description: editForm.description,
          size: editForm.size,
          eventType: editForm.eventType.map(e => e.toLowerCase()),
          fabric: editForm.fabric,
          color: editForm.color,
          ageGroup: editForm.ageGroup,
          gender: editForm.gender,
          status: editForm.status
        })
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('Gown updated successfully')
        fetchGowns()
        setTimeout(() => setSuccess(''), 3000)
        closeEditModal()
      } else {
        setError(data.message || 'Failed to update gown')
        setTimeout(() => setError(''), 3000)
      }
    } catch (error) {
      console.error('Error updating gown:', error)
      setError('An error occurred. Please try again.')
      setTimeout(() => setError(''), 3000)
    } finally {
      setEditSaving(false)
    }
  }

  if (loading) {
    return (
      <div className='flex min-h-screen'>
        <OwnerSidebar />
        <div className='flex-1 flex items-center justify-center px-4'>
          <div className='text-center'>
            <p className='text-lg sm:text-xl text-gray-500 mb-4'>Loading apparel...</p>
            <div className='animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-primary mx-auto'></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='flex min-h-screen bg-gray-50'>
      <OwnerSidebar />
      
      <div className='flex-1 p-4 sm:p-6 lg:p-8'>
        <div className='max-w-7xl mx-auto'>
          {/* Header */}
          <div className='mb-6 sm:mb-8 mt-12 lg:mt-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
            <div>
              <h1 className='text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2'>Manage Apparel</h1>
              <p className='text-sm sm:text-base text-gray-600'>View and manage all your apparel.</p>
            </div>
            <button
              onClick={() => navigate('/owner/add-gown')}
              className='w-full sm:w-auto px-5 sm:px-6 py-2.5 sm:py-3 bg-primary text-white rounded-lg hover:bg-primary-dull transition-colors font-semibold flex items-center justify-center gap-2 text-sm sm:text-base'
            >
              <img src={assets.addIconColored} alt="add" className='w-4 h-4 sm:w-5 sm:h-5 filter brightness-0 invert' />
              Add New Gown
            </button>
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

          {/* Gowns Grid */}
          {gowns.length === 0 ? (
            <div className='text-center py-12 sm:py-16 bg-white rounded-xl border border-gray-200 px-4'>
              <img src={assets.gownIcon} alt="gown" className='w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 opacity-50' />
              <p className='text-lg sm:text-xl text-gray-500 mb-3 sm:mb-4'>No apparel found</p>
              <p className='text-sm sm:text-base text-gray-400 mb-4 sm:mb-6'>Start by adding your first gown!</p>
              <button
                onClick={() => navigate('/owner/add-gown')}
                className='px-5 sm:px-6 py-2.5 sm:py-3 bg-primary text-white rounded-lg hover:bg-primary-dull transition-colors font-semibold text-sm sm:text-base'
              >
                Add Your First Gown
              </button>
            </div>
          ) : (
            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6'>
              {gowns.map((gown) => (
                <div 
                  key={gown._id || gown.id} 
                  className='bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow'
                >
                  {/* Gown Image */}
                  <div className='relative h-48 sm:h-56 md:h-64 overflow-hidden'>
                    <img 
                      src={Array.isArray(gown.image) ? gown.image[0] : gown.image || assets.gown_image1} 
                      alt={gown.name}
                      className='w-full h-full object-cover'
                    />
                    <div className='absolute top-2 left-2 sm:top-4 sm:left-4'>
                      <div className={`px-2 py-1 sm:px-3 rounded-full text-xs font-semibold ${
                        gown.available
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {gown.available ? 'Available' : 'Unavailable'}
                      </div>
                    </div>
                    {gown.verified && (
                      <div className='absolute top-2 right-2 sm:top-4 sm:right-4'>
                        <div className='px-2 py-1 sm:px-3 rounded-full text-xs font-semibold bg-blue-100 text-blue-800'>
                          Verified
                        </div>
                      </div>
                    )}
                    <div className='absolute bottom-2 right-2 sm:bottom-4 sm:right-4 bg-black/80 backdrop-blur-sm text-white px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg'>
                      <span className='text-sm sm:text-base font-semibold'>{currency}{gown.price?.toLocaleString() || 0}</span>
                    </div>
                  </div>

                  {/* Gown Details */}
                  <div className='p-4 sm:p-6'>
                    <h3 className='text-lg sm:text-xl font-bold text-gray-900 mb-2 truncate'>{gown.name}</h3>
                    {typeof gown.description === 'string' && gown.description.trim() !== '' && (
                      <p className='text-gray-600 text-xs sm:text-sm mb-3 sm:mb-4 line-clamp-2'>{gown.description}</p>
                    )}
                    
                    {/* Details Grid */}
                    <div className='grid grid-cols-2 gap-1.5 sm:gap-2 mb-3 sm:mb-4 text-xs sm:text-sm'>
                      <div className='flex items-center gap-1.5 sm:gap-2 text-gray-600'>
                        <img src={assets.fabric_icon} alt="fabric" className='w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0' />
                        <span className='truncate'>{gown.fabric}</span>
                      </div>
                      <div className='flex items-center gap-1.5 sm:gap-2 text-gray-600'>
                        <img src={assets.color_icon} alt="color" className='w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0' />
                        <span className='truncate'>{gown.color}</span>
                      </div>
                      <div className='flex items-center gap-1.5 sm:gap-2 text-gray-600'>
                        <img src={assets.event_icon} alt="event" className='w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0' />
                        <span className='capitalize truncate'>
                          {Array.isArray(gown.eventType) && gown.eventType.length > 0
                            ? gown.eventType.join(', ')
                            : gown.eventType || 'N/A'}
                        </span>
                      </div>
                      <div className='flex items-center gap-1.5 sm:gap-2 text-gray-600'>
                        <img src={assets.size_icon} alt="size" className='w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0' />
                        <span className='truncate'>
                          {Array.isArray(gown.size) ? gown.size.join(', ') : gown.size || 'N/A'}
                        </span>
                      </div>
                    </div>

                    {/* Status Field */}
                    <div className='mb-3 sm:mb-4 p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-200'>
                      <p className='text-xs sm:text-sm font-semibold text-blue-800 mb-2'>Status</p>
                      <p className='text-sm sm:text-base font-semibold text-blue-900'>{gown.status || 'Available'}</p>
                    </div>
                    <div className='mt-3 sm:mt-4 p-3 sm:p-4 bg-gray-50 rounded-lg border border-dashed border-gray-300'>
                      <div className='flex items-center justify-between mb-2 sm:mb-3'>
                        <p className='text-xs sm:text-sm font-semibold text-gray-700'>Laundry Days</p>
                      </div>
                      <div className='flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3'>
                        <div className='flex items-center gap-2'>
                          <input
                            type='number'
                            min='0'
                            max='14'
                            value={laundryForm[gown._id || gown.id] ?? String(gown.laundryDays ?? 0)}
                            onChange={(e) => handleLaundryInputChange(gown._id || gown.id, e.target.value)}
                            className='w-20 sm:w-24 px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-xs sm:text-sm'
                          />
                          <span className='text-xs sm:text-sm text-gray-600'>day(s)</span>
                        </div>
                        <button
                          onClick={() => handleSaveLaundryDays(gown._id || gown.id)}
                          disabled={laundrySaving === (gown._id || gown.id)}
                          className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors ${
                            laundrySaving === (gown._id || gown.id)
                              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                              : 'bg-primary text-white hover:bg-primary-dull'
                          }`}
                        >
                          {laundrySaving === (gown._id || gown.id) ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className='flex gap-2 pt-3 sm:pt-4 border-t border-gray-200 mt-3 sm:mt-4'>
                      <button
                        onClick={() => openEditModal(gown)}
                        className='flex-1 px-3 sm:px-4 py-2 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 transition-colors text-xs sm:text-sm font-semibold'
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleToggleAvailability(gown._id || gown.id)}
                        className={`flex-1 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors ${
                          gown.available
                            ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                            : 'bg-green-100 text-green-800 hover:bg-green-200'
                        }`}
                      >
                        {gown.available ? 'Unavailable' : 'Available'}
                      </button>
                      <button
                        onClick={() => handleDeleteGown(gown._id || gown.id)}
                        className='px-3 sm:px-4 py-2 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 transition-colors text-xs sm:text-sm font-semibold'
                      >
                        <img src={assets.delete_icon} alt="delete" className='w-4 h-4 mx-auto' />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Gown Modal */}
      {editOpen && selectedGown && (
        <div
          className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'
          onClick={closeEditModal}
        >
          <div
            className='bg-white rounded-xl shadow-xl max-w-2xl w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto'
            onClick={(e) => e.stopPropagation()}
          >
            <div className='flex items-start justify-between gap-4 mb-6'>
              <div>
                <h2 className='text-lg sm:text-xl font-bold text-gray-900'>Edit Apparel</h2>
                <p className='text-xs sm:text-sm text-gray-600'>{selectedGown.name}</p>
              </div>
              <button
                onClick={closeEditModal}
                className='text-gray-400 hover:text-gray-600 text-2xl leading-none'
              >
                ×
              </button>
            </div>

            {/* Error Messages */}
            {error && (
              <div className='mb-4 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg'>
                <p className='text-red-800 text-sm sm:text-base'>{error}</p>
              </div>
            )}

            <div className='space-y-4'>
              {/* Name */}
              <div>
                <label className='block text-sm font-semibold text-gray-700 mb-1'>Name *</label>
                <input
                  type='text'
                  name='name'
                  value={editForm.name}
                  onChange={handleEditFormChange}
                  className='w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none text-sm'
                />
              </div>

              {/* Price */}
              <div>
                <label className='block text-sm font-semibold text-gray-700 mb-1'>Price (₱) *</label>
                <input
                  type='number'
                  name='price'
                  min='0'
                  step='100'
                  value={editForm.price}
                  onChange={handleEditFormChange}
                  className='w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none text-sm'
                />
              </div>

              {/* Description */}
              <div>
                <label className='block text-sm font-semibold text-gray-700 mb-1'>Description</label>
                <textarea
                  name='description'
                  value={editForm.description}
                  onChange={handleEditFormChange}
                  rows='3'
                  className='w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none resize-none text-sm'
                />
              </div>

              {/* Fabric */}
              <div>
                <label className='block text-sm font-semibold text-gray-700 mb-1'>Fabric *</label>
                <input
                  type='text'
                  name='fabric'
                  value={editForm.fabric}
                  onChange={handleEditFormChange}
                  placeholder='e.g., Silk, Chiffon, Cotton'
                  className='w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none text-sm'
                />
              </div>

              {/* Color */}
              <div>
                <label className='block text-sm font-semibold text-gray-700 mb-1'>Color *</label>
                <input
                  type='text'
                  name='color'
                  value={editForm.color}
                  onChange={handleEditFormChange}
                  placeholder='e.g., Red, Blue, Gold'
                  className='w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none text-sm'
                />
              </div>

              {/* Event Types */}
              <div>
                <label className='block text-sm font-semibold text-gray-700 mb-2'>Event Type *</label>
                <div className='grid grid-cols-2 gap-2'>
                  {['wedding', 'traditional', 'prom', 'formal', 'themed'].map((event) => (
                    <button
                      key={event}
                      type='button'
                      onClick={() => handleEventTypeToggle(event)}
                      className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors border ${
                        editForm.eventType.includes(event)
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-primary'
                      }`}
                    >
                      {event.charAt(0).toUpperCase() + event.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sizes */}
              <div>
                <label className='block text-sm font-semibold text-gray-700 mb-2'>Size *</label>
                <div className='grid grid-cols-4 gap-2'>
                  {['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free Size'].map((size) => (
                    <button
                      key={size}
                      type='button'
                      onClick={() => handleSizeToggle(size)}
                      className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs font-semibold transition-colors border ${
                        editForm.size.includes(size)
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-primary'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Age Group */}
              <div>
                <label className='block text-sm font-semibold text-gray-700 mb-1'>Age Group (Optional)</label>
                <input
                  type='text'
                  name='ageGroup'
                  value={editForm.ageGroup}
                  onChange={handleEditFormChange}
                  placeholder='e.g., Kids, Teens, Adults'
                  className='w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none text-sm'
                />
              </div>

              {/* Gender */}
              <div>
                <label className='block text-sm font-semibold text-gray-700 mb-2'>Gender (Optional)</label>
                <div className='grid grid-cols-3 gap-2'>
                  {['Male', 'Female', 'Unisex'].map((gender) => (
                    <button
                      key={gender}
                      type='button'
                      onClick={() => setEditForm(prev => ({ ...prev, gender: prev.gender === gender ? '' : gender }))}
                      className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors border ${
                        editForm.gender === gender
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-primary'
                      }`}
                    >
                      {gender}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status */}
              <div>
                <label className='block text-sm font-semibold text-gray-700 mb-2'>Status</label>
                <select
                  name='status'
                  value={editForm.status}
                  onChange={handleEditFormChange}
                  className='w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none text-sm'
                >
                  <option value='Available'>Available</option>
                  <option value='Unavailable'>Unavailable</option>
                  <option value='In-Laundry'>In-Laundry</option>
                  <option value='Reserved'>Reserved</option>
                  <option value='In-Use'>In-Use</option>
                </select>
              </div>

              {/* Action Buttons */}
              <div className='flex gap-2 pt-4 border-t border-gray-200'>
                <button
                  type='button'
                  onClick={submitEditGown}
                  disabled={editSaving}
                  className='flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dull disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors'
                >
                  {editSaving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type='button'
                  onClick={closeEditModal}
                  className='px-4 sm:px-6 py-2.5 sm:py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors'
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ManageGowns

