import React, { useState, useEffect } from "react";
import { assets, menuLinks } from "../assets/assets";
import { Link, useLocation, useNavigate } from "react-router-dom";

const Navbar = ({setShowLogin}) => {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [navbarSearch, setNavbarSearch] = useState('')
  const role = user ? (typeof user.role === 'object' ? user.role.name : user.role) : null

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem('token')
      if (!token) {
        setLoading(false)
        return
      }

      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
        const response = await fetch(`${API_URL}/user/data`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        const data = await response.json()
        
        if (data.success || data.sucess) {
          setUser(data.user)
        }
      } catch (error) {
        console.error('Error fetching user:', error)
        localStorage.removeItem('token')
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [])

  useEffect(() => {
    if (!loading && role === 'owner' && !location.pathname.startsWith('/owner')) {
      navigate('/owner')
    }
  }, [loading, role, location.pathname, navigate])

  const handleLogout = () => {
    localStorage.removeItem('token')
    setUser(null)
    window.location.href = '/'
  }

  const handleNavbarSearch = (e) => {
    e.preventDefault()
    if (navbarSearch.trim()) {
      navigate(`/gowns?search=${encodeURIComponent(navbarSearch.trim())}`)
      setNavbarSearch('') // Clear search after navigation
    }
  }

  return (
    <div
      className={`flex items-center justify-between px-6 md:px-16 lg:px-24 xl:px-32 py-4 text-gray-600 border-b border-borderColor relative transition-all 
      ${location.pathname === "/" ? "bg-white" : "bg-white"}`}>

        <Link to="/">
          <img src={assets.logo} alt="logo" className="h-12" />
        </Link>
        <div
            className={`max-sm:fixed max-sm:h-screen max-sm:w-full max-sm:top-16 max-sm:border-t border-borderColor right-0 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-8 max-sm:p-4 transition-all duration-300 z-50 
            ${location.pathname === "/" ? "bg-white" : "bg-white"} 
            ${open ? "max-sm:translate-x-0" : "max-sm:translate-x-full"}`}>
            {menuLinks.map((link, index) => (
            <Link key={index} to={link.path}>
                {link.name}
            </Link>
            ))}
          <form onSubmit={handleNavbarSearch} className= "hidden lg:flex items-center text-sm gap-2 border border-borderColor px-3 rounded-full max-w-56">
          <input 
            type="text" 
            value={navbarSearch}
            onChange={(e) => setNavbarSearch(e.target.value)}
            className="py-1.5 w-full bg-transparent outline-none placeholder-500" 
            placeholder="Search Gown" 
          />
          <button type="submit" className="cursor-pointer">
            <img src={assets.search_icon} alt="search" />
          </button>
        </form>

            <div className="flex max-sm:flex-col items-start sm:items-center gap-6">
              {!loading && (
                <>
                  {user ? (
                    <>
                      {/* Show Dashboard button only for owners */}
                      {role === 'owner' && (
                        <button 
                          onClick={() => navigate('/owner')} 
                          className="cursor-pointer px-4 py-2 text-primary hover:text-primary-dull transition-all"
                        >
                          Dashboard
                        </button>
                      )}
                      
                      {/* User Info - Click to go to profile */}
                      <div 
                        onClick={() => navigate('/profile')}
                        className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-all"
                      >
                        <div className="text-right max-sm:text-left">
                          <p className="text-sm font-medium text-gray-700">{user.name}</p>
                          <p className="text-xs text-gray-500 capitalize">{role}</p>
                        </div>
                        {user.image ? (
                          <img 
                            src={user.image} 
                            alt={user.name}
                            className="w-10 h-10 rounded-full object-cover border-2 border-primary"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-semibold">
                            {user.name?.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      
                      <button 
                        onClick={handleLogout}
                        className="cursor-pointer px-4 py-2 text-gray-600 hover:text-red-600 transition-all text-sm"
                      >
                        Logout
                      </button>
                    </>
                  ) : (
                    <button 
                      onClick={() => setShowLogin(true)} 
                      className="cursor-pointer px-8 py-2 bg-primary hover:bg-primary-dull transition-all text-white rounded-full"
                    >
                      Login
                    </button>
                  )}
                </>
              )}
            </div>
      </div>
      <button
          onClick={() => setOpen(!open)}
          className="sm:hidden text-xl focus:outline-none">
          {open ? "✕" : "☰"}
        </button>
</div>
  );
};

export default Navbar;
