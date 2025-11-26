import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import OwnerSidebar from '../components/OwnerSidebar'

const ShopProfile = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
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

      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
      const response = await fetch(`${API_URL}/user/data`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()
      
      if (data.success && data.user?.shopProfile) {
        setShopProfile({
          shopName: data.user.shopProfile.shopName || '',
          description: data.user.shopProfile.description || '',
          address: data.user.shopProfile.address || '',
          city: data.user.shopProfile.city || '',
          contactNumber: data.user.shopProfile.contactNumber || '',
          operatingHours: data.user.shopProfile.operatingHours || '',
          facebook: data.user.shopProfile.socialMedia?.facebook || ''
        })
        // Set existing documents
        if (data.user.shopProfile.businessPermit) {
          setPermitPreview(data.user.shopProfile.businessPermit)
        }
        if (data.user.shopProfile.dtiRegistration) {
          setDtiPreview(data.user.shopProfile.dtiRegistration)
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

    try {
      const token = localStorage.getItem('token')
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
      
      // Create FormData for file uploads
      const formData = new FormData()
      formData.append('shopName', shopProfile.shopName)
      formData.append('description', shopProfile.description)
      formData.append('address', shopProfile.address)
      formData.append('city', shopProfile.city)
      formData.append('contactNumber', shopProfile.contactNumber)
      formData.append('operatingHours', shopProfile.operatingHours)
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
        setTimeout(() => setSuccess(''), 3000)
        // Refresh to show uploaded documents
        fetchShopProfile()
      } else {
        setError(data.message || 'Failed to update shop profile')
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
    <div className='flex min-h-screen bg-gray-50'>
      <OwnerSidebar />
      
      <div className='flex-1 p-8'>
        <div className='max-w-4xl mx-auto'>
          {/* Header */}
          <div className='mb-8'>
            <h1 className='text-3xl font-bold text-gray-900 mb-2'>Shop Profile</h1>
            <p className='text-gray-600'>
              Set up your shop information once and it will automatically appear on your gown listings.
            </p>
          </div>

          {/* Success/Error Messages */}
          {success && (
            <div className='mb-6 p-4 bg-green-50 border border-green-200 rounded-lg'>
              <p className='text-green-800'>{success}</p>
            </div>
          )}

          {error && (
            <div className='mb-6 p-4 bg-red-50 border border-red-200 rounded-lg'>
              <p className='text-red-800'>{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className='bg-white rounded-xl shadow-sm border border-gray-200 p-8'>
            {/* Shop Name */}
            <div className='mb-6'>
              <label className='block text-sm font-semibold text-gray-700 mb-2'>
                Shop Name <span className='text-red-500'>*</span>
              </label>
              <input
                type='text'
                name='shopName'
                value={shopProfile.shopName}
                onChange={handleInputChange}
                placeholder='e.g., Elegant Gowns Manila'
                required
                className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all'
              />
            </div>

            {/* Description */}
            <div className='mb-6'>
              <label className='block text-sm font-semibold text-gray-700 mb-2'>
                Description
              </label>
              <textarea
                name='description'
                value={shopProfile.description}
                onChange={handleInputChange}
                placeholder='Tell customers about your shop...'
                rows='4'
                className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all'
              />
            </div>

            {/* Location Section */}
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6 mb-6'>
              <div>
                <label className='block text-sm font-semibold text-gray-700 mb-2'>
                  Address <span className='text-red-500'>*</span>
                </label>
                <input
                  type='text'
                  name='address'
                  value={shopProfile.address}
                  onChange={handleInputChange}
                  placeholder='e.g., 123 Main Street, Barangay Name'
                  required
                  className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all'
                />
              </div>

              <div>
                <label className='block text-sm font-semibold text-gray-700 mb-2'>
                  City <span className='text-red-500'>*</span>
                </label>
                <input
                  type='text'
                  name='city'
                  value={shopProfile.city}
                  onChange={handleInputChange}
                  placeholder='e.g., Quezon City, Manila'
                  required
                  className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all'
                />
              </div>
            </div>

            {/* Operating Hours */}
            <div className='mb-6'>
              <label className='block text-sm font-semibold text-gray-700 mb-2'>
                Operating Hours
              </label>
              <input
                type='text'
                name='operatingHours'
                value={shopProfile.operatingHours}
                onChange={handleInputChange}
                placeholder='e.g., Mon-Sat: 9:00 AM - 7:00 PM'
                className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all'
              />
            </div>

            {/* Contact Information */}
            <div className='mb-6'>
              <h3 className='text-lg font-semibold text-gray-900 mb-4'>Contact Information</h3>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                <div>
                  <label className='block text-sm font-semibold text-gray-700 mb-2'>
                    Phone Number <span className='text-red-500'>*</span>
                  </label>
                  <input
                    type='text'
                    name='contactNumber'
                    value={shopProfile.contactNumber}
                    onChange={handleInputChange}
                    placeholder='e.g., 09123456789'
                    required
                    className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all'
                  />
                </div>

                <div>
                  <label className='block text-sm font-semibold text-gray-700 mb-2'>
                    Facebook
                  </label>
                  <input
                    type='text'
                    name='facebook'
                    value={shopProfile.facebook}
                    onChange={handleInputChange}
                    placeholder='Facebook page URL'
                    className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all'
                  />
                </div>
              </div>
            </div>

            {/* Business Verification Documents */}
            <div className='mb-6'>
              <h3 className='text-lg font-semibold text-gray-900 mb-4'>Business Verification (Optional)</h3>
              <p className='text-sm text-gray-600 mb-4'>
                Upload your business documents to build trust with customers. Verified shops get a badge.
              </p>

              <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                {/* Business Permit */}
                <div>
                  <label className='block text-sm font-semibold text-gray-700 mb-2'>
                    Business Permit
                  </label>
                  {!permitPreview ? (
                    <label className='block'>
                      <div className='border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all'>
                        <div className='text-gray-400 mb-2'>
                          <svg className='w-10 h-10 mx-auto' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12' />
                          </svg>
                        </div>
                        <p className='text-sm text-gray-600 font-medium'>Upload Business Permit</p>
                        <p className='text-xs text-gray-500 mt-1'>PNG, JPG, or PDF (max 10MB)</p>
                      </div>
                      <input
                        type='file'
                        accept='image/png,image/jpeg,image/jpg,application/pdf'
                        onChange={(e) => handleFileChange(e, 'permit')}
                        className='hidden'
                      />
                    </label>
                  ) : (
                    <div className='relative border border-gray-300 rounded-lg p-4'>
                      {permitPreview.startsWith('http') || permitPreview.startsWith('data:image') ? (
                        <img 
                          src={permitPreview} 
                          alt='Business Permit' 
                          className='w-full h-32 object-contain'
                        />
                      ) : (
                        <div className='flex items-center justify-center h-32 text-gray-600'>
                          <svg className='w-12 h-12' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z' />
                          </svg>
                          <span className='ml-2'>PDF Uploaded</span>
                        </div>
                      )}
                      <button
                        type='button'
                        onClick={() => {
                          setBusinessPermit(null)
                          setPermitPreview('')
                        }}
                        className='absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600'
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>

                {/* DTI Registration */}
                <div>
                  <label className='block text-sm font-semibold text-gray-700 mb-2'>
                    DTI Registration
                  </label>
                  {!dtiPreview ? (
                    <label className='block'>
                      <div className='border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all'>
                        <div className='text-gray-400 mb-2'>
                          <svg className='w-10 h-10 mx-auto' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12' />
                          </svg>
                        </div>
                        <p className='text-sm text-gray-600 font-medium'>Upload DTI Registration</p>
                        <p className='text-xs text-gray-500 mt-1'>PNG, JPG, or PDF (max 10MB)</p>
                      </div>
                      <input
                        type='file'
                        accept='image/png,image/jpeg,image/jpg,application/pdf'
                        onChange={(e) => handleFileChange(e, 'dti')}
                        className='hidden'
                      />
                    </label>
                  ) : (
                    <div className='relative border border-gray-300 rounded-lg p-4'>
                      {dtiPreview.startsWith('http') || dtiPreview.startsWith('data:image') ? (
                        <img 
                          src={dtiPreview} 
                          alt='DTI Registration' 
                          className='w-full h-32 object-contain'
                        />
                      ) : (
                        <div className='flex items-center justify-center h-32 text-gray-600'>
                          <svg className='w-12 h-12' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z' />
                          </svg>
                          <span className='ml-2'>PDF Uploaded</span>
                        </div>
                      )}
                      <button
                        type='button'
                        onClick={() => {
                          setDtiRegistration(null)
                          setDtiPreview('')
                        }}
                        className='absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600'
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>


            {/* Submit Button */}
            <div className='flex gap-4'>
              <button
                type='submit'
                disabled={saving}
                className='flex-1 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dull transition-colors font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed'
              >
                {saving ? 'Saving...' : 'Save Shop Profile'}
              </button>
              <button
                type='button'
                onClick={() => navigate('/owner')}
                className='px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-semibold'
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default ShopProfile
