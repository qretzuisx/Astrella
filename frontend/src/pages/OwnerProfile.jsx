import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { assets } from '../assets/assets'
import { API_URL, CURRENCY } from '../config'
import GownCard from '../components/GownCard'

const OwnerProfile = () => {
  const { ownerId } = useParams()
  const navigate = useNavigate()
  const [owner, setOwner] = useState(null)
  const [gowns, setGowns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('about') // about, gowns, documents
  const currency = CURRENCY

  useEffect(() => {
    fetchOwnerProfile()
    fetchOwnerGowns()
  }, [ownerId])

  const fetchOwnerProfile = async () => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
      const response = await fetch(`${API_URL}/user/shop-profile/${ownerId}`)
      const data = await response.json()
      console.log('[DEBUG OwnerProfile] API response:', data)

      if (data.success) {
        // API returns shopProfile and ownerName, not 'owner' - construct the owner object
        setOwner({
          shopProfile: data.shopProfile,
          name: data.ownerName,
          email: data.ownerEmail,
          contactNumber: data.ownerContactNumber,
          createdAt: data.memberSince
        })
      } else {
        setError(data.message || 'Owner not found')
      }
    } catch (error) {
      console.error('Error fetching owner profile:', error)
      setError('Failed to load owner profile')
    } finally {
      setLoading(false)
    }
  }

  const fetchOwnerGowns = async () => {
    try {
      const response = await fetch(`${API_URL}/owner/all-gowns`)
      const data = await response.json()

      if (data.success && data.gowns) {
        // Filter gowns by this owner (support both MongoDB and SQL)
        const ownerGowns = data.gowns.filter(gown =>
          gown.owner === ownerId || gown.owner?._id === ownerId || gown.owner?.id == ownerId
        )
        setGowns(ownerGowns)
      }
    } catch (error) {
      console.error('Error fetching owner gowns:', error)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    })
  }

  const formatOperatingHours = (hoursString) => {
    if (!hoursString) return 'N/A'

    // Handle format like "09:00-17:00" or "09:00 - 17:00"
    const parts = hoursString.split('-').map(t => t.trim())
    if (parts.length !== 2) return hoursString

    const convertTo12Hour = (timeStr) => {
      const [hours, minutes] = timeStr.split(':').map(Number)
      if (isNaN(hours) || isNaN(minutes)) return timeStr

      const period = hours >= 12 ? 'PM' : 'AM'
      const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
      return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
    }

    return `${convertTo12Hour(parts[0])} - ${convertTo12Hour(parts[1])}`
  }

  if (loading) {
    return (
      <div className='min-h-screen flex items-center justify-center px-4'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-primary mx-auto mb-4'></div>
          <p className='text-lg sm:text-xl text-gray-500'>Loading shop profile...</p>
        </div>
      </div>
    )
  }

  if (error || !owner) {
    return (
      <div className='min-h-screen flex items-center justify-center px-4'>
        <div className='text-center'>
          <p className='text-lg sm:text-xl text-gray-500 mb-4'>{error || 'Owner not found'}</p>
          <button
            onClick={() => navigate('/gowns')}
            className='px-5 sm:px-6 py-2 text-sm sm:text-base bg-primary text-white rounded-lg hover:bg-primary-dull transition-colors'
          >
            Back to Apparel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-[#FDFDFF] pb-20'>
      {/* Hero Header Section */}
      <div className='relative w-full h-[300px] sm:h-[400px] overflow-hidden'>
        <div className='absolute inset-0 bg-primary/5'>
          <div className='absolute inset-0 bg-gradient-to-b from-primary/20 via-transparent to-[#FDFDFF]'></div>
        </div>
        
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className='absolute top-8 left-6 md:left-16 lg:left-24 xl:left-32 z-20 flex items-center gap-2 px-4 py-2 bg-white/40 backdrop-blur-md rounded-full text-xs font-black uppercase tracking-widest text-primary border border-white/40 hover:bg-white hover:shadow-lg transition-all active:scale-95'
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Back</span>
        </button>

        <div className='absolute inset-0 flex flex-col items-center justify-center text-center px-4'>
          <div className='w-24 h-24 sm:w-32 sm:h-32 rounded-[40px] bg-white shadow-[0_20px_50px_rgba(1,62,141,0.15)] flex items-center justify-center text-4xl sm:text-5xl font-black text-primary border-4 border-white mb-6 animate-fade-in'>
            {owner.shopProfile?.shopName?.charAt(0) || owner.name?.charAt(0) || '?'}
          </div>
          <div className="animate-fade-in-up">
            <h1 className='text-4xl sm:text-6xl font-black text-primary tracking-tighter mb-2'>
              {owner.shopProfile?.shopName || owner.name}
            </h1>
            {owner.shopProfile?.verified && (
              <div className="flex flex-col items-center gap-3">
                <div className='inline-flex items-center gap-2 px-4 py-1.5 bg-green-500/10 backdrop-blur-md border border-green-500/20 text-green-600 rounded-full text-[10px] font-black uppercase tracking-widest'>
                  <img src={assets.check_icon} alt="verified" className='w-3.5 h-3.5' />
                  Verified Partner
                </div>
                {/* Logo Accents */}
                <div className="flex gap-1.5">
                  <div className="w-6 h-1 rounded-full bg-[#FF3B30]"></div>
                  <div className="w-6 h-1 rounded-full bg-[#007AFF]"></div>
                  <div className="w-6 h-1 rounded-full bg-[#FFCC00]"></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className='max-w-7xl mx-auto px-6 md:px-16 lg:px-24 xl:px-32 -mt-12 relative z-10'>
        {/* Main Content Container */}
        <div className='bg-white/40 backdrop-blur-3xl rounded-[40px] shadow-[0_40px_100px_rgba(1,62,141,0.08)] border border-white/60 p-8 sm:p-12'>
          
          {/* Custom Navigation Tab Bar */}
          <div className='flex flex-wrap items-center justify-center gap-4 sm:gap-8 mb-12 bg-white/50 p-2 rounded-[32px] w-fit mx-auto border border-white/80 shadow-inner'>
            {[
              { id: 'about', label: 'About' },
              { id: 'gowns', label: `Apparel (${gowns.length})` },
              { id: 'documents', label: 'Credentials', hide: !(owner.shopProfile?.businessPermit || owner.shopProfile?.dtiRegistration) }
            ].filter(t => !t.hide).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-8 py-3.5 rounded-[24px] text-[11px] font-black uppercase tracking-widest transition-all ${
                  activeTab === tab.id 
                  ? 'bg-primary text-white shadow-xl shadow-primary/20 scale-105' 
                  : 'text-primary/40 hover:text-primary hover:bg-white/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content with Fade Animation */}
          <div className='animate-fade-in-up'>
            {activeTab === 'about' && (
              <div className='grid grid-cols-1 lg:grid-cols-3 gap-12'>
                <div className='lg:col-span-2 space-y-8'>
                  <div>
                    <h2 className='text-[10px] font-black text-[#007AFF] uppercase tracking-[0.4em] mb-4'>Professional Description</h2>
                    <p className='text-lg sm:text-xl text-primary/80 leading-relaxed font-bold'>
                      {owner.shopProfile?.description || 'This partner hasn\'t provided a detailed description yet, but they offer high-quality apparel services.'}
                    </p>
                  </div>
                  
                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-6'>
                    <div className='p-8 rounded-[32px] bg-white/60 border border-white/80 shadow-sm'>
                      <h3 className='text-[10px] font-black text-[#FF3B30] uppercase tracking-widest mb-4'>Total Collection</h3>
                      <p className='text-4xl font-black text-primary'>{gowns.length}</p>
                      <p className='text-xs text-primary/40 font-bold mt-1'>Selected Items</p>
                    </div>
                    <div className='p-8 rounded-[32px] bg-white/60 border border-white/80 shadow-sm'>
                      <h3 className='text-[10px] font-black text-[#FF3B30] uppercase tracking-widest mb-4'>Member Since</h3>
                      <p className='text-4xl font-black text-primary'>{formatDate(owner.createdAt)}</p>
                      <p className='text-xs text-primary/40 font-bold mt-1'>Exclusive Partner</p>
                    </div>
                  </div>
                </div>

                <div className='space-y-6'>
                  <div className='p-8 rounded-[40px] bg-primary text-white shadow-2xl shadow-primary/20'>
                    <h3 className='text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-6'>Contact Details</h3>
                    <div className='space-y-6'>
                      {owner.shopProfile?.address && (
                        <div className='flex gap-4'>
                          <div className='w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center shrink-0 border border-white/10'>
                            <svg className='w-5 h-5 text-white' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z' />
                              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M15 11a3 3 0 11-6 0 3 3 0 016 0z' />
                            </svg>
                          </div>
                          <div>
                            <p className='text-[10px] font-black text-[#FFCC00] uppercase tracking-widest mb-1'>Location</p>
                            <p className='text-sm font-bold leading-snug'>{owner.shopProfile.address}, {owner.shopProfile.city}</p>
                          </div>
                        </div>
                      )}
                      {owner.contactNumber && (
                        <div className='flex gap-4'>
                          <div className='w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center shrink-0'>
                            <svg className='w-5 h-5 text-white' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z' />
                            </svg>
                          </div>
                          <div>
                            <p className='text-[10px] font-black text-[#FFCC00] uppercase tracking-widest mb-1'>Phone</p>
                            <p className='text-sm font-bold'>{owner.contactNumber}</p>
                          </div>
                        </div>
                      )}
                      {owner.shopProfile?.operatingHours && (
                        <div className='flex gap-4'>
                          <div className='w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center shrink-0'>
                            <svg className='w-5 h-5 text-white' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' />
                            </svg>
                          </div>
                          <div>
                            <p className='text-[10px] font-black text-[#FFCC00] uppercase tracking-widest mb-1'>Available Hours</p>
                            <p className='text-sm font-bold'>{formatOperatingHours(owner.shopProfile.operatingHours)}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {owner.shopProfile?.socialMedia?.facebook && (
                    <a 
                      href={owner.shopProfile.socialMedia.facebook}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='block w-full py-4 bg-white border border-blue-50 text-center rounded-2xl text-[10px] font-black uppercase tracking-widest text-primary hover:bg-gray-50 transition-all shadow-sm'
                    >
                      Follow on Facebook
                    </a>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'gowns' && (
              <div className='grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8'>
                {gowns.length > 0 ? (
                  gowns.map((gown) => (
                    <GownCard key={gown._id || gown.id} gown={gown} />
                  ))
                ) : (
                  <div className='col-span-full py-20 text-center bg-white/20 rounded-[40px] border border-white/40'>
                    <p className='text-primary/40 font-black uppercase tracking-widest'>No collection items listed yet</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'documents' && (
              <div className='max-w-4xl mx-auto'>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
                  {[
                    { label: 'Business Permit', file: owner.shopProfile.businessPermit },
                    { label: 'DTI Registration', file: owner.shopProfile.dtiRegistration }
                  ].filter(doc => doc.file).map((doc, idx) => (
                    <div key={idx} className='group'>
                      <h3 className='text-[10px] font-black text-[#FF3B30] uppercase tracking-[0.3em] mb-4 pl-2'>{doc.label}</h3>
                      <div className='bg-white rounded-[32px] overflow-hidden border border-gray-100 shadow-xl shadow-primary/5 group-hover:shadow-2xl transition-all duration-500'>
                        {doc.file.toLowerCase().endsWith('.pdf') ? (
                          <div className='aspect-[4/5] flex flex-col items-center justify-center bg-gray-50/50 p-8 text-center'>
                            <div className='w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6'>
                              <svg className='w-8 h-8 text-primary' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                              </svg>
                            </div>
                            <p className='text-xs font-black text-primary uppercase tracking-widest mb-6'>Document Ready</p>
                            <a 
                              href={doc.file}
                              target='_blank' 
                              rel='noopener noreferrer'
                              className='px-8 py-3 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary-dull transition-all shadow-lg'
                            >
                              Open PDF
                            </a>
                          </div>
                        ) : (
                          <div className='relative aspect-[4/5] bg-gray-100 overflow-hidden'>
                            <img src={doc.file} alt={doc.label} className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-700' />
                            <a 
                              href={doc.file}
                              target='_blank' 
                              rel='noopener noreferrer'
                              className='absolute inset-0 bg-primary/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center'
                            >
                              <span className='px-6 py-2 bg-white text-primary rounded-full text-[10px] font-black uppercase tracking-widest'>View Original</span>
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default OwnerProfile
