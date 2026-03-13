import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { assets } from '../assets/assets'
import { API_URL } from '../config'

const UserProfile = () => {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPasswordChange, setShowPasswordChange] = useState(false)
  const [showDeleteAccount, setShowDeleteAccount] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    contactNumber: '',
  })

  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  // Delete account state
  const [deleteConfirmation, setDeleteConfirmation] = useState('')

  const role = user ? (typeof user.role === 'object' ? user.role.name : user.role) : null
  const roleLabel = role // Display actual role

  const validatePhoneNumber = (phone) => {
    return /^\d{11}$/.test(phone)
  }

  useEffect(() => {
    fetchUserData()
  }, [])

  const fetchUserData = async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      navigate('/')
      return
    }

    try {
      // Get user data
      const userResponse = await fetch(`${API_URL}/user/data`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const userData = await userResponse.json()

      if (userData.success || userData.sucess) {
        setUser(userData.user)
        setFormData({
          name: userData.user.name || '',
          email: userData.user.email || '',
          contactNumber: userData.user.contactNumber || '',
        })

      } else {
        navigate('/')
      }
    } catch (error) {
      console.error('Error fetching user data:', error)
      setError('Failed to load user data')
    } finally {
      setLoading(false)
    }
  }


  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setFieldErrors({})

    // Validate phone number before submission
    if (formData.contactNumber && !validatePhoneNumber(formData.contactNumber)) {
      setFieldErrors({ contactNumber: 'Phone number must be exactly 11 digits' })
      return
    }

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL}/user/update-profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: formData.name,
          contactNumber: formData.contactNumber,
        })
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('Profile updated successfully!')
        setFieldErrors({})
        setEditing(false)
        await fetchUserData()
        setTimeout(() => setSuccess(''), 3000)
      } else {
        // Parse error message to extract field-specific errors
        if (data.message && data.message.includes('contactNumber')) {
          setFieldErrors({ contactNumber: 'Phone number must be exactly 11 digits' })
          setError('Please fix the phone number error below')
        } else {
          setError(data.message || 'Failed to update profile')
        }
      }
    } catch (err) {
      console.error('Error updating profile:', err)
      setError('An error occurred. Please try again.')
    }
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    // Validate passwords
    if (passwordData.newPassword.length < 8) {
      setError('New password must be at least 8 characters long')
      return
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match')
      return
    }

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL}/user/change-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        })
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('Password changed successfully!')
        setShowPasswordChange(false)
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        })
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.message || 'Failed to change password')
      }
    } catch (err) {
      console.error('Error changing password:', err)
      setError('An error occurred. Please try again.')
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE') {
      setError('Please type DELETE to confirm')
      return
    }

    setError('')
    setSuccess('')

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL}/user/delete-account`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (data.success) {
        localStorage.removeItem('token')
        navigate('/')
      } else {
        setError(data.message || 'Failed to delete account')
      }
    } catch (err) {
      console.error('Error deleting account:', err)
      setError('An error occurred. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-light'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4'></div>
          <p className='text-gray-600'>Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className='min-h-screen bg-light py-12 px-4 md:px-8 lg:px-16'>
      <div className='max-w-4xl mx-auto'>
        {/* Header */}
        <div className='mb-8'>
          <button
            onClick={() => navigate('/')}
            className='text-primary hover:text-primary-dull mb-4 flex items-center gap-2'
          >
            <span>←</span> Back to Home
          </button>
          <h1 className='text-4xl font-bold text-gray-900 mb-2'>My Profile</h1>
          <p className='text-gray-600'>Manage your account information and settings</p>
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

        {/* Profile Card */}
        <div className='bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6'>
          {/* Profile Header */}
          <div className='bg-gradient-to-r from-primary to-primary-dull h-32'></div>

          <div className='px-8 pb-8'>
            {/* Profile Picture */}
            <div className='flex flex-col sm:flex-row items-center sm:items-end gap-6 -mt-16 mb-6'>
              <div>
                {user.image ? (
                  <img
                    src={user.image}
                    alt={user.name}
                    className='w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg'
                  />
                ) : (
                  <div className='w-32 h-32 rounded-full bg-primary text-white flex items-center justify-center text-4xl font-bold border-4 border-white shadow-lg'>
                    {user.name?.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              <div className='flex-1 text-center sm:text-left'>
                <p className='text-gray-600'>{user.email}</p>
                <span className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-semibold capitalize ${roleLabel === 'owner' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                  {roleLabel || 'user'}
                </span>
              </div>

              {role === 'owner' && (
                <button
                  onClick={() => navigate('/owner')}
                  className='px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dull transition-all font-semibold shadow-md'
                >
                  Go to Dashboard
                </button>
              )}
            </div>

            {/* Profile Information */}
            <div className='space-y-6'>
              {!editing ? (
                // View Mode
                <>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-2'>
                        Full Name
                      </label>
                      <input
                        type='text'
                        value={formData.name}
                        disabled
                        className='w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600'
                      />
                    </div>

                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-2'>
                        Email Address
                      </label>
                      <input
                        type='email'
                        value={formData.email}
                        disabled
                        className='w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600'
                      />
                    </div>

                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-2'>
                        Contact Number
                      </label>
                      <input
                        type='text'
                        value={formData.contactNumber || 'Not provided'}
                        disabled
                        className='w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600'
                      />
                      <p className='text-xs text-gray-500 mt-1'>e.g., 09123456789</p>
                    </div>

                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-2'>
                        Account Type
                      </label>
                      <input
                        type='text'
                        value={role || 'User'}
                        disabled
                        className='w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 capitalize'
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className='flex flex-wrap gap-3 pt-4 border-t border-gray-200'>
                    <button
                      onClick={() => setEditing(true)}
                      className='px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dull transition-all font-semibold'
                    >
                      Edit Profile
                    </button>
                    <button
                      onClick={() => setShowPasswordChange(!showPasswordChange)}
                      className='px-6 py-2 border-2 border-primary text-primary rounded-lg hover:bg-primary hover:text-white transition-all font-semibold'
                    >
                      Change Password
                    </button>
                    <button
                      onClick={() => setShowDeleteAccount(!showDeleteAccount)}
                      className='px-6 py-2 border-2 border-red-500 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all font-semibold'
                    >
                      Delete Account
                    </button>
                  </div>
                </>
              ) : (
                // Edit Mode
                <form onSubmit={handleUpdateProfile}>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-2'>
                        Full Name *
                      </label>
                      <input
                        type='text'
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none'
                      />
                    </div>

                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-2'>
                        Email Address
                      </label>
                      <input
                        type='email'
                        value={formData.email}
                        disabled
                        className='w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600'
                      />
                      <p className='text-xs text-gray-500 mt-1'>Email cannot be changed</p>
                    </div>

                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-2'>
                        Contact Number
                      </label>
                      <input
                        type='text'
                        value={formData.contactNumber}
                        onChange={(e) => {
                          setFormData({ ...formData, contactNumber: e.target.value })
                          // Clear field error when user corrects it
                          if (e.target.value === '') {
                            setFieldErrors(prev => ({ ...prev, contactNumber: '' }))
                          } else if (validatePhoneNumber(e.target.value)) {
                            setFieldErrors(prev => ({ ...prev, contactNumber: '' }))
                          }
                        }}
                        placeholder='e.g., 09123456789'
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-primary outline-none transition-all ${
                          fieldErrors.contactNumber
                            ? 'border-red-500 focus:ring-red-500'
                            : 'border-gray-300 focus:ring-primary'
                        }`}
                      />
                      {fieldErrors.contactNumber && (
                        <p className='mt-2 text-sm text-red-600'>{fieldErrors.contactNumber}</p>
                      )}
                    </div>

                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-2'>
                        Account Type
                      </label>
                      <input
                        type='text'
                        value={role || 'User'}
                        disabled
                        className='w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 capitalize'
                      />
                    </div>
                  </div>

                  <div className='flex gap-4 pt-6 border-t border-gray-200 mt-6'>
                    <button
                      type='submit'
                      className='flex-1 py-3 bg-primary text-white rounded-lg hover:bg-primary-dull transition-all font-semibold'
                    >
                      Save Changes
                    </button>
                    <button
                      type='button'
                      onClick={() => {
                        setEditing(false)
                        setFormData({
                          name: user.name || '',
                          email: user.email || '',
                          contactNumber: user.contactNumber || '',
                        })
                      }}
                      className='px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-semibold'
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Password Change Section */}
        {showPasswordChange && (
          <div className='bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-6'>
            <h2 className='text-2xl font-bold text-gray-900 mb-4'>Change Password</h2>
            <form onSubmit={handlePasswordChange} className='space-y-4'>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Current Password *
                </label>
                <input
                  type='password'
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  required
                  className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none'
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  New Password * (min. 8 characters)
                </label>
                <input
                  type='password'
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  required
                  minLength={8}
                  className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none'
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Confirm New Password *
                </label>
                <input
                  type='password'
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  required
                  minLength={8}
                  className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none'
                />
              </div>

              <div className='flex gap-4 pt-4'>
                <button
                  type='submit'
                  className='flex-1 py-3 bg-primary text-white rounded-lg hover:bg-primary-dull transition-all font-semibold'
                >
                  Update Password
                </button>
                <button
                  type='button'
                  onClick={() => {
                    setShowPasswordChange(false)
                    setPasswordData({
                      currentPassword: '',
                      newPassword: '',
                      confirmPassword: '',
                    })
                  }}
                  className='px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-semibold'
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Delete Account Section */}
        {showDeleteAccount && (
          <div className='bg-red-50 rounded-xl shadow-sm border-2 border-red-200 p-8 mb-6'>
            <h2 className='text-2xl font-bold text-red-900 mb-4'>Delete Account</h2>
            <div className='bg-white p-6 rounded-lg mb-4'>
              <p className='text-gray-800 mb-4'>
                <strong>Warning:</strong> This action is permanent and cannot be undone. All your data including:
              </p>
              <ul className='list-disc list-inside text-gray-700 space-y-1 mb-4'>
                <li>Profile information</li>
                <li>Booking history</li>
                <li>Account preferences</li>
              </ul>
              <p className='text-gray-800'>will be permanently deleted.</p>
            </div>

            <div className='space-y-4'>
              <div>
                <label className='block text-sm font-medium text-red-900 mb-2'>
                  Type <strong>DELETE</strong> to confirm
                </label>
                <input
                  type='text'
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder='Type DELETE'
                  className='w-full px-4 py-3 border-2 border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none'
                />
              </div>

              <div className='flex gap-4'>
                <button
                  type='button'
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmation !== 'DELETE'}
                  className={`flex-1 py-3 rounded-lg font-semibold text-white transition-all ${deleteConfirmation === 'DELETE'
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-gray-400 cursor-not-allowed'
                    }`}
                >
                  Delete My Account
                </button>
                <button
                  type='button'
                  onClick={() => {
                    setShowDeleteAccount(false)
                    setDeleteConfirmation('')
                  }}
                  className='px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-semibold'
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

export default UserProfile
