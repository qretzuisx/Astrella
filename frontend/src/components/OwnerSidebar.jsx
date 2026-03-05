import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { assets, ownerMenuLinks } from '../assets/assets'

const OwnerSidebar = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)

  const handleLogout = () => {
    localStorage.removeItem('token')
    navigate('/')
    window.location.reload()
  }

  const closeSidebar = () => {
    setIsOpen(false)
  }

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className='lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg border border-gray-200'
      >
        <svg className='w-6 h-6 text-gray-700' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          {isOpen ? (
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
          ) : (
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M4 6h16M4 12h16M4 18h16' />
          )}
        </svg>
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className='lg:hidden fixed inset-0 bg-black/50 z-40'
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar - sticky on desktop so it stays visible when scrolling */}
      <div className={`
        fixed lg:sticky lg:top-0 inset-y-0 left-0 z-40 self-start
        w-64 h-screen lg:max-h-screen bg-white border-r border-gray-200 flex flex-col
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className='p-4 sm:p-6 border-b border-gray-200 flex-shrink-0'>
          <Link to='/owner' onClick={closeSidebar}>
            <img src={assets.logo} alt="logo" className='h-8 sm:h-10' />
          </Link>
        </div>

        {/* Navigation Links */}
        <nav className='flex-1 p-3 sm:p-4 overflow-y-auto min-h-0'>
          <ul className='space-y-1.5 sm:space-y-2'>
            {ownerMenuLinks.map((link, index) => {
              const isActive = location.pathname === link.path || 
                              (link.path !== '/owner' && location.pathname.startsWith(link.path))
              
              return (
                <li key={index}>
                  <Link
                    to={link.path}
                    onClick={closeSidebar}
                    className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg transition-all ${
                      isActive
                        ? 'bg-primary text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <img 
                      src={isActive ? link.coloredIcon : link.icon} 
                      alt={link.name} 
                      className='w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0' 
                    />
                    <span className='font-medium text-sm sm:text-base'>{link.name}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Logout button below Manage Bookings with spacing */}
        <div className='p-3 sm:p-4 pt-4 sm:pt-6 border-t border-gray-200 flex-shrink-0'>
          <button
            onClick={handleLogout}
            className='w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-all shadow-sm'
          >
            Logout
          </button>
        </div>
      </div>
    </>
  )
}

export default OwnerSidebar

