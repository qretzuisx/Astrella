import React, { useState, useEffect } from 'react'
import { assets } from '../assets/assets'
import GownCard from '../components/GownCard'

const Gown = () => {
  const [gowns, setGowns] = useState([])
  const [filteredGowns, setFilteredGowns] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch gowns from API
    const fetchGowns = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
        const response = await fetch(`${API_URL}/owner/all-gowns`)
        const data = await response.json()
        
        if (data.success && data.gowns) {
          setGowns(data.gowns)
          setFilteredGowns(data.gowns)
        } else {
          // Show empty state if no gowns or API error
          setGowns([])
          setFilteredGowns([])
        }
      } catch (error) {
        console.error('Error fetching gowns:', error)
        // Don't use dummy data, show empty state
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

  // Filter gowns based on search query
  useEffect(() => {
    let filtered = [...gowns]

    // Filter by search query (name, fabric, color, event type)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(gown => 
        gown.name?.toLowerCase().includes(query) ||
        gown.fabric?.toLowerCase().includes(query) ||
        gown.color?.toLowerCase().includes(query) ||
        gown.eventtype?.toLowerCase().includes(query) ||
        gown.eventType?.toLowerCase().includes(query) ||
        gown.description?.toLowerCase().includes(query)
      )
    }

    // Filter only available gowns
    filtered = filtered.filter(gown => gown.available !== false)

    setFilteredGowns(filtered)
  }, [searchQuery, gowns])

  const handleClearSearch = () => {
    setSearchQuery('')
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
    <div className='px-6 md:px-16 lg:px-24 xl:px-32 mt-16 mb-16'>
      {/* Header Section */}
      <div className='text-center mb-12'>
        <h1 className='text-4xl md:text-5xl font-bold text-gray-900 mb-4'>
          Available Apparel
        </h1>
        <p className='text-lg text-gray-600 mb-8'>
          Browse our selection of apparel available for your next event.
        </p>

        {/* Search Bar */}
        <div className='max-w-2xl mx-auto mb-8'>
          <div className='relative flex items-center bg-white rounded-full shadow-lg border border-gray-200 px-4 py-3'>
            <img src={assets.search_icon} alt="search" className='w-5 h-5 mr-3 text-gray-400' />
            <input
              type='text'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder='Search by cloth type, type, or features'
              className='flex-1 outline-none text-gray-700 placeholder-gray-400'
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className='ml-2 text-gray-400 hover:text-gray-600'
              >
                ✕
              </button>
            )}
          </div>
        </div>


        {/* Results Count */}
        {searchQuery && (
          <div className='text-gray-600 mb-8'>
            <span className='font-medium'>{filteredGowns.length}</span> item{filteredGowns.length !== 1 ? 's' : ''} found
            {filteredGowns.length > 0 && (
              <button
                onClick={handleClearSearch}
                className='ml-2 text-sm text-primary hover:underline'
              >
                Clear search
              </button>
            )}
          </div>
        )}
      </div>

      {/* Gowns Grid */}
      {filteredGowns.length === 0 ? (
        <div className='text-center py-16'>
          <p className='text-xl text-gray-500 mb-4'>No apparel found</p>
          <p className='text-gray-400 mb-6'>Try adjusting your search</p>
          {searchQuery && (
            <button
              onClick={handleClearSearch}
              className='px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dull transition-colors'
            >
              Clear Search
            </button>
          )}
        </div>
      ) : (
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8'>
          {filteredGowns.map((gown) => (
            <GownCard key={gown._id} gown={gown} />
          ))}
        </div>
      )}
    </div>
  )
}

export default Gown
