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
          console.log('✅ All face-api models loaded successfully');
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

       console.log('Skin tone analysis:', { 
         pixelsDetected: skinPixels.length,
         medianRGB: `rgb(${median.r}, ${median.g}, ${median.b})`,
         medianHSL: `hsl(${median.h.toFixed(1)}°, ${(median.s*100).toFixed(1)}%, ${(median.l*100).toFixed(1)}%)` 
       });

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
       console.log('Undertone votes - Warm:', warmVotes, 'Cool:', coolVotes);
       
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
        const faceRatio = faceHeight / Math.max(cheekWidth, 1);
        const jawToCheek = jawWidth / Math.max(cheekWidth, 1);
        const foreheadToCheek = foreheadWidth / Math.max(cheekWidth, 1);
        const chinToJaw = chinWidth / Math.max(jawWidth, 1);
        
        console.log('Face shape measurements:', {
          jawWidth: jawWidth.toFixed(1),
          cheekWidth: cheekWidth.toFixed(1),
          foreheadWidth: foreheadWidth.toFixed(1),
          chinWidth: chinWidth.toFixed(1),
          faceHeight: faceHeight.toFixed(1),
          ratios: {
            faceRatio: faceRatio.toFixed(2),
            jawToCheek: jawToCheek.toFixed(2),
            foreheadToCheek: foreheadToCheek.toFixed(2),
            chinToJaw: chinToJaw.toFixed(2)
          }
        });
        
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
    console.log('Starting image analysis...');

    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = image;
      });

      setAnalysisProgress('Detecting face...');
      console.log('Image loaded, analyzing attributes...');

      // First, get facial landmarks for improved analysis
      let faceLandmarks = null;
      let age = null;
      let detectedSex = null; // Temporary variable for face-api result
      let ageGroup = '';
      let sex = '';

      try {
        console.log('Detecting face and landmarks...');
        // Optimized: Reduced inputSize from 416 to 320 for faster processing (still accurate)
        const detection = await faceapi
          .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
          .withFaceLandmarks()
          .withAgeAndGender();

        if (detection) {
          faceLandmarks = detection.landmarks;
          age = Math.round(detection.age);
          detectedSex = detection.gender; // face-api returns 'male' | 'female'

          console.log('✅ Face detected with', faceLandmarks.positions.length, 'landmarks');

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

      console.log('Analysis results:', { skinTone, bodyType, faceShape });

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

      console.log('Analysis complete, sending results to Hero:', analysisResults);
      
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        <div className="p-4 sm:p-6">
          <div className="flex justify-between items-center mb-3 sm:mb-4">
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold pr-2">Upload Photo for Analysis</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl sm:text-3xl flex-shrink-0"
            >
              ×
            </button>
          </div>

          <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">
            Upload a full-body or face photo. We'll analyze it to detect your body type, skin tone, and face shape.
          </p>

          {analysisError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{analysisError}</p>
            </div>
          )}

          {!preview ? (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 sm:p-8 text-center">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-primary text-white px-5 sm:px-6 py-2.5 sm:py-3 rounded-full hover:bg-primary-dull transition-all text-sm sm:text-base"
              >
                Choose Photo
              </button>
              <p className="text-xs sm:text-sm text-gray-500 mt-2">
                JPG, PNG up to 5MB
              </p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              <div className="relative">
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full h-auto rounded-lg max-h-64 sm:max-h-96 object-contain mx-auto"
                />
                <canvas ref={canvasRef} className="hidden" />
              </div>

              <div className="space-y-2 sm:space-y-3">
                {analyzing && analysisProgress && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 sm:p-3">
                    <div className="flex items-center gap-2">
                      <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                      <span className="text-xs sm:text-sm text-blue-800">{analysisProgress}</span>
                    </div>
                  </div>
                )}
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                  <button
                    onClick={analyzeImage}
                    disabled={analyzing || !modelsLoaded || !image}
                    className="flex-1 bg-primary text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-full hover:bg-primary-dull transition-all disabled:opacity-50 text-sm sm:text-base font-medium"
                  >
                    {analyzing ? 'Analyzing...' : (!modelsLoaded ? 'Loading models...' : 'Analyze Photo')}
                  </button>
                  <button
                    onClick={() => {
                      setPreview(null);
                      setImage(null);
                      setResults(null);
                    }}
                    className="px-4 sm:px-6 py-2.5 sm:py-3 border border-gray-300 rounded-full hover:bg-gray-50 transition-all text-sm sm:text-base"
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


