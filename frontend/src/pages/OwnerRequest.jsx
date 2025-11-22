import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { assets } from '../assets/assets'

const OwnerRequest = () => {
  const navigate = useNavigate()
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [requestStatus, setRequestStatus] = useState(null)
  const [userRole, setUserRole] = useState(null)

  useEffect(() => {
    const fetchUserData = async () => {
      const token = localStorage.getItem('token')
      if (!token) {
        navigate('/')
        return
      }

      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
        
        // Get user data
        const userResponse = await fetch(`${API_URL}/user/data`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        const userData = await userResponse.json()
        
        if (userData.success || userData.sucess) {
          const role = userData.user ? (typeof userData.user.role === 'object' ? userData.user.role.name : userData.user.role) : null
          setUserRole(role)
          
          // If already owner/admin, redirect
          if (role === 'owner' || role === 'admin') {
            navigate('/owner')
            return
          }

          // Check existing request status
          const statusResponse = await fetch(`${API_URL}/user/owner-request-status`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })
          const statusData = await statusResponse.json()
          
          if (statusData.success && statusData.request) {
            setRequestStatus(statusData.request)
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error)
      }
    }

    fetchUserData()
  }, [navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setError('Please login first')
        setLoading(false)
        return
      }

      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
      const response = await fetch(`${API_URL}/user/request-owner`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message })
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(data.message || 'Request submitted successfully!')
        setMessage('')
        
        // Refresh request status
        setTimeout(async () => {
          const statusResponse = await fetch(`${API_URL}/user/owner-request-status`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })
          const statusData = await statusResponse.json()
          if (statusData.success && statusData.request) {
            setRequestStatus(statusData.request)
          }
        }, 1000)
      } else {
        setError(data.message || 'Failed to submit request')
      }
    } catch (err) {
      console.error('Error submitting request:', err)
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-300'
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getStatusMessage = (status) => {
    switch (status) {
      case 'pending':
        return 'Your request is being reviewed by admin'
      case 'approved':
        return 'Congratulations! Your request has been approved. You can now access the owner dashboard.'
      case 'rejected':
        return 'Your request has been rejected. Please contact admin for more information.'
      default:
        return ''
    }
  }

  if (userRole === 'owner' || userRole === 'admin') {
    return null // Will redirect
  }

  return (
    <div className='min-h-screen bg-light py-12 px-4 md:px-8 lg:px-16'>
      <div className='max-w-3xl mx-auto'>
        {/* Header */}
        <div className='mb-8 text-center'>
          <h1 className='text-4xl font-bold text-gray-900 mb-2'>Request Owner Access</h1>
          <p className='text-gray-600'>
            Become an owner to list and manage your gowns on Astrella
          </p>
        </div>

        {/* Existing Request Status */}
        {requestStatus && (
          <div className={`mb-6 p-6 rounded-lg border-2 ${getStatusBadge(requestStatus.status)}`}>
            <div className='flex items-center justify-between mb-2'>
              <h3 className='text-lg font-semibold'>Request Status</h3>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold capitalize ${getStatusBadge(requestStatus.status)}`}>
                {requestStatus.status}
              </span>
            </div>
            <p className='text-sm mb-2'>{getStatusMessage(requestStatus.status)}</p>
            
            {requestStatus.message && (
              <div className='mt-3 pt-3 border-t border-current border-opacity-20'>
                <p className='text-sm font-medium mb-1'>Your Message:</p>
                <p className='text-sm'>{requestStatus.message}</p>
              </div>
            )}
            
            {requestStatus.adminNote && (
              <div className='mt-3 pt-3 border-t border-current border-opacity-20'>
                <p className='text-sm font-medium mb-1'>Admin Note:</p>
                <p className='text-sm'>{requestStatus.adminNote}</p>
              </div>
            )}
            
            <p className='text-xs mt-3 opacity-75'>
              Submitted: {new Date(requestStatus.createdAt).toLocaleDateString()}
            </p>

            {requestStatus.status === 'approved' && (
              <button
                onClick={() => navigate('/owner')}
                className='mt-4 px-6 py-2 bg-white text-green-800 rounded-lg hover:bg-green-50 transition-colors font-semibold'
              >
                Go to Owner Dashboard →
              </button>
            )}

            {requestStatus.status === 'rejected' && (
              <button
                onClick={() => {
                  // Allow resubmission by clearing status (or create new request)
                  setRequestStatus(null)
                }}
                className='mt-4 px-6 py-2 bg-white text-red-800 rounded-lg hover:bg-red-50 transition-colors font-semibold'
              >
                Submit New Request
              </button>
            )}
          </div>
        )}

        {/* Request Form - Only show if no pending request */}
        {(!requestStatus || requestStatus.status !== 'pending') && (
          <div className='bg-white rounded-xl shadow-sm border border-gray-200 p-8'>
            <h2 className='text-2xl font-bold text-gray-900 mb-4'>
              {requestStatus?.status === 'rejected' ? 'Submit New Request' : 'Submit Request'}
            </h2>
            
            <p className='text-gray-600 mb-6'>
              Tell us why you want to become an owner. This helps us review your request faster.
            </p>

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

            <form onSubmit={handleSubmit} className='space-y-6'>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Message (Optional)
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder='Tell us about your business, experience, or why you want to become an owner...'
                  rows={6}
                  className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all resize-none'
                />
                <p className='text-xs text-gray-500 mt-1'>
                  This message will be sent to admin for review
                </p>
              </div>

              <div className='bg-blue-50 border border-blue-200 rounded-lg p-4'>
                <h3 className='font-semibold text-blue-900 mb-2'>What happens next?</h3>
                <ul className='text-sm text-blue-800 space-y-1 list-disc list-inside'>
                  <li>Your request will be reviewed by an admin</li>
                  <li>You'll be notified once a decision is made</li>
                  <li>If approved, you'll gain access to the owner dashboard</li>
                  <li>You can then start listing and managing your gowns</li>
                </ul>
              </div>

              <div className='flex gap-4'>
                <button
                  type='submit'
                  disabled={loading}
                  className={`flex-1 py-3 rounded-lg font-semibold text-white transition-all duration-300 ${
                    loading
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-primary hover:bg-primary-dull shadow-lg hover:shadow-xl'
                  }`}
                >
                  {loading ? 'Submitting...' : 'Submit Request'}
                </button>
                <button
                  type='button'
                  onClick={() => navigate('/')}
                  className='px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-semibold'
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}

export default OwnerRequest

