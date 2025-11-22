import React, { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { assets, ownerMenuLinks } from '../assets/assets'

const OwnerSidebar = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const [userRole, setUserRole] = useState(null)

  useEffect(() => {
    const fetchUserRole = async () => {
      const token = localStorage.getItem('token')
      if (!token) return

      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
        const response = await fetch(`${API_URL}/user/data`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        const data = await response.json()
        if (data.success || data.sucess) {
          const role = data.user ? (typeof data.user.role === 'object' ? data.user.role.name : data.user.role) : null
          setUserRole(role)
        }
      } catch (error) {
        console.error('Error fetching user role:', error)
      }
    }

    fetchUserRole()
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    navigate('/')
    window.location.reload()
  }

  return (
    <div className='w-64 min-h-screen bg-white border-r border-gray-200 flex flex-col'>
      {/* Logo */}
      <div className='p-6 border-b border-gray-200'>
        <Link to='/'>
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
          
          {/* Admin Only: Owner Requests */}
          {userRole === 'admin' && (
            <li>
              <Link
                to='/owner/admin/requests'
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  location.pathname === '/owner/admin/requests'
                    ? 'bg-primary text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' />
                </svg>
                <span className='font-medium'>Owner Requests</span>
              </Link>
            </li>
          )}
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

