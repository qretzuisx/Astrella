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
    setFaceShape(results.faceShape);
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
    <div className='min-h-screen flex flex-col items-center justify-center gap-14 bg-light text-center py-8'>
      <h1 className='text-4xl md:text-5xl font-semibold'>Astrella, your guide to becoming a Cinderella</h1>

      <form onSubmit={handleSubmit} className="flex flex-col items-center gap-4">
        <div className="flex flex-wrap md:flex-row items-start md:items-center justify-center gap-3 bg-white p-4 md:rounded-full rounded-2xl shadow-[0_8px_20px_rgba(0,0,0,0.1)] w-full md:w-[90%] lg:w-[80%] xl:w-[70%] max-w-[850px]">
          
          <div className="flex flex-col items-start gap-2">
            <select value={bodyType} onChange={(e) => setBodyType(e.target.value)} className="p-2 border rounded">
              <option value="">Body Type</option>{bodyTypeList.map((body) => (
                <option key={body} value={body}>{body}
                </option>))}
            </select>
            <p className='px-1 text-sm text-gray-500'>
              {bodyType ? bodyType : '(Select Body Type)'}</p>
          </div>
          <div className="flex flex-col items-start gap-2">
             <select value={skinTone} onChange={(e) => setSkinTone(e.target.value)} className="p-2 border rounded">
              <option value="">Skin tone</option>{skinToneList.map((skin) => (
                <option key={skin} value={skin}>{skin}
                </option>))}
            </select>
            <p className='px-1 text-sm text-gray-500'>
  {skinTone ? skinTone : '(Select Skin tone)'}</p>
          </div>
          <div className="flex flex-col items-start gap-2">
            <div className="flex items-center gap-1">
              <div className="flex items-center gap-1">
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
                  className="p-2 border rounded w-14 text-center"
                />
                <span className="text-gray-500 text-sm">ft</span>
              </div>
              <div className="flex items-center gap-1">
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
                  className="p-2 border rounded w-14 text-center"
                />
                <span className="text-gray-500 text-sm">in</span>
              </div>
            </div>
            <p className='px-1 text-sm text-gray-500'>
              {heightFeet || heightInches 
                ? `${heightFeet || 0}'${heightInches || 0}"` 
                : '(Enter height)'}</p>
          </div>
          <div className="flex flex-col items-start gap-2">
             <select value={eventType} onChange={(e) => seteventType(e.target.value)} className="p-2 border rounded">
              <option value="">Event Type</option>{eventTypeList.map((event) => (
                <option key={event} value={event}>{event}
                </option>))}
            </select>
            <p className='px-1 text-sm text-gray-500'>
              {eventType ? eventType: '(Select Event Type)'}</p>
          </div>
          <div className="flex flex-col items-start gap-2">
             <select value={faceShape} onChange={(e) => setfaceShape(e.target.value)} className="p-2 border rounded">
              <option value="">Face Shape</option>{faceShapeList.map((face) => (
                <option key={face} value={face}>{face}
                </option>))}
            </select>
            <p className='px-1 text-sm text-gray-500'>
              {faceShape ? faceShape : '(Select Face shape)'}</p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setShowImageAnalysis(true)}
              className="text-primary hover:text-primary-dull text-sm font-medium underline"
            >
            Upload Photo to Auto-Detect
            </button>
            <span className="text-gray-400">or</span>
            <button
              type="submit"
              className="bg-primary text-white px-6 py-3 rounded-full font-medium hover:bg-primary-dull transition-all"
            >
              Get Style Recommendations &gt;&gt;
            </button>
          </div>
          <p className="text-xs text-gray-500">
            Upload a photo to automatically detect your body type, skin tone, and face shape.
          </p>
        </div>
      </form>

      {showImageAnalysis && (
        <ImageAnalysis
          onAnalysisComplete={handleImageAnalysisComplete}
          onClose={() => setShowImageAnalysis(false)}
        />
      )}

      <img src={assets.main_ai} alt="ai" className='max-h-96 object-contain' />
    </div>
  );
}

export default Hero;
