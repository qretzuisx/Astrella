import React, { useState } from 'react'
import Navbar from './components/navbar'
import LoginModal from './components/LoginModal'
import { Route, Routes, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import GownDetails from './pages/GownDetails'
import MyBookings from './pages/MyBookings'
import Gown from './pages/Gown'
import OwnerDashboard from './pages/OwnerDashboard'
import AddGown from './pages/AddGown'
import ManageGowns from './pages/ManageGowns'
import ManageBookings from './pages/ManageBookings'
import Recommendations from './pages/Recommendations'
import UserProfile from './pages/UserProfile'
import ShopProfile from './pages/ShopProfile'
import OwnerProfile from './pages/OwnerProfile'

import BottomNav from './components/BottomNav'
import ErrorBoundary from './components/ErrorBoundary'

const App = () => {
  const [ShowLogin, setShowLogin] = useState(false)
  const location = useLocation()
  const isOwnerPath = location.pathname.startsWith('/owner')
  
  return (
    <div className="flex flex-col min-h-screen">
      {!isOwnerPath && <Navbar setShowLogin={setShowLogin} />}
      <LoginModal showLogin={ShowLogin} setShowLogin={setShowLogin} />

      <main className="flex-1">
        <ErrorBoundary>
        <Routes>
          <Route path='/' element={<Home />} />
          <Route path='/gown-details/:id' element={<GownDetails />} />
          <Route path='/owner-profile/:ownerId' element={<OwnerProfile />} />
          <Route path='/gowns' element={<Gown />} />
          <Route path='/recommendations' element={<Recommendations />} />
          <Route path='/my-bookings' element={<MyBookings setShowLogin={setShowLogin} />} />
          <Route path='/profile' element={<UserProfile />} />
          <Route path='/owner' element={<OwnerDashboard />} />
          <Route path='/owner/shop-profile' element={<ShopProfile />} />
          <Route path='/owner/add-gown' element={<AddGown />} />
          <Route path='/owner/manage-gown' element={<ManageGowns />} />
          <Route path='/owner/manage-bookings' element={<ManageBookings />} />
        </Routes>
        </ErrorBoundary>
      </main>

      {!isOwnerPath && <BottomNav />}
      
      {/* Mobile spacing for BottomNav */}
      {!isOwnerPath && <div className="h-20 sm:hidden" />}
    </div>
  )
}

export default App