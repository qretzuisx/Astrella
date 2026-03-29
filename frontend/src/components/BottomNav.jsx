import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { assets } from '../assets/assets'

const BottomNav = () => {
  const location = useLocation()

  const navItems = [
    { name: 'Home', path: '/', icon: 'home' },
    { name: 'Apparel', path: '/gowns', icon: 'apparel' },
    { name: 'My Bookings', path: '/my-bookings', icon: 'calendar' },
    { name: 'Profile', path: '/profile', icon: 'user' }
  ]

  // Render SVG icons for a consistent modern look
  const renderIcon = (type, isActive) => {
    const color = isActive ? '#fbbf24' : '#6b7280' // Gold or gray-500

    switch (type) {
      case 'home':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        )
      case 'apparel':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        )
      case 'sparkles':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
        )
      case 'calendar':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        )
      case 'user':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        )
      default:
        return null
    }
  }

  return (
    <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-2xl border-t border-gray-100/50 z-[100] pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.08)] rounded-t-[32px] interactive-none">
      <div className="flex justify-around items-center h-16 sm:h-20 px-6">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path
          return (
            <NavLink
              key={item.name}
              to={item.path}
              onClick={(e) => {
                if (location.pathname === item.path) {
                  e.preventDefault()
                }
              }}
              className="flex flex-col items-center justify-center w-full h-full space-y-1 relative group touch-target"
            >
              <div className={`p-2 rounded-2xl transition-all duration-500 transform ${isActive ? 'bg-primary/5 text-primary scale-110 shadow-sm' : 'text-gray-400 group-hover:text-primary active:scale-90'}`}>
                {renderIcon(item.icon, isActive)}
              </div>
              <span className={`text-[9.5px] font-semibold uppercase tracking-widest transition-all duration-300 ${isActive ? 'text-primary opacity-100 scale-100' : 'text-gray-400 opacity-70 scale-95'}`}>
                {item.name}
              </span>

              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-primary rounded-full animate-pulse shadow-[0_0_10px_rgba(22,43,105,0.4)]"></div>
              )}
            </NavLink>
          )
        })}
      </div>
    </div>
  )
}

export default BottomNav
