import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { assets, bodyTypeList, eventTypeList, faceShapeList, skinToneList } from '../assets/assets';
import ImageAnalysis from './ImageAnalysis';
import { API_URL, CURRENCY } from '../config';
import GownCard from './GownCard';

import AttributeSelector from './AttributeSelector';

const Hero = () => {
  const navigate = useNavigate();
  const [bodyType, setBodyType] = useState('');
  const [skinTone, setSkinTone] = useState('');
  const [eventType, seteventType] = useState('');
  const [faceShape, setfaceShape] = useState('');
  const [ageGroup, setAgeGroup] = useState('');
  const [sex, setSex] = useState('');
  const [showImageAnalysis, setShowImageAnalysis] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [popularGowns, setPopularGowns] = useState([]);
  const [loadingGowns, setLoadingGowns] = useState(true);

  const currency = CURRENCY;

  useEffect(() => {
    const fetchPopularGowns = async () => {
      try {
        setLoadingGowns(true);
        const response = await fetch(`${API_URL}/owner/trending-gowns`);
        const data = await response.json();
        if (data.success && data.gowns) {
          setPopularGowns(data.gowns || []);
        }
      } catch (err) {
        console.error('Error fetching trending gowns:', err);
      } finally {
        setLoadingGowns(false);
      }
    };
    fetchPopularGowns();
  }, []);

  const handleImageAnalysisComplete = (results) => {
    console.log('📥 Received analysis results:', results);
    setSkinTone(results.skinTone || 'Neutral');
    setBodyType(results.bodyType || 'Rectangle');
    setfaceShape(results.faceShape || 'Oval');

    if (results.ageGroup) {
      setAgeGroup(results.ageGroup);
    } else if (results.age) {
      const estimatedAge = parseInt(results.age, 10);
      if (estimatedAge >= 6 && estimatedAge <= 9) setAgeGroup('6–9 Years');
      else if (estimatedAge >= 10 && estimatedAge <= 12) setAgeGroup('10–12 Years');
      else if (estimatedAge >= 13 && estimatedAge <= 17) setAgeGroup('13–17 Years');
      else if (estimatedAge >= 18 && estimatedAge <= 29) setAgeGroup('18–29 Years');
      else if (estimatedAge >= 30 && estimatedAge <= 59) setAgeGroup('30–59 Years');
      else if (estimatedAge >= 60) setAgeGroup('60+ Years');
    }

    if (results.sex) {
      setSex(results.sex === 'Male' ? 'Male' : results.sex);
    }

    setShowImageAnalysis(false);
    setValidationError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setValidationError('');

    const missingFields = [];
    if (!bodyType) missingFields.push('Body Type');
    if (!skinTone) missingFields.push('Skin Tone');
    if (!eventType) missingFields.push('Event Type');
    if (!faceShape) missingFields.push('Face Shape');
    if (!ageGroup) missingFields.push('Age Group');
    if (!sex) missingFields.push('Sex');

    if (missingFields.length > 0) {
      setValidationError(`Please select: ${missingFields.join(', ')}`);
      return;
    }

    const params = new URLSearchParams();
    params.append('bodyType', bodyType);
    params.append('skinTone', skinTone);
    params.append('eventType', eventType);
    params.append('faceShape', faceShape);
    params.append('age', ageGroup);
    params.append('sex', sex);

    navigate(`/recommendations?${params.toString()}`);
  };

  return (
    <div className='h-[calc(100vh-64px)] min-h-[500px] flex flex-col items-center justify-center px-4 relative bg-[#FDFDFF] w-full'>

      {/* Hero Headline */}
      <div className="max-w-3xl mx-auto z-10 text-center space-y-0.5 mb-4 mt-2 sm:mt-0">
        <h1 className='text-5xl sm:text-7xl font-black text-primary tracking-tighter leading-tight animate-fade-in drop-shadow-sm'>
          AI <span className="text-accent-red italic">Recommendation</span>
        </h1>
        <p className="text-[10px] sm:text-xs text-primary/40 font-black uppercase tracking-[0.5em]">
          Your Personal AI Stylist
        </p>
      </div>

      {/* Custom Attribute Bar */}
      <form onSubmit={handleSubmit} className="flex flex-col items-center gap-4 w-full max-w-[1440px] relative z-20 mb-0 px-4 sm:px-10">
        <div className="flex items-center bg-white/40 backdrop-blur-xl p-1.5 sm:p-2 rounded-[40px] shadow-[0_20px_60px_rgba(22,43,105,0.12)] border border-primary/20 w-fit hover:border-primary/40 transition-all duration-500 relative z-10">
          <div className="flex flex-nowrap items-center justify-center gap-0 pb-0 overflow-visible w-full min-w-0">

            {/* Body Type */}
            <AttributeSelector
              label="Body Type"
              value={bodyType}
              options={bodyTypeList}
              onSelect={setBodyType}
              type="shape"
              shapes={{
                'Hourglass': 'M12 2C9 2 7 4 7 7C7 9 9 11 11 12C9 13 7 15 7 17C7 20 9 22 12 22C15 22 17 20 17 17C17 15 15 13 13 12C15 11 17 9 17 7C17 4 15 2 12 2Z',
                'Pear': 'M12 2C10 2 9 4 9 6C9 8 11 10 12 11C10 12 7 14 6 16C5 18 5 21 7 22C9 23 15 23 17 22C19 21 19 18 18 16C17 14 14 12 12 11C13 10 15 8 15 6C15 4 14 2 12 2Z',
                'Rectangle': 'M8 2H16V22H8V2Z',
                'Diamond': 'M12 2L9 8C9 8 5 10 5 14C5 18 8 22 12 22C16 22 19 18 19 14C19 10 15 8 15 8L12 2Z'
              }}
            />

            {/* Skin Tone */}
            <AttributeSelector
              label="Skin Tone"
              value={skinTone}
              options={skinToneList}
              onSelect={setSkinTone}
              type="color"
              colors={{
                'Warm': ['#FFDBAC', '#F1C27D', '#8D5524'],
                'Cool': ['#FADAD8', '#C68642', '#4B352D'],
                'Neutral': ['#F9DDCF', '#EABCAF', '#634439']
              }}
            />

            {/* Event Type */}
            <AttributeSelector
              label="Event"
              value={eventType}
              options={eventTypeList}
              onSelect={seteventType}
              type="shape"
              shapes={{
                'Wedding': 'M12 2L10 5H14L12 2ZM12 6C8.69 6 6 8.69 6 12C6 15.31 8.69 18 12 18C15.31 18 18 15.31 18 12C18 11.4 17.9 10.8 17.7 10.3L20 8L18 6L16 8.3C15 6.9 13.6 6 12 6ZM12 8C14.21 8 16 9.79 16 12C16 14.21 14.21 16 12 16C9.79 16 8 14.21 8 12C8 9.79 9.79 8 12 8Z',
                'Traditional': 'M12 2C10 2 8 4 8 7V17C8 20 10 22 12 22C14 22 16 20 16 17V7C16 4 14 2 12 2ZM10 7C10 6 11 5 12 5C13 5 14 6 14 7V17C14 18 13 19 12 19C11 19 10 18 10 17V7Z M12 2V1 M12 23V22',
                'Prom': 'M12 2C11 2 10 3 10 4V6C7 8 5 12 5 17C5 20 8 22 12 22C16 22 19 20 19 17C19 12 17 8 14 6V4C14 3 13 2 12 2ZM10 8L12 7.5L14 8L13 11L11 11L10 8Z',
                'Formal': 'M6 2L12 8L18 2V8L12 22L6 8V2ZM12 10L15 6H9L12 10Z',
                'Themed': 'M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM9 11.5C9 12.33 8.33 13 7.5 13C6.67 13 6 12.33 6 11.5C6 10.67 6.67 10 7.5 10C8.33 10 9 10.67 9 11.5ZM16.5 13C15.67 13 15 12.33 15 11.5C15 10.67 15.67 10 16.5 10C17.33 10 18 10.67 18 11.5C18 12.33 17.33 13 16.5 13ZM12 18C10.5 18 9.17 17.15 8.5 15.9L15.5 15.9C14.83 17.15 13.5 18 12 18Z'
              }}
            />

            {/* Face Shape */}
            <AttributeSelector
              label="Face Shape"
              value={faceShape}
              options={faceShapeList}
              onSelect={setfaceShape}
              type="shape"
              shapes={{
                'Oval': 'M12 2C9 2 6 6 6 12C6 18 9 22 12 22C15 22 18 18 18 12C18 6 15 2 12 2Z',
                'Square': 'M6 4C5 4 5 5 5 6V18C5 20 7 22 12 22C17 22 19 20 19 18V6C19 5 19 4 18 4H6Z',
                'Round': 'M12 2C6 2 4 6 4 12C4 18 6 22 12 22C18 22 20 18 20 12C20 6 18 2 12 2Z',
                'Heart': 'M12 22L9 20C7 18 4 14 4 9C4 5 7 2 12 2C17 2 20 5 20 9C20 14 17 18 15 20L12 22Z',
                'Diamond': 'M12 2L6 12L12 22L18 12L12 2Z'
              }}
            />

            {/* Age Group */}
            <AttributeSelector
              label="Age"
              value={ageGroup}
              options={['6–9 Years', '10–12 Years', '13–17 Years', '18–29 Years', '30–59 Years', '60+ Years']}
              onSelect={setAgeGroup}
              type="shape"
              shapes={{
                '6–9 Years': 'M12 4C14.21 4 16 5.79 16 8C16 10.21 14.21 12 12 12C9.79 12 8 10.21 8 8C8 5.79 9.79 4 12 4ZM4 20C4 17.79 7.58 16 12 16C16.42 16 20 17.79 20 20V22H4V20Z',
                '10–12 Years': 'M12 4C14.21 4 16 5.79 16 8C16 10.21 14.21 12 12 12C9.79 12 8 10.21 8 8C8 5.79 9.79 4 12 4ZM4 20C4 17.79 7.58 16 12 16C16.42 16 20 17.79 20 20V22H4V20Z',
                '13–17 Years': 'M12 4C14.21 4 16 5.79 16 8C16 10.21 14.21 12 12 12C9.79 12 8 10.21 8 8C8 5.79 9.79 4 12 4ZM4 20C4 17.79 7.58 16 12 16C16.42 16 20 17.79 20 20V22H4V20Z',
                '18–29 Years': 'M12 4C14.21 4 16 5.79 16 8C16 10.21 14.21 12 12 12C9.79 12 8 10.21 8 8C8 5.79 9.79 4 12 4ZM4 20C4 17.79 7.58 16 12 16C16.42 16 20 17.79 20 20V22H4V20Z',
                '30–59 Years': 'M12 4C14.21 4 16 5.79 16 8C16 10.21 14.21 12 12 12C9.79 12 8 10.21 8 8C8 5.79 9.79 4 12 4ZM4 20C4 17.79 7.58 16 12 16C16.42 16 20 17.79 20 20V22H4V20Z',
                '60+ Years': 'M12 4C14.21 4 16 5.79 16 8C16 10.21 14.21 12 12 12C9.79 12 8 10.21 8 8C8 5.79 9.79 4 12 4ZM4 20C4 17.79 7.58 16 12 16C16.42 16 20 17.79 20 20V22H4V20Z'
              }}
            />

            {/* Sex */}
            <AttributeSelector
              label="Sex"
              value={sex}
              options={['Female', 'Male', 'Unisex']}
              onSelect={setSex}
              type="shape" // Use shape type for better SVG control
              shapes={{
                'Female': 'M12 2C8.5 2 5.5 5 5.5 8.5C5.5 11.5 7.5 14 10.5 14.5V17H8C7.4 17 7 17.4 7 18C7 18.6 7.4 19 8 19H10.5V21.5C10.5 22.1 10.9 22.5 11.5 22.5H12.5C13.1 22.5 13.5 22.1 13.5 21.5V19H16C16.6 19 17 18.6 17 18C17 17.4 16.6 17 16 17H13.5V14.5C16.5 14 18.5 11.5 18.5 8.5C18.5 5 15.5 2 12 2ZM12 4.5C14.2 4.5 16 6.3 16 8.5C16 10.7 14.2 12.5 12 12.5C9.8 12.5 8 10.7 8 8.5C8 6.3 9.8 4.5 12 4.5Z',
                'Male': 'M20 1.5L14 1.5C13.2 1.5 12.5 2.2 12.5 3C12.5 3.8 13.2 4.5 14 4.5L16.2 4.5L13.1 7.6C11.8 6.6 10 6 8.5 6C4.4 6 1 9.4 1 13.5C1 17.6 4.4 21 8.5 21C12.6 21 16 17.6 16 13.5C16 12 15.4 10.2 14.4 8.9L17.5 5.8V8C17.5 8.8 18.2 9.5 19 9.5C19.8 9.5 20.5 8.8 20.5 8V2.5C20.5 1.9 20.1 1.5 19.5 1.5L20 1.5ZM8.5 18.5C5.7 18.5 3.5 16.3 3.5 13.5C3.5 10.7 5.7 8.5 8.5 8.5C11.3 8.5 13.5 10.7 13.5 13.5C13.5 16.3 11.3 18.5 8.5 18.5Z',
                'Unisex': 'M12 2C12.55 2 13 2.45 13 3V3.4C14.7 3.8 16.2 4.9 17.1 6.3L19.2 4.2L17.8 2.8C17.4 2.4 17.4 1.8 17.8 1.4L18.6 0.6C19 0.2 19.6 0.2 20 0.6L23.4 4C23.8 4.4 23.8 5 23.4 5.4L22.6 6.2C22.2 6.6 21.6 6.6 21.2 6.2L19.8 4.8L17.7 6.9C18.5 8.3 19 9.8 19 11.5C19 14.5 17.1 17.1 14.4 18.1L14.4 20.2H16C16.55 20.2 17 20.65 17 21.2C17 21.75 16.55 22.2 16 22.2H14.4V23C14.4 23.55 13.95 24 13.4 24H12.6C12.05 24 11.6 23.55 11.6 23V22.2H10C9.45 22.2 9 21.75 9 21.2C9 20.65 9.45 20.2 10 20.2H11.6V18.1C8.9 17.1 7 14.5 7 11.5C7 9.8 7.5 8.3 8.3 6.9L6.2 4.8L4.8 6.2C4.4 6.6 3.8 6.6 3.4 6.2L2.6 5.4C2.2 5 2.2 4.4 2.6 4L6 0.6C6.4 0.2 7 0.2 7.4 0.6L8.2 1.4C8.6 1.8 8.6 2.4 8.2 2.8L6.8 4.2L8.9 6.3C9.8 4.9 11.3 3.8 13 3.4V3C13 2.45 12.55 2 12 2ZM13 5C10 5 7.5 7.2 7.1 10.1C8 10 9 10 10 10H14C15 10 16 10 16.9 10.1C16.5 7.2 14 5 13 5Z'
              }}
              isLast
            />

          </div>
        </div>

        {validationError && (
          <div className="w-full max-w-sm bg-red-50 border border-red-100 text-red-800 px-4 py-1.5 rounded-lg shadow-sm flex items-center justify-center gap-2 animate-shake">
            <span className="font-bold text-[9px] uppercase tracking-wider">{validationError}</span>
          </div>
        )}

        <div className="flex flex-row items-center justify-center gap-3 w-full mt-4">
          <button
            type="button"
            onClick={() => setShowImageAnalysis(true)}
            className="flex-1 sm:flex-none sm:w-auto bg-white/80 backdrop-blur-md text-primary border border-primary/20 px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-secondary hover:border-secondary transition-all shadow-sm flex items-center justify-center gap-2 group active:scale-95"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Scan Profile</span>
          </button>
          <button
            type="submit"
            className="flex-1 sm:flex-none sm:w-auto bg-primary text-white px-10 py-3 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-primary-dull transition-all shadow-[0_15px_40px_rgba(22,43,105,0.15)] hover:-translate-y-0.5 active:scale-95"
          >
            <span>Find My Fit</span>
          </button>
        </div>
      </form>

      {/* Popular Gown Showcase Section - Adjusted for Single Viewport */}
      <div className="w-full max-w-6xl mx-auto relative z-10 flex flex-col items-center mt-8 pb-2">
        <div className="flex items-center gap-4 mb-12 opacity-80">
          <div className="w-10 h-[1px] bg-primary"></div>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Trending Choice</p>
          <div className="w-10 h-[1px] bg-primary"></div>
        </div>
        {loadingGowns ? (
          <div className="flex items-end justify-center gap-3 h-[140px] sm:h-[180px]">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className={`bg-gray-100 animate-pulse rounded-[24px] ${i === 3 ? 'w-24 h-32 sm:w-32 sm:h-44' : 'w-20 h-28 sm:w-24 sm:h-36 opacity-70'}`}></div>
            ))}
          </div>
        ) : popularGowns.length > 0 && (
          <div className="flex items-end justify-center gap-3 sm:gap-6 h-[170px] sm:h-[230px] w-full max-w-5xl">
            {popularGowns.slice(0, 5).map((gown, index) => {
              // Center is 2 if we have 5, or middle index otherwise
              const isCenter = index === 2 || (popularGowns.length < 3 && index === 0);
              const isSide = index === 1 || index === 3;
              const isOuter = index === 0 || index === 4;

              const sizeClass = isCenter
                ? "w-32 h-36 sm:w-48 sm:h-60 z-30 shadow-[0_25px_60px_rgba(22,43,105,0.2)] ring-[4px] ring-primary/10 scale-110"
                : isSide
                  ? "w-28 h-32 sm:w-36 sm:h-48 z-20 opacity-60 scale-95 grayscale-[50%]"
                  : "w-24 h-28 sm:w-28 sm:h-36 z-10 opacity-30 scale-90 grayscale";

              return (
                <div
                  key={gown._id || index}
                  className={`relative rounded-[32px] sm:rounded-[40px] overflow-hidden border border-primary/10 cursor-pointer transform transition-all duration-700 hover:-translate-y-4 bg-white group/gown ${sizeClass}`}
                  onClick={() => navigate(`/gown-details/${gown._id}`)}
                >
                  <img src={Array.isArray(gown.image) ? gown.image[0] : gown.image} alt={gown.name} className="w-full h-full object-contain transition-transform duration-1000 group-hover/gown:scale-110" />

                  {/* Info Overlay */}
                  <div className={`absolute inset-0 bg-gradient-to-t from-primary/95 via-primary/50 to-transparent transition-opacity duration-500 ${isCenter ? 'opacity-100' : 'opacity-0 group-hover/gown:opacity-100'}`}>
                    <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 text-white transform transition-transform duration-500 translate-y-2 group-hover/gown:translate-y-0">
                      <p className="text-[10px] font-black uppercase tracking-widest text-secondary-light mb-1 drop-shadow-md">{gown.category || 'Apparel'}</p>
                      <h3 className="text-xs sm:text-sm font-black truncate mb-2 drop-shadow-md">{gown.name}</h3>
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-black drop-shadow-md">
                          <span className="text-secondary-light mr-1">{currency}</span>
                          {(gown.pricePerDay || gown.price || 0).toLocaleString()}
                        </p>
                        <div className="w-6 h-6 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showImageAnalysis && (
        <ImageAnalysis
          onAnalysisComplete={handleImageAnalysisComplete}
          onClose={() => setShowImageAnalysis(false)}
        />
      )}
    </div>
  );
}

export default Hero;
