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
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [forgotShowPassword, setForgotShowPassword] = useState(false)
  const [forgotShowConfirmPassword, setForgotShowConfirmPassword] = useState(false)

  const handleInputChange = (e) => {
    const { name, value } = e.target
    if (name === 'contactNumber') {
      const digitsOnly = value.replace(/\D/g, '').slice(0, 11)
      setFormData({
        ...formData,
        [name]: digitsOnly
      })
    } else {
      setFormData({
        ...formData,
        [name]: value
      })
    }
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

        if (data.success) {
          localStorage.setItem('token', data.token)

          // Fetch user data to determine role and redirect
          const userResponse = await fetch(`${API_URL}/user/data`, {
            headers: {
              'Authorization': `Bearer ${data.token}`
            }
          })
          const userData = await userResponse.json()

          if (userData.success) {
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
        if (digitsOnly.length !== 11) {
          setError('Contact number must be exactly 11 digits')
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

        if (data.success) {
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
      if (response.ok && data.success) {
        setSuccess('Reset code generated! Please copy the 5-digit code below.')
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
      if (response.ok && data.success) {
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
    <div 
      className='fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-[100] p-4 transition-all duration-500 animate-in fade-in'
      onClick={handleClose}
    >
      <div 
        className='bg-white/80 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] max-w-md w-full p-8 sm:p-10 border border-white/60 relative overflow-hidden group/modal max-h-[90vh] overflow-y-auto custom-scrollbar'
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ornate Background Accents */}
        <div className='absolute -top-32 -right-32 w-64 h-64 bg-primary/20 rounded-full blur-[80px] group-hover/modal:bg-primary/30 transition-all duration-1000 pointer-events-none'></div>
        <div className='absolute -bottom-32 -left-32 w-64 h-64 bg-blue-400/20 rounded-full blur-[80px] group-hover/modal:bg-blue-400/30 transition-all duration-1000 pointer-events-none'></div>

        {/* Close Button */}
        <button
          onClick={handleClose}
          className='absolute top-6 right-6 p-2 rounded-xl text-gray-400 hover:text-gray-900 hover:bg-gray-100/50 hover:rotate-90 transition-all duration-300 z-50'
        >
          <svg className='w-6 h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
          </svg>
        </button>

        {!showForgotPassword ? (
          <>
            {/* Header Section */}
            <div className='text-center mb-8 relative z-10'>
              <h2 className='text-3xl sm:text-4xl font-black text-gray-900 mb-2 tracking-tight'>
                {isLogin ? 'Welcome ' : 'Create '}
                <span className='text-primary'>{isLogin ? 'Back' : 'Account'}</span>
              </h2>
              <p className='text-gray-500 font-medium'>
                {isLogin ? 'Enter your credentials to continue' : 'Join our premium boutique community'}
              </p>

              {/* Role Selector Tabs */}
              <div className='mt-8 flex p-1.5 bg-gray-100/50 backdrop-blur-sm rounded-[1.25rem] border border-gray-200/50 max-w-[280px] mx-auto overflow-hidden'>
                <button
                  type='button'
                  onClick={() => setFormData({ ...formData, role: 'user' })}
                  className={`flex-1 py-2.5 rounded-[0.9rem] text-sm font-bold transition-all duration-300 ${formData.role === 'user' ? 'bg-white text-primary shadow-sm border border-gray-100 focus:outline-none' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Customer
                </button>
                <button
                  type='button'
                  onClick={() => {
                    setFormData({ ...formData, role: 'owner' });
                    setIsLogin(true);
                  }}
                  className={`flex-1 py-2.5 rounded-[0.9rem] text-sm font-bold transition-all duration-300 ${formData.role === 'owner' ? 'bg-[#FF3B30] text-white shadow-sm focus:outline-none' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Shop Owner
                </button>
              </div>
            </div>

            {/* Feedback Messages */}
            <div className='relative z-10'>
              {error && (
                <div className='mb-6 p-4 bg-red-50/80 backdrop-blur-sm border border-red-100 rounded-2xl flex items-center shadow-sm animate-in slide-in-from-top-2'>
                  <svg className='w-5 h-5 text-red-500 mr-3 shrink-0' fill='currentColor' viewBox='0 0 20 20'>
                    <path fillRule='evenodd' d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z' clipRule='evenodd' />
                  </svg>
                  <p className='text-red-800 text-sm font-medium'>{error}</p>
                </div>
              )}

              {success && (
                <div className='mb-6 p-4 bg-green-50/80 backdrop-blur-sm border border-green-100 rounded-2xl flex items-center shadow-sm animate-in slide-in-from-top-2'>
                  <svg className='w-5 h-5 text-green-500 mr-3 shrink-0' fill='currentColor' viewBox='0 0 20 20'>
                    <path fillRule='evenodd' d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z' clipRule='evenodd' />
                  </svg>
                  <p className='text-green-800 text-sm font-medium'>{success}</p>
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className='space-y-5 relative z-10'>
              {!isLogin && (
                <div className='space-y-5 animate-in slide-in-from-bottom-4 duration-500'>
                  <div>
                    <label className='block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1'>
                      Full Name
                    </label>
                    <div className='relative group/field'>
                      <div className='absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none'>
                        <svg className='h-5 w-5 text-gray-400 group-focus-within/field:text-primary transition-colors' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' />
                        </svg>
                      </div>
                      <input
                        type='text'
                        name='name'
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder='Jane Doe'
                        className='w-full pl-11 pr-4 py-3.5 bg-white/50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all duration-300 font-medium'
                        required={!isLogin}
                      />
                    </div>
                  </div>

                  <div>
                    <label className='block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1'>
                      Contact Number
                    </label>
                    <div className='relative group/field'>
                      <div className='absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none'>
                        <svg className='h-5 w-5 text-gray-400 group-focus-within/field:text-primary transition-colors' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z' />
                        </svg>
                      </div>
                      <input
                        type='tel'
                        name='contactNumber'
                        inputMode='numeric'
                        value={formData.contactNumber}
                        onChange={handleInputChange}
                        placeholder='0912 345 6789'
                        className='w-full pl-11 pr-4 py-3.5 bg-white/50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all duration-300 font-medium'
                        required
                      />
                    </div>
                  </div>

                  {formData.role === 'owner' && (
                    <div className='p-5 bg-primary/5 rounded-3xl border border-primary/10 space-y-4 animate-in zoom-in-95 duration-300'>
                      <div className='flex items-center gap-2 mb-1'>
                        <svg className='w-4 h-4 text-primary' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' />
                        </svg>
                        <span className='text-xs font-black text-primary uppercase tracking-wider'>Boutique Details</span>
                      </div>
                      
                      <div className='grid grid-cols-1 gap-4'>
                        <input
                          type='text'
                          name='shopName'
                          value={formData.shopName}
                          onChange={handleInputChange}
                          placeholder='Shop Name'
                          required
                          className='w-full px-4 py-3 bg-white border border-gray-100 rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all duration-300 text-sm font-medium shadow-sm'
                        />
                        <div className='grid grid-cols-2 gap-3'>
                          <input
                            type='text'
                            name='city'
                            value={formData.city}
                            onChange={handleInputChange}
                            placeholder='City'
                            required
                            className='w-full px-4 py-3 bg-white border border-gray-100 rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all duration-300 text-sm font-medium shadow-sm'
                          />
                          <input
                            type='text'
                            name='address'
                            value={formData.address}
                            onChange={handleInputChange}
                            placeholder='Full Address'
                            required
                            className='w-full px-4 py-3 bg-white border border-gray-100 rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all duration-300 text-sm font-medium shadow-sm'
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className='space-y-5 animate-in slide-in-from-bottom-4 duration-700'>
                <div>
                  <label className='block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1'>
                    Email Address
                  </label>
                  <div className='relative group/field'>
                    <div className='absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none'>
                      <svg className='h-5 w-5 text-gray-400 group-focus-within/field:text-primary transition-colors' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' />
                      </svg>
                    </div>
                    <input
                      type='email'
                      name='email'
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder='your@email.com'
                      className='w-full pl-11 pr-4 py-3.5 bg-white/50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all duration-300 font-medium'
                      required
                    />
                  </div>
                </div>

                <div>
                  <div className='flex justify-between items-center mb-2 px-1'>
                    <label className='text-xs font-black text-gray-400 uppercase tracking-widest'>
                      Password
                    </label>
                    {isLogin && (
                      <button
                        type='button'
                        onClick={startForgotFlow}
                        className='text-xs font-bold text-primary hover:text-primary/80 transition-colors focus:outline-none'
                      >
                        Forgot Password?
                      </button>
                    )}
                  </div>
                  <div className='relative group/field'>
                    <div className='absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none'>
                      <svg className='h-5 w-5 text-gray-400 group-focus-within/field:text-primary transition-colors' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' />
                      </svg>
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name='password'
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder='••••••••'
                      className='w-full pl-11 pr-16 py-3.5 bg-white/50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all duration-300 font-medium'
                      required
                    />
                    <button
                      type='button'
                      onClick={() => setShowPassword(!showPassword)}
                      className='absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-primary transition-colors focus:outline-none'
                    >
                      <img 
                        src={showPassword ? assets.eye_close_icon : assets.eye_icon} 
                        alt="toggle password" 
                        className='w-11 h-11 opacity-70 hover:opacity-100 transition-opacity'
                      />
                    </button>
                  </div>
                </div>

                {!isLogin && (
                  <div className='animate-in slide-in-from-bottom-2 duration-300'>
                    <label className='block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1'>
                      Confirm Password
                    </label>
                    <div className='relative group/field'>
                      <div className='absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none'>
                        <svg className='h-5 w-5 text-gray-400 group-focus-within/field:text-primary transition-colors' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' />
                        </svg>
                      </div>
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        name='confirmPassword'
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        placeholder='••••••••'
                        className='w-full pl-11 pr-16 py-3.5 bg-white/50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all duration-300 font-medium'
                        required={!isLogin}
                      />
                      <button
                        type='button'
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className='absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-primary transition-colors focus:outline-none'
                      >
                        <img 
                          src={showConfirmPassword ? assets.eye_close_icon : assets.eye_icon} 
                          alt="toggle password" 
                          className='w-10 h-10 opacity-70 hover:opacity-100 transition-opacity'
                        />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <button
                type='submit'
                disabled={loading}
                className={`w-full py-4 rounded-2xl text-white font-black text-lg shadow-lg transform active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-3 mt-8 ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary hover:bg-primary/95 hover:shadow-[0_20px_40px_-12px_rgba(255,59,48,0.3)]'}`}
              >
                {loading ? (
                  <div className='w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin'></div>
                ) : (
                  <>
                    {isLogin ? (formData.role === 'owner' ? 'Login as Owner' : 'Sign In') : 'Create Account'}
                    <svg className='w-5 h-5 transition-transform group-hover:translate-x-1' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M13 7l5 5m0 0l-5 5m5-5H6' />
                    </svg>
                  </>
                )}
              </button>
            </form>

            {/* Footer Toggle */}
            <div className='mt-8 text-center relative z-10'>
              <p className='text-gray-500 font-medium'>
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                {formData.role === 'user' ? (
                  <button
                    type='button'
                    onClick={() => {
                      setIsLogin(!isLogin)
                      setError('')
                      setSuccess('')
                    }}
                    className='text-primary font-black hover:underline transition-all focus:outline-none'
                  >
                    {isLogin ? 'Sign Up' : 'Login'}
                  </button>
                ) : (
                  isLogin ? (
                    <span className='text-gray-400 italic text-sm'>Consult support for new boutiques</span>
                  ) : (
                    <button
                      type='button'
                      onClick={() => {
                        setIsLogin(true);
                        setFormData({ ...formData, role: 'user' });
                      }}
                      className='text-primary font-black hover:underline transition-all focus:outline-none'
                    >
                      Login as Customer
                    </button>
                  )
                )}
              </p>
            </div>
          </>
        ) : (
          /* Forgot Password Flow */
          <div className='space-y-6 relative z-10 animate-in fade-in duration-500'>
            <div className='text-center'>
              <div className='w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-primary/20'>
                <svg className='w-8 h-8 text-primary' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z' />
                </svg>
              </div>
              <h3 className='text-2xl font-black text-gray-900 mb-2'>Reset Password</h3>
              <p className='text-sm text-gray-500 font-medium leading-relaxed'>
                We'll help you secure your account again. Just follow the steps below.
              </p>
            </div>

            {/* Feedback Messages in Forgot Flow */}
            {(error || success) && (
              <div className='animate-in slide-in-from-top-2'>
                {error && <p className='p-3 bg-red-50 text-red-800 text-xs font-bold rounded-xl border border-red-100 mb-4'>{error}</p>}
                {success && <p className='p-3 bg-green-50 text-green-800 text-xs font-bold rounded-xl border border-green-100 mb-4'>{success}</p>}
              </div>
            )}

            <form 
              onSubmit={forgotStep === 'request' ? handleForgotRequest : handleResetPassword}
              className='space-y-4'
            >
              <div>
                <label className='block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1'>
                  Account Email
                </label>
                <input
                  type='email'
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder='you@example.com'
                  className='w-full px-4 py-3.5 bg-white/50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all duration-300 font-medium'
                  required
                />
              </div>

              {forgotStep === 'reset' && (
                <div className='space-y-4 animate-in slide-in-from-top-4 duration-500'>
                  <div>
                    <label className='block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1'>
                      Reset Code
                    </label>
                    <input
                      type='text'
                      value={providedResetToken}
                      onChange={(e) => setProvidedResetToken(e.target.value)}
                      placeholder='Enter 5-digit code'
                      maxLength={5}
                      className='w-full px-4 py-3.5 bg-white/50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all text-center text-xl font-black tracking-[0.2em]'
                      required
                    />
                  </div>
                  
                  {generatedResetToken && (
                    <div className='p-6 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 border border-blue-100 rounded-3xl shadow-sm text-center'>
                      <p className='text-[10px] uppercase tracking-widest font-black text-blue-500/80 mb-3'>Your Reset Code</p>
                      <div className='text-3xl font-black tracking-[0.2em] py-4 bg-white/80 backdrop-blur-sm rounded-xl border border-primary/10 text-primary shadow-sm font-mono'>
                        {generatedResetToken}
                      </div>
                      <p className='text-[10px] text-gray-400 mt-2 font-medium italic'>
                        Copy this and enter it above
                      </p>
                    </div>
                  )}

                  <div>
                    <label className='block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1'>
                      New Password
                    </label>
                    <div className='relative group/field'>
                      <input
                        type={forgotShowPassword ? 'text' : 'password'}
                        value={forgotNewPassword}
                        onChange={(e) => setForgotNewPassword(e.target.value)}
                        placeholder='••••••••'
                        className='w-full px-4 pr-16 py-3.5 bg-white/50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all duration-300 font-medium'
                        required
                      />
                      <button
                        type='button'
                        onClick={() => setForgotShowPassword(!forgotShowPassword)}
                        className='absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-primary transition-colors focus:outline-none'
                      >
                        <img 
                          src={forgotShowPassword ? assets.eye_close_icon : assets.eye_icon} 
                          alt="toggle password" 
                          className='w-10 h-10 opacity-70 hover:opacity-100 transition-opacity'
                        />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className='block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1'>
                      Confirm Password
                    </label>
                    <div className='relative group/field'>
                      <input
                        type={forgotShowConfirmPassword ? 'text' : 'password'}
                        value={forgotConfirmNewPassword}
                        onChange={(e) => setForgotConfirmNewPassword(e.target.value)}
                        placeholder='••••••••'
                        className='w-full px-4 pr-16 py-3.5 bg-white/50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all duration-300 font-medium'
                        required
                      />
                      <button
                        type='button'
                        onClick={() => setForgotShowConfirmPassword(!forgotShowConfirmPassword)}
                        className='absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-primary transition-colors focus:outline-none'
                      >
                        <img 
                          src={forgotShowConfirmPassword ? assets.eye_close_icon : assets.eye_icon} 
                          alt="toggle password" 
                          className='w-10 h-10 opacity-70 hover:opacity-100 transition-opacity'
                        />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className='flex flex-col gap-3 pt-4'>
                <button
                  type='submit'
                  disabled={loading}
                  className='w-full py-4 bg-primary text-white rounded-2xl font-black text-lg hover:bg-primary/95 shadow-lg active:scale-[0.98] transition-all duration-300 flex items-center justify-center'
                >
                  {loading ? (
                    <div className='w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin'></div>
                  ) : (
                    forgotStep === 'request' ? 'Generate Reset Code' : 'Update Password'
                  )}
                </button>
                <button
                  type='button'
                  onClick={exitForgotFlow}
                  className='w-full py-3 text-gray-400 font-bold hover:text-gray-600 transition-colors text-sm focus:outline-none'
                >
                  Back to Login
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}

export default LoginModal
