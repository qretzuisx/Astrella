import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { assets, bodyTypeList, eventTypeList, faceShapeList, skinToneList } from '../assets/assets';
import ImageAnalysis from './ImageAnalysis';
import { API_URL, CURRENCY } from '../config';
import GownCard from './GownCard';

import AttributeSelector from './AttributeSelector';

// Maps common color names to hex values for swatches
const COLOR_MAP = {
  white: ['#FFFFFF', '#F5F5F5'],
  ivory: ['#FFFFF0', '#F5F0DC'],
  cream: ['#FFF5D7', '#F0E6C8'],
  black: ['#1A1A1A', '#3D3D3D'],
  gold: ['#FFD700', '#B8860B'],
  silver: ['#C0C0C0', '#A9A9A9'],
  pink: ['#FFB6C1', '#FF69B4'],
  blush: ['#FFDFE4', '#F4A7B0'],
  red: ['#E63946', '#A21C25'],
  blue: ['#4A90D9', '#1D4E8F'],
  navy: ['#1D3557', '#0A203F'],
  green: ['#52B788', '#2D6A4F'],
  peach: ['#FFCBA4', '#F4A261'],
  lavender: ['#C9B1E0', '#9B72CF'],
  purple: ['#7B2D8B', '#4B0082'],
  champagne: ['#F7E7CE', '#E2C897'],
  beige: ['#F5F0E8', '#D9C4A0'],
  yellow: ['#FFD166', '#F0A500'],
  teal: ['#2A9D8F', '#1D6E63'],
  rose: ['#E9837A', '#C0392B'],
  coral: ['#FF6B6B', '#E05050'],
};

const ColorSwatch = ({ colorName }) => {
  if (!colorName) return null;
  // Handle compound names like "White / Gold" or "Blue & Pink"
  const parts = colorName.split(/[\/&,]+/).map(p => p.trim().toLowerCase()).filter(Boolean);
  const dots = parts.flatMap(part => COLOR_MAP[part] || []).slice(0, 4);
  if (dots.length > 0) {
    return (
      <div className="flex items-center">
        {dots.map((c, i) => (
          <div
            key={i}
            style={{ backgroundColor: c }}
            className={`w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full border border-gray-200/60 shadow-sm ${i > 0 ? '-ml-1' : ''}`}
          />
        ))}
      </div>
    );
  }
  // Fallback: single grey dot
  return (
    <div className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full bg-gray-300 border border-gray-200/60" />
  );
};

const Hero = () => {
  const navigate = useNavigate();
  const [bodyType, setBodyType] = useState('');
  const [skinTone, setSkinTone] = useState('');
  const [eventType, setEventType] = useState('');
  const [faceShape, setFaceShape] = useState('');
  const [ageGroup, setAgeGroup] = useState('');
  const [sex, setSex] = useState('');
  const [showImageAnalysis, setShowImageAnalysis] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [popularGowns, setPopularGowns] = useState([]);
  const [loadingGowns, setLoadingGowns] = useState(true);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 1024 : false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
        // Silent error handling for cleaner user experience
      } finally {
        setLoadingGowns(false);
      }
    };
    fetchPopularGowns();
  }, []);

  const handleImageAnalysisComplete = (results) => {
    setSkinTone(results.skinTone || 'Neutral');
    setBodyType(results.bodyType || 'Rectangle');
    setFaceShape(results.faceShape || 'Oval');

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
    <div className='min-h-screen flex flex-col items-center justify-center px-4 relative bg-[#FDFDFF] w-full'>

      {/* Hero Headline */}
      <div className="max-w-6xl mx-auto z-10 text-center space-y-5 sm:space-y-6 mb-8 sm:mb-12 pt-10 sm:pt-24 px-4">
        <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-secondary/10 border border-secondary/20 shadow-sm animate-fade-in mx-auto">
          <span className="text-[9px] sm:text-[11px] font-black text-secondary uppercase tracking-[0.5em]">Introducing Astrella</span>
        </div>
        <div className="space-y-4 sm:space-y-5">
          <h1 className='text-3xl sm:text-5xl md:text-6xl lg:text-8xl font-black text-primary tracking-tighter leading-[0.85] animate-fade-in drop-shadow-md pb-2'>
            Meet Your <br className="sm:hidden" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-secondary via-primary to-secondary animate-gradient-x italic pr-1 sm:pr-4 inline-block mt-1 sm:mt-0">Personal AI Stylist</span>
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-gray-500 font-bold max-w-2xl mx-auto leading-relaxed animate-fade-in delay-100">
            Powered by smart style-matching, Astrella's AI analyzes your unique traits — body type, skin tone, face shape, and more — to recommend the perfect apparel for any occasion.
          </p>
        </div>

        {/* How It Works - Premium Card Grid */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 md:gap-6 max-w-3xl mx-auto mt-6 sm:mt-8 animate-fade-in delay-200">
          {/* Step 1 */}
          <div className="relative bg-white/80 backdrop-blur-md rounded-2xl sm:rounded-3xl p-3 sm:p-5 md:p-6 border border-primary/10 shadow-[0_8px_30px_rgba(1,62,141,0.06)] hover:shadow-[0_16px_50px_rgba(1,62,141,0.12)] hover:-translate-y-1 transition-all duration-500 group">
            <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 text-primary flex items-center justify-center text-xs sm:text-sm font-black mx-auto mb-2 sm:mb-3 group-hover:scale-110 transition-transform">
              <svg className="w-3.5 h-3.5 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-[9px] sm:text-xs font-black text-primary uppercase tracking-wider mb-0.5 sm:mb-1">Step 1</p>
            <p className="text-[9px] sm:text-[11px] font-bold text-gray-400 leading-snug">Select attributes <span className="hidden sm:inline">or scan a photo</span></p>
          </div>

          {/* Step 2 */}
          <div className="relative bg-white/80 backdrop-blur-md rounded-2xl sm:rounded-3xl p-3 sm:p-5 md:p-6 border border-secondary/10 shadow-[0_8px_30px_rgba(239,68,68,0.06)] hover:shadow-[0_16px_50px_rgba(239,68,68,0.12)] hover:-translate-y-1 transition-all duration-500 group">
            <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-br from-secondary/10 to-secondary/5 text-secondary flex items-center justify-center text-xs sm:text-sm font-black mx-auto mb-2 sm:mb-3 group-hover:scale-110 transition-transform">
              <svg className="w-3.5 h-3.5 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <p className="text-[9px] sm:text-xs font-black text-secondary uppercase tracking-wider mb-0.5 sm:mb-1">Step 2</p>
            <p className="text-[9px] sm:text-[11px] font-bold text-gray-400 leading-snug">AI finds <span className="hidden sm:inline">your</span> best fits</p>
          </div>

          {/* Step 3 */}
          <div className="relative bg-white/80 backdrop-blur-md rounded-2xl sm:rounded-3xl p-3 sm:p-5 md:p-6 border border-primary/10 shadow-[0_8px_30px_rgba(1,62,141,0.06)] hover:shadow-[0_16px_50px_rgba(1,62,141,0.12)] hover:-translate-y-1 transition-all duration-500 group">
            <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 text-primary flex items-center justify-center text-xs sm:text-sm font-black mx-auto mb-2 sm:mb-3 group-hover:scale-110 transition-transform">
              <svg className="w-3.5 h-3.5 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-[9px] sm:text-xs font-black text-primary uppercase tracking-wider mb-0.5 sm:mb-1">Step 3</p>
            <p className="text-[9px] sm:text-[11px] font-bold text-gray-400 leading-snug">Browse & book <span className="hidden sm:inline">your look</span></p>
          </div>
        </div>
      </div>

      {/* Custom Attribute Bar */}
      <form onSubmit={handleSubmit} className="flex flex-col items-center gap-4 sm:gap-5 w-full max-w-[1100px] relative z-20 mb-4 px-3 sm:px-6">
        <div className="flex items-center bg-white p-2 sm:p-3 rounded-2xl sm:rounded-full shadow-[0_30px_80px_rgba(22,43,105,0.15)] border border-gray-100 w-full relative z-10 transition-all duration-300">
          <div className="flex flex-wrap lg:flex-nowrap items-center justify-center lg:justify-between gap-y-0 lg:gap-0 w-full min-w-0 py-1 sm:py-1">

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
              onSelect={setEventType}
              type="shape"
              shapes={{
                'Wedding': 'M12 2L10 5H14L12 2ZM12 6C8.69 6 6 8.69 6 12C6 15.31 8.69 18 12 18C15.31 18 18 15.31 18 12C18 11.4 17.9 10.8 17.7 10.3L20 8L18 6L16 8.3C15 6.9 13.6 6 12 6ZM12 8C14.21 8 16 9.79 16 12C16 14.21 14.21 16 12 16C9.79 16 8 14.21 8 12C8 9.79 9.79 8 12 8Z',
                'Traditional': 'M12 2C10 2 8 4 8 7V17C8 20 10 22 12 22C14 22 16 20 16 17V7C16 4 14 2 12 2ZM10 7C10 6 11 5 12 5C13 5 14 6 14 7V17C14 18 13 19 12 19C11 19 10 18 10 17V7Z M12 2V1 M12 23V22',
                'Prom': 'M12 2C11 2 10 3 10 4V6C7 8 5 12 5 17C5 20 8 22 12 22C16 22 19 20 19 17C19 12 17 8 14 6V4C14 3 13 2 12 2ZM10 8L12 7.5L14 8L13 11L11 11L10 8Z',
                'Formal': 'M6 2L12 8L18 2V8L12 22L6 8V2ZM12 10L15 6H9L12 10Z',
                'Themed': 'M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM9 11.5C9 12.33 8.33 13 7.5 13C6.67 13 6 12.33 6 11.5C6 10.67 6.67 10 7.5 10C8.33 10 9 10.67 9 11.5ZM16.5 13C15.67 13 15 12.33 15 11.5C15 10.67 15.67 10 16.5 10C17.33 10 18 10.67 18 11.5C18 12.33 17.33 13 16.5 13ZM12 18C10.5 18 9.17 17.15 8.5 15.9L15.5 15.9C14.83 17.15 13.5 18 12 18Z'
              }}
            />

            {/* Face Shape Selector */}
            <AttributeSelector
              label="Face Shape"
              value={faceShape}
              options={faceShapeList}
              onSelect={setFaceShape}
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

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full mt-6 sm:mt-10">
          <button
            type="button"
            onClick={() => setShowImageAnalysis(true)}
            className="w-full sm:w-auto bg-white/80 backdrop-blur-md text-primary border border-primary/20 px-8 sm:px-10 py-4 sm:py-5 rounded-2xl sm:rounded-full text-xs sm:text-sm font-black uppercase tracking-widest hover:bg-white hover:text-secondary hover:border-secondary transition-all shadow-lg flex items-center justify-center group active:scale-95"
          >
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-2.5">
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="leading-none">Scan Profile</span>
              </div>
              <span className="text-[9px] sm:text-[10px] font-bold text-primary/40 normal-case tracking-normal leading-none">Don't know your attributes? Scan here</span>
            </div>
          </button>
          <button
            type="submit"
            className="w-full sm:w-auto bg-primary text-white px-10 sm:px-14 py-4 sm:py-6 rounded-2xl sm:rounded-full text-sm font-black uppercase tracking-widest hover:bg-primary-dull transition-all shadow-[0_20px_50px_rgba(22,43,105,0.2)] hover:-translate-y-1 active:scale-95 flex items-center justify-center min-h-[56px] sm:min-h-[70px]"
          >
            <span>Find My Fit</span>
          </button>
        </div>
      </form>

      {/* Trending Choice Section - Premium Horizontal Carousel */}
      <div className="w-full mt-24 sm:mt-40 pb-32 relative z-10 overflow-hidden">
        <div className="flex flex-col items-center mb-12 sm:mb-20 px-4">
          <div className="flex items-center gap-4 sm:gap-6 mb-3 sm:mb-4">
            <div className="w-10 sm:w-16 h-[2px] bg-gradient-to-r from-transparent to-secondary"></div>
            <p className="text-[9px] sm:text-xs font-black uppercase tracking-[0.4em] sm:tracking-[0.6em] text-secondary">Featured Picks</p>
            <div className="w-10 sm:w-16 h-[2px] bg-gradient-to-l from-transparent to-secondary"></div>
          </div>
          <h2 className="text-3xl sm:text-5xl md:text-6xl font-black text-primary tracking-tight text-center leading-tight">
            This Season's <span className="text-secondary italic">Top Picks</span>
          </h2>
          <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-gray-400 font-medium max-w-sm text-center">Handpicked rental gowns for your special occassions</p>
        </div>

        {loadingGowns ? (
          <div className="flex gap-8 px-10 overflow-x-hidden">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="min-w-[280px] sm:min-w-[400px] aspect-[4/5] bg-gray-100 animate-pulse rounded-[50px]"></div>
            ))}
          </div>
        ) : popularGowns.length > 0 ? (
          <div className="max-w-[1600px] mx-auto px-1 sm:px-10 pb-10 overflow-visible">
            <div className="flex flex-row items-center justify-center gap-0.5 sm:gap-8 overflow-visible no-scrollbar py-6 sm:py-10">
              {(() => {
                // Determine limits: 3 for mobile, 5 for desktop
                const limit = isMobile ? 3 : 5;
                const displayGowns = [...popularGowns].slice(0, limit);
                const rearranged = [];

                if (displayGowns.length === limit) {
                  // Rearrange display order to place the most popular gown (#1) in the center
                  // for better visual emphasis in the horizontal layout.
                  if (limit === 3) {
                    // Rearrange to: [Second Most, Most Popular, Third Most]
                    rearranged.push(displayGowns[1], displayGowns[0], displayGowns[2]);
                  } else {
                    // Rearrange to: [Fourth, Second, Most Popular, Third, Fifth]
                    rearranged.push(displayGowns[3], displayGowns[1], displayGowns[0], displayGowns[2], displayGowns[4]);
                  }
                } else {
                  // Fallback for cases with fewer gowns than the target limit
                  rearranged.push(...displayGowns);
                }

                return rearranged.map((gown, index) => {
                  const isTopChoice = gown === popularGowns[0];
                  // Determine scale: middle is largest, neighbors are smaller, edges are smallest
                  // But for simplicity, just Top Choice is bigger

                  return (
                    <div
                      key={gown._id || index}
                      className={`flex flex-col items-center transition-all duration-1000 w-full ${isTopChoice ? 'lg:w-[400px] z-20 scale-100 sm:scale-110 mb-8 sm:mb-0' : 'lg:w-[300px] z-10 opacity-70 scale-95 sm:scale-90 hover:opacity-100 hover:scale-100'}`}
                    >

                      <div
                        className={`relative aspect-[4/5] w-full max-w-[380px] rounded-[40px] sm:rounded-[50px] overflow-hidden bg-white shadow-[0_20px_50px_rgba(0,0,0,0.05)] transition-all duration-700 group cursor-pointer ${isTopChoice ? 'ring-8 ring-secondary/5 shadow-[0_40px_100px_rgba(239,68,68,0.12)]' : 'border border-primary/5 shadow-sm'}`}
                        onClick={() => navigate(`/gown-details/${gown._id}`)}
                      >
                        <img
                          src={Array.isArray(gown.image) ? gown.image[0] : gown.image}
                          alt={gown.name}
                          loading="lazy"
                          className="w-full h-full object-contain transition-transform duration-1000 group-hover:scale-110 p-4 sm:p-8"
                        />

                        {/* Hover Overlay */}
                        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8 bg-gradient-to-t from-primary via-primary/80 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-700">
                          <h3 className="text-base sm:text-lg font-black text-white mb-2 sm:mb-4 line-clamp-1 drop-shadow-md">{gown.name}</h3>
                          {/* Gown details row */}
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {gown.fabric && (
                              <span className="text-[9px] sm:text-[10px] font-bold bg-white/20 text-white px-2 py-0.5 rounded-full uppercase tracking-wider backdrop-blur-sm">{gown.fabric}</span>
                            )}
                            {gown.size && gown.size.length > 0 && (
                              <span className="text-[9px] sm:text-[10px] font-bold bg-white/20 text-white px-2 py-0.5 rounded-full uppercase tracking-wider backdrop-blur-sm">{gown.size[0]}</span>
                            )}
                            {gown.eventType && gown.eventType.length > 0 && (
                              <span className="text-[9px] sm:text-[10px] font-bold bg-secondary/80 text-white px-2 py-0.5 rounded-full uppercase tracking-wider">{gown.eventType[0]}</span>
                            )}
                          </div>
                          <div className="flex items-center justify-between pt-3 sm:pt-4 border-t border-white/20">
                            <p className="text-lg sm:text-xl font-black text-white leading-none drop-shadow-sm">
                              <span className="text-secondary-light mr-1 font-medium italic">{currency}</span>
                              {(gown.pricePerDay || gown.price || 0).toLocaleString()}
                            </p>
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-secondary-light text-primary flex items-center justify-center shadow-lg">
                              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Detailed Card Info Below Image */}
                      <div className="mt-4 sm:mt-8 text-center space-y-2 px-2 sm:px-4 animate-fade-in">
                        {/* Catchy badge for top choice */}
                        {isTopChoice && (
                          <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-secondary/10 to-primary/10 border border-secondary/20 px-3 py-1 rounded-full mb-1">
                            <span className="text-secondary text-[9px] sm:text-[10px]">✦</span>
                            <span className="text-[9px] sm:text-[10px] font-black text-secondary uppercase tracking-[0.15em]">#1 Most Booked</span>
                            <span className="text-secondary text-[9px] sm:text-[10px]">✦</span>
                          </div>
                        )}
                        <h3 className={`font-black text-primary line-clamp-1 leading-tight ${isTopChoice ? 'text-base sm:text-xl' : 'text-sm sm:text-base'}`}>
                          {gown.name}
                        </h3>
                        {/* Color swatch + shop */}
                        <div className="flex flex-col items-center gap-1.5">
                          {gown.color && (
                            <div className="flex items-center gap-1.5">
                              <ColorSwatch colorName={gown.color} />
                              <span className="text-[9px] sm:text-[10px] font-semibold text-gray-400 capitalize">{gown.color}</span>
                            </div>
                          )}
                          <p className="text-[10px] sm:text-[11px] font-black text-secondary uppercase tracking-[0.15em] sm:tracking-[0.2em]">
                            {gown.owner ? (typeof gown.owner === 'object' ? (gown.owner.shopName || gown.owner.name) : 'Boutique Partner') : 'Exclusive Boutique'}
                          </p>

                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
            <div className="mt-16 flex justify-center">
              <button
                onClick={() => navigate('/gowns')}
                className="bg-white/80 backdrop-blur-md text-primary border border-primary/20 px-12 py-4 rounded-full text-sm font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all shadow-lg active:scale-95"
              >
                Explore more Apparel
              </button>
            </div>
          </div>
        ) : (
          <div className="max-w-[1400px] mx-auto px-4 sm:px-10">
            <div className="flex flex-row items-center justify-center gap-2 sm:gap-8 py-6 sm:py-10">
              {[1, 2, 3].map(i => (
                <div key={i} className={`flex flex-col items-center w-full ${i === 2 ? 'scale-105 z-10' : 'opacity-50 scale-90'}`}>
                  <div className="aspect-[4/5] w-full max-w-[320px] bg-gradient-to-b from-gray-100 to-gray-50 rounded-[40px] sm:rounded-[50px] border border-dashed border-gray-200 flex items-center justify-center">
                    <div className="text-center space-y-3 px-6">
                      <div className="w-12 h-12 bg-gray-200 rounded-full mx-auto flex items-center justify-center">
                        <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      {i === 2 && <p className="text-sm font-bold text-gray-300">Coming soon</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-center space-y-4 pb-8">
              <p className="text-gray-400 font-bold text-base sm:text-lg">Our trending collection is being prepared for you.</p>
              <button
                onClick={() => navigate('/gowns')}
                className="bg-primary text-white px-10 py-4 rounded-full text-sm font-black uppercase tracking-widest hover:bg-primary-dull transition-all shadow-lg active:scale-95"
              >
                Browse All Apparel
              </button>
            </div>
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
