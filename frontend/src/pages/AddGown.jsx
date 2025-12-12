import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { assets, eventTypeList } from '../assets/assets'
import OwnerSidebar from '../components/OwnerSidebar'

const AddGown = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  const [formData, setFormData] = useState({
    name: '',
    eventType: [],
    fabric: '',
    price: '',
    color: '',
    size: ['Free Size'],
    available: true
  })
  
  const [selectedImage, setSelectedImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)

  const sizeOptions = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free Size']

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value
    })
    setError('')
    setSuccess('')
  }

  const handleSizeChange = (size) => {
    setFormData(prev => {
      if (prev.size.includes(size)) {
        // Remove if already selected
        return {
          ...prev,
          size: prev.size.filter(s => s !== size)
        }
      } else {
        // Add if not selected
        return {
          ...prev,
          size: [...prev.size, size]
        }
      }
    })
  }

  const handleEventTypeChange = (eventType) => {
    setFormData(prev => {
      if (prev.eventType.includes(eventType)) {
        // Remove if already selected
        return {
          ...prev,
          eventType: prev.eventType.filter(e => e !== eventType)
        }
      } else {
        // Add if not selected
        return {
          ...prev,
          eventType: [...prev.eventType, eventType]
        }
      }
    })
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setSelectedImage(file)
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    // Validation
    if (!formData.name || !formData.fabric || !formData.price || !formData.color) {
      setError('Please fill in all required fields')
      setLoading(false)
      return
    }

    if (!selectedImage) {
      setError('Please select an image')
      setLoading(false)
      return
    }

    if (formData.size.length === 0) {
      setError('Please select at least one size')
      setLoading(false)
      return
    }

    if (formData.eventType.length === 0) {
      setError('Please select at least one event type')
      setLoading(false)
      return
    }

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setError('Please login to add a gown')
        setLoading(false)
        return
      }

      // Create FormData for file upload
      const formDataToSend = new FormData()
      formDataToSend.append('image', selectedImage)
      formDataToSend.append('gownData', JSON.stringify({
        name: formData.name,
        eventType: formData.eventType.map(e => e.toLowerCase()),
        fabric: formData.fabric,
        price: parseFloat(formData.price),
        color: formData.color,
        size: formData.size,
        available: formData.available
      }))

      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
      const response = await fetch(`${API_URL}/owner/add-gown`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataToSend
      })

      const data = await response.json()

      if (data.success || data.sucess) {
        setSuccess('Apparel added successfully!')
        // Reset form
        setFormData({
          name: '',
          eventType: [],
          fabric: '',
          price: '',
          color: '',
          size: ['Free Size'],
          available: true
        })
        setSelectedImage(null)
        setImagePreview(null)
        
        // Redirect to manage gowns and trigger refresh
        setTimeout(() => {
          navigate('/owner/manage-gown', { state: { refresh: true } })
        }, 1500)
      } else {
        setError(data.message || 'Failed to add gown')
      }
    } catch (err) {
      console.error('Error adding gown:', err)
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='flex min-h-screen bg-gray-50'>
      <OwnerSidebar />
      
      <div className='flex-1 p-4 sm:p-6 lg:p-8'>
        <div className='max-w-3xl mx-auto'>
          {/* Header */}
          <div className='mb-6 sm:mb-8 mt-12 lg:mt-0'>
            <h1 className='text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2'>Add New Apparel</h1>
            <p className='text-sm sm:text-base text-gray-600'>Fill in the details to add new apparel to your collection.</p>
          </div>

          {/* Success/Error Messages */}
          {success && (
            <div className='mb-4 sm:mb-6 p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg'>
              <p className='text-green-800 text-sm sm:text-base'>{success}</p>
            </div>
          )}

          {error && (
            <div className='mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg'>
              <p className='text-red-800 text-sm sm:text-base'>{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className='bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 lg:p-8'>
            <div className='space-y-4 sm:space-y-6'>
              {/* Image Upload */}
              <div>
                <label className='block text-xs sm:text-sm font-medium text-gray-700 mb-2'>
                  Apparel Image <span className='text-red-500'>*</span>
                </label>
                <div className='flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4'>
                  <div className='flex-1 w-full'>
                    <input
                      type='file'
                      accept='image/*'
                      onChange={handleImageChange}
                      className='w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all'
                      required
                    />
                  </div>
                  {imagePreview && (
                    <div className='w-24 h-24 sm:w-32 sm:h-32 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0'>
                      <img src={imagePreview} alt='Preview' className='w-full h-full object-cover' />
                    </div>
                  )}
                </div>
              </div>

              {/* Gown Name */}
              <div>
                <label className='block text-xs sm:text-sm font-medium text-gray-700 mb-2'>
                  Apparel Name <span className='text-red-500'>*</span>
                </label>
                <input
                  type='text'
                  name='name'
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder='Enter apparel name'
                  className='w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all'
                  required
                />
              </div>

              {/* Info Box - Location from Shop Profile */}
              <div className='col-span-1 md:col-span-2 p-4 bg-blue-50 border border-blue-200 rounded-lg'>
                <p className='text-sm text-blue-800'>
                  <strong>Note:</strong> Location and contact information will be automatically taken from your Shop Profile. 
                  <button
                    type='button'
                    onClick={() => navigate('/owner/shop-profile')}
                    className='ml-1 text-primary font-semibold hover:underline'
                  >
                    Update Shop Profile
                  </button>
                </p>
              </div>

              {/* Event Type */}
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Event Types <span className='text-red-500'>*</span>
                </label>
                <div className='flex flex-wrap gap-3'>
                  {eventTypeList.map((eventType) => (
                    <button
                      key={eventType}
                      type='button'
                      onClick={() => handleEventTypeChange(eventType.toLowerCase())}
                      className={`px-4 py-2 rounded-lg border-2 transition-all capitalize ${
                        formData.eventType.includes(eventType.toLowerCase())
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-primary'
                      }`}
                    >
                      {eventType}
                    </button>
                  ))}
                </div>
                <p className='text-sm text-gray-500 mt-2'>
                  Selected: {formData.eventType.length > 0 ? formData.eventType.map(e => e.charAt(0).toUpperCase() + e.slice(1)).join(', ') : 'None'}
                </p>
              </div>

              {/* Fabric and Color Row */}
              <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-2'>
                    Fabric <span className='text-red-500'>*</span>
                  </label>
                  <input
                    type='text'
                    name='fabric'
                    value={formData.fabric}
                    onChange={handleInputChange}
                    placeholder='e.g., Chiffon, Silk'
                    className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all'
                    required
                  />
                </div>

                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-2'>
                    Color <span className='text-red-500'>*</span>
                  </label>
                  <input
                    type='text'
                    name='color'
                    value={formData.color}
                    onChange={handleInputChange}
                    placeholder='e.g., White, Red'
                    className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all'
                    required
                  />
                </div>
              </div>

              {/* Price */}
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Price (₱) <span className='text-red-500'>*</span>
                </label>
                <input
                  type='number'
                  name='price'
                  value={formData.price}
                  onChange={handleInputChange}
                  placeholder='Enter rental price'
                  min='0'
                  step='0.01'
                  className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all'
                  required
                />
              </div>

              {/* Size Selection */}
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Available Sizes <span className='text-red-500'>*</span>
                </label>
                <div className='flex flex-wrap gap-3'>
                  {sizeOptions.map((size) => (
                    <button
                      key={size}
                      type='button'
                      onClick={() => handleSizeChange(size)}
                      className={`px-4 py-2 rounded-lg border-2 transition-all ${
                        formData.size.includes(size)
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-primary'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
                <p className='text-sm text-gray-500 mt-2'>
                  Selected: {formData.size.join(', ') || 'None'}
                </p>
              </div>

              {/* Available Toggle */}
              <div className='flex items-center gap-3'>
                <input
                  type='checkbox'
                  id='available'
                  checked={formData.available}
                  onChange={(e) => setFormData({...formData, available: e.target.checked})}
                  className='w-5 h-5 text-primary rounded focus:ring-primary'
                />
                <label htmlFor='available' className='text-sm font-medium text-gray-700'>
                  Mark as available for booking
                </label>
              </div>

              {/* Submit Button */}
              <div className='flex gap-4 pt-4'>
                <button
                  type='submit'
                  disabled={loading}
                  className={`flex-1 py-3 rounded-lg font-semibold text-white transition-all duration-300 ${
                    loading
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-primary hover:bg-primary-dull shadow-lg hover:shadow-xl'
                  }`}
                >
                  {loading ? 'Adding Apparel...' : 'Add Apparel'}
                </button>
                <button
                  type='button'
                  onClick={() => navigate('/owner/manage-gown')}
                  className='px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-semibold'
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default AddGown

