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
      {/* Mobile Menu Button - More Premium Feel */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`lg:hidden fixed top-5 ${isOpen ? 'right-5' : 'left-5'} z-[60] p-2.5 bg-white rounded-xl shadow-lg border border-gray-100 text-primary transition-all duration-300`}
      >
        <svg className='w-6 h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          {isOpen ? (
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M6 18L18 6M6 6l12 12' />
          ) : (
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M4 6h16M4 12h16M4 18h16' />
          )}
        </svg>
      </button>

      {/* Overlay for mobile with Blur */}
      {isOpen && (
        <div 
          className='lg:hidden fixed inset-0 bg-primary-dull/40 backdrop-blur-md z-50 transition-opacity duration-300'
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar - sticky on desktop */}
      <div className={`
        fixed lg:sticky lg:top-0 inset-y-0 left-0 z-50 self-start
        w-72 sm:w-80 lg:w-64 h-screen lg:max-h-screen bg-white/95 lg:bg-white/80 backdrop-blur-2xl border-r border-gray-100/50 flex flex-col
        shadow-2xl lg:shadow-none transform transition-transform duration-500 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo Section */}
        <div className='p-8 lg:p-6 mb-2 flex-shrink-0'>
          <Link to='/owner' onClick={closeSidebar} className="block transition-transform hover:scale-105">
            <img src={assets.logo} alt="logo" className='h-10 sm:h-12 w-auto' />
          </Link>
          <div className="mt-6 lg:mt-4 px-1">
            <div className="h-px w-full bg-gradient-to-r from-primary/20 via-primary/5 to-transparent"></div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className='flex-1 p-4 overflow-y-auto hide-scrollbar'>
          <p className="px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Main Menu</p>
          <ul className='space-y-1.5'>
            {ownerMenuLinks.map((link, index) => {
              const isActive = location.pathname === link.path || 
                               (link.path !== '/owner' && location.pathname.startsWith(link.path))
              
              return (
                <li key={index}>
                  <Link
                    to={link.path}
                    onClick={closeSidebar}
                    className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 relative group ${
                      isActive
                        ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-primary active:scale-95'
                    }`}
                  >
                    <div className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-300 ${isActive ? 'bg-white/20' : 'bg-primary/5 group-hover:bg-primary/10'}`}>
                      <img 
                        src={isActive ? link.coloredIcon : link.icon} 
                        alt={link.name} 
                        className={`w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 transition-all ${isActive ? 'brightness-0 invert' : 'opacity-60 group-hover:opacity-100'}`} 
                      />
                    </div>
                    <span className='font-black text-sm uppercase tracking-wide'>{link.name}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Footer / Logout */}
        <div className='p-5 mt-auto flex-shrink-0'>
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
            <button
              onClick={handleLogout}
              className='w-full flex items-center justify-center gap-2 py-3 px-4 bg-white text-red-600 border border-red-50 hover:bg-red-50 hover:border-red-100 active:scale-95 rounded-xl font-bold text-sm sm:text-base transition-all shadow-sm'
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          </div>
          <p className="mt-4 text-center text-[10px] text-gray-400 font-medium">Astrella Owner v1.0</p>
        </div>
      </div>
    </>
  )
}

export default OwnerSidebar

