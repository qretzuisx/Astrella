import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { assets } from '../assets/assets'
import { API_URL } from '../config'
import GownCard from '../components/GownCard'

const Gown = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [gowns, setGowns] = useState([])
  const [filteredGowns, setFilteredGowns] = useState([])
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')
  const [selectedColor, setSelectedColor] = useState('')
  const [selectedEventType, setSelectedEventType] = useState('')
  const [selectedFabric, setSelectedFabric] = useState('')
  const [selectedSize, setSelectedSize] = useState('')
  const [selectedAgeGroup, setSelectedAgeGroup] = useState('')
  const [selectedGender, setSelectedGender] = useState('')
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [error, setError] = useState('')
  
  // Extract unique values for filters
  const [availableFabrics, setAvailableFabrics] = useState([])
  
  // Predefined common colors
  const commonColors = [
    'Red', 'Blue', 'Green', 'Yellow', 'Orange', 'Purple', 
    'Pink', 'Black', 'White', 'Gray', 'Brown', 'Beige',
    'Gold', 'Silver', 'Maroon', 'Navy', 'Teal', 'Lavender'
  ]
  const eventTypes = ['wedding', 'traditional', 'prom', 'formal', 'themed']
  const commonSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free Size']

  // Update search query when URL params change
  useEffect(() => {
    const urlSearch = searchParams.get('search')
    if (urlSearch) {
      setSearchQuery(urlSearch)
    }
  }, [searchParams])

  useEffect(() => {
    // Fetch gowns from API
    const fetchGowns = async () => {
      try {
        const response = await fetch(`${API_URL}/owner/all-gowns`, { cache: 'no-store' })
        const data = await response.json()
        
        if (data.success && data.gowns) {
          setError('')
          // Only show gowns that have an owner (deleted gowns won't have owner)
          const validGowns = data.gowns.filter(gown => gown.owner && gown.owner._id)
          setGowns(validGowns)
          setFilteredGowns(validGowns)
          
          // Extract unique fabrics for filter options
          const fabrics = [...new Set(validGowns.map(g => g.fabric).filter(Boolean))]
          setAvailableFabrics(fabrics.sort())
        } else {
          // Show empty state if no gowns or API error
          setGowns([])
          setFilteredGowns([])
        }
      } catch (err) {
        console.error('Error fetching gowns:', err)
        setError('Failed to load apparel. Please try again.')
        setGowns([])
        setFilteredGowns([])
      } finally {
        setLoading(false)
      }
    }

    fetchGowns()
    
    // Refresh every 30 seconds to get new gowns
    const refreshInterval = setInterval(fetchGowns, 30000)
    
    return () => clearInterval(refreshInterval)
  }, [])

  // Filter gowns based on search query and filters
  useEffect(() => {
    let filtered = [...gowns]

    // Filter by search query (name, fabric, color, event type)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(gown => {
        // Check basic fields
        const basicMatch = 
          gown.name?.toLowerCase().includes(query) ||
          gown.fabric?.toLowerCase().includes(query) ||
          gown.color?.toLowerCase().includes(query) ||
          gown.description?.toLowerCase().includes(query)
        
        // Check eventType (handle both array and string)
        let eventMatch = false
        if (Array.isArray(gown.eventType)) {
          eventMatch = gown.eventType.some(e => e?.toLowerCase().includes(query))
        } else {
          eventMatch = 
            gown.eventtype?.toLowerCase().includes(query) ||
            gown.eventType?.toLowerCase().includes(query)
        }
        
        return basicMatch || eventMatch
      })
    }

    // Filter by color
    if (selectedColor) {
      filtered = filtered.filter(gown => 
        gown.color?.toLowerCase() === selectedColor.toLowerCase()
      )
    }

    // Filter by event type
    if (selectedEventType) {
      filtered = filtered.filter(gown => {
        // Handle array of event types
        if (Array.isArray(gown.eventType)) {
          return gown.eventType.some(e => 
            e?.toLowerCase() === selectedEventType.toLowerCase()
          )
        }
        // Backward compatibility for string eventType
        return (
          gown.eventType?.toLowerCase() === selectedEventType.toLowerCase() ||
          gown.eventtype?.toLowerCase() === selectedEventType.toLowerCase()
        )
      })
    }

    // Filter by fabric
    if (selectedFabric) {
      filtered = filtered.filter(gown => 
        gown.fabric?.toLowerCase() === selectedFabric.toLowerCase()
      )
    }

    // Filter by size
    if (selectedSize) {
      filtered = filtered.filter(gown => 
        gown.size && Array.isArray(gown.size) && 
        gown.size.some(s => s?.toLowerCase() === selectedSize.toLowerCase())
      )
    }

    // Filter by age group
    if (selectedAgeGroup) {
      filtered = filtered.filter(gown => (gown.ageGroup || '').toLowerCase() === selectedAgeGroup.toLowerCase())
    }

    // Filter by sex
    if (selectedGender) {
      filtered = filtered.filter(gown => (gown.sex || '').toLowerCase() === selectedGender.toLowerCase())
    }

    setFilteredGowns(filtered)
  }, [searchQuery, selectedColor, selectedEventType, selectedFabric, selectedSize, selectedAgeGroup, selectedGender, gowns])

  const handleClearSearch = () => {
    setSearchQuery('')
    setSearchParams({}) // Clear URL params
  }

  const handleClearFilters = () => {
    setSelectedColor('')
    setSelectedEventType('')
    setSelectedFabric('')
    setSelectedSize('')
    setSelectedAgeGroup('')
    setSelectedGender('')
    setSearchQuery('')
    setSearchParams({})
  }

  const hasActiveFilters = searchQuery || selectedColor || selectedEventType || selectedFabric || selectedSize || selectedAgeGroup || selectedGender

  const handleSearchChange = (value) => {
    setSearchQuery(value)
    // Update URL params when typing in the search box
    if (value.trim()) {
      setSearchParams({ search: value.trim() })
    } else {
      setSearchParams({})
    }
  }

  if (loading) {
    return (
      <div className='px-6 md:px-16 lg:px-24 xl:px-32 mt-16 flex items-center justify-center min-h-[60vh]'>
        <div className='text-center'>
          <p className='text-xl text-gray-500 mb-4'>Loading apparel...</p>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto'></div>
        </div>
      </div>
    )
  }

  return (
    <div className='px-4 sm:px-6 md:px-16 lg:px-24 xl:px-32 mt-12 sm:mt-16 mb-16'>
      {error && (
        <div className='mb-4 p-4 bg-red-50 border border-red-200 rounded-lg'>
          <p className='text-red-800 font-medium'>{error}</p>
        </div>
      )}
      {/* Header Section */}
      <div className='text-center mb-8 sm:mb-12'>
        <h1 className='text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-3 sm:mb-4'>
          Available Apparel
        </h1>
        <p className='text-base sm:text-lg text-gray-600 mb-6 sm:mb-8 px-4'>
          Browse our selection of apparel available for your next event.
        </p>

        {/* Search Bar with Filter Button */}
        <div className='sticky top-16 sm:top-20 z-10 py-3 sm:py-4 mb-6 sm:mb-8 bg-white/80 backdrop-blur-sm -mx-4 sm:mx-0 px-4 sm:px-0'>
          <div className='max-w-2xl mx-auto'>
            <div className='relative flex items-center gap-2 sm:gap-3'>
            {/* Search Input */}
            <div className='flex-1 flex items-center bg-white rounded-full shadow-lg border border-gray-200 px-3 sm:px-4 py-2 sm:py-3'>
              <img src={assets.search_icon} alt="search" className='w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3 text-gray-400 flex-shrink-0' />
              <input
                type='text'
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder='Search apparel...'
                className='flex-1 outline-none text-sm sm:text-base text-gray-700 placeholder-gray-400 min-w-0'
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className='ml-2 text-gray-400 hover:text-gray-600 flex-shrink-0'
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filter Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`relative px-3 sm:px-4 py-2 sm:py-3 rounded-full shadow-lg border transition-all flex-shrink-0 ${
                hasActiveFilters 
                  ? 'bg-primary text-white border-primary' 
                  : 'bg-white text-gray-700 border-gray-200 hover:border-primary hover:text-primary'
              }`}
            >
              <div className='flex items-center gap-1 sm:gap-2'>
                <img 
                  src={assets.filter_icon} 
                  alt="filter" 
                  className='w-4 h-4 sm:w-5 sm:h-5'
                  style={{ filter: hasActiveFilters ? 'brightness(0) invert(1)' : 'none' }}
                />
                <span className='font-medium hidden md:inline text-sm sm:text-base'>Filter</span>
                {hasActiveFilters && (
                  <span className='absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center font-bold'>
                    {[selectedColor, selectedEventType, selectedFabric, selectedSize, selectedAgeGroup, selectedGender].filter(Boolean).length}
                  </span>
                )}
              </div>
            </button>
          </div>

          {/* Filter Dropdown Panel */}
          {showFilters && (
            <div className='mt-3 sm:mt-4 bg-white rounded-xl sm:rounded-2xl shadow-xl border border-gray-200 p-3 sm:p-4'>
              <div className='flex items-center justify-between mb-3'>
                <h3 className='text-sm sm:text-base font-semibold text-gray-900'>Filters</h3>
                {hasActiveFilters && (
                  <button
                    onClick={handleClearFilters}
                    className='text-xs sm:text-sm text-primary hover:underline font-medium'
                  >
                    Clear All
                  </button>
                )}
              </div>

              {/* Grid Layout for Filters */}
              <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 mb-3'>
                {/* Age Group Filter */}
                <div>
                  <label className='flex items-center gap-1 text-xs font-medium text-gray-700 mb-1.5'>
                    Age Group
                  </label>
                  <select
                    value={selectedAgeGroup}
                    onChange={(e) => setSelectedAgeGroup(e.target.value)}
                    className='w-full px-2 sm:px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg bg-white text-gray-700 outline-none focus:ring-2 focus:ring-primary focus:border-primary cursor-pointer'
                  >
                    <option value=''>All</option>
                    <option value='6–9 Years'>6–9 Years</option>
                    <option value='10–12 Years'>10–12 Years</option>
                    <option value='13–17 Years'>13–17 Years</option>
                    <option value='18–29 Years'>18–29 Years</option>
                    <option value='30–59 Years'>30–59 Years</option>
                    <option value='60+ Years'>60+ Years</option>
                  </select>
                </div>

                {/* Gender Filter */}
                <div>
                  <label className='flex items-center gap-1 text-xs font-medium text-gray-700 mb-1.5'>
                    Gender
                  </label>
                  <select
                    value={selectedGender}
                    onChange={(e) => setSelectedGender(e.target.value)}
                    className='w-full px-2 sm:px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg bg-white text-gray-700 outline-none focus:ring-2 focus:ring-primary focus:border-primary cursor-pointer'
                  >
                    <option value=''>All</option>
                    <option value='Female'>Female</option>
                    <option value='Male'>Male</option>
                    <option value='Unisex'>Unisex</option>
                  </select>
                </div>
                {/* Color Filter */}
                <div>
                  <label className='flex items-center gap-1 text-xs font-medium text-gray-700 mb-1.5'>
                    <img src={assets.color_icon} alt="color" className='w-3 h-3' />
                    Color
                  </label>
                  <select
                    value={selectedColor}
                    onChange={(e) => setSelectedColor(e.target.value)}
                    className='w-full px-2 sm:px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg bg-white text-gray-700 outline-none focus:ring-2 focus:ring-primary focus:border-primary cursor-pointer'
                  >
                    <option value=''>All Colors</option>
                    {commonColors.map(color => (
                      <option key={color} value={color}>{color}</option>
                    ))}
                  </select>
                </div>

                {/* Event Type Filter */}
                <div>
                  <label className='flex items-center gap-1 text-xs font-medium text-gray-700 mb-1.5'>
                    <img src={assets.event_icon} alt="event" className='w-3 h-3' />
                    Event Type
                  </label>
                  <select
                    value={selectedEventType}
                    onChange={(e) => setSelectedEventType(e.target.value)}
                    className='w-full px-2 sm:px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg bg-white text-gray-700 outline-none focus:ring-2 focus:ring-primary focus:border-primary cursor-pointer'
                  >
                    <option value=''>All Events</option>
                    {eventTypes.map(type => (
                      <option key={type} value={type} className='capitalize'>{type}</option>
                    ))}
                  </select>
                </div>

                {/* Fabric Filter */}
                <div>
                  <label className='flex items-center gap-1 text-xs font-medium text-gray-700 mb-1.5'>
                    <img src={assets.fabric_icon} alt="fabric" className='w-3 h-3' />
                    Fabric
                  </label>
                  <select
                    value={selectedFabric}
                    onChange={(e) => setSelectedFabric(e.target.value)}
                    className='w-full px-2 sm:px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg bg-white text-gray-700 outline-none focus:ring-2 focus:ring-primary focus:border-primary cursor-pointer'
                  >
                    <option value=''>All Fabrics</option>
                    {availableFabrics.map(fabric => (
                      <option key={fabric} value={fabric}>{fabric}</option>
                    ))}
                  </select>
                </div>

                {/* Size Filter */}
                <div>
                  <label className='flex items-center gap-1 text-xs font-medium text-gray-700 mb-1.5'>
                    <img src={assets.size_icon} alt="size" className='w-3 h-3' />
                    Size
                  </label>
                  <select
                    value={selectedSize}
                    onChange={(e) => setSelectedSize(e.target.value)}
                    className='w-full px-2 sm:px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg bg-white text-gray-700 outline-none focus:ring-2 focus:ring-primary focus:border-primary cursor-pointer'
                  >
                    <option value=''>All Sizes</option>
                    {commonSizes.map(size => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Apply Button */}
              <button
                onClick={() => setShowFilters(false)}
                className='w-full px-3 py-2.5 bg-primary text-white text-sm sm:text-base rounded-lg hover:bg-primary-dull transition-colors font-semibold'
              >
                Apply Filters
              </button>
            </div>
          )}
          </div>
        </div>

        {/* Results Count */}
        {hasActiveFilters && (
          <div className='text-gray-600 mb-6 sm:mb-8 text-sm sm:text-base px-4 sm:px-0'>
            <span className='font-medium'>{filteredGowns.length}</span> item{filteredGowns.length !== 1 ? 's' : ''} found
            {filteredGowns.length > 0 && (
              <button
                onClick={handleClearFilters}
                className='ml-2 text-xs sm:text-sm text-primary hover:underline'
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Gowns Grid */}
      {filteredGowns.length === 0 ? (
        <div className='text-center py-12 sm:py-16 px-4'>
          <p className='text-lg sm:text-xl text-gray-500 mb-3 sm:mb-4'>No apparel found</p>
          <p className='text-sm sm:text-base text-gray-400 mb-4 sm:mb-6'>Try adjusting your search or filters</p>
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className='px-5 sm:px-6 py-2 text-sm sm:text-base bg-primary text-white rounded-lg hover:bg-primary-dull transition-colors'
            >
              Clear All Filters
            </button>
          )}
        </div>
      ) : (
        <div className='grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5 lg:gap-6'>
          {filteredGowns.map((gown) => (
            <GownCard key={gown._id || gown.id} gown={gown} />
          ))}
        </div>
      )}
    </div>
  )
}

export default Gown
