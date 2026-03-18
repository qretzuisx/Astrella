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

      if (userData.success) {
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
    <div className='min-h-screen bg-[#FDFDFF] py-12 px-4 md:px-8 lg:px-16 pb-24 sm:pb-12'>
      <div className='max-w-4xl mx-auto'>
        {/* Header */}
        <div className='mb-10 lg:mb-12 flex flex-col sm:flex-row sm:items-end justify-between gap-4'>
          <div>
            <button
              onClick={() => navigate('/')}
              className='text-primary hover:text-primary-dull mb-6 flex items-center gap-2 font-black transition-all hover:-translate-x-1 w-fit'
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Back to Home</span>
            </button>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-1 bg-primary rounded-full"></div>
              <span className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">Customer Space</span>
            </div>
            <h1 className='text-3xl sm:text-4xl md:text-5xl font-black text-primary-dull tracking-tight mb-2'>My Profile</h1>
            <p className='text-sm sm:text-base text-gray-500 font-medium'>Manage your account details and preferences.</p>
          </div>
          <div className="hidden sm:flex items-center gap-3 bg-white p-2 rounded-2xl border border-gray-100 shadow-[0_10px_30px_rgba(1,62,141,0.05)]">
            <div className="p-2 bg-primary/5 rounded-xl">
               <img src={assets.calendar_icon_colored} alt="calendar" className="w-5 h-5" />
            </div>
            <div className="pr-4">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Current Date</p>
              <p className="text-xs font-bold text-primary-dull">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</p>
            </div>
          </div>
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
        <div className='bg-white rounded-[32px] shadow-[0_10px_40px_rgba(0,0,0,0.04)] border border-blue-50/50 overflow-hidden mb-8 hover:shadow-[0_20px_60px_rgba(1,62,141,0.08)] transition-all duration-500'>
          {/* Profile Header */}
          <div className='bg-gradient-to-r from-primary to-primary-dull h-32'></div>

          <div className='px-5 sm:px-8 pb-6 sm:pb-8'>
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
                  className='px-6 py-2 bg-primary text-white rounded-xl text-sm font-black uppercase tracking-widest hover:bg-primary-dull transition-all shadow-[0_10px_30px_rgba(1,62,141,0.2)] hover:shadow-[0_15px_40px_rgba(1,62,141,0.3)] hover:-translate-y-1'
                >
                  Go to Dashboard
                </button>
              )}
            </div>

            {/* Profile Information */}
            <div className='space-y-8'>
              {!editing ? (
                // View Mode
                <>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
                    <div>
                      <label className='block text-xs font-black text-primary/50 uppercase tracking-widest mb-3'>
                        Full Name
                      </label>
                      <div className="px-5 py-4 bg-gray-50/50 rounded-2xl border border-gray-100 text-primary font-bold shadow-sm">
                        {formData.name}
                      </div>
                    </div>

                    <div>
                      <label className='block text-xs font-black text-primary/50 uppercase tracking-widest mb-3'>
                        Email Address
                      </label>
                      <div className="px-5 py-4 bg-gray-50/50 rounded-2xl border border-gray-100 text-primary font-bold shadow-sm">
                        {formData.email}
                      </div>
                    </div>

                    <div>
                      <label className='block text-xs font-black text-primary/50 uppercase tracking-widest mb-3'>
                        Contact Number
                      </label>
                      <div className="px-5 py-4 bg-gray-50/50 rounded-2xl border border-gray-100 text-primary font-bold shadow-sm">
                        {formData.contactNumber || 'Not provided'}
                      </div>
                    </div>

                    <div>
                      <label className='block text-xs font-black text-primary/50 uppercase tracking-widest mb-3'>
                        Account Type
                      </label>
                      <div className="px-5 py-4 bg-gray-50/50 rounded-2xl border border-gray-100 text-primary font-bold shadow-sm capitalize">
                        {role || 'User'}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className='flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 pt-8 border-t border-gray-100'>
                    <button
                      onClick={() => setEditing(true)}
                      className='px-8 py-3 bg-primary text-white rounded-2xl text-[10px] uppercase tracking-widest hover:bg-primary-dull transition-all font-black shadow-[0_10px_30px_rgba(1,62,141,0.2)] hover:shadow-[0_20px_50px_rgba(1,62,141,0.35)] hover:-translate-y-1'
                    >
                      Edit Profile
                    </button>
                    <button
                      onClick={() => setShowPasswordChange(!showPasswordChange)}
                      className='px-8 py-3 border border-primary/20 text-primary rounded-2xl text-[10px] uppercase tracking-widest hover:bg-primary/5 hover:border-primary/40 transition-all font-black hover:-translate-y-1 shadow-sm'
                    >
                      Change Password
                    </button>
                    <button
                      onClick={() => setShowDeleteAccount(!showDeleteAccount)}
                      className='px-8 py-3 border border-red-100 text-red-500 rounded-2xl text-[10px] uppercase tracking-widest hover:bg-red-50 hover:border-red-200 transition-all font-black ml-auto hover:-translate-y-1 shadow-sm'
                    >
                      Delete Account
                    </button>
                  </div>
                </>
              ) : (
                // Edit Mode
                <form onSubmit={handleUpdateProfile}>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
                    <div>
                      <label className='block text-xs font-black text-primary/50 uppercase tracking-widest mb-3'>
                        Full Name *
                      </label>
                      <input
                        type='text'
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        className='w-full px-5 py-4 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none font-bold transition-all bg-gray-50/30'
                      />
                    </div>

                    <div>
                      <label className='block text-xs font-black text-primary/50 uppercase tracking-widest mb-3'>
                        Email Address
                      </label>
                      <input
                        type='email'
                        value={formData.email}
                        disabled
                        className='w-full px-5 py-4 border border-gray-100 rounded-2xl bg-gray-100/50 text-gray-400 font-bold'
                      />
                      <p className='text-[10px] text-gray-400 mt-2 font-bold'>Email cannot be changed</p>
                    </div>

                    <div>
                      <label className='block text-xs font-black text-primary/50 uppercase tracking-widest mb-3'>
                        Contact Number
                      </label>
                      <input
                        type='text'
                        value={formData.contactNumber}
                        onChange={(e) => {
                          setFormData({ ...formData, contactNumber: e.target.value })
                          if (e.target.value === '') {
                            setFieldErrors(prev => ({ ...prev, contactNumber: '' }))
                          } else if (validatePhoneNumber(e.target.value)) {
                            setFieldErrors(prev => ({ ...prev, contactNumber: '' }))
                          }
                        }}
                        placeholder='09123456789'
                        className={`w-full px-5 py-4 border rounded-2xl focus:ring-4 outline-none transition-all font-bold ${
                          fieldErrors.contactNumber
                            ? 'border-red-500 focus:ring-red-500/10'
                            : 'border-gray-200 focus:ring-primary/10 focus:border-primary bg-gray-50/30'
                        }`}
                      />
                      {fieldErrors.contactNumber && (
                        <p className='mt-2 text-[10px] text-red-600 font-bold'>{fieldErrors.contactNumber}</p>
                      )}
                    </div>

                    <div>
                      <label className='block text-xs font-black text-primary/50 uppercase tracking-widest mb-3'>
                        Account Type
                      </label>
                      <input
                        type='text'
                        value={role || 'User'}
                        disabled
                        className='w-full px-5 py-4 border border-gray-100 rounded-2xl bg-gray-100/50 text-gray-400 font-bold capitalize'
                      />
                    </div>
                  </div>

                  <div className='flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 pt-8 border-t border-gray-100 mt-8'>
                    <button
                      type='submit'
                      className='w-full sm:w-auto px-10 py-4 bg-primary text-white rounded-2xl text-[10px] uppercase tracking-widest hover:bg-primary-dull transition-all font-black shadow-[0_10px_30px_rgba(1,62,141,0.2)] hover:shadow-[0_20px_50px_rgba(1,62,141,0.35)] hover:-translate-y-1 order-first sm:order-none'
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
                      className='px-10 py-4 border-2 border-gray-100 text-gray-500 rounded-2xl hover:bg-gray-50 transition-all font-black'
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
          <div className='bg-white rounded-[32px] shadow-[0_10px_40px_rgba(0,0,0,0.04)] border border-blue-50/50 overflow-hidden p-6 sm:p-8 mb-6 hover:shadow-[0_20px_60px_rgba(1,62,141,0.08)] transition-all duration-500'>
            <h2 className='text-xl sm:text-2xl font-black text-primary tracking-tight mb-6'>Change Password</h2>
            <form onSubmit={handlePasswordChange} className='space-y-4'>
              <div>
                <label className='block text-xs font-black text-primary/50 uppercase tracking-widest mb-3'>
                  Current Password *
                </label>
                <input
                  type='password'
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  required
                  className='w-full px-5 py-4 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none font-bold transition-all bg-gray-50/30'
                />
              </div>

              <div>
                <label className='block text-xs font-black text-primary/50 uppercase tracking-widest mb-3'>
                  New Password * (min. 8 characters)
                </label>
                <input
                  type='password'
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  required
                  minLength={8}
                  className='w-full px-5 py-4 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none font-bold transition-all bg-gray-50/30'
                />
              </div>

              <div>
                <label className='block text-xs font-black text-primary/50 uppercase tracking-widest mb-3'>
                  Confirm New Password *
                </label>
                <input
                  type='password'
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  required
                  minLength={8}
                  className='w-full px-5 py-4 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none font-bold transition-all bg-gray-50/30'
                />
              </div>

              <div className='flex flex-col sm:flex-row gap-4 pt-4'>
                <button
                  type='submit'
                  className='flex-1 py-3.5 sm:py-3 bg-primary text-white rounded-2xl hover:bg-primary-dull transition-all font-black text-[10px] uppercase tracking-widest shadow-[0_10px_30px_rgba(1,62,141,0.2)]'
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
                  className='px-6 py-3.5 sm:py-3 border-2 border-gray-100 text-gray-500 rounded-2xl hover:bg-gray-50 transition-all font-black text-[10px] uppercase tracking-widest'
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Delete Account Section */}
        {showDeleteAccount && (
          <div className='bg-white rounded-[32px] shadow-[0_10px_40px_rgba(0,0,0,0.04)] border-2 border-red-100 overflow-hidden p-6 sm:p-8 mb-6'>
            <h2 className='text-xl sm:text-2xl font-black text-red-900 tracking-tight mb-4'>Delete Account</h2>
            <div className='bg-red-50/50 p-5 sm:p-6 rounded-2xl mb-6'>
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
                <label className='block text-xs font-black text-red-800 uppercase tracking-widest mb-3'>
                  Type <strong>DELETE</strong> to confirm
                </label>
                <input
                  type='text'
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder='Type DELETE'
                  className='w-full px-5 py-4 border-2 border-red-200 rounded-2xl focus:ring-4 focus:ring-red-500/10 focus:border-red-500 outline-none font-bold transition-all'
                />
              </div>

              <div className='flex flex-col sm:flex-row gap-4'>
                <button
                  type='button'
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmation !== 'DELETE'}
                  className={`flex-1 py-3.5 sm:py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest text-white transition-all ${deleteConfirmation === 'DELETE'
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
                  className='px-6 py-3.5 sm:py-3 border-2 border-gray-100 text-gray-500 rounded-2xl hover:bg-gray-50 transition-all font-black text-[10px] uppercase tracking-widest'
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
