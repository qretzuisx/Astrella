import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { assets, ownerMenuLinks } from '../assets/assets'

const OwnerSidebar = () => {
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = () => {
    localStorage.removeItem('token')
    navigate('/')
    window.location.reload()
  }

  return (
    <div className='w-64 min-h-screen bg-white border-r border-gray-200 flex flex-col'>
      {/* Logo */}
      <div className='p-6 border-b border-gray-200'>
        <Link to='/owner'>
          <img src={assets.logo} alt="logo" className='h-10' />
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className='flex-1 p-4'>
        <ul className='space-y-2'>
          {ownerMenuLinks.map((link, index) => {
            const isActive = location.pathname === link.path || 
                            (link.path !== '/owner' && location.pathname.startsWith(link.path))
            
            return (
              <li key={index}>
                <Link
                  to={link.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    isActive
                      ? 'bg-primary text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <img 
                    src={isActive ? link.coloredIcon : link.icon} 
                    alt={link.name} 
                    className='w-5 h-5' 
                  />
                  <span className='font-medium'>{link.name}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Logout Button */}
      <div className='p-4 border-t border-gray-200'>
        <button
          onClick={handleLogout}
          className='w-full px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-all font-medium'
        >
          Logout
        </button>
      </div>
    </div>
  )
}

export default OwnerSidebar

