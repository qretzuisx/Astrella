import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { assets, eventTypeList } from '../assets/assets'
import { API_URL } from '../config'
import OwnerSidebar from '../components/OwnerSidebar'
import { removeBackground } from '@imgly/background-removal'
import { getColorHex } from '../utils/colorUtils'

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
    replacementCost: '',
    color: '',
    size: ['Free Size'],
    ageGroup: [],
    sex: '',
    silhouette: '',
    available: true
  })

  const [selectedImage, setSelectedImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [isRemovingBg, setIsRemovingBg] = useState(false)


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


  const runBackgroundRemoval = async (fileToProcess) => {
    if (!fileToProcess) return;
    
    setIsRemovingBg(true);
    setError('');
    
    try {
      // 25 second timeout as requested by user
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Background removal taking longer than expected')), 25000)
      );

      const bgRemovalPromise = removeBackground(fileToProcess);
      
      const imageBlob = await Promise.race([bgRemovalPromise, timeoutPromise]);

      const newFile = new File([imageBlob], fileToProcess.name.replace(/\.[^/.]+$/, "") + ".png", { type: 'image/png' });
      setSelectedImage(newFile);

      const newReader = new FileReader();
      newReader.onloadend = () => {
        setImagePreview(newReader.result);
      };
      newReader.readAsDataURL(newFile);
    } catch (error) {
      // Shortened, easy to understand message as requested by user
      setError("AI Timeout: Retry or use original.");
    } finally {
      setIsRemovingBg(false);
    }
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0]
    if (file) {
      setSelectedImage(file)
      // Create preview immediately
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result)
      }
      reader.readAsDataURL(file)

      // Automatically remove background
      runBackgroundRemoval(file);
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
        replacementCost: formData.replacementCost ? parseFloat(formData.replacementCost) : 0,
        color: formData.color,
        size: formData.size,
        ageGroup: formData.ageGroup,
        sex: formData.sex,
        silhouette: formData.silhouette,
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

      if (data.success) {
        setSuccess('Apparel added successfully!')
        // Reset form
        setFormData({
          name: '',
          eventType: [],
          fabric: '',
          price: '',
          replacementCost: '',
          color: '',
          size: ['Free Size'],
          ageGroup: [],
          sex: '',
          silhouette: '',
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
    <div className='flex min-h-screen bg-[#FDFDFF] max-w-full overflow-x-hidden'>
      <OwnerSidebar />

      <div className='flex-1 min-w-0 p-4 sm:p-8 lg:p-12 overflow-y-auto'>
        <div className='max-w-4xl mx-auto'>
          {/* Header */}
          <div className='mb-6 mt-10 lg:mt-0'>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-6 h-1 bg-primary rounded-full"></div>
              <span className="text-[9px] font-black text-primary uppercase tracking-[0.2em]">Management</span>
            </div>
            <h1 className='text-2xl sm:text-3xl font-black text-primary tracking-tight'>Add New Apparel</h1>
            <p className='text-xs sm:text-sm text-gray-500 font-medium mt-1'>Introduce a new masterpiece to your collection.</p>
          </div>

          {/* Messages */}
          {success && (
            <div className='mb-6 p-3.5 bg-green-50 border border-green-100 rounded-2xl animate-fade-in'>
              <p className='text-xs text-green-800 font-bold flex items-center gap-2'>{success}</p>
            </div>
          )}

          {error && (
            <div className='mb-6 p-3.5 bg-red-50 border border-red-100 rounded-2xl animate-shake'>
              <p className='text-xs text-red-800 font-bold flex items-center gap-2'>{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className='bg-white/40 backdrop-blur-3xl rounded-3xl shadow-[0_20px_80px_rgba(1,62,141,0.06)] border border-white p-4 sm:p-6 space-y-6'>

            {/* Image Upload Area */}
            <div className="space-y-4">
              <div className="flex items-center gap-2.5 px-1">
                <div className="w-1 h-5 bg-secondary rounded-full"></div>
                <h3 className="text-xs font-black text-primary uppercase tracking-widest">Visual Presentation</h3>
              </div>

              <div className="flex flex-col sm:flex-row gap-6 items-start">
                <div className="flex-1 w-full space-y-2">
                  <label className="text-[9px] font-black text-primary/40 uppercase tracking-widest ml-2">Apparel Image *</label>
                  <label className='block group cursor-pointer'>
                    <div className='border border-dashed border-gray-200 rounded-2xl p-5 text-center bg-gray-50/30 hover:border-primary hover:bg-primary/5 transition-all duration-300'>
                      <div className='bg-primary/5 w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform'>
                        <svg className='w-5 h-5 text-primary/40' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d='M12 4v16m8-8H4' /></svg>
                      </div>
                      <p className='text-[10px] text-primary font-black uppercase tracking-wider'>Upload Photo</p>
                    </div>
                    <input type='file' accept='image/*' onChange={handleImageChange} className='hidden' required />
                  </label>
                </div>

                {imagePreview && (
                  <div className="w-full sm:w-40 aspect-[3/4] overflow-hidden rounded-2xl border border-gray-100 shadow-lg relative group bg-gray-50/50">
                    <img src={imagePreview} alt='Preview' className={`w-full h-full object-contain transition-transform duration-700 ${isRemovingBg ? 'opacity-50 blur-sm' : 'group-hover:scale-105'}`} />
                    <div className="absolute inset-0 bg-black/5 pointer-events-none"></div>
                    {isRemovingBg ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/40 backdrop-blur-sm">
                        <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin mb-1.5"></div>
                        <span className="text-[8px] font-black text-primary uppercase tracking-[0.2em] bg-white/90 px-2 py-1 rounded-full shadow-sm">AI Processing...</span>
                      </div>
                    ) : (
                      <button 
                        type="button"
                        onClick={() => runBackgroundRemoval(selectedImage)}
                        className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-md px-2.5 py-1.5 rounded-xl text-[8px] font-black text-primary uppercase tracking-widest shadow-md border border-white hover:bg-white transition-all hover:scale-105 active:scale-95 z-20"
                      >
                        Retry AI
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Basic Info */}
            <div className="space-y-4">
              <div className="flex items-center gap-2.5 px-1">
                <div className="w-1 h-5 bg-secondary rounded-full"></div>
                <h3 className="text-xs font-black text-primary uppercase tracking-widest">Core Details</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-[9px] font-black text-primary/40 uppercase tracking-widest ml-2">Apparel Name *</label>
                  <input
                    type='text'
                    name='name'
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder='e.g., Midnight Velvet Ballgown'
                    required
                    className='w-full px-4 py-2.5 bg-white/60 border border-gray-100 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/5 outline-none font-bold text-primary text-xs sm:text-sm transition-all shadow-sm'
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-primary/40 uppercase tracking-widest ml-2">Fabric *</label>
                  <input
                    type='text'
                    name='fabric'
                    value={formData.fabric}
                    onChange={handleInputChange}
                    placeholder='Chiffon, Silk'
                    required
                    className='w-full px-4 py-2.5 bg-white/60 border border-gray-100 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/5 outline-none font-bold text-primary text-xs sm:text-sm transition-all shadow-sm'
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-primary/40 uppercase tracking-widest ml-2">Main Color *</label>
                  <input
                    type='text'
                    name='color'
                    value={formData.color}
                    onChange={handleInputChange}
                    placeholder='Emerald Green'
                    required
                    className='w-full px-4 py-2.5 bg-white/60 border border-gray-100 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/5 outline-none font-bold text-primary text-xs sm:text-sm transition-all shadow-sm'
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-[9px] font-black text-primary/40 uppercase tracking-widest ml-2">Rental Price (₱) *</label>
                  <input
                    type='number'
                    name='price'
                    value={formData.price}
                    onChange={handleInputChange}
                    placeholder='0.00'
                    required
                    className='w-full px-4 py-2.5 bg-white/60 border border-gray-100 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/5 outline-none font-black text-primary text-xs sm:text-sm transition-all shadow-sm'
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-[9px] font-black text-primary/40 uppercase tracking-widest ml-2">Replacement Cost (₱)</label>
                  <input
                    type='number'
                    name='replacementCost'
                    value={formData.replacementCost}
                    onChange={handleInputChange}
                    placeholder='Full gown value if lost/damaged'
                    className='w-full px-4 py-2.5 bg-white/60 border border-gray-100 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/5 outline-none font-bold text-primary text-xs sm:text-sm transition-all shadow-sm'
                  />
                  <p className="text-[8px] font-bold text-gray-400 ml-2">Used for full replacement penalties. Leave blank to default to rental price.</p>
                </div>
              </div>
            </div>

            {/* Target Audience */}
            <div className="space-y-4">
              <div className="flex items-center gap-2.5 px-1">
                <div className="w-1 h-5 bg-secondary rounded-full"></div>
                <h3 className="text-xs font-black text-primary uppercase tracking-widest">Aesthetics & Fit</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[9px] font-black text-primary/40 uppercase tracking-widest ml-2">Event Types *</label>
                  <div className="flex flex-wrap gap-2">
                    {eventTypeList.map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => handleEventTypeChange(type.toLowerCase())}
                        className={`px-2.5 py-1.5 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-all border ${formData.eventType.includes(type.toLowerCase())
                            ? 'bg-primary text-white border-primary shadow-md shadow-primary/10 scale-102'
                            : 'bg-white/50 text-primary border-gray-100 hover:bg-white'
                          }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[9px] font-black text-primary/40 uppercase tracking-widest ml-2">Target Sex *</label>
                  <div className="flex flex-wrap gap-2">
                    {['Female', 'Male', 'Unisex'].map(sex => (
                      <button
                        key={sex}
                        type="button"
                        onClick={() => setFormData({ ...formData, sex })}
                        className={`px-2.5 py-1.5 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-all border ${formData.sex === sex
                            ? 'bg-primary text-white border-primary shadow-md shadow-primary/10 scale-102'
                            : 'bg-white/50 text-primary border-gray-100 hover:bg-white'
                          }`}
                      >
                        {sex}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 sm:col-span-2">
                  <label className="text-[9px] font-black text-primary/40 uppercase tracking-widest ml-2">Age Groups *</label>
                  <div className="flex flex-wrap gap-2">
                    {['6–9 Years', '10–12 Years', '13–17 Years', '18–29 Years', '30–59 Years', '60+ Years'].map(age => (
                      <button
                        key={age}
                        type="button"
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          ageGroup: prev.ageGroup.includes(age) ? prev.ageGroup.filter(a => a !== age) : [...prev.ageGroup, age]
                        }))}
                        className={`px-2.5 py-1.5 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-all border ${formData.ageGroup.includes(age)
                            ? 'bg-primary text-white border-primary shadow-md shadow-primary/10 scale-102'
                            : 'bg-white/50 text-primary border-gray-100 hover:bg-white'
                          }`}
                      >
                        {age}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-[9px] font-black text-primary/40 uppercase tracking-widest ml-2">Silhouette (Recommended for AI Match)</label>
                  <select
                    name='silhouette'
                    value={formData.silhouette || ''}
                    onChange={handleInputChange}
                    className='w-full px-4 py-2.5 bg-white/60 border border-gray-100 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/5 outline-none font-bold text-primary text-xs sm:text-sm appearance-none cursor-pointer transition-all shadow-sm'
                  >
                    <option value=''>Not Specified (Optional)</option>
                    <option value='A-Line'>A-Line</option>
                    <option value='Mermaid'>Mermaid</option>
                    <option value='Ball Gown'>Ball Gown</option>
                    <option value='Sheath'>Sheath</option>
                    <option value='Empire'>Empire</option>
                    <option value='Shift'>Shift</option>
                    <option value='Wrap'>Wrap</option>
                    <option value='Peplum'>Peplum</option>
                    <option value='Trumpet'>Trumpet</option>
                  </select>
                </div>

                <div className="space-y-3 sm:col-span-2">
                  <label className="text-[9px] font-black text-primary/40 uppercase tracking-widest ml-2">Available Sizes *</label>
                  <div className="flex flex-wrap gap-2">
                    {sizeOptions.map(size => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => handleSizeChange(size)}
                        className={`px-2.5 py-1.5 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-all border ${formData.size.includes(size)
                            ? 'bg-primary text-white border-primary shadow-md shadow-primary/10 scale-102'
                            : 'bg-white/50 text-primary border-gray-100 hover:bg-white'
                          }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="sm:col-span-2 px-1 flex items-center gap-2">
                  <input
                    type='checkbox'
                    id='available'
                    checked={formData.available}
                    onChange={(e) => setFormData({ ...formData, available: e.target.checked })}
                    className='w-4.5 h-4.5 rounded border-gray-200 text-primary focus:ring-primary/20 transition-all'
                  />
                  <label htmlFor='available' className='text-[9px] font-black text-primary uppercase tracking-widest cursor-pointer'>
                    Available for immediate booking
                  </label>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className='flex flex-col sm:flex-row gap-3 pt-3'>
              <button
                type='submit'
                disabled={loading || isRemovingBg}
                className='flex-grow px-8 py-3 bg-primary text-white rounded-xl hover:shadow-[0_15px_40px_rgba(1,62,141,0.15)] hover:-translate-y-0.5 transition-all font-black text-xs uppercase tracking-widest disabled:opacity-50 relative overflow-hidden group'
              >
                <span className="relative z-10">
                  {loading ? 'Saving Apparel...' : (isRemovingBg ? 'AI Processing...' : 'Add to Collection')}
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer"></div>
              </button>
              <button
                type='button'
                onClick={() => navigate('/owner/manage-gown')}
                className='px-8 py-3 bg-white text-primary border border-gray-100 rounded-xl hover:bg-gray-50 transition-all font-black text-xs uppercase tracking-widest'
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
