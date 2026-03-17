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
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const currency = CURRENCY

  // Derive a display status that combines dynamic booking status with the owner's
  // availability toggle. If the gown is toggled off (available === false), we
  // always show it as "Unavailable" on the owner page, regardless of booking status.
  const getDisplayStatus = (gown) => {
    // Priority 1: Manual availability toggle (Hide)
    if (gown && gown.available === false) return 'Unavailable';
    // Priority 2: Backend calculated status (respects statusOverride and dynamic booking logic)
    return gown?.status || 'Available';
  };

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
    ageGroup: [],
    sex: '',
    statusOverride: '',
    available: true
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
    // Prevent double-saving or concurrent saves for the same gown
    if (laundrySaving === gownId) return;

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
      ageGroup: Array.isArray(gown.ageGroup) ? gown.ageGroup : (gown.ageGroup ? [gown.ageGroup] : []),
      sex: gown.sex || '',
      statusOverride: gown.statusOverride || '',
      available: gown.available !== false,
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

    if (editForm.ageGroup.length === 0) {
      setError('Please select at least one age group')
      return
    }

    if (!editForm.sex) {
      setError('Please select a gender')
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
          sex: editForm.sex,
          statusOverride: editForm.statusOverride,
          available: editForm.available,
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
  // Filter gowns by status and search term
  const filteredGowns = gowns.filter(gown => {
    const matchesStatus = filterStatus === 'all' || getDisplayStatus(gown) === filterStatus
    const matchesSearch = (gown.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (gown.description || '').toLowerCase().includes(searchTerm.toLowerCase())
    return matchesStatus && matchesSearch
  })
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
            <div className='flex flex-col gap-3 w-full sm:w-auto'>
              <button
                onClick={() => navigate('/owner/add-gown')}
                className='w-full px-5 sm:px-6 py-2.5 sm:py-3 bg-primary text-white rounded-lg hover:bg-primary-dull transition-colors font-semibold flex items-center justify-center gap-2 text-sm sm:text-base'
              >
                <img src={assets.addIconColored} alt="add" className='w-4 h-4 sm:w-5 sm:h-5 filter brightness-0 invert' />
                Add New Gown
              </button>
              <div className='relative'>
                <input
                  type='text'
                  placeholder='Search apparel...'
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none text-sm'
                />
                <div className='absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none'>
                  <img src={assets.search_icon} alt="search" className='w-4 h-4 opacity-40' />
                </div>
              </div>
            </div>
          </div>

          {/* Status Filter Tabs - Modern Segmented Control Style */}
          <div className='mb-10 flex flex-wrap items-center gap-3 p-1.5 bg-gray-100/50 rounded-2xl w-fit'>
            {['all', 'Available', 'Reserved', 'In-Use', 'In-Laundry', 'Unavailable'].map((status) => {
              const count = status === 'all'
                ? gowns.length
                : gowns.filter(g => getDisplayStatus(g) === status).length

              return (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all duration-300 relative ${filterStatus === status
                      ? 'bg-white text-primary shadow-sm scale-105'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-white/50'
                    }`}
                >
                  <span className="flex items-center gap-2">
                    {status === 'all' ? 'All Gowns' : status}
                    <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${filterStatus === status ? 'bg-primary/10 text-primary' : 'bg-gray-200 text-gray-500'}`}>
                        {count}
                    </span>
                  </span>
                </button>
              )
            })}
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
          {filteredGowns.length === 0 ? (
            <div className='text-center py-12 sm:py-16 bg-white rounded-xl border border-gray-200 px-4'>
              <img src={assets.gownIcon} alt="gown" className='w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 opacity-50' />
              <p className='text-lg sm:text-xl text-gray-500 mb-3 sm:mb-4'>
                {gowns.length === 0 ? 'No apparel found' : `No ${filterStatus.toLowerCase()} gowns`}
              </p>
              {gowns.length === 0 && (
                <>
                  <p className='text-sm sm:text-base text-gray-400 mb-4 sm:mb-6'>Start by adding your first gown!</p>
                  <button
                    onClick={() => navigate('/owner/add-gown')}
                    className='px-5 sm:px-6 py-2.5 sm:py-3 bg-primary text-white rounded-lg hover:bg-primary-dull transition-colors font-semibold text-sm sm:text-base'
                  >
                    Add Your First Gown
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'>
              {filteredGowns.map((gown) => (
                <div
                  key={gown._id || gown.id}
                  className='group bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-2xl hover:shadow-primary/5 hover:border-primary/10 transition-all duration-500'
                >
                  {/* Gown Image - Premium Presentation */}
                  <div className='relative h-56 sm:h-64 overflow-hidden'>
                    <img
                      src={Array.isArray(gown.image) ? gown.image[0] : gown.image || assets.gown_image1}
                      alt={gown.name}
                      className='w-full h-full object-cover group-hover:scale-110 transition-transform duration-700'
                    />
                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    
                    {/* Status Badge - Refined */}
                    <div className={`absolute top-4 left-4 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white shadow-xl backdrop-blur-md border border-white/20 ${
                        getDisplayStatus(gown) === 'Available' ? 'bg-green-500/80' :
                        getDisplayStatus(gown) === 'Unavailable' ? 'bg-orange-500/80' :
                        getDisplayStatus(gown) === 'Reserved' ? 'bg-red-500/80' :
                        getDisplayStatus(gown) === 'In-Use' ? 'bg-gray-500/80' :
                        getDisplayStatus(gown) === 'In-Laundry' ? 'bg-blue-500/80' :
                        'bg-gray-400/80'
                      }`}>
                      {getDisplayStatus(gown)}
                    </div>

                    {/* Price Tag - Premium */}
                    <div className='absolute bottom-4 right-4 bg-white rounded-2xl px-4 py-2.5 shadow-xl border border-gray-100 group-hover:-translate-y-1 transition-transform'>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Rent Price</p>
                        <span className='text-lg font-black text-primary-dull'>
                            <span className="text-sm mr-0.5">₱</span>{gown.price?.toLocaleString() || 0}
                        </span>
                    </div>
                  </div>

                  {/* Gown Details */}
                  <div className='p-6'>
                    <div className="flex items-start justify-between gap-4 mb-4">
                        <h3 className='text-xl font-black text-primary-dull group-hover:text-primary transition-colors leading-tight line-clamp-1'>{gown.name}</h3>
                        {!gown.available && (
                            <div className="p-1 px-2 bg-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest rounded-lg">Hidden</div>
                        )}
                    </div>
                    
                    {/* Details Grid - Consistent with GownCard */}
                    <div className='grid grid-cols-2 gap-y-3 gap-x-4 text-xs font-semibold mb-6'>
                      <div className='flex items-center gap-2.5 text-gray-500 bg-gray-50 p-2 rounded-xl border border-gray-50'>
                        <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center shadow-sm">
                            <img src={assets.fabric_icon} alt="fabric" className='w-3 h-3' />
                        </div>
                        <span className='truncate'>{gown.fabric}</span>
                      </div>
                      <div className='flex items-center gap-2.5 text-gray-500 bg-gray-50 p-2 rounded-xl border border-gray-50'>
                         <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center shadow-sm">
                            <img src={assets.color_icon} alt="color" className='w-3 h-3' />
                        </div>
                        <span className='truncate'>{gown.color}</span>
                      </div>
                      <div className='flex items-center gap-2.5 text-gray-500 bg-gray-50 p-2 rounded-xl border border-gray-50'>
                        <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center shadow-sm">
                            <img src={assets.event_icon} alt="event" className='w-3 h-3' />
                        </div>
                        <span className='capitalize truncate'>
                          {Array.isArray(gown.eventType) && gown.eventType.length > 0
                            ? gown.eventType[0]
                            : gown.eventType || 'N/A'}
                        </span>
                      </div>
                      <div className='flex items-center gap-2.5 text-gray-500 bg-gray-50 p-2 rounded-xl border border-gray-50'>
                        <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center shadow-sm">
                            <img src={assets.size_icon} alt="size" className='w-3 h-3' />
                        </div>
                        <span className='truncate'>
                          {Array.isArray(gown.size) ? gown.size[0] : gown.size || 'N/A'}
                        </span>
                      </div>
                    </div>

                    {/* Laundry Management - Refined */}
                    <div className='mb-6 p-4 bg-primary-dull/5 rounded-2xl border border-primary/5 flex items-center justify-between'>
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center">
                            <img src={assets.laundry_icon} className="w-4 h-4" />
                         </div>
                         <div>
                            <p className='text-[10px] font-black text-primary-dull/40 uppercase tracking-widest'>Maintenance</p>
                            <p className="text-xs font-bold text-primary-dull">Laundry Hold</p>
                         </div>
                      </div>
                      <div className='flex items-center gap-2'>
                        <input
                          type='number'
                          min='0'
                          max='14'
                          value={laundryForm[gown._id || gown.id] ?? String(gown.laundryDays ?? 0)}
                          onChange={(e) => handleLaundryInputChange(gown._id || gown.id, e.target.value)}
                          className='w-12 px-2 py-1.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all text-xs font-bold text-center shadow-sm'
                        />
                        <button
                          onClick={() => handleSaveLaundryDays(gown._id || gown.id)}
                          disabled={laundrySaving === (gown._id || gown.id)}
                          className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${laundrySaving === (gown._id || gown.id)
                              ? 'bg-gray-100 text-gray-400'
                              : 'bg-primary text-white hover:shadow-lg hover:shadow-primary/20 active:scale-95'
                            }`}
                        >
                          {laundrySaving === (gown._id || gown.id) ? '...' : 'Save'}
                        </button>
                      </div>
                    </div>

                    {/* Action Buttons - Premium Control Bar */}
                    <div className='flex gap-2.5'>
                      <button
                        onClick={() => openEditModal(gown)}
                        className='flex-1 h-11 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-600 hover:text-white transition-all duration-300 text-xs font-black uppercase tracking-widest active:scale-95 flex items-center justify-center gap-2'
                      >
                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                         </svg>
                        Edit
                      </button>
                      <button
                        onClick={() => handleToggleAvailability(gown._id || gown.id)}
                        className={`flex-1 h-11 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 active:scale-95 flex items-center justify-center gap-2 ${gown.available
                            ? 'bg-orange-50 text-orange-600 hover:bg-orange-500 hover:text-white'
                            : 'bg-green-50 text-green-700 hover:bg-green-600 hover:text-white'
                          }`}
                      >
                        {gown.available ? (
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                             </svg>
                        ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                             </svg>
                        )}
                        {gown.available ? 'Hide' : 'Show'}
                      </button>
                      <button
                        onClick={() => handleDeleteGown(gown._id || gown.id)}
                        className='w-11 h-11 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all duration-300 active:scale-95 flex items-center justify-center'
                      >
                         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                         </svg>
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
          className='fixed inset-0 bg-primary/20 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in'
          onClick={closeEditModal}
        >
          <div
            className='bg-white rounded-[40px] shadow-[0_40px_100px_rgba(1,62,141,0.15)] max-w-2xl w-full p-8 sm:p-10 max-h-[90vh] overflow-y-auto border border-blue-50 relative'
            onClick={(e) => e.stopPropagation()}
          >
            <div className='flex items-start justify-between gap-6 mb-10'>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-1 bg-primary rounded-full"></div>
                  <span className="text-[10px] font-black text-primary uppercase tracking-widest">Editor</span>
                </div>
                <h2 className='text-3xl font-black text-primary tracking-tight leading-tight'>
                  Edit Apparel
                </h2>
                <p className='text-sm text-gray-500 font-bold mt-1'>{selectedGown.name}</p>
              </div>
              <button
                onClick={closeEditModal}
                className='w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-primary/40 hover:text-primary hover:bg-primary/5 transition-all group'
              >
                <svg className="w-6 h-6 transition-transform group-hover:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Error Messages */}
            {error && (
              <div className='mb-4 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg'>
                <p className='text-red-800 text-sm sm:text-base'>{error}</p>
              </div>
            )}

            <div className='space-y-8'>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className='block text-[10px] font-black text-primary/40 uppercase tracking-widest pl-2'>Name *</label>
                  <input
                    type='text'
                    name='name'
                    value={editForm.name}
                    onChange={handleEditFormChange}
                    className='w-full px-5 py-4 bg-gray-50/50 border border-gray-100 rounded-2xl text-sm font-black text-primary transition-all focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none'
                  />
                </div>

                <div className="space-y-2">
                  <label className='block text-[10px] font-black text-primary/40 uppercase tracking-widest pl-2'>Price (₱) *</label>
                  <input
                    type='number'
                    name='price'
                    min='0'
                    step='100'
                    value={editForm.price}
                    onChange={handleEditFormChange}
                    className='w-full px-5 py-4 bg-gray-50/50 border border-gray-100 rounded-2xl text-sm font-black text-primary transition-all focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none'
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className='block text-[10px] font-black text-primary/40 uppercase tracking-widest pl-2'>Description</label>
                <textarea
                  name='description'
                  value={editForm.description}
                  onChange={handleEditFormChange}
                  rows='3'
                  className='w-full px-5 py-4 bg-gray-50/50 border border-gray-100 rounded-2xl text-sm font-black text-primary transition-all focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none resize-none'
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className='block text-[10px] font-black text-primary/40 uppercase tracking-widest pl-2'>Fabric *</label>
                  <input
                    type='text'
                    name='fabric'
                    value={editForm.fabric}
                    onChange={handleEditFormChange}
                    className='w-full px-5 py-4 bg-gray-50/50 border border-gray-100 rounded-2xl text-sm font-black text-primary transition-all focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none'
                  />
                </div>
                <div className="space-y-2">
                  <label className='block text-[10px] font-black text-primary/40 uppercase tracking-widest pl-2'>Color *</label>
                  <input
                    type='text'
                    name='color'
                    value={editForm.color}
                    onChange={handleEditFormChange}
                    className='w-full px-5 py-4 bg-gray-50/50 border border-gray-100 rounded-2xl text-sm font-black text-primary transition-all focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none'
                  />
                </div>
              </div>

              <div className="space-y-4">
                <label className='block text-[10px] font-black text-primary/40 uppercase tracking-widest pl-2'>Event Types *</label>
                <div className='flex flex-wrap gap-2'>
                  {['wedding', 'traditional', 'prom', 'formal', 'themed'].map((event) => (
                    <button
                      key={event}
                      type='button'
                      onClick={() => handleEventTypeToggle(event)}
                      className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${editForm.eventType.includes(event)
                          ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-105'
                          : 'bg-gray-50 text-gray-500 hover:bg-gray-100 border border-gray-100'
                        }`}
                    >
                      {event}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <label className='block text-[10px] font-black text-primary/40 uppercase tracking-widest pl-2'>Sizes *</label>
                <div className='flex flex-wrap gap-2'>
                  {['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free Size'].map((size) => (
                    <button
                      key={size}
                      type='button'
                      onClick={() => handleSizeToggle(size)}
                      className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${editForm.size.includes(size)
                          ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-105'
                          : 'bg-gray-50 text-gray-500 hover:bg-gray-100 border border-gray-100'
                        }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <label className='block text-[10px] font-black text-primary/40 uppercase tracking-widest pl-2'>Sex *</label>
                <div className='flex flex-wrap gap-2'>
                  {['Male', 'Female', 'Unisex'].map((sex) => (
                    <button
                      key={sex}
                      type='button'
                      onClick={() => setEditForm(prev => ({ ...prev, sex }))}
                      className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${editForm.sex === sex
                          ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-105'
                          : 'bg-gray-50 text-gray-500 hover:bg-gray-100 border border-gray-100'
                        }`}
                    >
                      {sex}
                    </button>
                  ))}
                </div>
              </div>

              {/* Apparel Status & Visibility - Simplified */}
              <div className='pt-8 border-t border-gray-100'>
                <div className='flex items-center gap-2 mb-6'>
                  <div className='w-1 h-5 bg-primary rounded-full'></div>
                  <h3 className='text-[10px] font-black text-primary uppercase tracking-wider'>Status Control</h3>
                </div>
                
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-6'>
                  {/* Status Selection */}
                  <div className='bg-gray-50/50 p-6 rounded-2xl border border-gray-100'>
                    <label className='block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3'>Manual Override</label>
                    <select
                      name='statusOverride'
                      value={editForm.statusOverride}
                      onChange={handleEditFormChange}
                      className='w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none text-xs font-black text-primary appearance-none shadow-sm'
                    >
                      <option value=''>Auto (Dynamic)</option>
                      <option value='Available'>Force Available</option>
                      <option value='Reserved'>Force Reserved</option>
                      <option value='In-Use'>Force In-Use</option>
                      <option value='In-Laundry'>Force In-Laundry</option>
                      <option value='Unavailable'>Force Unavailable</option>
                    </select>
                  </div>

                  {/* Visibility Toggle */}
                  <div className='bg-gray-50/50 p-6 rounded-2xl border border-gray-100 flex flex-col justify-center'>
                    <label className='flex items-center justify-between cursor-pointer group'>
                       <span className='text-[10px] font-black text-gray-700 uppercase tracking-widest group-hover:text-primary transition-colors'>Catalog Visibility</span>
                      <div className='relative'>
                        <input
                          type='checkbox'
                          name='available'
                          checked={editForm.available}
                          onChange={(e) => setEditForm(prev => ({ ...prev, available: e.target.checked }))}
                          className='sr-only'
                        />
                        <div className={`w-12 h-6 rounded-full transition-colors ${editForm.available ? 'bg-primary' : 'bg-gray-300'}`}></div>
                        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${editForm.available ? 'translate-x-6' : ''}`}></div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              <div className='flex gap-4 pt-6'>
                <button
                  type='button'
                  onClick={closeEditModal}
                  className='flex-1 py-5 border-2 border-primary/10 text-primary rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-gray-50 transition-all active:scale-95'
                >
                  Discard
                </button>
                <button
                  type='button'
                  onClick={submitEditGown}
                  disabled={editSaving}
                  className='flex-[2] py-5 bg-primary text-white rounded-3xl font-black text-xs uppercase tracking-widest shadow-[0_15px_40px_rgba(1,62,141,0.2)] hover:shadow-[0_20px_50px_rgba(1,62,141,0.3)] hover:-translate-y-1 transition-all disabled:bg-gray-100 disabled:text-gray-300 disabled:shadow-none disabled:translate-y-0 active:scale-95'
                >
                  {editSaving ? 'Updating...' : 'Save Changes'}
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

