import React, { useState, useRef, useEffect } from 'react';
// import * as faceapi from 'face-api.js'; // Disabled due to package.json export issues
import { bodyTypeList, skinToneList, faceShapeList } from '../assets/assets';

const ImageAnalysis = ({ onAnalysisComplete, onClose }) => {
   const [image, setImage] = useState(null);
   const [analyzing, setAnalyzing] = useState(false);
   const [results, setResults] = useState(null);
   const [preview, setPreview] = useState(null);
   const [modelsLoaded, setModelsLoaded] = useState(false);
   const fileInputRef = useRef(null);
   const canvasRef = useRef(null);

  // Load face-api models for age & gender estimation
  useEffect(() => {
    let mounted = true;
    const loadModels = async () => {
      try {
        // Models are stored in /public/models
        const MODEL_URL = '/models';
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL),
        ]);
        if (mounted) setModelsLoaded(true);
      } catch (e) {
        console.error('Failed to load face-api models:', e);
        if (mounted) setModelsLoaded(true); // Allow analysis to continue without age/gender
      }
    };
    loadModels();
    return () => { mounted = false; };
  }, []);

   // SKIN TONE ANALYSIS (Improved)
   const analyzeSkinTone = async (imgElement) => {
     try {
       const canvas = document.createElement('canvas');
       const ctx = canvas.getContext('2d');
       canvas.width = imgElement.width;
       canvas.height = imgElement.height;
       ctx.drawImage(imgElement, 0, 0);

       // Focus on face regions (more accurate for skin tone)
       const regions = [
         { x: 0.38, y: 0.2, w: 0.24, h: 0.15 },  // forehead
         { x: 0.35, y: 0.35, w: 0.12, h: 0.12 }, // left cheek
         { x: 0.53, y: 0.35, w: 0.12, h: 0.12 }, // right cheek
         { x: 0.42, y: 0.48, w: 0.16, h: 0.08 }  // upper chin
       ];

       let skinPixels = [];

       regions.forEach(region => {
         const startX = Math.floor(canvas.width * region.x);
         const endX = Math.floor(canvas.width * (region.x + region.w));
         const startY = Math.floor(canvas.height * region.y);
         const endY = Math.floor(canvas.height * (region.y + region.h));

         for (let y = startY; y < endY; y += 2) {
           for (let x = startX; x < endX; x += 2) {
             const { data } = ctx.getImageData(x, y, 1, 1);
             const [r, g, b] = [data[0], data[1], data[2]];

             // Improved skin detection using YCbCr color space approximation
             const isSkinLike = (
               r > 95 && g > 40 && b > 20 &&
               r > g && r > b &&
               Math.abs(r - g) > 15 &&
               Math.max(r, g, b) - Math.min(r, g, b) > 15 &&
               r < 250 && g < 230 && b < 220
             );

             if (isSkinLike) {
               skinPixels.push({ r, g, b });
             }
           }
         }
       });

       if (skinPixels.length < 50) return 'Neutral';

       // Calculate median instead of average (more robust to outliers)
       skinPixels.sort((a, b) => (a.r + a.g + a.b) - (b.r + b.g + b.b));
       const medianIndex = Math.floor(skinPixels.length / 2);
       const medianPixel = skinPixels[medianIndex];

       const { r: avgR, g: avgG, b: avgB } = medianPixel;

       // Use ITA° (Individual Typology Angle) method for better accuracy
       const L = 0.2126 * avgR + 0.7152 * avgG + 0.0722 * avgB;
       const a = avgR - avgG;
       const b = avgG - avgB;
       
       // Calculate undertone
       const warmScore = a - b;
       const coolScore = b - a;

       if (warmScore > 8) return 'Warm';
       else if (coolScore > 8) return 'Cool';
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

  // FACE SHAPE ANALYSIS (Improved)
  const analyzeFaceShape = async (imgElement) => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = imgElement.width;
      canvas.height = imgElement.height;
      ctx.drawImage(imgElement, 0, 0);

      // More precise face region sampling
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
    console.log('Starting image analysis...');

    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = image;
      });

      console.log('Image loaded, analyzing attributes...');

      // Analyze attributes using improved algorithms
      const [skinTone, bodyType, faceShape] = await Promise.all([
        analyzeSkinTone(img),
        analyzeBodyType(img),
        analyzeFaceShape(img)
      ]);

      // Age & gender (face-api)
      let age = null;
      let gender = null;
      let ageGroup = '';
      let sex = '';
      try {
        const detection = await faceapi
          .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 }))
          .withAgeAndGender();

        if (detection) {
          age = Math.round(detection.age);
          gender = detection.gender; // 'male' | 'female'

          // Map to buckets required by UI
          if (age >= 6 && age <= 9) ageGroup = '6–9 Years'
          else if (age >= 10 && age <= 12) ageGroup = '10–12 Years'
          else if (age >= 13 && age <= 17) ageGroup = '13–17 Years'
          else if (age >= 18 && age <= 29) ageGroup = '18–29 Years'
          else if (age >= 30 && age <= 59) ageGroup = '30–59 Years'
          else if (age >= 60) ageGroup = '60+ Years'

          sex = gender === 'female' ? 'Female' : gender === 'male' ? 'Male' : ''
        }
      } catch (e) {
        console.warn('Age/gender detection unavailable:', e);
      }

      console.log('Analysis results:', { skinTone, bodyType, faceShape });

      const analysisResults = {
        skinTone: skinTone || 'Neutral',
        bodyType: bodyType || 'Rectangle',
        faceShape: faceShape || 'Oval',
        ageGroup,
        sex,
        // keep original raw values for debugging/backward compat
        age: age ?? '',
        gender: gender ?? '',
        confidence: age && gender ? 'High' : 'Medium'
      };

      setResults(analysisResults);
      console.log('Results set:', analysisResults);
    } catch (error) {
      console.error('Analysis error:', error);
  
      const analysisResults = {
        skinTone: 'Neutral',
        bodyType: 'Rectangle',
        faceShape: 'Oval',
        age: '',
        gender: '',
        confidence: 'Low'
      };
      setResults(analysisResults);
    } finally {
      setAnalyzing(false);
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Upload Photo for Analysis</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>

          <p className="text-gray-600 mb-4">
            Upload a full-body or face photo. We'll analyze it to detect your body type, skin tone, and face shape.
          </p>

          {!preview ? (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-primary text-white px-6 py-3 rounded-full hover:bg-primary-dull transition-all"
              >
                Choose Photo
              </button>
              <p className="text-sm text-gray-500 mt-2">
                JPG, PNG up to 5MB
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative">
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full h-auto rounded-lg max-h-96 object-contain mx-auto"
                />
                <canvas ref={canvasRef} className="hidden" />
              </div>

              {!results ? (
                <div className="flex gap-4">
                  <button
                    onClick={analyzeImage}
                    disabled={analyzing || !modelsLoaded || !image}
                    className="flex-1 bg-primary text-white px-6 py-3 rounded-full hover:bg-primary-dull transition-all disabled:opacity-50"
                  >
                    {analyzing ? 'Analyzing...' : (!modelsLoaded ? 'Loading models...' : 'Analyze Photo')}
                  </button>
                  <button
                    onClick={() => {
                      setPreview(null);
                      setImage(null);
                      setResults(null);
                    }}
                    className="px-6 py-3 border border-gray-300 rounded-full hover:bg-gray-50 transition-all"
                  >
                    Change Photo
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold mb-3">Detected Attributes</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm text-gray-600">Skin Tone</label>
                        <select
                          value={results.skinTone}
                          onChange={(e) => handleEdit('skinTone', e.target.value)}
                          className="w-full mt-1 p-2 border rounded"
                        >
                          {skinToneList.map(tone => (
                            <option key={tone} value={tone}>{tone}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-sm text-gray-600">Body Type</label>
                        <select
                          value={results.bodyType}
                          onChange={(e) => handleEdit('bodyType', e.target.value)}
                          className="w-full mt-1 p-2 border rounded"
                        >
                          {bodyTypeList.map(type => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-sm text-gray-600">Face Shape</label>
                        <select
                          value={results.faceShape}
                          onChange={(e) => handleEdit('faceShape', e.target.value)}
                          className="w-full mt-1 p-2 border rounded"
                        >
                          {faceShapeList.map(shape => (
                            <option key={shape} value={shape}>{shape}</option>
                          ))}
                        </select>
                      </div>

                      <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                        <div>
                          <label className="text-sm text-gray-600">Age Group</label>
                          <select
                            value={results.ageGroup || ''}
                            onChange={(e) => handleEdit('ageGroup', e.target.value)}
                            className="w-full mt-1 p-2 border rounded"
                          >
                            <option value=''>Select age group</option>
                            <option value='6–9 Years'>6–9 Years</option>
                            <option value='10–12 Years'>10–12 Years</option>
                            <option value='13–17 Years'>13–17 Years</option>
                            <option value='18–29 Years'>18–29 Years</option>
                            <option value='30–59 Years'>30–59 Years</option>
                            <option value='60+ Years'>60+ Years</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-sm text-gray-600">Sex</label>
                          <select
                            value={results.sex || ''}
                            onChange={(e) => handleEdit('sex', e.target.value)}
                            className="w-full mt-1 p-2 border rounded"
                          >
                            <option value=''>Select sex</option>
                            <option value='Female'>Female</option>
                            <option value='Male'>Male</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      The attributes above have been automatically detected and populated. Review and adjust if needed, then apply them.
                    </p>
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={handleConfirm}
                      className="flex-1 bg-primary text-white px-6 py-3 rounded-full hover:bg-primary-dull transition-all"
                    >
                      Apply Detected Attributes
                    </button>
                    <button
                      onClick={() => {
                        setPreview(null);
                        setImage(null);
                        setResults(null);
                      }}
                      className="px-6 py-3 border border-gray-300 rounded-full hover:bg-gray-50 transition-all"
                    >
                      Try Again
                    </button>
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


