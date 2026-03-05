import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { assets } from '../assets/assets'
import { API_URL } from '../config'

const LoginModal = ({ showLogin, setShowLogin }) => {
  const navigate = useNavigate()
  const [isLogin, setIsLogin] = useState(true)
  const [formData, setFormData] = useState({
    role: 'user', // user | owner
    name: '',
    email: '',
    contactNumber: '',
    password: '',
    confirmPassword: '',

    // Owner signup required fields
    shopName: '',
    address: '',
    city: '',
    operatingHoursOpen: '09:00',
    operatingHoursClose: '19:00'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [forgotStep, setForgotStep] = useState('request')
  const [forgotEmail, setForgotEmail] = useState('')
  const [generatedResetToken, setGeneratedResetToken] = useState('')
  const [providedResetToken, setProvidedResetToken] = useState('')
  const [forgotNewPassword, setForgotNewPassword] = useState('')
  const [forgotConfirmNewPassword, setForgotConfirmNewPassword] = useState('')

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    setError('')
    setSuccess('')
  }

  const resetForgotState = () => {
    setForgotStep('request')
    setGeneratedResetToken('')
    setProvidedResetToken('')
    setForgotNewPassword('')
    setForgotConfirmNewPassword('')
  }

  const startForgotFlow = () => {
    setShowForgotPassword(true)
    setForgotEmail(formData.email || '')
    resetForgotState()
    setError('')
    setSuccess('')
  }

  const exitForgotFlow = () => {
    setShowForgotPassword(false)
    resetForgotState()
    setForgotEmail('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      if (isLogin) {
        // Login
        if (!formData.email || !formData.password) {
          setError('Please fill in all fields')
          setLoading(false)
          return
        }

        const response = await fetch(`${API_URL}/user/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password
          })
        })

        const data = await response.json()

        if (data.sucess || data.success) {
          localStorage.setItem('token', data.token)

          // Fetch user data to determine role and redirect
          const userResponse = await fetch(`${API_URL}/user/data`, {
            headers: {
              'Authorization': `Bearer ${data.token}`
            }
          })
          const userData = await userResponse.json()

          if (userData.success || userData.sucess) {
            const actualRole = userData.user
              ? (typeof userData.user.role === 'object' ? userData.user.role.name : userData.user.role)
              : 'user'

            // If user selected a role to login as, enforce it to prevent confusion.
            if (formData.role && actualRole && formData.role !== actualRole) {
              localStorage.removeItem('token')
              setError(`This account is a ${actualRole === 'owner' ? 'Shop Owner' : 'Customer'} account. Please switch the login role.`)
              setLoading(false)
              return
            }

            setSuccess('Login successful!')
            setTimeout(() => {
              setShowLogin(false)
              window.location.href = actualRole === 'owner' ? '/owner' : '/'
            }, 700)
          } else {
            setSuccess('Login successful!')
            setTimeout(() => {
              setShowLogin(false)
              window.location.href = '/'
            }, 700)
          }
        } else {
          setError(data.message || 'Login failed')
        }
      } else {
        // Register
        if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword || !formData.contactNumber) {
          setError('Please fill in all fields')
          setLoading(false)
          return
        }

        const digitsOnly = formData.contactNumber.toString().replace(/\D/g, '')
        if (digitsOnly.length < 10 || digitsOnly.length > 13) {
          setError('Contact number must be 10-13 digits')
          setLoading(false)
          return
        }

        if (formData.password !== formData.confirmPassword) {
          setError('Passwords do not match')
          setLoading(false)
          return
        }

        if (formData.password.length < 8) {
          setError('Password must be at least 8 characters')
          setLoading(false)
          return
        }

        if (formData.role === 'owner') {
          if (!formData.shopName?.trim() || !formData.address?.trim() || !formData.city?.trim()) {
            setError('Owner details are required: please fill in Shop Name, Address, and City.')
            setLoading(false)
            return
          }
          if (!formData.operatingHoursOpen || !formData.operatingHoursClose) {
            setError('Please set your shop operating hours (open and close time).')
            setLoading(false)
            return
          }
        }

        const response = await fetch(`${API_URL}/user/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            password: formData.password,
            contactNumber: digitsOnly,
            role: formData.role,
            shopProfile: formData.role === 'owner' ? {
              shopName: formData.shopName.trim(),
              address: formData.address.trim(),
              city: formData.city.trim(),
              operatingHours: `${formData.operatingHoursOpen}-${formData.operatingHoursClose}`,
              socialMedia: { facebook: '', instagram: '' }
            } : undefined
          })
        })

        const data = await response.json()

        if (data.sucess || data.success) {
          localStorage.setItem('token', data.token)
          
          // Fetch user data to determine role and redirect
          const userResponse = await fetch(`${API_URL}/user/data`, {
            headers: {
              'Authorization': `Bearer ${data.token}`
            }
          })
          const userData = await userResponse.json()
          
          setSuccess('Registration successful!')
          setTimeout(() => {
            setShowLogin(false)
            
            // Redirect based on user role (new users are 'user' by default)
            window.location.href = '/'
          }, 1000)
        } else {
          setError(data.message || 'Registration failed')
        }
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
      console.error('Auth error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleForgotRequest = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!forgotEmail) {
      setError('Please enter the email associated with your account.')
      return
    }

    try {
      setLoading(true)
      const response = await fetch(`${API_URL}/user/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: forgotEmail.trim() })
      })

      const data = await response.json()
      if (response.ok && (data.success || data.sucess)) {
        setSuccess('Reset code generated. Check your inbox or use the code shown below.')
        setGeneratedResetToken(data.resetToken || '')
        setProvidedResetToken(data.resetToken || '')
        setForgotStep('reset')
      } else {
        setError(data.message || 'Unable to start password reset.')
      }
    } catch (err) {
      console.error('Forgot password error:', err)
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!providedResetToken) {
      setError('Please enter the reset code.')
      return
    }

    if (!forgotNewPassword || forgotNewPassword.length < 8) {
      setError('New password must be at least 8 characters.')
      return
    }

    if (forgotNewPassword !== forgotConfirmNewPassword) {
      setError('Passwords do not match.')
      return
    }

    try {
      setLoading(true)
      const response = await fetch(`${API_URL}/user/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: forgotEmail.trim(),
          resetToken: providedResetToken.trim(),
          newPassword: forgotNewPassword
        })
      })

      const data = await response.json()
      if (response.ok && (data.success || data.sucess)) {
        setSuccess('Password updated successfully. You can now log in.')
        setTimeout(() => {
          exitForgotFlow()
          setShowForgotPassword(false)
          setIsLogin(true)
        }, 1200)
      } else {
        setError(data.message || 'Failed to reset password.')
      }
    } catch (err) {
      console.error('Reset password error:', err)
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setShowLogin(false)
    setError('')
    setSuccess('')
    exitForgotFlow()
    setFormData({
      role: 'user',
      name: '',
      email: '',
      contactNumber: '',
      password: '',
      confirmPassword: '',
      shopName: '',
      address: '',
      city: '',
      operatingHoursOpen: '09:00',
      operatingHoursClose: '19:00'
    })
  }

  if (!showLogin) return null

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'
      onClick={handleClose}
    >
      <div 
        className='bg-white rounded-2xl shadow-xl max-w-md w-full p-4 sm:p-8 relative max-h-[85vh] overflow-y-auto'
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          className='absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl'
        >
          ×
        </button>

        {/* Header */}
        <div className='text-center mb-4 sm:mb-6'>
          <h2 className='text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2'>
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className='text-gray-600'>
            {isLogin ? 'Login to your account' : 'Sign up to get started'}
          </p>

          {/* Role Selector */}
          <div className='mt-3 sm:mt-4 flex gap-2 justify-center'>
            <button
              type='button'
              onClick={() => setFormData({ ...formData, role: 'user' })}
              className={`px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${formData.role === 'user' ? 'bg-primary text-white border-primary' : 'bg-white text-gray-700 border-gray-300'}`}
            >
              Customer
            </button>
            <button
              type='button'
              onClick={() => setFormData({ ...formData, role: 'owner' })}
              className={`px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${formData.role === 'owner' ? 'bg-primary text-white border-primary' : 'bg-white text-gray-700 border-gray-300'}`}
            >
              Shop Owner
            </button>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className='mb-4 p-3 bg-red-50 border border-red-200 rounded-lg'>
            <p className='text-red-800 text-sm'>{error}</p>
          </div>
        )}

        {success && (
          <div className='mb-4 p-3 bg-green-50 border border-green-200 rounded-lg'>
            <p className='text-green-800 text-sm'>{success}</p>
          </div>
        )}

        {/* Form */}
        {!showForgotPassword ? (
          <form onSubmit={handleSubmit} className='space-y-4'>
            {!isLogin && (
              <>
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>
                    Full Name
                  </label>
                  <input
                    type='text'
                    name='name'
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder='Enter your name'
                    className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all'
                    required={!isLogin}
                  />
                </div>

                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>
                    Contact Number
                  </label>
                  <input
                    type='tel'
                    name='contactNumber'
                    inputMode='numeric'
                    value={formData.contactNumber}
                    onChange={handleInputChange}
                    placeholder='e.g., 09XXXXXXXXX'
                    className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all'
                    required
                  />
                  <p className='text-xs text-gray-500 mt-1'>Required (used for bookings so you won\'t re-type it every time)</p>
                </div>

                {formData.role === 'owner' && (
                  <div className='p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-3'>
                    <span className='text-sm font-semibold text-gray-900'>Owner Details <span className='text-red-500'>*</span></span>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>Shop Name <span className='text-red-500'>*</span></label>
                      <input
                        type='text'
                        name='shopName'
                        value={formData.shopName}
                        onChange={handleInputChange}
                        placeholder='Your shop name'
                        required
                        className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all bg-white'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-2'>Address <span className='text-red-500'>*</span></label>
                      <input
                        type='text'
                        name='address'
                        value={formData.address}
                        onChange={handleInputChange}
                        placeholder='Shop address'
                        required
                        className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all bg-white'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-2'>City <span className='text-red-500'>*</span></label>
                      <input
                        type='text'
                        name='city'
                        value={formData.city}
                        onChange={handleInputChange}
                        placeholder='City'
                        required
                        className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all bg-white'
                      />
                    </div>
                    <div className='grid grid-cols-2 gap-3'>
                      <div>
                        <label className='block text-sm font-medium text-gray-700 mb-2'>Opening Time <span className='text-red-500'>*</span></label>
                        <input
                          type='time'
                          name='operatingHoursOpen'
                          value={formData.operatingHoursOpen}
                          onChange={handleInputChange}
                          className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all bg-white'
                        />
                      </div>
                      <div>
                        <label className='block text-sm font-medium text-gray-700 mb-2'>Closing Time <span className='text-red-500'>*</span></label>
                        <input
                          type='time'
                          name='operatingHoursClose'
                          value={formData.operatingHoursClose}
                          onChange={handleInputChange}
                          className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all bg-white'
                        />
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                Email
              </label>
              <input
                type='email'
                name='email'
                value={formData.email}
                onChange={handleInputChange}
                placeholder='Enter your email'
                className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all'
                required
              />
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                Password
              </label>
              <input
                type='password'
                name='password'
                value={formData.password}
                onChange={handleInputChange}
                placeholder='Enter your password'
                className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all'
                required
              />
            </div>

            {isLogin && (
              <div className='text-right'>
                <button
                  type='button'
                  onClick={startForgotFlow}
                  className='text-sm text-primary font-semibold hover:underline'
                >
                  Forgot password?
                </button>
              </div>
            )}

            {!isLogin && (
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Confirm Password
                </label>
                <input
                  type='password'
                  name='confirmPassword'
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder='Confirm your password'
                  className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all'
                  required={!isLogin}
                />
              </div>
            )}

            <button
              type='submit'
              disabled={loading}
              className={`w-full py-3 rounded-lg font-semibold text-white transition-all duration-300 ${
                loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-primary hover:bg-primary-dull shadow-lg hover:shadow-xl'
              }`}
            >
              {loading ? 'Processing...' : isLogin ? 'Login' : 'Register'}
            </button>
          </form>
        ) : (
          <form
            onSubmit={forgotStep === 'request' ? handleForgotRequest : handleResetPassword}
            className='space-y-4'
          >
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                Account Email
              </label>
              <input
                type='email'
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder='you@example.com'
                className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all'
                required
              />
            </div>

            {forgotStep === 'reset' && (
              <>
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-2'>
                    Reset Code
                  </label>
                  <input
                    type='text'
                    value={providedResetToken}
                    onChange={(e) => setProvidedResetToken(e.target.value)}
                    placeholder='Paste the code you received'
                    className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all'
                    required
                  />
                </div>
                {generatedResetToken && (
                  <div className='p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-800'>
                    <p className='font-semibold mb-1'>Testing locally?</p>
                    <p className='break-all'>{generatedResetToken}</p>
                    <p className='text-xs text-orange-600 mt-1'>
                      Use this code if you cannot receive emails in development.
                    </p>
                  </div>
                )}
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-2'>
                    New Password
                  </label>
                  <input
                    type='password'
                    value={forgotNewPassword}
                    onChange={(e) => setForgotNewPassword(e.target.value)}
                    placeholder='Enter a new password'
                    className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all'
                    required
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-2'>
                    Confirm New Password
                  </label>
                  <input
                    type='password'
                    value={forgotConfirmNewPassword}
                    onChange={(e) => setForgotConfirmNewPassword(e.target.value)}
                    placeholder='Re-enter your new password'
                    className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all'
                    required
                  />
                </div>
              </>
            )}

            <button
              type='submit'
              disabled={loading}
              className={`w-full py-3 rounded-lg font-semibold text-white transition-all duration-300 ${
                loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-primary hover:bg-primary-dull shadow-lg hover:shadow-xl'
              }`}
            >
              {loading
                ? 'Processing...'
                : forgotStep === 'request'
                ? 'Send Reset Code'
                : 'Update Password'}
            </button>
          </form>
        )}

        {/* Toggle between Login/Register or back to login */}
        {!showForgotPassword ? (
          <div className='mt-6 text-center'>
            <p className='text-gray-600'>
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <button
                onClick={() => {
                  setIsLogin(!isLogin)
                  setError('')
                  setSuccess('')
                  setFormData({
                    role: 'user',
                    name: '',
                    email: '',
                    contactNumber: '',
                    password: '',
                    confirmPassword: '',
                    shopName: '',
                    address: '',
                    city: '',
                    facebook: '',
                    instagram: ''
                  })
                }}
                className='text-primary font-semibold hover:underline'
              >
                {isLogin ? 'Sign Up' : 'Login'}
              </button>
            </p>
          </div>
        ) : (
          <div className='mt-6 text-center'>
            <button
              onClick={() => {
                exitForgotFlow()
                setError('')
                setSuccess('')
              }}
              className='text-primary font-semibold hover:underline'
            >
              Back to login
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default LoginModal
