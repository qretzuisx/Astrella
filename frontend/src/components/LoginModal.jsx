import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { assets } from '../assets/assets'

const LoginModal = ({ showLogin, setShowLogin }) => {
  const navigate = useNavigate()
  const [isLogin, setIsLogin] = useState(true)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    setError('')
    setSuccess('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
      
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
          
          setSuccess('Login successful!')
          setTimeout(() => {
            setShowLogin(false)
            
            // Redirect based on user role
            if (userData.success || userData.sucess) {
              const role = userData.user ? (typeof userData.user.role === 'object' ? userData.user.role.name : userData.user.role) : null
              if (role === 'owner' || role === 'admin') {
                window.location.href = '/owner'
              } else {
                window.location.href = '/'
              }
            } else {
              window.location.href = '/'
            }
          }, 1000)
        } else {
          setError(data.message || 'Login failed')
        }
      } else {
        // Register
        if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
          setError('Please fill in all fields')
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

        const response = await fetch(`${API_URL}/user/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: formData.name,
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

  const handleClose = () => {
    setShowLogin(false)
    setError('')
    setSuccess('')
    setFormData({
      name: '',
      email: '',
      password: '',
      confirmPassword: ''
    })
  }

  if (!showLogin) return null

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'
      onClick={handleClose}
    >
      <div 
        className='bg-white rounded-2xl shadow-xl max-w-md w-full p-8 relative'
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
        <div className='text-center mb-6'>
          <h2 className='text-3xl font-bold text-gray-900 mb-2'>
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className='text-gray-600'>
            {isLogin ? 'Login to your account' : 'Sign up to get started'}
          </p>
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
        <form onSubmit={handleSubmit} className='space-y-4'>
          {!isLogin && (
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
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

        {/* Toggle between Login/Register */}
        <div className='mt-6 text-center'>
          <p className='text-gray-600'>
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => {
                setIsLogin(!isLogin)
                setError('')
                setSuccess('')
                setFormData({
                  name: '',
                  email: '',
                  password: '',
                  confirmPassword: ''
                })
              }}
              className='text-primary font-semibold hover:underline'
            >
              {isLogin ? 'Sign Up' : 'Login'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

export default LoginModal
