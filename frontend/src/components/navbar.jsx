import React, { useState, useEffect } from "react";
import { assets, menuLinks } from "../assets/assets";
import { API_URL } from "../config";
import { Link, useLocation, useNavigate } from "react-router-dom";

const Navbar = ({ setShowLogin }) => {
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
      className={`sticky top-0 z-50 flex items-center justify-between px-4 sm:px-6 md:px-16 lg:px-24 xl:px-32 py-3 sm:py-4 text-gray-700 transition-all border-b border-gray-100/50 bg-white/60 backdrop-blur-3xl shadow-sm pt-safe touch-target`}>

      <Link to="/" className="flex items-center">
        <img src={assets.logo} alt="logo" className="h-8 sm:h-12 w-auto object-contain" />
      </Link>
      <div
        className="hidden sm:flex flex-row items-center gap-4 sm:gap-8 transition-all duration-300 z-50">
        {menuLinks.map((link, index) => {
          const isActive = location.pathname === link.path
          return (
            <Link
              key={index}
              to={link.path}
              className={`transition-all duration-300 text-sm font-bold tracking-tight px-1 py-1 relative group ${isActive ? "text-primary" : "text-gray-500 hover:text-primary"}`}
            >
              {link.name}
              <div className={`absolute bottom-0 left-0 h-0.5 bg-secondary-light transition-all duration-500 rounded-full ${isActive ? "w-full" : "w-0 group-hover:w-full"}`}></div>
            </Link>
          )
        })}
        {location.pathname !== '/gowns' && (
          <form
            onSubmit={handleNavbarSearch}
            className="hidden lg:flex items-center text-sm gap-2 px-4 py-1.5 rounded-full max-w-56 bg-white/50 backdrop-blur-md border border-gray-200 focus-within:border-primary/40 focus-within:bg-white focus-within:shadow-lg transition-all"
          >
            <input
              type="text"
              value={navbarSearch}
              onChange={(e) => setNavbarSearch(e.target.value)}
              className="w-full bg-transparent outline-none placeholder:text-gray-400 font-medium"
              placeholder="Search Gown..."
            />
            <button type="submit" className="cursor-pointer opacity-40 hover:opacity-100 transition-opacity">
              <img src={assets.search_icon} alt="search" className="w-4 h-4" />
            </button>
          </form>
        )}

        <div className="flex items-center gap-6">
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
                    className="flex items-center gap-3 cursor-pointer group transition-all"
                  >
                    <div className="text-right hidden xl:block">
                      <p className="text-[13px] font-black text-primary leading-tight group-hover:text-secondary transition-colors">
                        {role === 'owner' && user.shopProfile?.shopName
                          ? user.shopProfile.shopName
                          : user.name}
                      </p>
                      <p className="text-[9px] text-secondary font-black uppercase tracking-[0.15em] mt-0.5">{role}</p>
                    </div>
                    {user.image ? (
                      <div className="relative">
                        <img
                          src={user.image}
                          alt={role === 'owner' && user.shopProfile?.shopName ? user.shopProfile.shopName : user.name}
                          className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-md group-hover:border-primary/20 transition-all"
                        />
                        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-dull text-white flex items-center justify-center font-bold shadow-lg border-2 border-white group-hover:scale-105 transition-all">
                        {(role === 'owner' && user.shopProfile?.shopName
                          ? user.shopProfile.shopName
                          : user.name)?.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleLogout}
                    className="cursor-pointer px-3 py-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all text-[11px] font-black uppercase tracking-wider"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShowLogin(true)}
                  className="cursor-pointer px-8 py-2.5 bg-primary hover:bg-primary-dull transition-all text-white rounded-full font-black text-sm shadow-[0_10px_20px_rgba(22,43,105,0.2)] active:scale-95"
                >
                  Login
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Mobile Right Section (Login/Avatar) */}
      <div className="sm:hidden flex items-center gap-3">
        {!loading && !user && (
          <button
            onClick={() => setShowLogin(true)}
            className="px-6 py-2 bg-primary text-white rounded-full font-black text-xs uppercase tracking-widest shadow-md"
          >
            Login
          </button>
        )}
      </div>
    </div>
  );
};

export default Navbar;
