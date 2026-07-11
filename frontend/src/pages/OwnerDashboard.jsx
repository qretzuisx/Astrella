import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { assets } from '../assets/assets'
import { API_URL, CURRENCY } from '../config'
import OwnerSidebar from '../components/OwnerSidebar'

const OwnerDashboard = () => {
  const navigate = useNavigate()
  const [dashboardData, setDashboardData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [userRole, setUserRole] = useState(null)
  const currency = CURRENCY
  const timeFormatOptions = { hour: '2-digit', minute: '2-digit' }
  const triggerBtnRef = useRef(null)
  const dropdownMenuRef = useRef(null)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 })

  // Month selection and generation helpers
  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth()) // 0-indexed, or -1 for whole year
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const MONTH_FULL_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

  const currentNow = new Date()
  const currentYear = currentNow.getFullYear()
  const currentMonth = currentNow.getMonth()

  const handleMonthSelect = (monthIndex) => {
    setSelectedMonth(monthIndex)
    setDropdownOpen(false)
  }

  const isMonthDisabled = (monthIndex) => {
    return false // Allow all months to align with future bookings calendar
  }

  const canGoNextYear = selectedYear < currentYear
  const canGoPrevYear = selectedYear > 2025

  // Close dropdown when clicking outside both the trigger button and the menu
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (
        triggerBtnRef.current && !triggerBtnRef.current.contains(e.target) &&
        dropdownMenuRef.current && !dropdownMenuRef.current.contains(e.target)
      ) {
        setDropdownOpen(false)
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick)
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [dropdownOpen])


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

  const fetchDashboardData = async (mIndex, yVal) => {
    const targetMonthIndex = mIndex !== undefined ? mIndex : selectedMonth
    const targetYear = yVal !== undefined ? yVal : selectedYear
    
    // Construct YYYY-MM or YYYY query param
    const targetMonthStr = targetMonthIndex === -1
      ? `${targetYear}`
      : `${targetYear}-${String(targetMonthIndex + 1).padStart(2, '0')}`

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setError('Please login to access the dashboard')
        setLoading(false)
        return
      }

      // First check user data to see their role
      const userResponse = await fetch(`${API_URL}/user/data`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const userData = await userResponse.json()

      if (userData.success) {
        const role = userData.user ? (typeof userData.user.role === 'object' ? userData.user.role.name : userData.user.role) : null
        setUserRole(role)

        // Check if user is owner
        if (role !== 'owner') {
          setError('You need owner access to view this dashboard. Please submit an owner request first.')
          setLoading(false)
          return
        }
      }

      // Fetch dashboard data with month filter
      const response = await fetch(`${API_URL}/owner/dashboard?month=${targetMonthStr}`, {
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

  useEffect(() => {
    fetchDashboardData(selectedMonth, selectedYear)

    // Set up polling every 10 seconds
    const intervalId = setInterval(() => fetchDashboardData(selectedMonth, selectedYear), 10000)

    // Refresh when window gains focus
    const handleFocus = () => fetchDashboardData(selectedMonth, selectedYear)
    window.addEventListener('focus', handleFocus)

    return () => {
      clearInterval(intervalId)
      window.removeEventListener('focus', handleFocus)
    }
  }, [selectedMonth, selectedYear])

  if (loading) {
    return (
      <div className='flex min-h-screen'>
        <OwnerSidebar />
        <div className='flex-1 flex items-center justify-center px-4'>
          <div className='text-center'>
            <p className='text-lg sm:text-xl text-gray-500 mb-4'>Loading dashboard...</p>
            <div className='animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-primary mx-auto'></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className='flex min-h-screen'>
        <OwnerSidebar />
        <div className='flex-1 flex items-center justify-center px-4'>
          <div className='text-center max-w-md w-full'>
            <div className='bg-red-50 border border-red-200 rounded-lg p-4 sm:p-6 mb-4'>
              <p className='text-red-800 font-semibold mb-2 text-sm sm:text-base'>Access Denied</p>
              <p className='text-red-600 text-xs sm:text-sm mb-4'>{error}</p>
              {userRole === 'user' && (
                <button
                  onClick={() => window.location.href = '/'}
                  className='px-4 py-2 text-sm sm:text-base bg-primary text-white rounded-lg hover:bg-primary-dull transition-colors'
                >
                  Go Back
                </button>
              )}
              {!userRole && (
                <button
                  onClick={() => window.location.href = '/'}
                  className='px-4 py-2 text-sm sm:text-base bg-primary text-white rounded-lg hover:bg-primary-dull transition-colors'
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
    <div className='flex min-h-screen bg-[#FDFDFF] max-w-full overflow-x-hidden'>
      <OwnerSidebar />
      
      <div className='flex-1 min-w-0 p-4 sm:p-6 lg:p-10 transition-all duration-500'>
        <div className='max-w-7xl mx-auto'>
          {/* Header Section */}
          <div className='mb-10 mt-12 lg:mt-0 flex flex-col sm:flex-row sm:items-end justify-between gap-4'>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-1 bg-primary rounded-full"></div>
                <span className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">Management Space</span>
              </div>
              <h1 className='text-3xl sm:text-4xl font-black text-primary-dull tracking-tight mb-2'>Dashboard</h1>
              <p className='text-sm sm:text-base text-gray-500 font-medium'>Welcome back! Here's an overview of your shop's performance.</p>
            </div>
            <div className="hidden sm:flex items-center gap-3 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm">
              <div className="p-2 bg-primary/5 rounded-xl">
                 <img src={assets.calendar_icon_colored} alt="calendar" className="w-5 h-5" />
              </div>
              <div className="pr-4">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Current Date</p>
                <p className="text-xs font-bold text-primary-dull">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</p>
              </div>
            </div>
          </div>

          {/* Stats Cards - Grid Layout */}
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12'>
            {/* Total Apparel */}
            <button
              type='button'
              onClick={() => navigate('/owner/manage-gown')}
              className='group bg-white rounded-3xl shadow-sm p-4 sm:p-6 border border-gray-100 text-left hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden flex flex-row items-center gap-5 sm:block'
            >
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/5 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
              <div className='flex-shrink-0 sm:flex sm:items-center sm:justify-between sm:mb-6 relative'>
                <div className='p-3.5 bg-primary/10 rounded-2xl group-hover:bg-primary group-hover:scale-110 transition-all duration-300'>
                  <img src={assets.gownIconColored} alt="apparel" className='w-6 h-6 group-hover:brightness-0 group-hover:invert transition-all' />
                </div>
                <div className="hidden sm:block text-[10px] font-bold text-primary bg-primary/5 px-2.5 py-1 rounded-full uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">View All</div>
              </div>
              <div className="flex-1 flex flex-row items-center justify-between sm:block">
                <h3 className='text-xs font-bold text-gray-400 uppercase tracking-widest sm:mb-1 relative'>Total Apparel</h3>
                <p className='text-3xl sm:text-4xl font-black text-primary-dull relative'>
                  {dashboardData?.totalGowns || 0}
                </p>
              </div>
            </button>

            {/* Total Bookings */}
            <button
              type='button'
              onClick={() => navigate('/owner/manage-bookings')}
              className='group bg-white rounded-3xl shadow-sm p-4 sm:p-6 border border-gray-100 text-left hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden flex flex-row items-center gap-5 sm:block'
            >
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-50 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
              <div className='flex-shrink-0 sm:flex sm:items-center sm:justify-between sm:mb-6 relative'>
                <div className='p-3.5 bg-blue-50 rounded-2xl group-hover:bg-blue-600 group-hover:scale-110 transition-all duration-300'>
                  <img src={assets.listIconColored} alt="bookings" className='w-6 h-6 group-hover:brightness-0 group-hover:invert transition-all' />
                </div>
                <div className="hidden sm:block text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">Manage</div>
              </div>
              <div className="flex-1 flex flex-row items-center justify-between sm:block">
                <h3 className='text-xs font-bold text-gray-400 uppercase tracking-widest sm:mb-1 relative'>Total Bookings</h3>
                <p className='text-3xl sm:text-4xl font-black text-primary-dull relative'>
                  {dashboardData?.totalBookings || 0}
                </p>
              </div>
            </button>

            {/* Pending Bookings */}
            <button
              type='button'
              onClick={() => navigate('/owner/manage-bookings?status=pending')}
              className='group bg-white rounded-3xl shadow-sm p-4 sm:p-6 border border-gray-100 text-left hover:shadow-xl hover:shadow-orange-500/5 hover:border-orange-200 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden flex flex-row items-center gap-5 sm:block'
            >
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-orange-50 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
              <div className='flex-shrink-0 sm:flex sm:items-center sm:justify-between sm:mb-6 relative'>
                <div className='p-3.5 bg-orange-50 rounded-2xl group-hover:bg-orange-500 group-hover:scale-110 transition-all duration-300'>
                  <img src={assets.cautionIconColored} alt="pending" className='w-6 h-6 group-hover:brightness-0 group-hover:invert transition-all' />
                </div>
                {dashboardData?.pendingBookings > 0 && (
                  <div className="hidden sm:flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                  </div>
                )}
              </div>
              <div className="flex-1 flex flex-row items-center justify-between sm:block">
                <div className="flex items-center gap-2 sm:mb-1 relative">
                  {dashboardData?.pendingBookings > 0 && (
                    <div className="flex sm:hidden h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                    </div>
                  )}
                  <h3 className='text-xs font-bold text-gray-400 uppercase tracking-widest'>Pending Orders</h3>
                </div>
                <p className='text-3xl sm:text-4xl font-black text-primary-dull relative'>
                  {dashboardData?.pendingBookings || 0}
                </p>
              </div>
            </button>

            {/* Monthly Revenue */}
            <div className='group bg-primary-dull rounded-3xl shadow-xl shadow-primary/10 p-4 sm:p-6 text-left hover:-translate-y-1 transition-all duration-300 relative flex flex-col justify-between gap-4 w-full sm:block'>
              {/* Decorative background clipped inside the card */}
              <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none z-0">
                <div className="absolute -right-4 -top-4 w-32 h-32 bg-white/5 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
              </div>
              
              <div className='flex items-center justify-between w-full sm:mb-6 relative z-10'>
                <div className='p-3.5 bg-white/10 rounded-2xl flex-shrink-0'>
                  <span className='group-hover:scale-110 block transition-transform text-2xl text-white font-black leading-none'>₱</span>
                </div>
                                {/* Month Dropdown Selector */}
                <div className="relative">
                  <button
                    ref={triggerBtnRef}
                    type="button"
                    onClick={() => {
                      if (!dropdownOpen && triggerBtnRef.current) {
                        const rect = triggerBtnRef.current.getBoundingClientRect()
                        setDropdownPos({
                          top: rect.bottom + 8,
                          right: window.innerWidth - rect.right,
                        })
                      }
                      setDropdownOpen(prev => !prev)
                    }}
                    className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 active:scale-95 text-white text-[11px] font-bold px-3 py-1.5 rounded-xl border border-white/15 transition-all cursor-pointer shadow-sm select-none"
                    style={{ fontFamily: "'Poppins', sans-serif" }}
                  >
                    <span>
                      {selectedMonth === -1 ? selectedYear : `${MONTH_NAMES[selectedMonth]} ${selectedYear}`}
                    </span>
                    <svg
                      className={`w-3.5 h-3.5 transition-transform duration-300 ${dropdownOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Portal dropdown — rendered at body root to fully escape card stacking/clipping */}
                  {dropdownOpen && createPortal(
                    <div
                      ref={dropdownMenuRef}
                      style={{
                        position: 'fixed',
                        top: dropdownPos.top,
                        right: dropdownPos.right,
                        zIndex: 99999,
                        width: '280px',
                        backgroundColor: '#0d1b3e',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: '1.25rem',
                        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.6)',
                        overflow: 'hidden',
                        fontFamily: "'Poppins', sans-serif"
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Year Navigation */}
                      <div className="flex items-center justify-between px-4 py-3 bg-white/5 border-b border-white/10">
                        <button
                          type="button"
                          onClick={() => canGoPrevYear && setSelectedYear(y => y - 1)}
                          disabled={!canGoPrevYear}
                          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-90 ${
                            canGoPrevYear
                              ? 'hover:bg-white/10 text-white/50 hover:text-white'
                              : 'text-white/20 cursor-not-allowed'
                          }`}
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <span className="text-sm font-black text-white tracking-wide select-none">{selectedYear}</span>
                        <button
                          type="button"
                          onClick={() => canGoNextYear && setSelectedYear(y => y + 1)}
                          disabled={!canGoNextYear}
                          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-90 ${
                            canGoNextYear
                              ? 'hover:bg-white/10 text-white/50 hover:text-white'
                              : 'text-white/20 cursor-not-allowed'
                          }`}
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                      </div>

                      {/* Month Grid */}
                      <div className="grid grid-cols-3 gap-1.5 p-3">
                        {MONTH_NAMES.map((name, index) => {
                          const isSelected = index === selectedMonth
                          const isCurrent = index === currentMonth && selectedYear === currentYear
                          const disabled = isMonthDisabled(index)
                          return (
                            <button
                              key={name}
                              type="button"
                              onClick={() => !disabled && handleMonthSelect(index)}
                              disabled={disabled}
                              className={`relative py-3 px-2 rounded-xl text-[13px] font-bold transition-all duration-200 ${
                                disabled
                                  ? 'text-white/20 cursor-not-allowed'
                                  : isSelected
                                    ? 'bg-[#162b69] text-white shadow-lg shadow-[#162b69]/50 scale-[1.02] cursor-pointer'
                                    : isCurrent
                                      ? 'bg-white/10 text-white font-black hover:bg-white/20 cursor-pointer'
                                      : 'text-white/70 hover:bg-white/5 hover:text-white cursor-pointer active:scale-95'
                              }`}
                            >
                              {name}
                              {isCurrent && !isSelected && (
                                <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white"></span>
                              )}
                            </button>
                          )
                        })}
                      </div>

                      {/* Year-Only Filter Toggle */}
                      <div className="border-t border-white/10 p-2 bg-white/[0.02] flex justify-center">
                        <button
                          type="button"
                          onClick={() => handleMonthSelect(-1)}
                          className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold text-center transition-all duration-200 cursor-pointer ${
                            selectedMonth === -1
                              ? 'bg-[#162b69] text-white shadow-md'
                              : 'text-white/80 hover:bg-white/5 hover:text-white active:scale-95'
                          }`}
                        >
                          Show Entire Year
                        </button>
                      </div>
                    </div>,
                    document.body
                  )}
                </div>
              </div>

              <div className="relative z-10 w-full flex flex-row items-center justify-between sm:block">
                <div className="sm:mb-2">
                  <h3 className='text-[9px] font-black text-white/40 uppercase tracking-[0.2em] leading-none'>Est. Revenue</h3>
                  <p className="text-[10px] text-white/50 font-medium mt-0.5">
                    {selectedMonth === -1 ? `Year ${selectedYear}` : `${MONTH_FULL_NAMES[selectedMonth]} ${selectedYear}`}
                  </p>
                </div>
                <p className='text-2xl sm:text-3xl font-black text-white relative flex items-baseline gap-1'>
                  <span className="text-sm sm:text-lg opacity-60">{currency}</span>
                  <span>{dashboardData?.monthlyRevenue != null ? dashboardData.monthlyRevenue.toLocaleString() : '0'}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Recent Bookings Section */}
          <div className='bg-white rounded-[32px] shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden'>
            <div className='px-8 py-8 border-b border-gray-50 flex items-center justify-between bg-gradient-to-r from-white to-gray-50/50'>
              <div>
                <h2 className='text-2xl font-black text-primary-dull tracking-tight'>Recent Activity</h2>
                <p className="text-xs font-medium text-gray-500 mt-0.5">Your latest 5 client requests</p>
              </div>
              <button 
                onClick={() => navigate('/owner/manage-bookings')}
                className="px-5 py-2.5 bg-gray-100 hover:bg-primary hover:text-white rounded-xl text-xs font-bold text-gray-600 transition-all active:scale-95 shadow-sm"
              >
                View Bookings
              </button>
            </div>
            
            <div className='p-6 sm:p-8'>
              {dashboardData?.recentBookings && dashboardData.recentBookings.length > 0 ? (
                <div className='space-y-4 font-geist'>
                  {dashboardData.recentBookings.map((booking) => (
                    <div
                      key={booking._id || booking.id}
                      className='group flex flex-col sm:flex-row sm:items-center justify-between p-5 border border-gray-100 rounded-3xl hover:bg-gray-50/80 hover:border-primary/10 hover:shadow-md transition-all duration-300 cursor-pointer relative overflow-hidden'
                      onClick={() => {
                        const bookingId = booking._id || booking.id
                        navigate(`/owner/manage-bookings?highlightId=${bookingId}`)
                      }}
                    >
                      <div className='flex items-center gap-5'>
                        <div className="relative">
                          <img 
                            src={booking.gown?.image || assets.gown_image1} 
                            alt={booking.gown?.name}
                            className='w-20 h-20 object-contain bg-white rounded-2xl shadow-md group-hover:scale-105 transition-transform duration-500'
                          />
                          <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-lg flex items-center justify-center border-2 border-white shadow-sm ${
                            booking.status === 'confirmed' ? 'bg-green-500' : 'bg-orange-500'
                          }`}>
                            <div className="w-2 h-2 rounded-full bg-white"></div>
                          </div>
                        </div>
                        <div>
                          <h3 className='text-lg font-black text-primary-dull group-hover:text-primary transition-colors'>{booking.gown?.name || 'Gown'}</h3>
                          <div className="flex flex-col gap-1 mt-1">
                            <div className="flex items-center gap-2">
                               <svg className="w-3.5 h-3.5 text-gray-400 opacity-60" fill="currentColor" viewBox="0 0 20 20">
                                 <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                               </svg>
                               <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{booking.user?.name || 'Customer'}</span>
                            </div>
                            <p className='text-[11px] font-medium text-gray-400'>
                              {formatBookingDate(booking.pickupDate)} • {formatBookingTime(booking.pickupTime, booking.pickupDate)}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className='flex items-center justify-between sm:flex-col sm:items-end gap-3 mt-4 sm:mt-0'>
                        <div className={`px-4 py-1.5 rounded-xl text-[10px] font-black tracking-[0.15em] border ${
                          booking.status === 'confirmed' 
                            ? 'bg-green-50 text-green-700 border-green-100' 
                            : booking.status === 'pending'
                            ? 'bg-orange-50 text-orange-600 border-orange-100'
                            : 'bg-gray-100 text-gray-600 border-gray-200'
                        }`}>
                          {booking.status?.toUpperCase() || 'PENDING'}
                        </div>
                        <p className='text-xl font-black text-primary-dull group-hover:scale-105 transition-transform'>
                          <span className="text-xs font-bold opacity-40 mr-1">{currency}</span>
                          {booking.price?.toLocaleString() || 0}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className='text-center py-20 bg-gray-50/50 rounded-[2rem] border-2 border-dashed border-gray-100'>
                  <div className="p-5 bg-white inline-block rounded-3xl shadow-sm mb-4">
                    <img src={assets.listIcon} className="w-8 h-8 opacity-20" />
                  </div>
                  <p className='text-base font-bold text-gray-400'>No recent bookings to display</p>
                  <p className="text-xs text-gray-400 mt-1">Your activity will appear here once customers start booking.</p>
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

