import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { assets } from '../assets/assets'
import OwnerSidebar from '../components/OwnerSidebar'

const OwnerDashboard = () => {
  const navigate = useNavigate()
  const [dashboardData, setDashboardData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [userRole, setUserRole] = useState(null)
  const currency = import.meta.env.VITE_CURRENCY || '₱'
  const timeFormatOptions = { hour: '2-digit', minute: '2-digit' }

  const formatBookingDate = (value) => {
    if (!value) return '--'
    return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const formatBookingTime = (timeValue, fallbackDate) => {
    if (timeValue) {
      const [hours, minutes] = timeValue.split(':').map(Number)
      if (!Number.isNaN(hours) && !Number.isNaN(minutes)) {
        const date = fallbackDate ? new Date(fallbackDate) : new Date()
        date.setHours(hours, minutes, 0, 0)
        return date.toLocaleTimeString(undefined, timeFormatOptions)
      }
    }
    if (fallbackDate) {
      return new Date(fallbackDate).toLocaleTimeString(undefined, timeFormatOptions)
    }
    return '--:--'
  }

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem('token')
        if (!token) {
          setError('Please login to access the dashboard')
          setLoading(false)
          return
        }

        // First check user data to see their role
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
        const userResponse = await fetch(`${API_URL}/user/data`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        const userData = await userResponse.json()
        
        if (userData.sucess || userData.success) {
          const role = userData.user ? (typeof userData.user.role === 'object' ? userData.user.role.name : userData.user.role) : null
          setUserRole(role)
          
        // Check if user is owner
        if (role !== 'owner') {
          setError('You need owner access to view this dashboard. Please submit an owner request first.')
            setLoading(false)
            return
          }
        }

        // Fetch dashboard data
        const response = await fetch(`${API_URL}/owner/dashboard`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        const data = await response.json()
        
        if (data.success) {
          setDashboardData(data.dashboardData)
        } else {
          setError(data.message || 'Failed to load dashboard data')
        }
      } catch (error) {
        console.error('Error fetching dashboard:', error)
        setError('An error occurred. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  if (loading) {
    return (
      <div className='flex min-h-screen'>
        <OwnerSidebar />
        <div className='flex-1 flex items-center justify-center'>
          <div className='text-center'>
            <p className='text-xl text-gray-500 mb-4'>Loading dashboard...</p>
            <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto'></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className='flex min-h-screen'>
        <OwnerSidebar />
        <div className='flex-1 flex items-center justify-center'>
          <div className='text-center max-w-md'>
            <div className='bg-red-50 border border-red-200 rounded-lg p-6 mb-4'>
              <p className='text-red-800 font-semibold mb-2'>Access Denied</p>
              <p className='text-red-600 text-sm mb-4'>{error}</p>
              {userRole === 'user' && (
                <button
                  onClick={() => window.location.href = '/'}
                  className='px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dull transition-colors'
                >
                  Go Back
                </button>
              )}
              {!userRole && (
                <button
                  onClick={() => window.location.href = '/'}
                  className='px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dull transition-colors'
                >
                  Login
                </button>
              )}
            </div>
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
          <div className='mb-8'>
            <h1 className='text-3xl font-bold text-gray-900 mb-2'>Dashboard</h1>
            <p className='text-gray-600'>Welcome back! Here's your overview.</p>
          </div>

          {/* Stats Cards */}
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8'>
            {/* Total Apparel */}
            <button
              type='button'
              onClick={() => navigate('/owner/manage-gown')}
              className='bg-white rounded-xl shadow-sm p-6 border border-gray-200 text-left hover:shadow-md transition-shadow'
            >
              <div className='flex items-center justify-between mb-4'>
                <div className='p-3 bg-primary/10 rounded-lg'>
                  <img src={assets.gownIconColored} alt="apparel" className='w-6 h-6' />
                </div>
              </div>
              <h3 className='text-sm text-gray-600 mb-1'>Total Apparel</h3>
              <p className='text-3xl font-bold text-gray-900'>
                {dashboardData?.totalGowns || 0}
              </p>
            </button>

            {/* Total Bookings */}
            <button
              type='button'
              onClick={() => navigate('/owner/manage-bookings')}
              className='bg-white rounded-xl shadow-sm p-6 border border-gray-200 text-left hover:shadow-md transition-shadow'
            >
              <div className='flex items-center justify-between mb-4'>
                <div className='p-3 bg-blue-100 rounded-lg'>
                  <img src={assets.listIconColored} alt="bookings" className='w-6 h-6' />
                </div>
              </div>
              <h3 className='text-sm text-gray-600 mb-1'>Total Bookings</h3>
              <p className='text-3xl font-bold text-gray-900'>
                {dashboardData?.totalBookings || 0}
              </p>
            </button>

            {/* Pending Bookings */}
            <button
              type='button'
              onClick={() => navigate('/owner/manage-bookings')}
              className='bg-white rounded-xl shadow-sm p-6 border border-gray-200 text-left hover:shadow-md transition-shadow'
            >
              <div className='flex items-center justify-between mb-4'>
                <div className='p-3 bg-yellow-100 rounded-lg'>
                  <img src={assets.cautionIconColored} alt="pending" className='w-6 h-6' />
                </div>
              </div>
              <h3 className='text-sm text-gray-600 mb-1'>Pending Bookings</h3>
              <p className='text-3xl font-bold text-gray-900'>
                {dashboardData?.pendingBookings || 0}
              </p>
            </button>

            {/* Monthly Revenue */}
            <div className='bg-white rounded-xl shadow-sm p-6 border border-gray-200'>
              <div className='flex items-center justify-between mb-4'>
                <div className='p-3 bg-green-100 rounded-lg'>
                  <span className='text-2xl'>₱</span>
                </div>
              </div>
              <h3 className='text-sm text-gray-600 mb-1'>Monthly Revenue</h3>
              <p className='text-3xl font-bold text-gray-900'>
                {currency}{dashboardData?.monthlyRevenue?.toLocaleString() || 0}
              </p>
            </div>
          </div>

          {/* Recent Bookings */}
          <div className='bg-white rounded-xl shadow-sm border border-gray-200'>
            <div className='p-6 border-b border-gray-200'>
              <h2 className='text-xl font-bold text-gray-900'>Recent Bookings</h2>
            </div>
            
            <div className='p-6'>
              {dashboardData?.recentBookings && dashboardData.recentBookings.length > 0 ? (
                <div className='space-y-4'>
                  {dashboardData.recentBookings.map((booking) => (
                    <div 
                      key={booking._id} 
                      className='flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors'
                    >
                      <div className='flex items-center gap-4'>
                        <img 
                          src={booking.gown?.image || assets.gown_image1} 
                          alt={booking.gown?.name}
                          className='w-16 h-16 object-cover rounded-lg'
                        />
                        <div>
                          <h3 className='font-semibold text-gray-900'>{booking.gown?.name || 'Gown'}</h3>
                          <p className='text-sm text-gray-600'>
                            {booking.user?.name || 'Customer'} • {formatBookingDate(booking.pickupDate)} {formatBookingTime(booking.pickupTime, booking.pickupDate)} - {formatBookingDate(booking.returnDate)} {formatBookingTime(booking.returnTime, booking.returnDate)}
                          </p>
                        </div>
                      </div>
                      <div className='text-right'>
                        <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          booking.status === 'confirmed' 
                            ? 'bg-green-100 text-green-800' 
                            : booking.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {booking.status?.toUpperCase() || 'PENDING'}
                        </div>
                        <p className='text-lg font-bold text-primary mt-2'>
                          {currency}{booking.price?.toLocaleString() || 0}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className='text-center py-12'>
                  <p className='text-gray-500'>No recent bookings</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OwnerDashboard

