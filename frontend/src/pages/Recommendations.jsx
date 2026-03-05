import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import GownCard from '../components/GownCard';
import { assets, bodyTypeList, skinToneList, faceShapeList, eventTypeList } from '../assets/assets';
import { API_URL } from '../config';

const Recommendations = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState({});
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editedPrefs, setEditedPrefs] = useState({});

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        setLoading(true);
        // Get preferences from URL params
        const bodyType = searchParams.get('bodyType');
        const skinTone = searchParams.get('skinTone');
        const eventType = searchParams.get('eventType');
        const faceShape = searchParams.get('faceShape');
        const age = searchParams.get('age');
        const sex = searchParams.get('sex');

        const params = new URLSearchParams();
        if (bodyType) params.append('bodyType', bodyType);
        if (skinTone) params.append('skinTone', skinTone);
        if (eventType) params.append('eventType', eventType);
        if (faceShape) params.append('faceShape', faceShape);
        if (age) params.append('age', age);
        if (sex) params.append('sex', sex);

        const response = await fetch(`${API_URL}/user/recommendations?${params.toString()}`);
        const data = await response.json();

        if (data.success) {
          // Filter out recommendations below 50% and sort by score (highest first)
          const filtered = (data.recommendations || [])
            .filter(item => item.score >= 50)
            .sort((a, b) => b.score - a.score);
          
          setRecommendations(filtered);
          
          // Merge backend preferences with URL params to ensure all fields are populated
          const prefs = {
            ...data.preferences,
            bodyType: bodyType || data.preferences?.bodyType,
            skinTone: skinTone || data.preferences?.skinTone,
            eventType: eventType || data.preferences?.eventType,
            faceShape: faceShape || data.preferences?.faceShape,
            age: age || data.preferences?.age,
            sex: sex || data.preferences?.sex
          };
          
          setPreferences(prefs);
          setEditedPrefs(prefs); // Initialize edited prefs with current values
        } else {
          setError(data.message || 'Failed to fetch recommendations');
        }
      } catch (error) {
        console.error('Error fetching recommendations:', error);
        setError('Failed to load recommendations. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [searchParams]);

  // Handle preference changes
  const handlePrefChange = (field, value) => {
    setEditedPrefs(prev => ({ ...prev, [field]: value }));
  };

  // Apply new preferences and reload recommendations
  const applyPreferences = () => {
    const params = new URLSearchParams();
    if (editedPrefs.bodyType) params.append('bodyType', editedPrefs.bodyType);
    if (editedPrefs.skinTone) params.append('skinTone', editedPrefs.skinTone);
    if (editedPrefs.eventType) params.append('eventType', editedPrefs.eventType);
    if (editedPrefs.faceShape) params.append('faceShape', editedPrefs.faceShape);
    if (editedPrefs.age) params.append('age', editedPrefs.age);
    if (editedPrefs.sex) params.append('sex', editedPrefs.sex);
    
    navigate(`/recommendations?${params.toString()}`);
    setEditMode(false);
  };

  // Get stars and badge for top 3 ranked items
  const getStarBadge = (rank) => {
    switch (rank) {
      case 0: // 1st place
        return {
          starIcon: assets.star_gold,
          starCount: 3,
          text: 'BEST MATCH',
          bgColor: 'bg-gradient-to-r from-yellow-400 to-yellow-500',
          textColor: 'text-yellow-900',
          borderColor: 'border-yellow-400',
          glowColor: 'shadow-yellow-300'
        };
      case 1: // 2nd place
        return {
          starIcon: assets.star_blue,
          starCount: 2,
          text: 'TOP MATCH',
          bgColor: 'bg-gradient-to-r from-blue-400 to-blue-500',
          textColor: 'text-blue-900',
          borderColor: 'border-blue-400',
          glowColor: 'shadow-blue-300'
        };
      case 2: // 3rd place
        return {
          starIcon: assets.star_green,
          starCount: 1,
          text: 'GREAT MATCH',
          bgColor: 'bg-gradient-to-r from-green-400 to-green-500',
          textColor: 'text-green-900',
          borderColor: 'border-green-400',
          glowColor: 'shadow-green-300'
        };
      default:
        return null;
    }
  };
  
  // Split recommendations into top 3 and others
  const topThree = recommendations.slice(0, 3);
  const others = recommendations.slice(3);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-light">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Finding your perfect apparel...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-light px-4">
        <div className="text-center max-w-md">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="bg-primary text-white px-6 py-2 rounded-full hover:bg-primary-dull transition-all"
          >
            Go Back Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-light py-12 px-4 md:px-8 lg:px-16">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/')}
            className="text-primary hover:text-primary-dull mb-4 flex items-center gap-2"
          >
            <span>←</span> Back to Home
          </button>
          <h1 className="text-4xl font-bold mb-2">Your Style Recommendations</h1>
          <p className="text-gray-600">
            We found {recommendations.length} gown{recommendations.length !== 1 ? 's' : ''} that match your preferences
          </p>
        </div>

        {/* Empty state when no recommendations */}
        {!loading && recommendations.length === 0 && (
          <div className="text-center py-12 px-4 bg-gray-50 rounded-xl border border-gray-200">
            <p className="text-lg font-semibold text-gray-800 mb-2">No recommendations match your preferences</p>
            <p className="text-gray-600 mb-4">Try adjusting your body type, skin tone, face shape, or event type to see more options.</p>
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-dull transition-colors"
            >
              Back to Home
            </button>
          </div>
        )}

        {/* Recommendations Display */}
        {recommendations.length > 0 ? (
          <div className="space-y-12">
            {/* Top 3 Section */}
            {topThree.length > 0 && (
              <div>
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-gray-800">Your Top {topThree.length} Match{topThree.length !== 1 ? 'es' : ''}</h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                  {topThree.map((item, index) => {
                    const badge = getStarBadge(index);
                    return (
                      <div key={item.gown._id || item.gown.id || index} className="relative group flex flex-col">
                        {/* Star Badge - Big and Prominent */}
                        <div className={`${badge.bgColor} ${badge.textColor} px-5 py-4 rounded-t-lg border-b-2 ${badge.borderColor} shadow-lg ${badge.glowColor}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              {/* SVG Stars */}
                              <div className="flex items-center gap-1">
                                {[...Array(badge.starCount)].map((_, i) => (
                                  <img key={i} src={badge.starIcon} alt="star" className="w-6 h-6" />
                                ))}
                              </div>
                              <span className="font-extrabold text-base">{badge.text}</span>
                            </div>
                            <span className="text-xl font-extrabold">{item.score}%</span>
                          </div>
                        </div>
                        
                        {/* Gown Card - Fixed height for consistency */}
                        <div className="flex-1 flex flex-col">
                          <GownCard gown={item.gown} />
                        </div>
                        
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Your Preferences - Between Top 3 and Others */}
            {(preferences.bodyType || preferences.skinTone || preferences.eventType || preferences.faceShape || preferences.age || preferences.sex) && (
              <div className="bg-white rounded-lg shadow-md p-6 mb-8 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-800">Your Preferences</h2>
                  <button
                    onClick={applyPreferences}
                    className="bg-primary text-white px-6 py-2.5 rounded-full hover:bg-primary-dull transition-all font-semibold text-sm shadow-md"
                  >
                    Update
                  </button>
                </div>

                {/* Grid with labels */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  
                  {/* Body Type */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Body Type</label>
                    <select
                      value={editedPrefs.bodyType || ''}
                      onChange={(e) => handlePrefChange('bodyType', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-full text-sm text-gray-800 hover:border-primary focus:border-primary focus:outline-none transition-all bg-white shadow-sm"
                    >
                      <option value="">Select</option>
                      {bodyTypeList.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  {/* Skin Tone */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Skin Tone</label>
                    <select
                      value={editedPrefs.skinTone || ''}
                      onChange={(e) => handlePrefChange('skinTone', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-full text-sm text-gray-800 hover:border-primary focus:border-primary focus:outline-none transition-all bg-white shadow-sm"
                    >
                      <option value="">Select</option>
                      {skinToneList.map(tone => (
                        <option key={tone} value={tone}>{tone}</option>
                      ))}
                    </select>
                  </div>

                  {/* Event Type */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Event Type</label>
                    <select
                      value={editedPrefs.eventType || ''}
                      onChange={(e) => handlePrefChange('eventType', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-full text-sm text-gray-800 hover:border-primary focus:border-primary focus:outline-none transition-all bg-white shadow-sm"
                    >
                      <option value="">Select</option>
                      {eventTypeList.map(event => (
                        <option key={event} value={event}>{event}</option>
                      ))}
                    </select>
                  </div>

                  {/* Face Shape */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Face Shape</label>
                    <select
                      value={editedPrefs.faceShape || ''}
                      onChange={(e) => handlePrefChange('faceShape', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-full text-sm text-gray-800 hover:border-primary focus:border-primary focus:outline-none transition-all bg-white shadow-sm"
                    >
                      <option value="">Select</option>
                      {faceShapeList.map(shape => (
                        <option key={shape} value={shape}>{shape}</option>
                      ))}
                    </select>
                  </div>

                  {/* Age Group */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Age Group</label>
                    <select
                      value={editedPrefs.age || ''}
                      onChange={(e) => handlePrefChange('age', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-full text-sm text-gray-800 hover:border-primary focus:border-primary focus:outline-none transition-all bg-white shadow-sm"
                    >
                      <option value="">Select</option>
                      <option value="6–9 Years">6–9 Years</option>
                      <option value="10–12 Years">10–12 Years</option>
                      <option value="13–17 Years">13–17 Years</option>
                      <option value="18–29 Years">18–29 Years</option>
                      <option value="30–59 Years">30–59 Years</option>
                      <option value="60+ Years">60+ Years</option>
                    </select>
                  </div>

                  {/* Sex */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Sex</label>
                    <select
                      value={editedPrefs.sex || ''}
                      onChange={(e) => handlePrefChange('sex', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-full text-sm text-gray-800 hover:border-primary focus:border-primary focus:outline-none transition-all bg-white shadow-sm"
                    >
                      <option value="">Select</option>
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Other Recommendations */}
            {others.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-700">Other Recommendations</h2>
                  <span className="text-sm text-gray-500">{others.length} more option{others.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
                  {others.map((item, index) => (
                    <div key={item.gown._id || item.gown.id || index} className="flex flex-col">
                      <GownCard gown={item.gown} />
                      {item.matchReason && (
                        <p className="text-xs text-gray-400 mt-2 text-center line-clamp-2">
                          {item.matchReason}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* View All Gowns Button */}
            <div className="text-center py-8 bg-white rounded-lg shadow-sm border-2 border-dashed border-gray-300">
              <p className="text-gray-600 mb-4">Not finding what you're looking for?</p>
              <button
                onClick={() => navigate('/gowns')}
                className="bg-white text-primary border-2 border-primary px-8 py-3 rounded-full hover:bg-primary hover:text-white transition-all font-semibold"
              >
                Browse All Gowns
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <p className="text-gray-600 mb-4">No gowns found matching your preferences (50%+ match).</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              <button
                onClick={() => navigate('/')}
                className="bg-primary text-white px-6 py-2 rounded-full hover:bg-primary-dull transition-all"
              >
                Try Different Preferences
              </button>
              <button
                onClick={() => navigate('/gowns')}
                className="bg-white text-primary border-2 border-primary px-6 py-2 rounded-full hover:bg-primary hover:text-white transition-all"
              >
                Browse All Gowns
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Recommendations;

