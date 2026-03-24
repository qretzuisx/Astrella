import React, { useState, useRef, useEffect } from 'react';
import * as faceapi from 'face-api.js';
import { bodyTypeList, skinToneList, faceShapeList } from '../assets/assets';

const ImageAnalysis = ({ onAnalysisComplete, onClose }) => {
  const [image, setImage] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState('');
  const [results, setResults] = useState(null);
  const [preview, setPreview] = useState(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);

  // Load face-api models for age, sex & facial landmarks
  useEffect(() => {
    let mounted = true;
    const loadModels = async () => {
      try {
        // Models are stored in /public/models
        const MODEL_URL = '/models';
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL), // For precise face shape detection
        ]);
        if (mounted) {
          setModelsLoaded(true);
        }
      } catch (e) {
        console.error('Failed to load face-api models:', e);
        if (mounted) setModelsLoaded(true); // Allow analysis to continue without age/sex
      }
    };
    loadModels();
    return () => { mounted = false; };
  }, []);

  // Helper: RGB to HSL conversion (for lighting-independent color analysis)
  const rgbToHsl = (r, g, b) => {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0; // achromatic
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

  // IMPROVED SKIN TONE ANALYSIS with Lighting Normalization
  const analyzeSkinTone = async (imgElement, faceLandmarks) => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = imgElement.width;
      canvas.height = imgElement.height;
      ctx.drawImage(imgElement, 0, 0);

      let regions = [];

      // If we have face landmarks, use them for precise regions
      if (faceLandmarks) {
        const landmarks = faceLandmarks.positions;
        // Use specific landmark points for skin sampling
        // Points 1-15: Jaw line, Points 19-24: Eyebrow area
        const foreheadY = landmarks[19].y - 20; // Above eyebrows
        const foreheadX = (landmarks[19].x + landmarks[24].x) / 2;
        const leftCheekX = landmarks[3].x;
        const leftCheekY = landmarks[31].y; // Nose reference
        const rightCheekX = landmarks[13].x;
        const rightCheekY = landmarks[31].y;

        regions = [
          { x: foreheadX - 15, y: foreheadY, w: 30, h: 20 },
          { x: leftCheekX, y: leftCheekY, w: 25, h: 25 },
          { x: rightCheekX - 25, y: rightCheekY, w: 25, h: 25 },
        ];
      } else {
        // Fallback to percentage-based regions if no landmarks
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

        for (let y = startY; y < endY; y += 3) {  // Increased from 2 to 3 for faster sampling
          for (let x = startX; x < endX; x += 3) {  // Increased from 2 to 3
            if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) continue;

            const { data } = ctx.getImageData(x, y, 1, 1);
            const [r, g, b] = [data[0], data[1], data[2]];
            const hsl = rgbToHsl(r, g, b);

            // IMPROVED skin detection using HSL (lighting-independent)
            // Skin hues are typically in the orange-yellow range (0-50°)
            // Saturation should be moderate (not gray, not super vibrant)
            const isSkinLike = (
              (hsl.h >= 0 && hsl.h <= 50) &&  // Skin tone hue range
              (hsl.s >= 0.20 && hsl.s <= 0.85) && // Not too gray or oversaturated
              (hsl.l >= 0.15 && hsl.l <= 0.85) && // Not too dark or too bright
              r > g && r > b // Red channel dominance (skin characteristic)
            );

            if (isSkinLike) {
              skinPixels.push({ r, g, b, h: hsl.h, s: hsl.s, l: hsl.l });
            }
          }
        }
      });

      if (skinPixels.length < 30) {
        console.warn('Not enough skin pixels detected, defaulting to Neutral');
        return 'Neutral';
      }

      // Calculate median RGB and HSL values (robust against outliers)
      skinPixels.sort((a, b) => (a.r + a.g + a.b) - (b.r + b.g + b.b));
      const medianIndex = Math.floor(skinPixels.length / 2);
      const median = skinPixels[medianIndex];

      // MULTI-METHOD UNDERTONE DETECTION (more reliable)
      let warmVotes = 0;
      let coolVotes = 0;

      // Method 1: RGB ratio analysis
      const rgRatio = median.r / Math.max(median.g, 1);
      const rbRatio = median.r / Math.max(median.b, 1);
      const bgRatio = median.b / Math.max(median.g, 1);

      if (rgRatio > 1.05 && median.r > median.b) warmVotes++; // More red than green
      if (bgRatio > 1.02) coolVotes++; // More blue than green

      // Method 2: HSL hue analysis
      if (median.h >= 0 && median.h <= 30) warmVotes++; // Orange/peachy hues
      if (median.h >= 15 && median.h <= 45) warmVotes++; // Yellow undertones
      if (median.h > 180 && median.h < 240) coolVotes++; // Blue/cyan undertones (rare but possible)

      // Method 3: Green channel dominance (cool skin often has more green)
      if (median.g > median.r && median.g > median.b) coolVotes++;

      // Method 4: Saturation check (very desaturated can indicate cool)
      if (median.s < 0.25) coolVotes++;

      // Final decision based on voting

      if (warmVotes > coolVotes + 1) return 'Warm';
      else if (coolVotes > warmVotes + 1) return 'Cool';
      else return 'Neutral';

    } catch (error) {
      console.error('Skin tone analysis error:', error);
      return 'Neutral';
    }
  };

  // BODY TYPE ANALYSIS (Improved)
  const analyzeBodyType = async (imgElement) => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = imgElement.width;
      canvas.height = imgElement.height;
      ctx.drawImage(imgElement, 0, 0);

      // Better positioned regions for body detection
      const regions = [
        { x: 0.25, y: 0.18, w: 0.5, h: 0.12 }, // shoulders
        { x: 0.32, y: 0.38, w: 0.36, h: 0.1 }, // waist
        { x: 0.28, y: 0.52, w: 0.44, h: 0.12 }  // hips
      ];

      const getRegionWidth = (region) => {
        const startX = Math.floor(canvas.width * region.x);
        const endX = Math.floor(canvas.width * (region.x + region.w));
        const startY = Math.floor(canvas.height * region.y);
        const endY = Math.floor(canvas.height * (region.y + region.h));

        let leftEdge = endX;
        let rightEdge = startX;
        let edgeCount = 0;

        for (let y = startY; y < endY; y += 3) {
          let rowLeftEdge = endX;
          let rowRightEdge = startX;

          for (let x = startX; x < endX; x += 2) {
            const { data } = ctx.getImageData(x, y, 1, 1);
            const brightness = (data[0] + data[1] + data[2]) / 3;

            // Better edge detection with contrast consideration
            const isEdge = brightness < 200 && data[3] > 200; // Check for solid pixels

            if (isEdge) {
              if (x < rowLeftEdge) rowLeftEdge = x;
              if (x > rowRightEdge) rowRightEdge = x;
            }
          }

          // Average across multiple rows for stability
          if (rowLeftEdge < rowRightEdge) {
            leftEdge = Math.min(leftEdge, rowLeftEdge);
            rightEdge = Math.max(rightEdge, rowRightEdge);
            edgeCount++;
          }
        }

        return edgeCount > 3 ? Math.max(0, rightEdge - leftEdge) : 0;
      };

      const shoulderWidth = getRegionWidth(regions[0]);
      const waistWidth = getRegionWidth(regions[1]);
      const hipWidth = getRegionWidth(regions[2]);

      if (shoulderWidth < 30 || waistWidth < 30 || hipWidth < 30) return 'Rectangle';

      const waistToShoulder = waistWidth / shoulderWidth;
      const waistToHip = waistWidth / hipWidth;
      const hipToShoulder = hipWidth / shoulderWidth;
      const shoulderToHip = shoulderWidth / hipWidth;

      // Improved classification thresholds
      if (waistToShoulder < 0.75 && waistToHip < 0.75 && Math.abs(hipToShoulder - 1) < 0.1)
        return 'Hourglass';
      else if (hipToShoulder > 1.1 && waistToHip < 0.85)
        return 'Pear';
      else if (shoulderToHip > 1.1 && waistToShoulder > 0.85)
        return 'Inverted Triangle';
      else if (waistToShoulder > 0.9 && waistToHip > 0.9 && Math.abs(hipToShoulder - 1) < 0.15)
        return 'Rectangle';
      else
        return 'Rectangle';
    } catch (error) {
      console.error('Body type analysis error:', error);
      return 'Rectangle';
    }
  };

  // IMPROVED FACE SHAPE ANALYSIS using Facial Landmarks
  const analyzeFaceShape = async (imgElement, faceLandmarks) => {
    try {
      // If we have landmarks, use them for accurate measurements
      if (faceLandmarks) {
        const landmarks = faceLandmarks.positions;

        // Key landmark points:
        // 0-16: Jawline (0=left jaw, 8=chin, 16=right jaw)
        // 17-21: Left eyebrow, 22-26: Right eyebrow
        // 27-35: Nose bridge and tip

        // Measure face widths at different points
        const jawWidth = Math.abs(landmarks[0].x - landmarks[16].x); // Full jaw width
        const cheekWidth = Math.abs(landmarks[2].x - landmarks[14].x); // Cheekbone width
        const foreheadWidth = Math.abs(landmarks[17].x - landmarks[26].x) * 1.2; // Eyebrow span (estimate forehead)
        const chinWidth = Math.abs(landmarks[6].x - landmarks[10].x); // Chin width

        // Measure face height
        const faceHeight = Math.abs(landmarks[8].y - ((landmarks[19].y + landmarks[24].y) / 2));

        // Calculate ratios for classification

        // Classification based on landmark ratios
        // Oval: Balanced proportions, face longer than wide
        if (faceRatio > 1.35 && Math.abs(foreheadToCheek - 1) < 0.15 && Math.abs(jawToCheek - 1) < 0.15) {
          return 'Oval';
        }

        // Heart: Wide forehead, narrow chin
        if (foreheadToCheek > 1.08 && chinToJaw < 0.65 && jawToCheek < 0.92) {
          return 'Heart';
        }

        // Round: Face nearly as wide as it is long, soft curves
        if (faceRatio < 1.2 && Math.abs(foreheadToCheek - 1) < 0.12 && Math.abs(jawToCheek - 1) < 0.12) {
          return 'Round';
        }

        // Square: Equal forehead, cheek, and jaw widths, strong jawline
        if (Math.abs(foreheadToCheek - 1) < 0.1 && Math.abs(jawToCheek - 1) < 0.1 && chinToJaw > 0.7) {
          return 'Square';
        }

        // Diamond: Widest at cheeks, narrow forehead and jaw
        if (cheekWidth > foreheadWidth && cheekWidth > jawWidth &&
          (cheekWidth - foreheadWidth) > 8 && (cheekWidth - jawWidth) > 8) {
          return 'Diamond';
        }

        // Default to Oval (most common and versatile)
        return 'Oval';
      }

      // Fallback to old method if no landmarks available
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = imgElement.width;
      canvas.height = imgElement.height;
      ctx.drawImage(imgElement, 0, 0);

      // More precise face region sampling (old method)
      const regions = [
        { x: 0.36, y: 0.15, w: 0.28, h: 0.06 }, // forehead
        { x: 0.32, y: 0.28, w: 0.36, h: 0.08 }, // cheekbones
        { x: 0.35, y: 0.42, w: 0.3, h: 0.06 },  // jawline
        { x: 0.42, y: 0.48, w: 0.16, h: 0.04 }  // chin
      ];

      const getFaceWidth = (region) => {
        const startX = Math.floor(canvas.width * region.x);
        const endX = Math.floor(canvas.width * (region.x + region.w));
        const startY = Math.floor(canvas.height * region.y);
        const endY = Math.floor(canvas.height * (region.y + region.h));

        let widths = [];

        for (let y = startY; y < endY; y += 2) {
          let rowLeftEdge = endX;
          let rowRightEdge = startX;

          for (let x = startX; x < endX; x += 2) {
            const { data } = ctx.getImageData(x, y, 1, 1);
            const [r, g, b] = [data[0], data[1], data[2]];
            const brightness = (r + g + b) / 3;

            // Better skin/face detection
            const isFaceLike = (
              brightness > 80 && brightness < 240 &&
              r > 60 && g > 40 && b > 20 &&
              r > b && data[3] > 200
            );

            if (isFaceLike) {
              if (x < rowLeftEdge) rowLeftEdge = x;
              if (x > rowRightEdge) rowRightEdge = x;
            }
          }

          if (rowLeftEdge < rowRightEdge) {
            widths.push(rowRightEdge - rowLeftEdge);
          }
        }

        // Return median width for more stability
        if (widths.length === 0) return 0;
        widths.sort((a, b) => a - b);
        return widths[Math.floor(widths.length / 2)];
      };

      const foreheadWidth = getFaceWidth(regions[0]);
      const cheekWidth = getFaceWidth(regions[1]);
      const jawWidth = getFaceWidth(regions[2]);
      const chinWidth = getFaceWidth(regions[3]);

      const faceHeight = Math.floor(canvas.height * 0.48) - Math.floor(canvas.height * 0.15);

      if (foreheadWidth < 20 || cheekWidth < 20 || jawWidth < 20) return 'Oval';

      const jawCheekRatio = jawWidth / cheekWidth;
      const foreheadCheekRatio = foreheadWidth / cheekWidth;
      const foreheadJawRatio = foreheadWidth / jawWidth;
      const chinJawRatio = chinWidth / jawWidth;
      const faceRatio = faceHeight / cheekWidth;

      // Improved classification with better thresholds
      if (foreheadCheekRatio > 1.05 && jawCheekRatio < 0.85 && chinJawRatio < 0.75)
        return 'Heart';
      else if (Math.abs(foreheadCheekRatio - 1) < 0.08 && Math.abs(jawCheekRatio - 1) < 0.08 && chinJawRatio > 0.75)
        return 'Square';
      else if (faceRatio < 1.15 && Math.abs(foreheadCheekRatio - 1) < 0.1 && Math.abs(jawCheekRatio - 1) < 0.1)
        return 'Round';
      else if (cheekWidth > foreheadWidth && cheekWidth > jawWidth && (cheekWidth - foreheadWidth) > 10 && (cheekWidth - jawWidth) > 10)
        return 'Diamond';
      else if (faceRatio > 1.3 && Math.abs(foreheadCheekRatio - 1) < 0.12 && Math.abs(jawCheekRatio - 1) < 0.12)
        return 'Oval';
      else
        return 'Oval'; // fallback
    } catch (error) {
      console.error('Face shape analysis error:', error);
      return 'Oval';
    }
  };


  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target.result);
      setImage(e.target.result);
      setAnalysisError('');
    };
    reader.readAsDataURL(file);
  };

  const analyzeImage = async () => {
    if (!image) {
      alert('Please choose a photo first.')
      return;
    }

    // If models are still loading, don't silently do nothing.
    if (!modelsLoaded) {
      alert('Loading analysis models... please try again in a moment.')
      return;
    }

    setAnalyzing(true);
    setAnalysisProgress('Loading image...');

    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = image;
      });

      setAnalysisProgress('Detecting face...');

      // First, get facial landmarks for improved analysis
      let faceLandmarks = null;
      let age = null;
      let detectedSex = null; // Temporary variable for face-api result
      let ageGroup = '';
      let sex = '';

      try {
        // Optimized: Reduced inputSize from 416 to 320 for faster processing (still accurate)
        const detection = await faceapi
          .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
          .withFaceLandmarks()
          .withAgeAndGender();

        if (detection) {
          faceLandmarks = detection.landmarks;
          age = Math.round(detection.age);
          detectedSex = detection.gender; // face-api returns 'male' | 'female'

          // Map to buckets required by UI
          if (age >= 6 && age <= 9) ageGroup = '6–9 Years'
          else if (age >= 10 && age <= 12) ageGroup = '10–12 Years'
          else if (age >= 13 && age <= 17) ageGroup = '13–17 Years'
          else if (age >= 18 && age <= 29) ageGroup = '18–29 Years'
          else if (age >= 30 && age <= 59) ageGroup = '30–59 Years'
          else if (age >= 60) ageGroup = '60+ Years'

          sex = detectedSex === 'female' ? 'Female' : detectedSex === 'male' ? 'Male' : ''
        } else {
          console.warn('⚠️ No face detected, using fallback analysis methods');
        }
      } catch (e) {
        console.warn('Face detection unavailable:', e);
      }

      setAnalysisProgress('Analyzing attributes...');

      // Analyze attributes using improved algorithms with facial landmarks
      const [skinTone, bodyType, faceShape] = await Promise.all([
        analyzeSkinTone(img, faceLandmarks),
        analyzeBodyType(img),
        analyzeFaceShape(img, faceLandmarks)
      ]);

      const analysisResults = {
        skinTone: skinTone || 'Neutral',
        bodyType: bodyType || 'Rectangle',
        faceShape: faceShape || 'Oval',
        ageGroup,
        sex,
        // keep original raw values for debugging
        age: age ?? '',
        confidence: age && sex ? 'High' : 'Medium'
      };

      // Automatically send results to Hero component and close modal
      onAnalysisComplete(analysisResults);
    } catch (error) {
      console.error('Analysis error:', error);
      setAnalysisError('Analysis failed. Please try again or use a different image.');
      const analysisResults = {
        skinTone: 'Neutral',
        bodyType: 'Rectangle',
        faceShape: 'Oval',
        ageGroup: '',
        sex: '',
        age: '',
        confidence: 'Low'
      };
      onAnalysisComplete(analysisResults);
    } finally {
      setAnalyzing(false);
      setAnalysisProgress('');
    }
  };

  const handleConfirm = () => {
    if (results) {
      onAnalysisComplete(results);
    }
  };

  const handleEdit = (attribute, value) => {
    setResults({
      ...results,
      [attribute]: value
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[32px] sm:rounded-[40px] shadow-[0_20px_60px_rgba(0,0,0,0.15)] max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto border border-primary/10 relative">
        <div className="p-6 sm:p-10">
          <div className="flex justify-between items-center mb-4 sm:mb-6 leading-none">
            <h2 className="text-2xl sm:text-3xl font-black text-primary tracking-tight pr-4">AI Profiler</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full w-10 h-10 flex items-center justify-center transition-all bg-gray-50 flex-shrink-0"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <p className="text-sm text-gray-500 font-medium mb-8">
            Upload a <span className="font-bold text-primary">clear and full-body photo</span>. Our AI will analyze your features and body proportions to recommend the perfect match for you.
          </p>

          {analysisError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3">
              <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              <p className="text-[11px] font-black text-red-800 uppercase tracking-widest">{analysisError}</p>
            </div>
          )}

          {!preview ? (
            <div className="border-2 border-dashed border-primary/20 bg-primary/5 rounded-[32px] p-8 sm:p-12 text-center group hover:bg-primary/10 hover:border-primary/40 transition-all cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
              />
              <div className="w-16 h-16 bg-white rounded-full mx-auto mb-6 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </div>
              <button
                className="bg-primary text-white px-8 py-3 rounded-full hover:bg-primary-dull transition-all text-xs font-black uppercase tracking-widest shadow-md mb-3"
              >
                Choose Photo
              </button>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                JPG, PNG up to 5MB
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="relative bg-gray-50 rounded-[32px] p-2 border border-gray-100">
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full h-auto rounded-[24px] max-h-64 sm:max-h-96 object-contain mx-auto"
                />
                <canvas ref={canvasRef} className="hidden" />
              </div>

              <div className="space-y-4">
                {analyzing && analysisProgress && (
                  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center justify-center gap-3">
                    <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                    <span className="text-[11px] font-black uppercase tracking-widest text-blue-800">{analysisProgress}</span>
                  </div>
                )}
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={analyzeImage}
                    disabled={analyzing || !modelsLoaded || !image}
                    className="flex-1 bg-primary text-white px-6 py-4 rounded-full hover:bg-primary-dull transition-all disabled:opacity-50 text-xs font-black uppercase tracking-[0.2em] shadow-[0_10px_20px_rgba(22,43,105,0.15)] active:scale-95"
                  >
                    {analyzing ? 'Analyzing...' : (!modelsLoaded ? 'Loading models...' : 'Analyze Photo')}
                  </button>
                  <button
                    onClick={() => {
                      setPreview(null);
                      setImage(null);
                      setResults(null);
                    }}
                    disabled={analyzing}
                    className="px-6 py-4 bg-white text-gray-600 border-2 border-gray-200 rounded-full hover:bg-gray-50 hover:border-gray-300 transition-all text-xs font-black uppercase tracking-[0.2em] active:scale-95 disabled:opacity-50"
                  >
                    Change Photo
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageAnalysis;


