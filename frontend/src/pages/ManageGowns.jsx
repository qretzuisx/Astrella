import React, { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { assets } from '../assets/assets'
import OwnerSidebar from '../components/OwnerSidebar'

const ManageGowns = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [gowns, setGowns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const currency = import.meta.env.VITE_CURRENCY || '₱'

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
        setGowns(data.gowns || [])
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
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
      
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

  if (loading) {
    return (
      <div className='flex min-h-screen'>
        <OwnerSidebar />
        <div className='flex-1 flex items-center justify-center'>
          <div className='text-center'>
            <p className='text-xl text-gray-500 mb-4'>Loading gowns...</p>
            <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto'></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='flex min-h-screen bg-gray-50'>
      <OwnerSidebar />
      
      <div className='flex-1 p-8'>
        <div className='max-w-7xl mx-auto'>
          {/* Header */}
          <div className='mb-8 flex items-center justify-between'>
            <div>
              <h1 className='text-3xl font-bold text-gray-900 mb-2'>Manage Gowns</h1>
              <p className='text-gray-600'>View and manage all your gowns.</p>
            </div>
            <button
              onClick={() => navigate('/owner/add-gown')}
              className='px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dull transition-colors font-semibold flex items-center gap-2'
            >
              <img src={assets.addIconColored} alt="add" className='w-5 h-5 filter brightness-0 invert' />
              Add New Gown
            </button>
          </div>

          {/* Success/Error Messages */}
          {success && (
            <div className='mb-6 p-4 bg-green-50 border border-green-200 rounded-lg'>
              <p className='text-green-800'>{success}</p>
            </div>
          )}

          {error && (
            <div className='mb-6 p-4 bg-red-50 border border-red-200 rounded-lg'>
              <p className='text-red-800'>{error}</p>
            </div>
          )}

          {/* Gowns Grid */}
          {gowns.length === 0 ? (
            <div className='text-center py-16 bg-white rounded-xl border border-gray-200'>
              <img src={assets.gownIcon} alt="gown" className='w-16 h-16 mx-auto mb-4 opacity-50' />
              <p className='text-xl text-gray-500 mb-4'>No gowns found</p>
              <p className='text-gray-400 mb-6'>Start by adding your first gown!</p>
              <button
                onClick={() => navigate('/owner/add-gown')}
                className='px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dull transition-colors font-semibold'
              >
                Add Your First Gown
              </button>
            </div>
          ) : (
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
              {gowns.map((gown) => (
                <div 
                  key={gown._id} 
                  className='bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow'
                >
                  {/* Gown Image */}
                  <div className='relative h-64 overflow-hidden'>
                    <img 
                      src={Array.isArray(gown.image) ? gown.image[0] : gown.image || assets.gown_image1} 
                      alt={gown.name}
                      className='w-full h-full object-cover'
                    />
                    <div className='absolute top-4 left-4'>
                      <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        gown.available
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {gown.available ? 'Available' : 'Unavailable'}
                      </div>
                    </div>
                    {gown.verified && (
                      <div className='absolute top-4 right-4'>
                        <div className='px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800'>
                          Verified
                        </div>
                      </div>
                    )}
                    <div className='absolute bottom-4 right-4 bg-black/80 backdrop-blur-sm text-white px-3 py-2 rounded-lg'>
                      <span className='font-semibold'>{currency}{gown.price?.toLocaleString() || 0}</span>
                    </div>
                  </div>

                  {/* Gown Details */}
                  <div className='p-6'>
                    <h3 className='text-xl font-bold text-gray-900 mb-2'>{gown.name}</h3>
                    <p className='text-gray-600 text-sm mb-4 line-clamp-2'>{gown.description}</p>
                    
                    {/* Details Grid */}
                    <div className='grid grid-cols-2 gap-2 mb-4 text-sm'>
                      <div className='flex items-center gap-2 text-gray-600'>
                        <img src={assets.fabric_icon} alt="fabric" className='w-4 h-4' />
                        <span className='truncate'>{gown.fabric}</span>
                      </div>
                      <div className='flex items-center gap-2 text-gray-600'>
                        <img src={assets.color_icon} alt="color" className='w-4 h-4' />
                        <span className='truncate'>{gown.color}</span>
                      </div>
                      <div className='flex items-center gap-2 text-gray-600'>
                        <img src={assets.event_icon} alt="event" className='w-4 h-4' />
                        <span className='capitalize truncate'>{gown.eventType || 'N/A'}</span>
                      </div>
                      <div className='flex items-center gap-2 text-gray-600'>
                        <img src={assets.size_icon} alt="size" className='w-4 h-4' />
                        <span className='truncate'>
                          {Array.isArray(gown.size) ? gown.size.join(', ') : gown.size || 'N/A'}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className='flex gap-2 pt-4 border-t border-gray-200'>
                      <button
                        onClick={() => handleToggleAvailability(gown._id)}
                        className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                          gown.available
                            ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                            : 'bg-green-100 text-green-800 hover:bg-green-200'
                        }`}
                      >
                        {gown.available ? 'Mark Unavailable' : 'Mark Available'}
                      </button>
                      <button
                        onClick={() => handleDeleteGown(gown._id)}
                        className='px-4 py-2 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 transition-colors text-sm font-semibold'
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
    </div>
  )
}

export default ManageGowns

