import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { assets, bodyTypeList, eventTypeList, faceShapeList, skinToneList } from '../assets/assets';
import ImageAnalysis from './ImageAnalysis';

const Hero = () => {
  const navigate = useNavigate();
  const [bodyType, setBodyType] = useState(''); 
  const [skinTone, setSkinTone] = useState('');
  const [heightFeet, setHeightFeet] = useState('');
  const [heightInches, setHeightInches] = useState('');
  const [eventType, seteventType] = useState('');
  const [faceShape, setfaceShape] = useState('');
  const [showImageAnalysis, setShowImageAnalysis] = useState(false);

  // Convert feet and inches to height category
  const convertFeetInchesToCategory = (feet, inches) => {
    if ((!feet || feet === '') && (!inches || inches === '')) return '';
    
    const feetNum = parseFloat(feet) || 0;
    const inchesNum = parseFloat(inches) || 0;
    
    // Validate inputs
    if (isNaN(feetNum) && isNaN(inchesNum)) return '';
    if (feetNum < 0 || feetNum > 8) return '';
    if (inchesNum < 0 || inchesNum > 11) return '';
    
    // Convert to total inches
    const totalInches = (feetNum * 12) + inchesNum;
    
    if (totalInches === 0) return '';
    
    // Categories: Small (< 5'4" or 64"), Medium (5'4" to 5'8" or 64" to 68"), Tall (> 5'8" or 68")
    if (totalInches < 64) {
      return 'Small';
    } else if (totalInches <= 68) {
      return 'Medium';
    } else {
      return 'Tall';
    }
  };

  const handleImageAnalysisComplete = (results) => {
    setSkinTone(results.skinTone);
    setBodyType(results.bodyType);
    setfaceShape(results.faceShape);
    setShowImageAnalysis(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Convert height in feet and inches to category
    const heightCategory = convertFeetInchesToCategory(heightFeet, heightInches);
    
    // Build query params
    const params = new URLSearchParams();
    if (bodyType) params.append('bodyType', bodyType);
    if (skinTone) params.append('skinTone', skinTone);
    if (heightCategory) params.append('height', heightCategory);
    if (eventType) params.append('eventType', eventType);
    if (faceShape) params.append('faceShape', faceShape);

    // Navigate to recommendations page
    navigate(`/recommendations?${params.toString()}`);
  };

  return (
    <div 
      className='min-h-screen flex flex-col items-center pt-32 gap-14 text-center py-8 relative'
    >
      {/* Background Image with Darker Overlay */}
      <div 
        className='absolute inset-0 -z-10'
        style={{
          backgroundImage: `url(${assets.home_bg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      />
      {/* Darker overlay for better content visibility */}
      <div className='absolute inset-0 bg-gradient-to-b from-black/40 via-black/35 to-black/45 backdrop-blur-[0.5px] -z-10' />
      
      {/* Clean, Simple Heading */}
      <h1 className='text-4xl md:text-6xl font-bold text-white drop-shadow-[0_4px_20px_rgba(0,0,0,0.8)] px-4 leading-tight'>
        Astrella helps you wear the Best You.
      </h1>

      <form onSubmit={handleSubmit} className="flex flex-col items-center gap-6">
        {/* Glassmorphism Selection Fields in Single Line */}
        <div className="flex flex-wrap items-center justify-center gap-3 bg-white/40 backdrop-blur-md p-4 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.2)] border border-white/50 w-full max-w-[1000px]">
          
          <select 
            value={bodyType} 
            onChange={(e) => setBodyType(e.target.value)} 
            className="px-4 py-2 border-2 border-white/60 rounded-full text-gray-800 font-semibold hover:border-primary focus:border-primary focus:outline-none transition-all bg-white/60 backdrop-blur-sm shadow-md"
          >
            <option value="">Body Type</option>
            {bodyTypeList.map((body) => (
              <option key={body} value={body}>{body}</option>
            ))}
          </select>

          <select 
            value={skinTone} 
            onChange={(e) => setSkinTone(e.target.value)} 
            className="px-4 py-2 border-2 border-white/60 rounded-full text-gray-800 font-semibold hover:border-primary focus:border-primary focus:outline-none transition-all bg-white/60 backdrop-blur-sm shadow-md"
          >
            <option value="">Skin Tone</option>
            {skinToneList.map((skin) => (
              <option key={skin} value={skin}>{skin}</option>
            ))}
          </select>

          <div className="flex items-center gap-1 px-4 py-2 border-2 border-white/60 rounded-full hover:border-primary focus-within:border-primary transition-all bg-white/60 backdrop-blur-sm shadow-md">
            <input
              type="number"
              value={heightFeet}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '' || (parseInt(val) >= 0 && parseInt(val) <= 8)) {
                  setHeightFeet(val);
                }
              }}
              placeholder="5"
              min="0"
              max="8"
              step="1"
              className="w-10 text-center font-semibold text-gray-800 focus:outline-none bg-transparent"
            />
            <span className="text-gray-700 font-semibold text-sm">ft</span>
            <input
              type="number"
              value={heightInches}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '' || (parseInt(val) >= 0 && parseInt(val) <= 11)) {
                  setHeightInches(val);
                }
              }}
              placeholder="6"
              min="0"
              max="11"
              step="1"
              className="w-10 text-center font-semibold text-gray-800 focus:outline-none bg-transparent"
            />
            <span className="text-gray-700 font-semibold text-sm">in</span>
          </div>

          <select 
            value={eventType} 
            onChange={(e) => seteventType(e.target.value)} 
            className="px-4 py-2 border-2 border-white/60 rounded-full text-gray-800 font-semibold hover:border-primary focus:border-primary focus:outline-none transition-all bg-white/60 backdrop-blur-sm shadow-md"
          >
            <option value="">Event Type</option>
            {eventTypeList.map((event) => (
              <option key={event} value={event}>{event}</option>
            ))}
          </select>

          <select 
            value={faceShape} 
            onChange={(e) => setfaceShape(e.target.value)} 
            className="px-4 py-2 border-2 border-white/60 rounded-full text-gray-800 font-semibold hover:border-primary focus:border-primary focus:outline-none transition-all bg-white/60 backdrop-blur-sm shadow-md"
          >
            <option value="">Face Shape</option>
            {faceShapeList.map((face) => (
              <option key={face} value={face}>{face}</option>
            ))}
          </select>
        </div>

        {/* Glassmorphism Buttons */}
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setShowImageAnalysis(true)}
              className="bg-white/70 backdrop-blur-md text-primary border-2 border-white/80 px-8 py-3 rounded-full font-bold hover:bg-primary hover:text-white hover:border-primary transition-all shadow-xl flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Upload & Analyze Photo
            </button>
            <span className="text-white font-bold text-lg drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">or</span>
            <button
              type="submit"
              className="bg-primary text-white px-8 py-3 rounded-full font-bold hover:bg-primary-dull transition-all shadow-2xl border-2 border-primary hover:scale-105"
            >
              Get Recommendations
            </button>
          </div>
          <p className="text-sm text-gray-800 font-semibold bg-white/60 backdrop-blur-md px-6 py-2 rounded-full border border-white/70 shadow-lg">
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
