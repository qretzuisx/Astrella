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
    <div className='px-4 sm:px-6 md:px-16 lg:px-24 xl:px-32 mt-12 sm:mt-16 mb-12 sm:mb-16'>
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className='flex items-center gap-2 mb-6 sm:mb-8 text-sm sm:text-base text-gray-500 cursor-pointer hover:text-gray-700 transition-colors'
      >
        <img src={assets.arrow_icon} alt="back" className='rotate-180 opacity-65' />
        <span>Back</span>
      </button>

      {/* Owner Header */}
      <div className='bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8'>
        <div className='flex flex-col md:flex-row gap-6'>
          {/* Shop Logo/Avatar */}
          <div className='flex-shrink-0'>
            <div className='w-24 h-24 rounded-full bg-primary text-white flex items-center justify-center text-3xl font-bold'>
              {owner.shopProfile?.shopName?.charAt(0) || owner.name?.charAt(0) || '?'}
            </div>
          </div>

          {/* Shop Info */}
          <div className='flex-1'>
            <div className='flex items-start justify-between'>
              <div>
                <h1 className='text-3xl font-bold text-gray-900 mb-2'>
                  {owner.shopProfile?.shopName || owner.name}
                </h1>
                {owner.shopProfile?.verified && (
                  <div className='inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold mb-3'>
                    <img src={assets.check_icon} alt="verified" className='w-4 h-4' />
                    Verified Business
                  </div>
                )}
                <p className='text-gray-600 mb-4'>
                  {owner.shopProfile?.description || 'Professional gown rental service'}
                </p>
              </div>
            </div>

            {/* Quick Info */}
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mt-4'>
              {owner.shopProfile?.address && (
                <div className='flex items-start gap-2'>
                  <img src={assets.location_icon_colored} alt="location" className='w-5 h-5 mt-1' />
                  <div>
                    <p className='text-sm text-gray-500'>Location</p>
                    <p className='text-gray-900 font-medium'>
                      {owner.shopProfile.address}, {owner.shopProfile.city}
                    </p>
                  </div>
                </div>
              )}

              {owner.contactNumber && (
                <div className='flex items-start gap-2'>
                  <svg className='w-5 h-5 text-gray-600 mt-1' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z' />
                  </svg>
                  <div>
                    <p className='text-sm text-gray-500'>Contact</p>
                    <p className='text-gray-900 font-medium'>{owner.contactNumber}</p>
                  </div>
                </div>
              )}

              {owner.shopProfile?.operatingHours && (
                <div className='flex items-start gap-2'>
                  <svg className='w-5 h-5 text-gray-600 mt-1' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' />
                  </svg>
                  <div>
                    <p className='text-sm text-gray-500'>Operating Hours</p>
                    <p className='text-gray-900 font-medium'>{formatOperatingHours(owner.shopProfile.operatingHours)}</p>
                  </div>
                </div>
              )}

              <div className='flex items-start gap-2'>
                <img src={assets.calendar_icon_colored} alt="joined" className='w-5 h-5 mt-1' />
                <div>
                  <p className='text-sm text-gray-500'>Member Since</p>
                  <p className='text-gray-900 font-medium'>{formatDate(owner.joinedDate)}</p>
                </div>
              </div>
            </div>

            {/* Social Media */}
            {owner.shopProfile?.socialMedia?.facebook && (
              <div className='flex gap-4 mt-4'>
                <a
                  href={owner.shopProfile.socialMedia.facebook}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='text-blue-600 hover:text-blue-700 font-medium text-sm'
                >
                  Facebook
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className='mb-8 border-b border-gray-200'>
        <div className='flex gap-8'>
          <button
            onClick={() => setActiveTab('about')}
            className={`pb-4 font-semibold transition-colors ${activeTab === 'about'
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-600 hover:text-gray-900'
              }`}
          >
            About
          </button>
          <button
            onClick={() => setActiveTab('gowns')}
            className={`pb-4 font-semibold transition-colors ${activeTab === 'gowns'
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-600 hover:text-gray-900'
              }`}
          >
            Apparel ({gowns.length})
          </button>
          {(owner.shopProfile?.businessPermit || owner.shopProfile?.dtiRegistration) && (
            <button
              onClick={() => setActiveTab('documents')}
              className={`pb-4 font-semibold transition-colors ${activeTab === 'documents'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              Business Documents
            </button>
          )}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'about' && (
        <div className='bg-white rounded-xl shadow-sm border border-gray-200 p-8'>
          <h2 className='text-2xl font-bold text-gray-900 mb-6'>About This Shop</h2>

          {owner.shopProfile?.description ? (
            <p className='text-gray-700 mb-6 leading-relaxed'>{owner.shopProfile.description}</p>
          ) : (
            <p className='text-gray-500 mb-6'>No description provided.</p>
          )}

          <div className='grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-gray-200'>
            <div>
              <h3 className='font-semibold text-gray-900 mb-2'>Total Apparel</h3>
              <p className='text-3xl font-bold text-primary'>{gowns.length}</p>
            </div>
            {owner.shopProfile?.verified && (
              <div>
                <h3 className='font-semibold text-gray-900 mb-2'>Business Status</h3>
                <div className='flex items-center gap-2 text-green-600'>
                  <img src={assets.check_icon} alt="verified" className='w-5 h-5' />
                  <span className='font-semibold'>Verified Business</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'gowns' && (
        <div>
          {gowns.length > 0 ? (
            <div className='grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6'>
              {gowns.map((gown) => (
                <GownCard key={gown._id || gown.id} gown={gown} />
              ))}
            </div>
          ) : (
            <div className='bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center'>
              <p className='text-gray-500 text-lg'>No apparel available at this time.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'documents' && (
        <div className='bg-white rounded-xl shadow-sm border border-gray-200 p-8'>
          <h2 className='text-2xl font-bold text-gray-900 mb-4'>Business Verification Documents</h2>
          <p className='text-gray-600 mb-6'>
            These documents verify the legitimacy of this business.
          </p>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            {/* Business Permit */}
            {owner.shopProfile?.businessPermit && (
              <div className='border border-gray-300 rounded-lg p-4'>
                <h3 className='font-semibold text-gray-900 mb-3'>Business Permit</h3>
                <div className='border border-gray-200 rounded-lg overflow-hidden'>
                  {owner.shopProfile.businessPermit.toLowerCase().endsWith('.pdf') ? (
                    <div className='flex items-center justify-center h-64 bg-gray-50'>
                      <div className='text-center'>
                        <svg className='w-16 h-16 mx-auto text-gray-400 mb-2' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z' />
                        </svg>
                        <p className='text-gray-600 font-medium mb-3'>PDF Document</p>
                        <a
                          href={owner.shopProfile.businessPermit}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='inline-block px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dull transition-colors text-sm'
                        >
                          View Document
                        </a>
                      </div>
                    </div>
                  ) : (
                    <a
                      href={owner.shopProfile.businessPermit}
                      target='_blank'
                      rel='noopener noreferrer'
                    >
                      <img
                        src={owner.shopProfile.businessPermit}
                        alt='Business Permit'
                        className='w-full h-auto max-h-96 object-contain cursor-pointer hover:opacity-90 transition-opacity'
                      />
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* DTI Registration */}
            {owner.shopProfile?.dtiRegistration && (
              <div className='border border-gray-300 rounded-lg p-4'>
                <h3 className='font-semibold text-gray-900 mb-3'>DTI Registration</h3>
                <div className='border border-gray-200 rounded-lg overflow-hidden'>
                  {owner.shopProfile.dtiRegistration.toLowerCase().endsWith('.pdf') ? (
                    <div className='flex items-center justify-center h-64 bg-gray-50'>
                      <div className='text-center'>
                        <svg className='w-16 h-16 mx-auto text-gray-400 mb-2' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z' />
                        </svg>
                        <p className='text-gray-600 font-medium mb-3'>PDF Document</p>
                        <a
                          href={owner.shopProfile.dtiRegistration}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='inline-block px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dull transition-colors text-sm'
                        >
                          View Document
                        </a>
                      </div>
                    </div>
                  ) : (
                    <a
                      href={owner.shopProfile.dtiRegistration}
                      target='_blank'
                      rel='noopener noreferrer'
                    >
                      <img
                        src={owner.shopProfile.dtiRegistration}
                        alt='DTI Registration'
                        className='w-full h-auto max-h-96 object-contain cursor-pointer hover:opacity-90 transition-opacity'
                      />
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default OwnerProfile
