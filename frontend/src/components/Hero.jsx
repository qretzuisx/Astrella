import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { assets, bodyTypeList, eventTypeList, faceShapeList, skinToneList } from '../assets/assets';
import ImageAnalysis from './ImageAnalysis';

const Hero = () => {
  const navigate = useNavigate();
  const [bodyType, setBodyType] = useState(''); 
  const [skinTone, setSkinTone] = useState('');
  const [eventType, seteventType] = useState('');
  const [faceShape, setfaceShape] = useState('');
  const [ageGroup, setAgeGroup] = useState('');
  const [sex, setSex] = useState('');
  const [showImageAnalysis, setShowImageAnalysis] = useState(false);

  const handleImageAnalysisComplete = (results) => {
    setSkinTone(results.skinTone);
    setBodyType(results.bodyType);
    setfaceShape(results.faceShape);
    // Photo analysis may estimate age as a number; map to your age-group buckets
    // Prefer explicit fields from ImageAnalysis
    if (results.ageGroup) setAgeGroup(results.ageGroup)
    if (results.sex) setSex(results.sex)

    // Backward compatible: numeric age + gender
    const estimatedAge = results.age ? parseInt(results.age, 10) : NaN;
    if (!Number.isNaN(estimatedAge) && !results.ageGroup) {
      if (estimatedAge >= 6 && estimatedAge <= 9) setAgeGroup('6–9 Years');
      else if (estimatedAge >= 10 && estimatedAge <= 12) setAgeGroup('10–12 Years');
      else if (estimatedAge >= 13 && estimatedAge <= 17) setAgeGroup('13–17 Years');
      else if (estimatedAge >= 18 && estimatedAge <= 29) setAgeGroup('18–29 Years');
      else if (estimatedAge >= 30 && estimatedAge <= 59) setAgeGroup('30–59 Years');
      else if (estimatedAge >= 60) setAgeGroup('60+ Years');
    }

    if (results.gender && !results.sex) setSex(results.gender === 'female' ? 'Female' : 'Male');
    setShowImageAnalysis(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Build query params
    const params = new URLSearchParams();
    if (bodyType) params.append('bodyType', bodyType);
    if (skinTone) params.append('skinTone', skinTone);
    if (eventType) params.append('eventType', eventType);
    if (faceShape) params.append('faceShape', faceShape);
    // Keep backend-compatible params: map ageGroup -> age, sex -> gender
    if (ageGroup) params.append('age', ageGroup);
    if (sex) params.append('gender', sex);

    // Navigate to recommendations page
    navigate(`/recommendations?${params.toString()}`);
  };

  return (
    <div 
      className='min-h-screen flex flex-col items-center pt-20 sm:pt-32 gap-8 sm:gap-14 text-center py-8 px-4 relative'
    >
      {/* Background Image with Light Overlay */}
      <div
        className='absolute inset-0 -z-10'
        style={{
          backgroundImage: `url(${assets.home_bg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      />
      {/* Light overlay for better content visibility */}
      <div className='absolute inset-0 bg-gradient-to-b from-white/8 via-white/5 to-white/12 backdrop-blur-[0.5px] -z-10' />
      
      {/* Clean, Simple Heading */}
      <h1 className='text-3xl sm:text-4xl md:text-6xl font-bold text-white drop-shadow-[0_4px_20px_rgba(0,0,0,0.8)] px-4 leading-tight'>
        Astrella helps you wear the Best You.
      </h1>

      <form onSubmit={handleSubmit} className="flex flex-col items-center gap-6 w-full max-w-[1000px]">
        {/* Glassmorphism Selection Fields in Single Line */}
        <div className="flex flex-wrap items-center justify-center gap-3 bg-white/40 backdrop-blur-md p-3 sm:p-4 rounded-3xl sm:rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.2)] border border-white/50 w-full">
          
          <select 
            value={bodyType} 
            onChange={(e) => setBodyType(e.target.value)} 
            className="w-full sm:w-auto px-3 sm:px-4 py-2 border-2 border-white/60 rounded-full text-sm sm:text-base text-gray-800 font-semibold hover:border-primary focus:border-primary focus:outline-none transition-all bg-white/60 backdrop-blur-sm shadow-md"
          >
            <option value="">Body Type</option>
            {bodyTypeList.map((body) => (
              <option key={body} value={body}>{body}</option>
            ))}
          </select>

          <select 
            value={skinTone} 
            onChange={(e) => setSkinTone(e.target.value)} 
            className="w-full sm:w-auto px-3 sm:px-4 py-2 border-2 border-white/60 rounded-full text-sm sm:text-base text-gray-800 font-semibold hover:border-primary focus:border-primary focus:outline-none transition-all bg-white/60 backdrop-blur-sm shadow-md"
          >
            <option value="">Skin Tone</option>
            {skinToneList.map((skin) => (
              <option key={skin} value={skin}>{skin}</option>
            ))}
          </select>

          <select 
            value={eventType} 
            onChange={(e) => seteventType(e.target.value)} 
            className="w-full sm:w-auto px-3 sm:px-4 py-2 border-2 border-white/60 rounded-full text-sm sm:text-base text-gray-800 font-semibold hover:border-primary focus:border-primary focus:outline-none transition-all bg-white/60 backdrop-blur-sm shadow-md"
          >
            <option value="">Event Type</option>
            {eventTypeList.map((event) => (
              <option key={event} value={event}>{event}</option>
            ))}
          </select>

          <select 
            value={faceShape} 
            onChange={(e) => setfaceShape(e.target.value)} 
            className="w-full sm:w-auto px-3 sm:px-4 py-2 border-2 border-white/60 rounded-full text-sm sm:text-base text-gray-800 font-semibold hover:border-primary focus:border-primary focus:outline-none transition-all bg-white/60 backdrop-blur-sm shadow-md"
          >
            <option value="">Face Shape</option>
            {faceShapeList.map((face) => (
              <option key={face} value={face}>{face}</option>
            ))}
          </select>

          <select
            value={ageGroup}
            onChange={(e) => setAgeGroup(e.target.value)}
            className="w-full sm:w-auto px-3 sm:px-4 py-2 border-2 border-white/60 rounded-full text-sm sm:text-base text-gray-800 font-semibold hover:border-primary focus:border-primary focus:outline-none transition-all bg-white/60 backdrop-blur-sm shadow-md"
          >
            <option value="">Age Group</option>
            <option value="6–9 Years">6–9 Years</option>
            <option value="10–12 Years">10–12 Years</option>
            <option value="13–17 Years">13–17 Years</option>
            <option value="18–29 Years">18–29 Years</option>
            <option value="30–59 Years">30–59 Years</option>
            <option value="60+ Years">60+ Years</option>
          </select>

          <select
            value={sex}
            onChange={(e) => setSex(e.target.value)}
            className="w-full sm:w-auto px-3 sm:px-4 py-2 border-2 border-white/60 rounded-full text-sm sm:text-base text-gray-800 font-semibold hover:border-primary focus:border-primary focus:outline-none transition-all bg-white/60 backdrop-blur-sm shadow-md"
          >
            <option value="">Sex</option>
            <option value="Female">Female</option>
            <option value="Male">Male</option>
          </select>
        </div>

        {/* Glassmorphism Buttons */}
        <div className="flex flex-col items-center gap-4 w-full px-4">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setShowImageAnalysis(true)}
              className="w-full sm:w-auto bg-white/70 backdrop-blur-md text-primary border-2 border-white/80 px-6 sm:px-8 py-3 rounded-full text-sm sm:text-base font-bold hover:bg-primary hover:text-white hover:border-primary transition-all shadow-xl flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="whitespace-nowrap">Upload & Analyze Photo</span>
            </button>
            <span className="text-white font-bold text-base sm:text-lg drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] hidden sm:inline">or</span>
            <button
              type="submit"
              className="w-full sm:w-auto bg-primary text-white px-6 sm:px-8 py-3 rounded-full text-sm sm:text-base font-bold hover:bg-primary-dull transition-all shadow-2xl border-2 border-primary hover:scale-105"
            >
              Get Recommendations
            </button>
          </div>
          <p className="text-xs sm:text-sm text-gray-800 font-semibold bg-white/60 backdrop-blur-md px-4 sm:px-6 py-2 rounded-full border border-white/70 shadow-lg text-center">
            Upload a photo to auto-detect your features or fill in manually
          </p>
        </div>
      </form>

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
