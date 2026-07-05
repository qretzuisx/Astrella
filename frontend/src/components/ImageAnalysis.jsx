import React, { useState, useRef, useEffect } from 'react';
import * as faceapi from 'face-api.js';
import { loadPoseModel, classifyBodyShape, scanWaistWidth } from '../utils/poseBodyAnalysis';

const ImageAnalysis = ({ onAnalysisComplete, onClose }) => {
  const [image, setImage] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState('');
  const [preview, setPreview] = useState(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [showGuidelines, setShowGuidelines] = useState(true);
  const fileInputRef = useRef(null);

  // Load face-api models for facial landmarks, age, and gender
  useEffect(() => {
    let mounted = true;
    const loadModels = async () => {
      try {
        const MODEL_URL = '/models';
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL),
        ]);
        if (mounted) {
          setModelsLoaded(true);
        }
      } catch (e) {
        console.error('Failed to load face-api models:', e);
        if (mounted) setModelsLoaded(true);
      }
    };
    loadModels();
    return () => { mounted = false; };
  }, []);

  const rgbToHsl = (r, g, b) => {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return { h: h * 360, s, l };
  };

  const analyzeSkinTone = async (imgElement, faceLandmarks) => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = imgElement.width;
      canvas.height = imgElement.height;
      ctx.drawImage(imgElement, 0, 0);

      let regions = [];
      if (faceLandmarks) {
        const landmarks = faceLandmarks.positions;
        const foreheadY = landmarks[19].y - 20;
        const foreheadX = (landmarks[19].x + landmarks[24].x) / 2;
        const leftCheekX = landmarks[3].x;
        const leftCheekY = landmarks[31].y;
        const rightCheekX = landmarks[13].x;
        const rightCheekY = landmarks[31].y;

        regions = [
          { x: foreheadX - 15, y: foreheadY, w: 30, h: 20 },
          { x: leftCheekX, y: leftCheekY, w: 25, h: 25 },
          { x: rightCheekX - 25, y: rightCheekY, w: 25, h: 25 },
        ];
      } else {
        regions = [
          { x: canvas.width * 0.38, y: canvas.height * 0.2, w: canvas.width * 0.24, h: canvas.height * 0.15 },
          { x: canvas.width * 0.35, y: canvas.height * 0.35, w: canvas.width * 0.12, h: canvas.height * 0.12 },
          { x: canvas.width * 0.53, y: canvas.height * 0.35, w: canvas.width * 0.12, h: canvas.height * 0.12 },
        ];
      }

      let skinPixels = [];
      regions.forEach(region => {
        const startX = Math.floor(region.x);
        const endX = Math.floor(region.x + region.w);
        const startY = Math.floor(region.y);
        const endY = Math.floor(region.y + region.h);
        for (let y = startY; y < endY; y += 3) {
          for (let x = startX; x < endX; x += 3) {
            if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) continue;
            const { data } = ctx.getImageData(x, y, 1, 1);
            const r = data[0], g = data[1], b = data[2];
            const hsl = rgbToHsl(r, g, b);
            const isSkinLike = (
              (hsl.h >= 0 && hsl.h <= 50) &&
              (hsl.s >= 0.20 && hsl.s <= 0.85) &&
              (hsl.l >= 0.15 && hsl.l <= 0.85) &&
              r > g && r > b
            );
            if (isSkinLike) skinPixels.push({ r, g, b, h: hsl.h, s: hsl.s, l: hsl.l });
          }
        }
      });

      if (skinPixels.length < 30) return 'Neutral';
      skinPixels.sort((a, b) => (a.r + a.g + a.b) - (b.r + b.g + b.b));
      const median = skinPixels[Math.floor(skinPixels.length / 2)];
      let warmVotes = 0, coolVotes = 0;
      const rgRatio = median.r / Math.max(median.g, 1), rbRatio = median.r / Math.max(median.b, 1), bgRatio = median.b / Math.max(median.g, 1);
      if (rgRatio > 1.05 && median.r > median.b) warmVotes++;
      if (bgRatio > 1.02) coolVotes++;
      if (median.h >= 0 && median.h <= 30) warmVotes++;
      if (median.h >= 15 && median.h <= 45) warmVotes++;
      if (median.h > 180 && median.h < 240) coolVotes++;
      if (median.g > median.r && median.g > median.b) coolVotes++;
      if (median.s < 0.25) coolVotes++;
      if (warmVotes > coolVotes + 1) return 'Warm';
      if (coolVotes > warmVotes + 1) return 'Cool';
      return 'Neutral';
    } catch (error) {
      console.error('Skin tone analysis error:', error);
      return 'Neutral';
    }
  };



  const analyzeFaceShape = async (imgElement, faceLandmarks) => {
    try {
      if (faceLandmarks) {
        const landmarks = faceLandmarks.positions;
        const jawWidth = Math.abs(landmarks[0].x - landmarks[16].x);
        const cheekWidth = Math.abs(landmarks[2].x - landmarks[14].x);
        const foreheadWidth = Math.abs(landmarks[17].x - landmarks[26].x) * 1.2;
        const chinWidth = Math.abs(landmarks[6].x - landmarks[10].x);
        const faceHeight = Math.abs(landmarks[8].y - ((landmarks[19].y + landmarks[24].y) / 2));
        const faceRatio = faceHeight / cheekWidth, foreheadToCheek = foreheadWidth / cheekWidth, jawToCheek = jawWidth / cheekWidth, chinToJaw = chinWidth / jawWidth;
        if (faceRatio > 1.45) return 'Long';
        if (foreheadToCheek > 1.05 && chinToJaw < 0.7) return 'Heart';
        if (jawToCheek > 1.05 && foreheadToCheek < 0.95) return 'Triangle';
        if (faceRatio < 1.15 && Math.abs(foreheadToCheek - 1) < 0.15 && Math.abs(jawToCheek - 1) < 0.15) return 'Round';
        if (faceRatio > 1.25 && Math.abs(foreheadToCheek - 1) < 0.12 && Math.abs(jawToCheek - 1) < 0.12) return 'Rectangle';
        if (Math.abs(foreheadToCheek - 1) < 0.12 && Math.abs(jawToCheek - 1) < 0.12) return 'Square';
        if (cheekWidth > foreheadWidth && cheekWidth > jawWidth) return 'Diamond';
        return 'Oval';
      }
      return 'Oval';
    } catch (error) {
      console.error('Face shape analysis error:', error);
      return 'Oval';
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith('image/')) {
       alert('Please upload a valid image file');
       return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target.result);
      setImage(e.target.result);
      setAnalysisError('');
      setShowGuidelines(false);
    };
    reader.readAsDataURL(file);
  };

  const analyzeImage = async () => {
    if (!image || !modelsLoaded) {
      alert(!image ? 'Please choose a photo first.' : 'Loading models... please try again in a moment.');
      return;
    }
    setAnalyzing(true);
    setAnalysisError('');

    try {
      // STEP 1: Load original image
      setAnalysisProgress('Analyzing face...');
      const originalImg = new Image();
      originalImg.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        originalImg.onload = resolve;
        originalImg.onerror = reject;
        originalImg.src = image;
      });

      // STEP 2: Face detection (face shape, skin tone landmarks)
      let faceLandmarks = null;
      const detection = await faceapi.detectSingleFace(originalImg, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 })).withFaceLandmarks();
      if (detection) {
        faceLandmarks = detection.landmarks;
      }

      // STEP 3: Pose detection on original image
      setAnalysisProgress('Detecting body shape...');
      const poseLandmarker = await loadPoseModel();
      const poseResults = poseLandmarker.detect(originalImg);
      let bodyType = 'Rectangle';

      const skinTone = await analyzeSkinTone(originalImg, faceLandmarks);
      const faceShape = await analyzeFaceShape(originalImg, faceLandmarks);

      // STEP 4: Body type classification
      if (poseResults?.landmarks?.length > 0) {
        const landmarks = poseResults.landmarks[0];
        const lShoulder = landmarks[11];
        const rShoulder = landmarks[12];
        const lHip = landmarks[23];
        const rHip = landmarks[24];
        
        // Shoulder & hip width from POSE LANDMARK X-coordinates.
        // These are at the actual skeleton joints — immune to arm position.
        const shoulderWidth = Math.abs(lShoulder.x - rShoulder.x);
        const hipWidth = Math.abs(lHip.x - rHip.x);
        
        // For waist: scan the original image using center-outward technique.
        // No bg removal needed — we scan from the body center (known from pose)
        // outward and find the edges where color changes significantly.
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = originalImg.width;
        canvas.height = originalImg.height;
        ctx.drawImage(originalImg, 0, 0);
        
        const waistWidth = scanWaistWidth(ctx, canvas.width, canvas.height, landmarks);
        
        // Sanity check: if scanned waist seems unreasonable, fall back to estimation
        let finalWaist = waistWidth;
        if (waistWidth <= 0 || waistWidth > Math.max(shoulderWidth, hipWidth) * 1.15) {
          const avgWidth = (shoulderWidth + hipWidth) / 2;
          finalWaist = avgWidth * 0.72;
          console.log(`[BodyShape] waist scan unreliable (${waistWidth.toFixed(4)}), using estimate: ${finalWaist.toFixed(4)}`);
        }
        
        console.log(`[BodyShape] shoulder=${shoulderWidth.toFixed(4)}, waist=${finalWaist.toFixed(4)}, hip=${hipWidth.toFixed(4)}`);
        bodyType = classifyBodyShape(shoulderWidth, finalWaist, hipWidth);
      } else {
        console.warn('Pose estimation failed, defaulting body type to Rectangle.');
        bodyType = 'Rectangle';
      }

      onAnalysisComplete({ skinTone, bodyType, faceShape, confidence: poseResults?.landmarks?.length > 0 ? 'High' : 'Medium' });
    } catch (error) {
      console.error('Analysis error:', error);
      setAnalysisError('Analysis failed. Please try again.');
      onAnalysisComplete({ skinTone: 'Neutral', bodyType: 'Rectangle', faceShape: 'Oval', confidence: 'Low' });
    } finally {
      setAnalyzing(false);
      setAnalysisProgress('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[110] sm:p-4 animate-in fade-in duration-200">
      <div className={`bg-white sm:rounded-[40px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.2)] ${preview ? 'max-w-2xl' : showGuidelines ? 'max-w-4xl' : 'max-w-2xl'} w-full border border-primary/5 relative transition-all duration-300 guidelines-modal-container`}>
        <div className={preview ? 'px-4 pt-4 pb-8 sm:px-8 sm:pt-6 sm:pb-6 pb-[env(safe-area-inset-bottom,24px)] preview-modal-wrapper' : 'p-4 sm:p-6 lg:p-8 py-4 lg:py-5 pb-8 sm:pb-6 pb-[env(safe-area-inset-bottom,24px)] guidelines-modal-wrapper'}>
          <div className={`flex justify-between items-center mb-5 leading-none sticky top-0 bg-white/95 backdrop-blur-md z-20 py-3 border-b border-transparent [&:not(:first-child)]:border-gray-100/60 guidelines-header ${preview ? '-mx-4 px-4 sm:-mx-8 sm:px-8' : '-mx-4 px-4 sm:mx-0 sm:px-0'}`}>
            <div className="pr-4">
              <h2 className="text-xl sm:text-3xl font-black text-primary tracking-tight">AI Profiler</h2>
              <div className="h-1 w-8 sm:w-12 bg-secondary mt-1.5 rounded-full"></div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button 
                onClick={() => setShowGuidelines(!showGuidelines)} 
                className={`text-[9px] sm:text-[10px] font-black uppercase tracking-widest px-3 sm:px-4 py-2 rounded-full transition-all ${showGuidelines ? 'bg-primary text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
              >
                Tips
              </button>
              <button 
                onClick={onClose} 
                className="text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center transition-all bg-gray-50 flex-shrink-0"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </div>

          {!preview && showGuidelines ? (
            <div className="animate-in slide-in-from-bottom-2 duration-300">
              <div className="space-y-2 mb-5 sm:mb-6 text-center px-4 guidelines-title-section">
                <h3 className="text-base sm:text-lg font-black text-primary uppercase tracking-widest">Get the best matches</h3>
                <p className="text-gray-500 text-xs sm:text-sm font-medium max-w-sm mx-auto leading-relaxed">A clear photo helps our AI find the <span className="text-primary font-bold">perfect fit</span> for you.</p>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mb-6 sm:mb-8 guidelines-grid-layout">
                <div className="bg-green-50/40 rounded-[28px] p-5 sm:p-6 border border-green-100 relative group overflow-hidden flex flex-col justify-between guidelines-ideal-card">
                  <div className="absolute top-8 left-4 sm:top-4 bg-green-500 text-white text-[9px] sm:text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest z-10 shadow-md">Ideal</div>
                  <div className="mb-5 rounded-[20px] overflow-hidden shadow-xl transition-transform group-hover:scale-[1.01] duration-300 bg-white aspect-square guidelines-ideal-image-container">
                    <img src="/guidelines/guideline_do_ideal.png" alt="Ideal Shot" className="w-full h-full object-cover" />
                  </div>
                  <div className="space-y-2 font-black text-xs sm:text-sm uppercase tracking-widest text-green-700 flex items-center gap-2">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    Full-Body Look
                    <p className="normal-case text-[11px] sm:text-xs text-green-800/60 font-medium tracking-normal mt-0.5">Show your whole body from head to toe in good light.</p>
                  </div>
                </div>
                <div className="space-y-6 guidelines-avoid-section">
                  <div className="text-[9px] font-black text-red-500 uppercase tracking-[0.2em] px-2 mb-1">What to avoid</div>
                  <div className="grid grid-cols-2 lg:grid-cols-2 gap-3 sm:gap-4">
                    <div className="bg-red-50/20 rounded-[20px] p-3 sm:p-4 border border-red-50 text-center guidelines-dont-card">
                      <div className="relative rounded-[12px] overflow-hidden aspect-square mb-2 grayscale-[0.6] bg-white guidelines-dont-image-container">
                        <img src="/guidelines/guideline_dont_half.png" alt="Half Body" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 flex items-center justify-center bg-red-500/5">
                          <svg className="w-6 h-6 sm:w-8 sm:h-8 text-red-500 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                        </div>
                      </div>
                      <div className="text-[9px] font-black text-red-800 uppercase tracking-widest">Half-Body</div>
                    </div>
                    <div className="bg-red-50/20 rounded-[20px] p-3 sm:p-4 border border-red-50 text-center guidelines-dont-card">
                      <div className="relative rounded-[12px] overflow-hidden aspect-square mb-2 grayscale-[0.6] bg-white guidelines-dont-image-container">
                        <img src="/guidelines/guideline_dont_mirror.png" alt="Mirror Selfie" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 flex items-center justify-center bg-red-500/5">
                          <svg className="w-6 h-6 sm:w-8 sm:h-8 text-red-500 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                        </div>
                      </div>
                      <div className="text-[9px] font-black text-red-800 uppercase tracking-widest">Mirror Selfie</div>
                    </div>
                    <div className="bg-red-50/25 rounded-[24px] p-3 sm:p-4 border border-red-50 col-span-2 flex gap-4 sm:gap-6 items-center guidelines-blocked-card">
                      <div className="relative rounded-[12px] overflow-hidden aspect-square h-20 sm:h-24 grayscale-[0.6] shrink-0 shadow-lg bg-white guidelines-blocked-image-container">
                        <img src="/guidelines/guideline_dont_obscured.png" alt="Blocked View" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 flex items-center justify-center bg-red-500/5">
                          <svg className="w-10 h-10 sm:w-16 sm:h-16 text-red-500 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] sm:text-sm font-black text-red-800 uppercase tracking-widest mb-1.5">Blocked View</div>
                        <p className="text-xs sm:text-sm text-red-700/60 font-medium leading-tight">Keep bags, clothes, or objects from covering your body.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-center gap-3 mt-4 mb-4">
                <button 
                  onClick={() => setShowGuidelines(false)} 
                  className="w-full sm:w-auto bg-primary text-white px-10 py-4.5 sm:px-14 sm:py-5 rounded-full hover:bg-primary-dull transition-all text-xs sm:text-sm font-black uppercase tracking-[0.2em] shadow-xl active:scale-95 guidelines-footer-button"
                >
                  Start Upload
                </button>
              </div>
            </div>
          ) : (
            <div className="animate-in fade-in duration-200">
              <p className="text-xs sm:text-sm text-gray-500 font-medium mb-4 sm:mb-5 text-center sm:text-left">Upload a <span className="font-bold text-primary">full-body photo</span> to get tailored recommendations.</p>
              {analysisError && <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3"><p className="text-[11px] font-black text-red-800 uppercase tracking-widest">{analysisError}</p></div>}
              {!preview ? (
                <div className="border-2 border-dashed border-primary/20 bg-primary/5 rounded-[32px] p-8 sm:p-20 text-center group hover:bg-primary/10 hover:border-primary/40 transition-all cursor-pointer relative" onClick={() => fileInputRef.current?.click()}>
                  <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                  <div className="w-20 h-20 bg-white rounded-full mx-auto mb-8 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-500 text-primary">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                  </div>
                  <h4 className="text-lg font-black text-primary uppercase tracking-widest mb-2">Select Your Photo</h4>
                  <button className="bg-primary text-white px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest shadow-md">Choose Photo</button>
                </div>
              ) : (
                <div className="space-y-4 sm:space-y-5">
                  <div className="-mx-4 sm:-mx-8 overflow-hidden rounded-[20px] sm:rounded-[28px] border border-gray-100 bg-gray-50/40">
                    <img
                      src={preview}
                      alt="Preview"
                      className="w-full max-h-[160px] sm:max-h-[200px] lg:max-h-[180px] xl:max-h-[200px] object-contain object-center block mx-auto"
                    />
                  </div>
                  {analyzing && <div className="bg-blue-50 border border-blue-200 rounded-3xl p-5 flex items-center justify-center gap-4 animate-pulse"><div className="animate-spin h-6 w-6 border-3 border-blue-600 border-t-transparent rounded-full"></div><span className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-800">{analysisProgress}</span></div>}
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-1">
                    <button onClick={analyzeImage} disabled={analyzing || !modelsLoaded || !image} className="flex-1 bg-primary text-white px-8 py-5 rounded-full hover:bg-primary-dull transition-all disabled:opacity-50 text-xs font-black uppercase tracking-[0.2em] shadow-[0_15px_30px_rgba(22,43,105,0.2)]">{analyzing ? 'Analyzing Profile...' : 'Start AI Analysis'}</button>
                    <button onClick={() => { setPreview(null); setImage(null); setResults(null); }} disabled={analyzing} className="px-8 py-5 bg-white text-gray-600 border-2 border-gray-200 rounded-full hover:bg-gray-50 text-xs font-black uppercase tracking-[0.2em]">Change</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageAnalysis;
