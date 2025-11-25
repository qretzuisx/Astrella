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
import OwnerRequest from './pages/OwnerRequest'
import AdminOwnerRequests from './pages/AdminOwnerRequests'
import UserProfile from './pages/UserProfile'

const App = () => {
  const [ShowLogin, setShowLogin] = useState(false)
  const isOwnerPath = useLocation().pathname.startsWith('/owner')
  return (
    <>
      {!isOwnerPath && <Navbar setShowLogin={setShowLogin}/>}
      <LoginModal showLogin={ShowLogin} setShowLogin={setShowLogin} />

      <Routes>
        <Route path='/' element={<Home/>}/>
        <Route path='/gown-details/:id' element={<GownDetails/>}/> 
        <Route path='/gowns' element={<Gown/>}/>
        <Route path='/recommendations' element={<Recommendations/>}/>
        <Route path='/my-bookings' element={<MyBookings/>}/> 
        <Route path='/profile' element={<UserProfile/>}/>
        <Route path='/request-owner' element={<OwnerRequest/>}/>
        <Route path='/owner' element={<OwnerDashboard/>}/>
        <Route path='/owner/add-gown' element={<AddGown/>}/>
        <Route path='/owner/manage-gown' element={<ManageGowns/>}/>
        <Route path='/owner/manage-bookings' element={<ManageBookings/>}/>
        <Route path='/owner/admin/requests' element={<AdminOwnerRequests/>}/>
      </Routes>
    </>
  )
}

export default App