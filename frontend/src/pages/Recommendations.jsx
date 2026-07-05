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
        const ageGroup = searchParams.get('ageGroup') || searchParams.get('age');
        const sex = searchParams.get('sex');

        const params = new URLSearchParams();
        if (bodyType) params.append('bodyType', bodyType);
        if (skinTone) params.append('skinTone', skinTone);
        if (eventType) params.append('eventType', eventType);
        if (faceShape) params.append('faceShape', faceShape);
        if (ageGroup) params.append('ageGroup', ageGroup);
        if (sex) params.append('sex', sex);

        const token = localStorage.getItem('token');
        const headers = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_URL}/ml/recommendations?${params.toString()}`, { headers });
        const data = await response.json();

        if (data.success) {
          // Filter out recommendations below 40% and sort by score (highest first)
          const filtered = (data.recommendations || [])
            .filter(item => item.score >= 40)
            .sort((a, b) => b.score - a.score);

          setRecommendations(filtered);

          // Merge backend preferences with URL params to ensure all fields are populated
          const prefs = {
            ...data.preferences,
            bodyType: bodyType || data.preferences?.bodyType,
            skinTone: skinTone || data.preferences?.skinTone,
            eventType: eventType || data.preferences?.eventType,
            faceShape: faceShape || data.preferences?.faceShape,
            ageGroup: ageGroup || data.preferences?.ageGroup || data.preferences?.age,
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
    if (editedPrefs.ageGroup) params.append('ageGroup', editedPrefs.ageGroup);
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
          bgColor: 'bg-gradient-to-br from-yellow-300 via-yellow-500 to-amber-600',
          textColor: 'text-amber-900',
          borderColor: 'border-yellow-400',
          glowColor: 'shadow-yellow-400'
        };
      case 1: // 2nd place
        return {
          starIcon: assets.star_blue,
          starCount: 2,
          text: 'TOP MATCH',
          bgColor: 'bg-gradient-to-br from-blue-300 via-blue-500 to-indigo-700',
          textColor: 'text-blue-900',
          borderColor: 'border-blue-400',
          glowColor: 'shadow-blue-400'
        };
      case 2: // 3rd place
        return {
          starIcon: assets.star_green,
          starCount: 1,
          text: 'GREAT MATCH',
          bgColor: 'bg-gradient-to-br from-red-400 via-red-500 to-rose-700',
          textColor: 'text-white',
          borderColor: 'border-red-400',
          glowColor: 'shadow-red-400'
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#FDFDFF] via-[#F8FAFF] to-[#F1F5FF]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-6 shadow-2xl shadow-primary/10"></div>
          <p className="text-xl font-black text-primary tracking-tight">Preparing your perfect style...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#FDFDFF] via-[#F8FAFF] to-[#F1F5FF] px-4">
        <div className="text-center max-w-md p-10 bg-white rounded-[40px] shadow-2xl border border-red-50">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-600 mx-auto mb-6">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-red-800 font-black mb-8">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="w-full bg-primary text-white px-8 py-4 rounded-full font-black uppercase tracking-widest hover:bg-primary-dull transition-all shadow-xl active:scale-95"
          >
            Go Back Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FDFDFF] via-[#F8FAFF] to-[#F1F5FF] pt-3 sm:pt-4 pb-8 sm:pb-16 px-4 md:px-8 lg:px-16 xl:px-32">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-2 sm:mb-3">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-primary hover:text-primary-dull font-black transition-all hover:-translate-x-1 group"
          >
            <svg className="w-5 h-5 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="uppercase tracking-widest text-[10px] sm:text-xs">Back to Home</span>
          </button>
        </div>


        {/* Recommendations Display */}
        {recommendations.length > 0 ? (
          <div className="space-y-3">
            {/* Top 3 Section */}
            {topThree.length > 0 && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex flex-col mb-3 sm:mb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 sm:w-8 h-[2px] bg-gradient-to-r from-secondary to-secondary/40 rounded-full"></div>
                    <span className="text-[9px] sm:text-[10px] font-black text-secondary uppercase tracking-[0.3em]">AI Stylist Results</span>
                    <div className="w-6 sm:w-8 h-[2px] bg-gradient-to-l from-secondary to-secondary/40 rounded-full"></div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <h2 className="text-xl sm:text-2xl font-black text-primary tracking-tight">Your Top <span className="text-secondary italic">3 Picks</span></h2>
                      <div className="h-[2px] flex-1 bg-gradient-to-r from-primary/10 to-transparent"></div>
                    </div>
                    {/* Mobile: Pagination Dots at Top */}
                    <div className="flex sm:hidden items-center gap-2 ml-4">
                      <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse"></div>
                      <div className="w-2 h-2 rounded-full bg-primary/20"></div>
                      <div className="w-2 h-2 rounded-full bg-primary/20"></div>
                    </div>
                    {/* Desktop Indicators */}
                    <div className="hidden sm:flex items-center gap-2 ml-4">
                      <div className="w-2 h-2 rounded-full bg-primary/20"></div>
                      <div className="w-2 h-2 rounded-full bg-primary/20"></div>
                      <div className="w-2 h-2 rounded-full bg-primary/20"></div>
                    </div>
                  </div>
                  <p className="text-[10px] sm:text-xs font-bold text-primary/40 uppercase tracking-widest sm:hidden">Swipe to explore Top 3</p>
                </div>

                {/* Mobile: Horizontal Carousel, Desktop: Grid */}
                <div className="flex sm:grid flex-nowrap sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5 overflow-x-auto sm:overflow-visible premium-scrollbar pb-6 sm:pb-8 pt-2 -mx-4 px-4 sm:mx-0 sm:px-0 scroll-snap-x">
                  {topThree.map((item, index) => {
                    const badge = getStarBadge(index);
                    return (
                      <div key={item.gown._id || item.gown.id || index} className="min-w-[85vw] sm:min-w-0 flex flex-col group h-full scroll-snap-align-start">
                        {/* Premium Integrated Wrapper */}
                        <div className="flex-1 flex flex-col rounded-[28px] sm:rounded-[40px] overflow-hidden border border-gray-100 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.05)] transition-all duration-700 group-hover:shadow-[0_40px_100px_rgba(1,62,141,0.15)] group-hover:-translate-y-2">
                          {/* Rank Badge Header */}
                          <div className={`flex items-center justify-between px-4 py-3 sm:px-5 sm:py-4 relative overflow-hidden ${badge.bgColor}`}>
                             {/* Glossy overlay effect */}
                             <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent opacity-50"></div>
                             
                             <div className="flex items-center gap-2 sm:gap-3 relative z-10">
                               <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-[0_8px_32px_rgba(0,0,0,0.1)] border border-white/30`}>
                                  <img src={badge.starIcon} alt="star" className="w-4 h-4 sm:w-5 sm:h-5 brightness-0 invert" />
                               </div>
                               <div>
                                 <p className="text-[8px] sm:text-[9px] font-bold text-white/80 uppercase tracking-widest mb-0.5">Rank #{index + 1}</p>
                                 <span className="font-black text-[10px] sm:text-xs text-white uppercase tracking-widest">{badge.text}</span>
                               </div>
                             </div>

                             <div className="text-right relative z-10">
                               <p className="text-[8px] sm:text-[9px] font-bold text-white/70 uppercase tracking-widest mb-0.5">Match Score</p>
                               <span className="text-xl sm:text-2xl font-black text-white tracking-tighter">{item.score}%</span>
                             </div>

                             {/* Abstract Decorative Circles */}
                             <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
                             <div className="absolute -left-6 -top-6 w-24 h-24 bg-black/5 rounded-full blur-2xl"></div>
                          </div>

                          {/* Seamless Gown Card Body */}
                          <GownCard 
                            gown={item.gown} 
                            customClassName="border-none shadow-none rounded-[28px] sm:rounded-[40px] !p-0 !m-0 hover:translate-y-0"
                            useContainImage={true}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {(preferences.bodyType || preferences.skinTone || preferences.eventType || preferences.faceShape || preferences.ageGroup || preferences.sex) && (
              <div className="bg-white rounded-[32px] sm:rounded-[36px] shadow-lg p-4 sm:p-5 border border-gray-100/50 relative overflow-hidden group">
                {/* Background decorative element */}
                <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full -mr-24 -mt-24 blur-2xl transition-transform duration-700 group-hover:scale-110"></div>
                
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3.5 sm:mb-4 relative z-10">
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-primary tracking-tight mb-0.5">Style Profile</h2>
                    <p className="text-[10px] sm:text-[11px] text-gray-500 font-medium">Refine your traits for even better accuracy.</p>
                  </div>
                  <button
                    onClick={applyPreferences}
                    className="bg-primary text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-full hover:bg-primary-dull transition-all font-black text-[9px] uppercase tracking-[0.2em] shadow-[0_10px_30px_rgba(1,62,141,0.15)] hover:shadow-[0_15px_35px_rgba(1,62,141,0.25)] active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    Update Profile
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3 relative z-10">
                  {/* Body Type */}
                  <div className="space-y-1">
                    <label className="block text-[8px] font-black text-primary/40 uppercase tracking-widest pl-2">Body Type</label>
                    <select
                      value={editedPrefs.bodyType || ''}
                      onChange={(e) => handlePrefChange('bodyType', e.target.value)}
                      className="w-full px-3 py-1.5 bg-gray-50/50 border border-gray-100 rounded-full text-[10px] sm:text-xs font-bold text-primary focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none transition-all appearance-none cursor-pointer"
                    >
                      <option value="">Select</option>
                      {bodyTypeList.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  {/* Skin Tone */}
                  <div className="space-y-1">
                    <label className="block text-[8px] font-black text-primary/40 uppercase tracking-widest pl-2">Skin Tone</label>
                    <select
                      value={editedPrefs.skinTone || ''}
                      onChange={(e) => handlePrefChange('skinTone', e.target.value)}
                      className="w-full px-3 py-1.5 bg-gray-50/50 border border-gray-100 rounded-full text-[10px] sm:text-xs font-bold text-primary focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none transition-all appearance-none cursor-pointer"
                    >
                      <option value="">Select</option>
                      {skinToneList.map(tone => (
                        <option key={tone} value={tone}>{tone}</option>
                      ))}
                    </select>
                  </div>

                  {/* Event Type */}
                  <div className="space-y-1">
                    <label className="block text-[8px] font-black text-primary/40 uppercase tracking-widest pl-2">Events</label>
                    <select
                      value={editedPrefs.eventType || ''}
                      onChange={(e) => handlePrefChange('eventType', e.target.value)}
                      className="w-full px-3 py-1.5 bg-gray-50/50 border border-gray-100 rounded-full text-[10px] sm:text-xs font-bold text-primary focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none transition-all appearance-none cursor-pointer"
                    >
                      <option value="">Select</option>
                      {eventTypeList.map(event => (
                        <option key={event} value={event}>{event}</option>
                      ))}
                    </select>
                  </div>

                  {/* Face Shape */}
                  <div className="space-y-1">
                    <label className="block text-[8px] font-black text-primary/40 uppercase tracking-widest pl-2">Face Shape</label>
                    <select
                      value={editedPrefs.faceShape || ''}
                      onChange={(e) => handlePrefChange('faceShape', e.target.value)}
                      className="w-full px-3 py-1.5 bg-gray-50/50 border border-gray-100 rounded-full text-[10px] sm:text-xs font-bold text-primary focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none transition-all appearance-none cursor-pointer"
                    >
                      <option value="">Select</option>
                      {faceShapeList.map(shape => (
                        <option key={shape} value={shape}>{shape}</option>
                      ))}
                    </select>
                  </div>

                  {/* Age Group */}
                  <div className="space-y-1">
                    <label className="block text-[8px] font-black text-primary/40 uppercase tracking-widest pl-2">Age Group</label>
                    <select
                      value={editedPrefs.ageGroup || ''}
                      onChange={(e) => handlePrefChange('ageGroup', e.target.value)}
                      className="w-full px-3 py-1.5 bg-gray-50/50 border border-gray-100 rounded-full text-[10px] sm:text-xs font-bold text-primary focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none transition-all appearance-none cursor-pointer"
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
                  <div className="space-y-1">
                    <label className="block text-[8px] font-black text-primary/40 uppercase tracking-widest pl-2">Category</label>
                    <select
                      value={editedPrefs.sex || ''}
                      onChange={(e) => handlePrefChange('sex', e.target.value)}
                      className="w-full px-3 py-1.5 bg-gray-50/50 border border-gray-100 rounded-full text-[10px] sm:text-xs font-bold text-primary focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none transition-all appearance-none cursor-pointer"
                    >
                      <option value="">Select</option>
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                      <option value="Unisex">Unisex</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Other Recommendations */}
            {others.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-8 sm:mb-10">
                  <div className="flex items-center gap-4 flex-1">
                    <h2 className="text-xl sm:text-2xl font-black text-primary tracking-tight">Galleries</h2>
                    <div className="h-[2px] flex-1 bg-gradient-to-r from-primary/10 to-transparent"></div>
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-black text-primary/30 uppercase tracking-[0.2em] ml-4">{others.length} Items</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3 xl:gap-5">
                  {others.map((item, index) => (
                    <div key={item.gown._id || item.gown.id || index} className="flex flex-col group animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
                      <div className="rounded-[24px] sm:rounded-[32px] overflow-hidden border border-gray-100 shadow-sm transition-all duration-500 group-hover:shadow-2xl group-hover:shadow-primary/5 group-hover:-translate-y-1 bg-white flex-1 flex flex-col">
                        <GownCard gown={item.gown} />
                      </div>
                      {item.matchReason && (
                        <p className="text-[9px] sm:text-[10px] font-bold text-gray-400 mt-3 sm:mt-4 text-center px-2 sm:px-4 leading-relaxed group-hover:text-primary transition-colors">
                          {item.matchReason}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* View All Gowns Button */}
            <div className="text-center py-6 mt-6 mb-10 relative z-10">
              <p className="text-xs sm:text-sm text-gray-500 font-medium mb-3">Still searching for your signature look?</p>
              <button
                onClick={() => navigate('/gowns')}
                className="bg-primary text-white px-6 py-2.5 rounded-full hover:bg-primary-dull transition-all font-black text-xs uppercase tracking-wider active:scale-95 shadow-[0_8px_20px_rgba(1,62,141,0.15)]"
              >
                Browse Entire Catalog
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-[32px] sm:rounded-[36px] shadow-lg border border-gray-100 animate-fade-in">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-base sm:text-lg font-black text-primary mb-6 max-w-sm mx-auto">We couldn't find matches that meet your style criteria (50%+ match).</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center px-4">
              <button
                onClick={() => navigate('/')}
                className="w-full sm:w-auto px-8 py-3.5 bg-primary text-white rounded-full font-black text-xs sm:text-sm uppercase tracking-widest hover:bg-primary-dull transition-all shadow-md active:scale-95"
              >
                Start Over
              </button>
              <button
                onClick={() => navigate('/gowns')}
                className="w-full sm:w-auto px-8 py-3.5 bg-white text-primary border-2 border-primary/10 rounded-full font-black text-xs sm:text-sm uppercase tracking-widest hover:bg-primary hover:text-white hover:border-primary transition-all active:scale-95"
              >
                Browse All
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Recommendations;

