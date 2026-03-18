import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { assets, eventTypeList } from '../assets/assets'
import { API_URL } from '../config'
import OwnerSidebar from '../components/OwnerSidebar'
import { removeBackground } from '@imgly/background-removal'

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
    ageGroup: [],
    sex: '',
    available: true
  })

  const [selectedImage, setSelectedImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [isRemovingBg, setIsRemovingBg] = useState(false)


  const sizeOptions = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free Size']

  // Helper for dynamic color preview
  const getColorPreview = (colorName) => {
    if (!colorName) return 'transparent';
    const lower = colorName.toLowerCase().trim();
    
    // Improved matching logic for preview
    const colorMap = {
      'red': '#EF4444', 'burgundy': '#800020', 'maroon': '#800000', 'crimson': '#DC143C', 'ruby': '#E0115F', 'rose': '#FF007F', 'wine': '#722F37',
      'pink': '#EC4899', 'blush': '#DE5D83', 'magenta': '#FF00FF', 'fuchsia': '#FF00FF', 'coral': '#FF7F50', 'peach': '#FFDAB9', 'salmon': '#FA8072',
      'orange': '#F97316', 'rust': '#B7410E', 'terracotta': '#E2725B', 'yellow': '#EAB308', 'gold': '#FFD700', 'amber': '#FFBF00', 'mustard': '#FFDB58',
      'green': '#22C55E', 'emerald': '#50C878', 'mint': '#98FF98', 'teal': '#008080', 'olive': '#808000', 'jade': '#00A86B', 'sage': '#BCB88A',
      'blue': '#3B82F6', 'navy': '#000080', 'sky': '#87CEEB', 'sapphire': '#0F52BA', 'azure': '#007FFF', 'cobalt': '#0047AB', 'turquoise': '#40E0D0', 'royal': '#4169E1',
      'purple': '#A855F7', 'lavender': '#E6E6FA', 'violet': '#EE82EE', 'plum': '#8E4585', 'indigo': '#4B0082', 'lilac': '#C8A2C8',
      'white': '#FFFFFF', 'ivory': '#FFFFF0', 'cream': '#FFFDD0', 'beige': '#F5F5DC', 'black': '#000000', 'gray': '#6B7280', 'grey': '#6B7280', 'silver': '#C0C0C0', 'nude': '#E3BC9A', 'champagne': '#F7E7CE'
    };
    
    if (colorMap[lower]) return colorMap[lower];
    const keys = Object.keys(colorMap).sort((a,b) => b.length - a.length);
    for (const key of keys) {
      if (lower.includes(key)) return colorMap[key];
    }
    return '#CCCCCC'; 
  };
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

  const handleImageChange = async (e) => {
    const file = e.target.files[0]
    if (file) {
      setSelectedImage(file)
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result)
      }
      reader.readAsDataURL(file)

      // Automatically remove background
      try {
        setIsRemovingBg(true)
        const imageBlob = await removeBackground(file)
        const newFile = new File([imageBlob], file.name.replace(/\.[^/.]+$/, "") + ".png", { type: 'image/png' })
        
        setSelectedImage(newFile)
        
        const newReader = new FileReader()
        newReader.onloadend = () => {
          setImagePreview(newReader.result)
        }
        newReader.readAsDataURL(newFile)
      } catch (error) {
        console.error("Error removing background:", error)
      } finally {
        setIsRemovingBg(false)
      }
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

    if (formData.ageGroup.length === 0) {
      setError('Please select at least one age group')
      setLoading(false)
      return
    }

    if (!formData.sex) {
      setError('Please select a gender')
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
        ageGroup: formData.ageGroup,
        sex: formData.sex,
        available: formData.available
      }))

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
          ageGroup: '',
          sex: '',
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
            <h1 className='text-4xl font-black text-primary tracking-tight'>Add New Apparel</h1>
            <p className='text-gray-500 font-bold mt-2'>Introduce a new masterpiece to your collection.</p>
          </div>

          {/* Messages */}
          {success && (
            <div className='mb-8 p-4 bg-green-50 border border-green-100 rounded-2xl animate-fade-in'>
              <p className='text-green-800 font-bold flex items-center gap-2'>{success}</p>
            </div>
          )}

          {error && (
            <div className='mb-8 p-4 bg-red-50 border border-red-100 rounded-2xl animate-shake'>
              <p className='text-red-800 font-bold flex items-center gap-2'>{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className='bg-white/40 backdrop-blur-3xl rounded-[40px] shadow-[0_30px_100px_rgba(1,62,141,0.08)] border border-white p-4 sm:p-10 space-y-10'>
            
            {/* Image Upload Area */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 px-2">
                <div className="w-1.5 h-6 bg-secondary rounded-full"></div>
                <h3 className="text-sm font-black text-primary uppercase tracking-widest">Visual Presentation</h3>
              </div>
              
              <div className="flex flex-col md:flex-row gap-8 items-start">
                <div className="flex-1 w-full space-y-3">
                  <label className="text-[10px] font-black text-primary/40 uppercase tracking-widest ml-4">Apparel Image *</label>
                  <label className='block group cursor-pointer'>
                    <div className='border-2 border-dashed border-gray-100 rounded-3xl p-10 text-center bg-gray-50/30 hover:border-primary hover:bg-primary/5 transition-all duration-300'>
                      <div className='bg-primary/5 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform'>
                        <svg className='w-6 h-6 text-primary/40' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={3} d='M12 4v16m8-8H4' /></svg>
                      </div>
                      <p className='text-xs text-primary font-black uppercase tracking-wider'>Upload Photo</p>
                    </div>
                    <input type='file' accept='image/*' onChange={handleImageChange} className='hidden' required />
                  </label>
                </div>

                {imagePreview && (
                  <div className="w-full md:w-56 aspect-[3/4] overflow-hidden rounded-[32px] border border-gray-100 shadow-2xl relative group">
                    <img src={imagePreview} alt='Preview' className={`w-full h-full object-cover transition-transform duration-700 ${isRemovingBg ? 'opacity-50 blur-sm' : 'group-hover:scale-110'}`} />
                    <div className="absolute inset-0 bg-black/10 pointer-events-none"></div>
                    {isRemovingBg && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/30 backdrop-blur-sm">
                        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-2"></div>
                        <span className="text-[10px] font-black text-primary uppercase tracking-widest bg-white/80 px-2 py-1 rounded-md">Removing BG...</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Basic Info */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 px-2">
                <div className="w-1.5 h-6 bg-secondary rounded-full"></div>
                <h3 className="text-sm font-black text-primary uppercase tracking-widest">Core Details</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-black text-primary/40 uppercase tracking-widest ml-4">Apparel Name *</label>
                  <input
                    type='text'
                    name='name'
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder='e.g., Midnight Velvet Ballgown'
                    required
                    className='w-full px-6 py-4 bg-white/60 border border-gray-100 rounded-2xl focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none font-bold text-primary transition-all shadow-sm'
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-primary/40 uppercase tracking-widest ml-4">Fabric *</label>
                  <input
                    type='text'
                    name='fabric'
                    value={formData.fabric}
                    onChange={handleInputChange}
                    placeholder='Chiffon, Silk'
                    required
                    className='w-full px-6 py-4 bg-white/60 border border-gray-100 rounded-2xl focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none font-bold text-primary transition-all shadow-sm'
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between ml-4">
                    <label className="text-[10px] font-black text-primary/40 uppercase tracking-widest">Main Color *</label>
                  </div>
                  <input
                    type='text'
                    name='color'
                    value={formData.color}
                    onChange={handleInputChange}
                    placeholder='Emerald Green'
                    required
                    className='w-full px-6 py-4 bg-white/60 border border-gray-100 rounded-2xl focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none font-bold text-primary transition-all shadow-sm'
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-black text-primary/40 uppercase tracking-widest ml-4">Rental Price (₱) *</label>
                  <input
                    type='number'
                    name='price'
                    value={formData.price}
                    onChange={handleInputChange}
                    placeholder='0.00'
                    required
                    className='w-full px-6 py-4 bg-white/60 border border-gray-100 rounded-2xl focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none font-black text-primary transition-all shadow-sm'
                  />
                </div>
              </div>
            </div>

            {/* Target Audience */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 px-2">
                <div className="w-1.5 h-6 bg-secondary rounded-full"></div>
                <h3 className="text-sm font-black text-primary uppercase tracking-widest">Aesthetics & Fit</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                   <label className="text-[10px] font-black text-primary/40 uppercase tracking-widest ml-4">Event Types *</label>
                   <div className="flex flex-wrap gap-2">
                      {eventTypeList.map(type => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => handleEventTypeChange(type.toLowerCase())}
                          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                            formData.eventType.includes(type.toLowerCase())
                              ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                              : 'bg-white/50 text-primary border-gray-100 hover:bg-white'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                   </div>
                </div>

                <div className="space-y-4">
                   <label className="text-[10px] font-black text-primary/40 uppercase tracking-widest ml-4">Target Sex *</label>
                   <div className="flex flex-wrap gap-2">
                      {['Female', 'Male', 'Unisex'].map(sex => (
                        <button
                          key={sex}
                          type="button"
                          onClick={() => setFormData({ ...formData, sex })}
                          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                            formData.sex === sex
                              ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                              : 'bg-white/50 text-primary border-gray-100 hover:bg-white'
                          }`}
                        >
                          {sex}
                        </button>
                      ))}
                   </div>
                </div>

                <div className="space-y-4 md:col-span-2">
                   <label className="text-[10px] font-black text-primary/40 uppercase tracking-widest ml-4">Age Groups *</label>
                   <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {['6–9 Years', '10–12 Years', '13–17 Years', '18–29 Years', '30–59 Years', '60+ Years'].map(age => (
                        <button
                          key={age}
                          type="button"
                          onClick={() => setFormData(prev => ({
                            ...prev,
                            ageGroup: prev.ageGroup.includes(age) ? prev.ageGroup.filter(a => a !== age) : [...prev.ageGroup, age]
                          }))}
                          className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                            formData.ageGroup.includes(age)
                              ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                              : 'bg-white/50 text-primary border-gray-100 hover:bg-white'
                          }`}
                        >
                          {age}
                        </button>
                      ))}
                   </div>
                </div>

                <div className="space-y-4 md:col-span-2">
                   <label className="text-[10px] font-black text-primary/40 uppercase tracking-widest ml-4">Available Sizes *</label>
                   <div className="flex flex-wrap gap-2">
                      {sizeOptions.map(size => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => handleSizeChange(size)}
                          className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                            formData.size.includes(size)
                              ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                              : 'bg-white/50 text-primary border-gray-100 hover:bg-white'
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                   </div>
                </div>

                <div className="md:col-span-2 px-2 flex items-center gap-3">
                    <input
                      type='checkbox'
                      id='available'
                      checked={formData.available}
                      onChange={(e) => setFormData({ ...formData, available: e.target.checked })}
                      className='w-5 h-5 rounded-lg border-gray-200 text-primary focus:ring-primary/20 transition-all'
                    />
                    <label htmlFor='available' className='text-[10px] font-black text-primary uppercase tracking-widest cursor-pointer'>
                      Available for immediate booking
                    </label>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className='flex flex-col sm:flex-row gap-4 pt-4'>
              <button
                type='submit'
                disabled={loading || isRemovingBg}
                className='flex-1 px-10 py-5 bg-primary text-white rounded-[24px] hover:shadow-[0_20px_50px_rgba(1,62,141,0.2)] hover:-translate-y-0.5 transition-all font-black text-xs uppercase tracking-widest disabled:opacity-50 relative overflow-hidden group'
              >
                 <span className="relative z-10">{(loading || isRemovingBg) ? 'Processing...' : 'Add to Collection'}</span>
                 <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer"></div>
              </button>
              <button
                type='button'
                onClick={() => navigate('/owner/manage-gown')}
                className='px-10 py-5 bg-white text-primary border border-gray-100 rounded-[24px] hover:bg-gray-50 transition-all font-black text-xs uppercase tracking-widest'
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

export default AddGown

