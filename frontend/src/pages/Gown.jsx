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
        setLoading(true)
        const response = await fetch(`${API_URL}/owner/all-gowns`, { cache: 'no-store' })
        const data = await response.json()

        if (data.success && data.gowns) {
          setError('')
          // Only show gowns that have an owner (deleted gowns won't have owner)
          let validGowns = data.gowns.filter(gown => gown.owner && gown.owner._id)
          
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
          gown.color?.toLowerCase().includes(query)

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
      filtered = filtered.filter(gown => {
        if (Array.isArray(gown.ageGroup)) {
          return gown.ageGroup.some(age => age?.toLowerCase() === selectedAgeGroup.toLowerCase())
        }
        return (gown.ageGroup || '').toLowerCase() === selectedAgeGroup.toLowerCase()
      })
    }

    // Filter by sex
    if (selectedGender) {
      filtered = filtered.filter(gown => {
        if (Array.isArray(gown.sex)) {
          return gown.sex.some(s => s?.toLowerCase() === selectedGender.toLowerCase())
        }
        return (gown.sex || '').toLowerCase() === selectedGender.toLowerCase()
      })
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
    <div className='px-4 sm:px-6 md:px-16 lg:px-24 xl:px-32 mt-12 sm:mt-16 mb-16 pb-20 sm:pb-0 bg-[#FDFDFF] min-h-screen'>
      {error && (
        <div className='mb-6 p-6 bg-red-50 border border-red-100 rounded-[32px] animate-shake flex flex-col sm:flex-row items-center justify-between gap-4'>
          <p className='text-red-800 font-bold flex items-center gap-3 text-lg'>
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
          <button 
            onClick={() => window.location.reload()}
            className='px-8 py-3 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg active:scale-95 text-xs'
          >
            Retry
          </button>
        </div>
      )}

      {/* Header Section */}
      <div className='flex flex-col items-center text-center mb-14 mt-12 lg:mt-0'>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-1 bg-primary rounded-full"></div>
          <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Our Collection</span>
          <div className="w-8 h-1 bg-primary rounded-full"></div>
        </div>
        <h1 className='text-4xl sm:text-5xl md:text-6xl font-black text-primary tracking-tight leading-tight'>
          Available <span className="text-secondary">Apparel</span>
        </h1>
        <p className='text-sm sm:text-base text-gray-500 font-bold mt-2 max-w-2xl'>Discover the perfect fit for your next extraordinary moment.</p>
      </div>

        <div 
          className='sticky top-16 sm:top-20 z-40 py-3 sm:py-6 mb-8 sm:mb-12 bg-white/80 backdrop-blur-2xl -mx-4 sm:mx-0 px-4 sm:px-0 rounded-b-[24px] sm:rounded-b-[40px] shadow-sm'
          onMouseEnter={() => setShowFilters(true)}
          onMouseLeave={() => setShowFilters(false)}
        >
          <div className='max-w-4xl mx-auto'>
            <div className='relative flex items-center gap-4'>
              {/* Search Input */}
              <div className='flex-1 flex items-center bg-white rounded-[20px] sm:rounded-[24px] shadow-[0_15px_40px_rgba(1,62,141,0.05)] border border-blue-50 px-4 sm:px-6 py-3.5 sm:py-5 group focus-within:shadow-[0_20px_60px_rgba(1,62,141,0.12)] focus-within:border-primary/20 transition-all'>
                <img src={assets.search_icon} alt="search" className='w-4 h-4 sm:w-5 sm:h-5 mr-3 sm:mr-4 text-primary opacity-20 group-focus-within:opacity-100 transition-all group-focus-within:scale-110' />
                <input
                  type='text'
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder='Search collection...'
                  className='flex-1 outline-none text-[15px] sm:text-base text-primary font-black placeholder-gray-300 min-w-0 bg-transparent'
                />
                {searchQuery && (
                  <button
                    onClick={() => handleClearSearch()}
                    className='ml-3 text-gray-300 hover:text-primary flex-shrink-0 transition-colors'
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Filter Button */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 sm:gap-3 px-4 sm:px-8 py-3.5 sm:py-5 rounded-[20px] sm:rounded-[24px] shadow-2xl transition-all font-black text-xs sm:text-sm uppercase tracking-widest whitespace-nowrap active:scale-95 ${hasActiveFilters
                  ? 'bg-primary text-white shadow-[0_20px_50px_rgba(1,62,141,0.3)]'
                  : 'bg-white text-primary border border-blue-50 hover:bg-gray-50'
                  }`}
              >
                <svg className={`w-4 h-4 sm:w-5 h-5 transition-transform ${showFilters ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                <span className="hidden xs:inline sm:inline">Filters</span>
                {hasActiveFilters && (
                  <span className='bg-secondary text-primary text-[9px] sm:text-[10px] rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center font-black shadow-inner'>
                    {[selectedColor, selectedEventType, selectedFabric, selectedSize, selectedAgeGroup, selectedGender].filter(Boolean).length}
                  </span>
                )}
              </button>

              {/* Filter Dropdown Panel */}
              {showFilters && (
                <>
                  {/* Light Backdrop Overlay for Mobile */}
                  <div 
                    className='fixed inset-0 bg-primary/5 z-40 sm:hidden animate-fade-in'
                    onClick={() => setShowFilters(false)}
                  />
                  
                  <div className='absolute top-full left-0 right-0 mt-3 bg-gradient-to-br from-white via-white to-blue-50/20 rounded-bl-[40px] rounded-br-[40px] sm:rounded-[40px] shadow-[0_30px_80px_rgba(1,62,141,0.1)] border border-blue-50/50 p-7 sm:p-12 animate-fade-in-down z-50 max-h-[85vh] sm:max-h-[80vh] overflow-y-auto no-scrollbar sm:w-[500px] md:w-[700px] lg:w-[900px] sm:left-auto sm:right-0'>
                    
                    <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10 sm:mb-12'>
                      <div>
                        <h3 className='text-3xl sm:text-4xl font-black text-primary tracking-tighter'>Refine Selection</h3>
                        <p className='text-sm text-gray-400 font-bold mt-1.5'>Discover the perfect fit for your next extraordinary moment.</p>
                      </div>
                      {hasActiveFilters && (
                        <button
                          onClick={handleClearFilters}
                          className='px-6 py-3 bg-secondary/5 text-secondary text-[10px] font-black uppercase tracking-[0.2em] rounded-full hover:bg-secondary/10 transition-all border border-secondary/10 h-fit w-fit'
                        >
                          Reset Filters
                        </button>
                      )}
                    </div>

                  <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-10 mb-14'>
                    {[
                      { label: 'Age Group', value: selectedAgeGroup, setter: setSelectedAgeGroup, options: ['6–9 Years', '10–12 Years', '13–17 Years', '18–29 Years', '30–59 Years', '60+ Years'], default: 'All Ages' },
                      { label: 'Sex', value: selectedGender, setter: setSelectedGender, options: ['Female', 'Male', 'Unisex'], default: 'All Sexes' },
                      { label: 'Color', value: selectedColor, setter: setSelectedColor, options: commonColors, default: 'All Colors' },
                      { label: 'Event Type', value: selectedEventType, setter: setSelectedEventType, options: eventTypes, default: 'All Events' },
                      { label: 'Fabric', value: selectedFabric, setter: setSelectedFabric, options: availableFabrics, default: 'All Fabrics' },
                      { label: 'Size', value: selectedSize, setter: setSelectedSize, options: commonSizes, default: 'All Sizes' }
                    ].map((filter, idx) => (
                      <div key={idx} className="space-y-4">
                        <label className='block text-[10px] font-black text-primary/40 uppercase tracking-widest pl-2'>
                          {filter.label}
                        </label>
                        <div className="relative group">
                          <select
                            value={filter.value}
                            onChange={(e) => filter.setter(e.target.value)}
                            className='w-full h-16 pl-6 pr-12 bg-white border-2 border-gray-50 rounded-[28px] text-[15px] sm:text-base font-black text-primary transition-all focus:border-primary/20 focus:ring-8 focus:ring-primary/5 outline-none appearance-none cursor-pointer truncate shadow-sm hover:shadow-md'
                          >
                            <option value=''>{filter.default}</option>
                            {filter.options.map(opt => (
                              <option key={opt} value={opt} className='font-bold'>{opt}</option>
                            ))}
                          </select>
                          <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-primary/30 group-focus-within:text-primary transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => setShowFilters(false)}
                    className='w-full py-6 bg-primary text-white rounded-full hover:shadow-[0_25px_60px_rgba(1,62,141,0.35)] hover:-translate-y-1 active:scale-[0.98] transition-all font-black text-sm uppercase tracking-[0.3em] relative overflow-hidden group shadow-[0_20px_50px_rgba(1,62,141,0.25)]'
                  >
                    <span className="relative z-10 flex items-center justify-center gap-3">
                      Show {filteredGowns.length} items
                      <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer"></div>
                  </button>
                </div>
              </>
            )}
            </div>
          </div>
        </div>

        {/* Results Count and Gowns Grid */}
        <div className="max-w-7xl mx-auto">
          {hasActiveFilters && (
            <div className='flex items-center gap-4 text-primary/60 mb-10 text-sm font-black'>
              <span className='bg-primary/5 px-4 py-2 rounded-full'>
                <span className='text-primary'>{filteredGowns.length}</span> items discovered
              </span>
              <button
                onClick={handleClearFilters}
                className='text-secondary hover:text-primary transition-colors underline decoration-2 underline-offset-4'
              >
                Reset All
              </button>
            </div>
          )}

          {filteredGowns.length === 0 ? (
            <div className='text-center py-20 px-4 bg-white rounded-[32px] border border-blue-50/50 shadow-[0_20px_60px_rgba(0,0,0,0.02)]'>
              <div className='w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6'>
                <svg className='w-10 h-10 text-gray-300' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' />
                </svg>
              </div>
              <p className='text-2xl font-black text-primary mb-3'>No apparel found</p>
              <p className='text-primary/50 font-bold mb-8'>Try adjusting your search or filters to find what you're looking for.</p>
              {hasActiveFilters && (
                <button
                  onClick={handleClearFilters}
                  className='px-10 py-4 bg-primary text-white rounded-2xl hover:bg-primary-dull transition-all font-black shadow-lg'
                >
                  Clear All Filters
                </button>
              )}
            </div>
          ) : (
            <div className='grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6 lg:gap-8'>
              {filteredGowns.map((gown) => (
                <GownCard key={gown._id || gown.id} gown={gown} />
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

export default Gown
