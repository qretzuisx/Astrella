import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_URL } from '../config'
import OwnerSidebar from '../components/OwnerSidebar'

const ShopProfile = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [shopProfile, setShopProfile] = useState({
    shopName: '',
    description: '',
    address: '',
    city: '',
    contactNumber: '',
    operatingHours: '',
    facebook: ''
  })
  const [businessPermit, setBusinessPermit] = useState(null)
  const [dtiRegistration, setDtiRegistration] = useState(null)
  const [permitPreview, setPermitPreview] = useState('')
  const [dtiPreview, setDtiPreview] = useState('')
  const [uploading, setUploading] = useState(false)
  const [operatingHoursOpen, setOperatingHoursOpen] = useState('09:00')
  const [operatingHoursClose, setOperatingHoursClose] = useState('19:00')
  const [availableDays, setAvailableDays] = useState([
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
  ])

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

  const toggleDay = (day) => {
    setAvailableDays(prev => {
      if (prev.includes(day)) {
        return prev.filter(d => d !== day)
      } else {
        return [...prev, day]
      }
    })
  }

  useEffect(() => {
    fetchShopProfile()
  }, [])

  const fetchShopProfile = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        navigate('/')
        return
      }

      const response = await fetch(`${API_URL}/user/data`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (data.success && data.user) {
        // SQL Backend: data is flat (shopName, shopDescription, etc.)
        // MongoDB Backend: data is nested in shopProfile object
        // Support both structures for compatibility

        const user = data.user
        const isFlat = user.shopName !== undefined // SQL backend structure

        setShopProfile({
          shopName: isFlat ? (user.shopName || '') : (user.shopProfile?.shopName || ''),
          description: isFlat ? (user.shopDescription || '') : (user.shopProfile?.description || ''),
          address: isFlat ? (user.shopAddress || '') : (user.shopProfile?.address || ''),
          city: isFlat ? (user.shopCity || '') : (user.shopProfile?.city || ''),
          contactNumber: isFlat ? (user.shopContactNumber || user.contactNumber || '') : (user.shopProfile?.contactNumber || user.contactNumber || ''),
          operatingHours: isFlat ? (user.operatingHours || '') : (user.shopProfile?.operatingHours || ''),
          facebook: isFlat ? (user.facebookUrl || '') : (user.shopProfile?.socialMedia?.facebook || '')
        })

        // Set existing documents (check both structures)
        const businessPermit = isFlat ? user.businessPermit : user.shopProfile?.businessPermit
        const dtiRegistration = isFlat ? user.dtiRegistration : user.shopProfile?.dtiRegistration

        if (businessPermit) {
          setPermitPreview(businessPermit)
        }
        if (dtiRegistration) {
          setDtiPreview(dtiRegistration)
        }

        // Parse operating hours "HH:MM-HH:MM" into open/close for time inputs
        // Try to get openingTime/closingTime from separate fields first (MongoDB)
        const shopProfileData = isFlat ? {} : (user.shopProfile || {})
        if (shopProfileData.openingTime) {
          setOperatingHoursOpen(shopProfileData.openingTime)
        } else {
          const oh = isFlat ? (user.operatingHours || '') : (user.shopProfile?.operatingHours || '')
          const match = String(oh).trim().match(/^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/)
          if (match) {
            setOperatingHoursOpen(`${match[1].padStart(2, '0')}:${match[2]}`)
          }
        }

        if (shopProfileData.closingTime) {
          setOperatingHoursClose(shopProfileData.closingTime)
        } else {
          const oh = isFlat ? (user.operatingHours || '') : (user.shopProfile?.operatingHours || '')
          const match = String(oh).trim().match(/^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/)
          if (match) {
            setOperatingHoursClose(`${match[3].padStart(2, '0')}:${match[4]}`)
          }
        }

        // Load available days
        const available = isFlat ? (user.availableDays || []) : (user.shopProfile?.availableDays || [])
        if (available.length > 0) {
          setAvailableDays(available)
        }
      }
    } catch (error) {
      console.error('Error fetching shop profile:', error)
      setError('Failed to load shop profile')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setShopProfile(prev => ({ ...prev, [name]: value }))
    setError('')
    
    // Clear field error when user corrects it
    if (name === 'contactNumber') {
      if (value === '') {
        setFieldErrors(prev => ({ ...prev, contactNumber: '' }))
      } else if (/^\d{11}$/.test(value)) {
        setFieldErrors(prev => ({ ...prev, contactNumber: '' }))
      }
    }
  }

  const validatePhoneNumber = (phone) => {
    return /^\d{11}$/.test(phone)
  }

  const handleFileChange = (e, type) => {
    const file = e.target.files[0]
    if (!file) return

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf']
    if (!validTypes.includes(file.type)) {
      setError('Please upload a PNG, JPG, or PDF file')
      return
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB')
      return
    }

    if (type === 'permit') {
      setBusinessPermit(file)
      // Create preview for images only
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onloadend = () => setPermitPreview(reader.result)
        reader.readAsDataURL(file)
      } else {
        setPermitPreview('PDF document selected')
      }
    } else if (type === 'dti') {
      setDtiRegistration(file)
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onloadend = () => setDtiPreview(reader.result)
        reader.readAsDataURL(file)
      } else {
        setDtiPreview('PDF document selected')
      }
    }
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')
    setFieldErrors({})

    // Validate phone number before submission
    if (shopProfile.contactNumber && !validatePhoneNumber(shopProfile.contactNumber)) {
      setFieldErrors({ contactNumber: 'Phone number must be exactly 11 digits' })
      setSaving(false)
      return
    }



    try {
      const token = localStorage.getItem('token')
      // Create FormData for file uploads
      const formData = new FormData()
      formData.append('shopName', shopProfile.shopName)
      formData.append('description', shopProfile.description)
      formData.append('address', shopProfile.address)
      formData.append('city', shopProfile.city)
      formData.append('contactNumber', shopProfile.contactNumber)
      formData.append('operatingHours', `${operatingHoursOpen}-${operatingHoursClose}`)
      formData.append('openingTime', operatingHoursOpen)
      formData.append('closingTime', operatingHoursClose)
      formData.append('availableDays', JSON.stringify(availableDays))
      formData.append('facebook', shopProfile.facebook)

      // Append files if selected
      if (businessPermit) {
        formData.append('businessPermit', businessPermit)
      }
      if (dtiRegistration) {
        formData.append('dtiRegistration', dtiRegistration)
      }

      const response = await fetch(`${API_URL}/user/shop-profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('Shop profile updated successfully!')
        setFieldErrors({})
        setTimeout(() => setSuccess(''), 3000)
        // Update operating hours from response so they don't revert before refetch
        const oh = data.shopProfile?.operatingHours || ''
        const match = String(oh).trim().match(/^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/)
        if (match) {
          setOperatingHoursOpen(`${match[1].padStart(2, '0')}:${match[2]}`)
          setOperatingHoursClose(`${match[3].padStart(2, '0')}:${match[4]}`)
        }
        // Refresh to show uploaded documents
        fetchShopProfile()
      } else {
        // Parse error message to extract field-specific errors
        if (data.message && data.message.includes('contactNumber')) {
          setFieldErrors({ contactNumber: 'Phone number must be exactly 11 digits' })
          setError('Please fix the phone number error below')
        } else {
          setError(data.message || 'Failed to update shop profile')
        }
      }
    } catch (error) {
      console.error('Error updating shop profile:', error)
      setError('An error occurred. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className='flex min-h-screen'>
        <OwnerSidebar />
        <div className='flex-1 flex items-center justify-center'>
          <div className='text-center'>
            <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4'></div>
            <p className='text-xl text-gray-500'>Loading shop profile...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='flex min-h-screen bg-[#FDFDFF]'>
      <OwnerSidebar />

      <div className='flex-1 p-4 sm:p-8 lg:p-12 overflow-y-auto'>
        <div className='max-w-4xl mx-auto'>
          {/* Header */}
          <div className='mb-12 mt-8 lg:mt-0'>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-1 bg-primary rounded-full"></div>
              <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Management</span>
            </div>
            <h1 className='text-4xl font-black text-primary tracking-tight'>Shop Profile</h1>
            <p className='text-gray-500 font-bold mt-2'>
              Your identity at Astrella. Set up your shop details to build trust with your clients.
            </p>
          </div>

          {/* Success/Error Messages */}
          {success && (
            <div className='mb-8 p-4 bg-green-50 border border-green-100 rounded-2xl animate-fade-in'>
              <p className='text-green-800 font-bold flex items-center gap-2'>
                 <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
                 {success}
              </p>
            </div>
          )}

          {error && (
            <div className='mb-8 p-4 bg-red-50 border border-red-100 rounded-2xl animate-shake'>
              <p className='text-red-800 font-bold flex items-center gap-2'>
                 <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"></path></svg>
                 {error}
              </p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className='bg-white/40 backdrop-blur-3xl rounded-[40px] shadow-[0_30px_100px_rgba(1,62,141,0.08)] border border-white p-6 sm:p-10 space-y-10'>
            
            {/* Basic Info */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 px-2">
                <div className="w-1.5 h-6 bg-secondary rounded-full"></div>
                <h3 className="text-sm font-black text-primary uppercase tracking-widest">General Information</h3>
              </div>
              
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-primary/40 uppercase tracking-widest ml-4">Shop Name *</label>
                  <input
                    type='text'
                    name='shopName'
                    value={shopProfile.shopName}
                    onChange={handleInputChange}
                    placeholder='e.g., Elegant Gowns Manila'
                    required
                    className='w-full px-6 py-4 bg-white/60 border border-gray-100 rounded-2xl focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none font-bold text-primary transition-all placeholder:text-gray-300 shadow-sm'
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-primary/40 uppercase tracking-widest ml-4">Description</label>
                  <textarea
                    name='description'
                    value={shopProfile.description}
                    onChange={handleInputChange}
                    placeholder='Tell customers about your shop...'
                    rows='4'
                    className='w-full px-6 py-4 bg-white/60 border border-gray-100 rounded-2xl focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none font-bold text-primary transition-all placeholder:text-gray-300 shadow-sm resize-none'
                  />
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 px-2">
                <div className="w-1.5 h-6 bg-secondary rounded-full"></div>
                <h3 className="text-sm font-black text-primary uppercase tracking-widest">Location & Operations</h3>
              </div>

              <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-primary/40 uppercase tracking-widest ml-4">Address *</label>
                  <input
                    type='text'
                    name='address'
                    value={shopProfile.address}
                    onChange={handleInputChange}
                    placeholder='123 Main Street'
                    required
                    className='w-full px-6 py-4 bg-white/60 border border-gray-100 rounded-2xl focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none font-bold text-primary transition-all shadow-sm'
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-primary/40 uppercase tracking-widest ml-4">City *</label>
                  <input
                    type='text'
                    name='city'
                    value={shopProfile.city}
                    onChange={handleInputChange}
                    placeholder='Quezon City'
                    required
                    className='w-full px-6 py-4 bg-white/60 border border-gray-100 rounded-2xl focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none font-bold text-primary transition-all shadow-sm'
                  />
                </div>
              </div>

              <div className='grid grid-cols-1 sm:grid-cols-2 gap-6'>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-primary/40 uppercase tracking-widest ml-4">Opening Time</label>
                  <input
                    type='time'
                    value={operatingHoursOpen}
                    onChange={(e) => setOperatingHoursOpen(e.target.value)}
                    className='w-full px-6 py-4 bg-white/60 border border-gray-100 rounded-2xl focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none font-bold text-primary transition-all shadow-sm'
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-primary/40 uppercase tracking-widest ml-4">Closing Time</label>
                  <input
                    type='time'
                    value={operatingHoursClose}
                    onChange={(e) => setOperatingHoursClose(e.target.value)}
                    className='w-full px-6 py-4 bg-white/60 border border-gray-100 rounded-2xl focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none font-bold text-primary transition-all shadow-sm'
                  />
                </div>
              </div>
            </div>

            {/* Contact */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 px-2">
                <div className="w-1.5 h-6 bg-secondary rounded-full"></div>
                <h3 className="text-sm font-black text-primary uppercase tracking-widest">Connect with Clients</h3>
              </div>

              <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-primary/40 uppercase tracking-widest ml-4">Phone Number *</label>
                  <input
                    type='text'
                    name='contactNumber'
                    value={shopProfile.contactNumber}
                    onChange={handleInputChange}
                    placeholder='09123456789'
                    required
                    className={`w-full px-6 py-4 bg-white/60 border rounded-2xl focus:ring-4 outline-none font-bold text-primary transition-all shadow-sm ${
                      fieldErrors.contactNumber
                        ? 'border-red-500 focus:ring-red-500/10'
                        : 'border-gray-100 focus:border-primary focus:ring-primary/5'
                    }`}
                  />
                  {fieldErrors.contactNumber && (
                    <p className='mt-2 text-xs text-red-600 font-bold ml-4'>{fieldErrors.contactNumber}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-primary/40 uppercase tracking-widest ml-4">Facebook URL</label>
                  <input
                    type='text'
                    name='facebook'
                    value={shopProfile.facebook}
                    onChange={handleInputChange}
                    placeholder='facebook.com/yourshop'
                    className='w-full px-6 py-4 bg-white/60 border border-gray-100 rounded-2xl focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none font-bold text-primary transition-all shadow-sm'
                  />
                </div>
              </div>
            </div>

            {/* Documents */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 px-2">
                <div className="w-1.5 h-6 bg-secondary rounded-full"></div>
                <h3 className="text-sm font-black text-primary uppercase tracking-widest">Business Trust</h3>
              </div>
              
              <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
                {[
                  { label: 'Business Permit', preview: permitPreview, setter: setBusinessPermit, previewSetter: setPermitPreview, type: 'permit' },
                  { label: 'DTI Registration', preview: dtiPreview, setter: setDtiRegistration, previewSetter: setDtiPreview, type: 'dti' }
                ].map((doc, i) => (
                  <div key={i} className="space-y-3">
                    <label className="text-[10px] font-black text-primary/40 uppercase tracking-widest ml-4">{doc.label}</label>
                    {!doc.preview ? (
                      <label className='block group cursor-pointer'>
                        <div className='border-2 border-dashed border-gray-100 rounded-3xl p-8 text-center bg-gray-50/30 hover:border-primary hover:bg-primary/5 transition-all duration-300'>
                          <div className='bg-primary/5 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform'>
                            <svg className='w-6 h-6 text-primary/40' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={3} d='M12 4v16m8-8H4' />
                            </svg>
                          </div>
                          <p className='text-xs text-primary font-black uppercase tracking-wider'>Add {doc.label}</p>
                          <p className='text-[10px] text-gray-400 font-bold mt-1'>PDF or Image (max 10MB)</p>
                        </div>
                        <input type='file' onChange={(e) => handleFileChange(e, doc.type)} className='hidden' />
                      </label>
                    ) : (
                      <div className='relative group overflow-hidden rounded-3xl border border-gray-100 shadow-md aspect-video bg-white flex items-center justify-center p-4'>
                        {doc.preview.startsWith('http') || doc.preview.startsWith('data:image') ? (
                          <img src={doc.preview} alt='Preview' className='w-full h-full object-contain transition-transform group-hover:scale-105 duration-700' />
                        ) : (
                          <div className='flex flex-col items-center gap-2 text-primary/40'>
                            <svg className='w-12 h-12' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z' /></svg>
                            <span className='text-[10px] font-black uppercase tracking-widest'>Document Ready</span>
                          </div>
                        )}
                        <button
                          type='button'
                          onClick={() => { doc.setter(null); doc.previewSetter(''); }}
                          className='absolute top-3 right-3 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600 shadow-lg active:scale-90 transition-all opacity-0 group-hover:opacity-100'
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className='flex flex-col sm:flex-row gap-4 pt-4'>
              <button
                type='submit'
                disabled={saving}
                className='flex-1 px-10 py-5 bg-primary text-white rounded-[24px] hover:shadow-[0_20px_50px_rgba(1,62,141,0.2)] hover:-translate-y-0.5 transition-all font-black text-xs uppercase tracking-widest disabled:opacity-50 disabled:translate-y-0 relative overflow-hidden group'
              >
                 <span className="relative z-10">{saving ? 'Updating Profile...' : 'Save All Changes'}</span>
                 <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer"></div>
              </button>
              <button
                type='button'
                onClick={() => navigate('/owner')}
                className='px-10 py-5 bg-white text-primary border border-gray-100 rounded-[24px] hover:bg-gray-50 transition-all font-black text-xs uppercase tracking-widest'
              >
                Return to Dashboard
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default ShopProfile
