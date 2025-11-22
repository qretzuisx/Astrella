import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
// Admin view: no owner sidebar — show only owner requests for admins

const AdminOwnerRequests = () => {
  const navigate = useNavigate()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [actionLoading, setActionLoading] = useState(null)

  useEffect(() => {
    fetchRequests()
  }, [])

  const fetchRequests = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      if (!token) {
        navigate('/')
        return
      }

      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
      const response = await fetch(`${API_URL}/admin/owner-requests`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (data.success) {
        setRequests(data.requests || [])
      } else {
        setError(data.message || 'Failed to load requests')
      }
    } catch (error) {
      console.error('Error fetching requests:', error)
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (requestId, adminNote = '') => {
    try {
      setActionLoading(requestId)
      const token = localStorage.getItem('token')
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

      const response = await fetch(`${API_URL}/admin/approve-owner-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ requestId, adminNote })
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('Request approved successfully!')
        fetchRequests() // Refresh list
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.message || 'Failed to approve request')
        setTimeout(() => setError(''), 3000)
      }
    } catch (error) {
      console.error('Error approving request:', error)
      setError('An error occurred. Please try again.')
      setTimeout(() => setError(''), 3000)
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (requestId, adminNote = '') => {
    const note = window.prompt('Enter rejection reason (optional):', adminNote || '')
    if (note === null) return // User cancelled

    try {
      setActionLoading(requestId)
      const token = localStorage.getItem('token')
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

      const response = await fetch(`${API_URL}/admin/reject-owner-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ requestId, adminNote: note || '' })
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('Request rejected successfully!')
        fetchRequests() // Refresh list
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.message || 'Failed to reject request')
        setTimeout(() => setError(''), 3000)
      }
    } catch (error) {
      console.error('Error rejecting request:', error)
      setError('An error occurred. Please try again.')
      setTimeout(() => setError(''), 3000)
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
        <div className='text-center'>
          <p className='text-xl text-gray-500 mb-4'>Loading requests...</p>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto'></div>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-gray-50 p-8'>
      <div className='max-w-7xl mx-auto'>
          {/* Header */}
          <div className='mb-8'>
            <h1 className='text-3xl font-bold text-gray-900 mb-2'>Owner Requests</h1>
            <p className='text-gray-600'>Review and manage owner access requests</p>
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

          {/* Requests List */}
          {requests.length === 0 ? (
            <div className='text-center py-16 bg-white rounded-xl border border-gray-200'>
              <p className='text-xl text-gray-500 mb-4'>No pending requests</p>
              <p className='text-gray-400'>All requests have been processed</p>
            </div>
          ) : (
            <div className='space-y-4'>
              {requests.map((request) => (
                <div
                  key={request._id}
                  className='bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow'
                >
                  <div className='flex items-start justify-between mb-4'>
                    <div className='flex-1'>
                      <div className='flex items-center gap-3 mb-2'>
                        {request.user?.image ? (
                          <img
                            src={request.user.image}
                            alt={request.user.name}
                            className='w-12 h-12 rounded-full object-cover border-2 border-primary'
                          />
                        ) : (
                          <div className='w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center font-semibold text-lg'>
                            {request.user?.name?.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <h3 className='text-lg font-semibold text-gray-900'>
                            {request.user?.name || 'Unknown User'}
                          </h3>
                          <p className='text-sm text-gray-500'>{request.user?.email}</p>
                        </div>
                      </div>
                    </div>
                    <span className='px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800'>
                      Pending
                    </span>
                  </div>

                  {request.message && (
                    <div className='mb-4 p-4 bg-gray-50 rounded-lg'>
                      <p className='text-sm font-medium text-gray-700 mb-1'>User Message:</p>
                      <p className='text-sm text-gray-600'>{request.message}</p>
                    </div>
                  )}

                  <div className='flex items-center justify-between pt-4 border-t border-gray-200'>
                    <div className='text-xs text-gray-500'>
                      Requested: {new Date(request.createdAt).toLocaleString()}
                    </div>
                    <div className='flex gap-3'>
                      <button
                        onClick={() => handleReject(request._id, request.adminNote)}
                        disabled={actionLoading === request._id}
                        className='px-4 py-2 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 transition-colors font-semibold text-sm disabled:opacity-50'
                      >
                        {actionLoading === request._id ? 'Processing...' : 'Reject'}
                      </button>
                      <button
                        onClick={() => handleApprove(request._id)}
                        disabled={actionLoading === request._id}
                        className='px-4 py-2 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 transition-colors font-semibold text-sm disabled:opacity-50'
                      >
                        {actionLoading === request._id ? 'Processing...' : 'Approve'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>
    </div>
  )
}

export default AdminOwnerRequests

