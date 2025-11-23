import React, { useState, useRef, useEffect } from 'react';
import { bodyTypeList, skinToneList, faceShapeList } from '../assets/assets';

const ImageAnalysis = ({ onAnalysisComplete, onClose }) => {
   const [image, setImage] = useState(null);
   const [analyzing, setAnalyzing] = useState(false);
   const [results, setResults] = useState(null);
   const [preview, setPreview] = useState(null);
   const [modelsLoaded, setModelsLoaded] = useState(true);
   const fileInputRef = useRef(null);
   const canvasRef = useRef(null);

  // Component is ready for analysis immediately
  useEffect(() => {
    setModelsLoaded(true); // Always ready since no models to load
  }, []);

   // SKIN TONE ANALYSIS
   const analyzeSkinTone = async (imgElement) => {
     try {
       const canvas = document.createElement('canvas');
       const ctx = canvas.getContext('2d');
       canvas.width = imgElement.width;
       canvas.height = imgElement.height;
       ctx.drawImage(imgElement, 0, 0);

       // Multiple regions for sampling
       const regions = [
         { x: 0.35, y: 0.15, w: 0.3, h: 0.2 }, // center
         { x: 0.25, y: 0.25, w: 0.15, h: 0.15 }, // left cheek
         { x: 0.6, y: 0.25, w: 0.15, h: 0.15 }, // right cheek
         { x: 0.4, y: 0.35, w: 0.2, h: 0.15 }   // chin
       ];

       let totalR = 0, totalG = 0, totalB = 0, count = 0;

       regions.forEach(region => {
         const startX = Math.floor(canvas.width * region.x);
         const endX = Math.floor(canvas.width * (region.x + region.w));
         const startY = Math.floor(canvas.height * region.y);
         const endY = Math.floor(canvas.height * (region.y + region.h));

         for (let y = startY; y < endY; y += 3) {
           for (let x = startX; x < endX; x += 3) {
             const { data } = ctx.getImageData(x, y, 1, 1);
             const [r, g, b] = [data[0], data[1], data[2]];

             // Looser skin pixel detection
             const isSkinLike = (
               r > 40 && g > 30 && b > 20 &&
               r < 250 && g < 240 && b < 240 &&
               r > g * 0.9 && g > b * 0.8
             );

             if (isSkinLike) {
               totalR += r;
               totalG += g;
               totalB += b;
               count++;
             }
           }
         }
       });

       if (count < 10) return 'Neutral';

       const avgR = totalR / count;
       const avgG = totalG / count;
       const avgB = totalB / count;

       const rbDiff = avgR - avgB;
       const rgDiff = avgR - avgG;

       if (rbDiff > 25 && rgDiff > 15) return 'Warm';
       else if (avgB > avgR && avgB > avgG) return 'Cool';
       else return 'Neutral';
     } catch (error) {
       console.error('Skin tone analysis error:', error);
       return 'Neutral';
     }
   };

  // BODY TYPE ANALYSIS
  const analyzeBodyType = async (imgElement) => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = imgElement.width;
      canvas.height = imgElement.height;
      ctx.drawImage(imgElement, 0, 0);

      const regions = [
        { x: 0.25, y: 0.15, w: 0.5, h: 0.2 }, // shoulders
        { x: 0.3, y: 0.35, w: 0.4, h: 0.15 }, // waist
        { x: 0.25, y: 0.5, w: 0.5, h: 0.2 }  // hips
      ];

      const getRegionWidth = (region) => {
        const startX = Math.floor(canvas.width * region.x);
        const endX = Math.floor(canvas.width * (region.x + region.w));
        const startY = Math.floor(canvas.height * region.y);
        const endY = Math.floor(canvas.height * (region.y + region.h));

        let leftEdge = endX;
        let rightEdge = startX;

        for (let y = startY; y < endY; y += 2) {
          for (let x = startX; x < endX; x += 2) {
            const { data } = ctx.getImageData(x, y, 1, 1);
            const brightness = (data[0] + data[1] + data[2]) / 3;

            if (brightness < 180) {
              if (x < leftEdge) leftEdge = x;
              if (x > rightEdge) rightEdge = x;
            }
          }
        }

        return Math.max(0, rightEdge - leftEdge);
      };

      const shoulderWidth = getRegionWidth(regions[0]);
      const waistWidth = getRegionWidth(regions[1]);
      const hipWidth = getRegionWidth(regions[2]);

      if (shoulderWidth < 20 || waistWidth < 20 || hipWidth < 20) return 'Rectangle';

      const waistToShoulder = waistWidth / shoulderWidth;
      const waistToHip = waistWidth / hipWidth;
      const hipToShoulder = hipWidth / shoulderWidth;

      if (waistToShoulder < 0.85 && waistToHip < 0.9 && Math.abs(shoulderWidth - hipWidth) < shoulderWidth * 0.15)
        return 'Hourglass';
      else if (hipToShoulder > 1.08 && waistToHip < 0.95)
        return 'Pear';
      else if (waistToShoulder > 1.05 && waistToHip > 1.02 && hipToShoulder < 0.98)
        return 'Diamond';
      else
        return 'Rectangle';
    } catch (error) {
      console.error('Body type analysis error:', error);
      return 'Rectangle';
    }
  };

  // FACE SHAPE ANALYSIS
  const analyzeFaceShape = async (imgElement) => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = imgElement.width;
      canvas.height = imgElement.height;
      ctx.drawImage(imgElement, 0, 0);

      const regions = [
        { x: 0.35, y: 0.12, w: 0.3, h: 0.08 }, // forehead
        { x: 0.3, y: 0.2, w: 0.4, h: 0.1 },   // cheekbones
        { x: 0.25, y: 0.3, w: 0.5, h: 0.08 }, // jawline
        { x: 0.4, y: 0.38, w: 0.2, h: 0.05 }  // chin
      ];

      const getFaceWidth = (region) => {
        const startX = Math.floor(canvas.width * region.x);
        const endX = Math.floor(canvas.width * (region.x + region.w));
        const startY = Math.floor(canvas.height * region.y);
        const endY = Math.floor(canvas.height * (region.y + region.h));

        let leftEdge = endX;
        let rightEdge = startX;

        for (let y = startY; y < endY; y += 2) {
          for (let x = startX; x < endX; x += 2) {
            const { data } = ctx.getImageData(x, y, 1, 1);
            const brightness = (data[0] + data[1] + data[2]) / 3;

            if (brightness > 60 && brightness < 220) {
              if (x < leftEdge) leftEdge = x;
              if (x > rightEdge) rightEdge = x;
            }
          }
        }

        return Math.max(0, rightEdge - leftEdge);
      };

      const foreheadWidth = getFaceWidth(regions[0]);
      const cheekWidth = getFaceWidth(regions[1]);
      const jawWidth = getFaceWidth(regions[2]);
      const chinWidth = getFaceWidth(regions[3]);

      const faceHeight = Math.floor(canvas.height * 0.43) - Math.floor(canvas.height * 0.12);

      if (foreheadWidth < 10 || cheekWidth < 10 || jawWidth < 10) return 'Oval';

      const jawCheekRatio = jawWidth / cheekWidth;
      const foreheadJawRatio = foreheadWidth / jawWidth;
      const chinJawRatio = chinWidth / jawWidth;
      const faceRatio = faceHeight / cheekWidth;

      if (foreheadJawRatio > 1.05 && chinJawRatio < 0.85 && jawCheekRatio < 0.95)
        return 'Heart';
      else if (jawCheekRatio > 1.02 && Math.abs(foreheadWidth - jawWidth) < foreheadWidth * 0.1)
        return 'Square';
      else if (faceRatio < 1.2 && jawCheekRatio < 1.05 && foreheadJawRatio < 1.05)
        return 'Round';
      else if (foreheadJawRatio < 0.95 && chinJawRatio < 0.9 && jawCheekRatio > 1.0)
        return 'Diamond';
      else if (faceRatio > 1.3 && jawCheekRatio >= 0.95 && jawCheekRatio <= 1.05)
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
    if (!image || !modelsLoaded) {
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

      console.log('Analysis results:', { skinTone, bodyType, faceShape });

      const analysisResults = {
        skinTone: skinTone || 'Neutral',
        bodyType: bodyType || 'Rectangle',
        faceShape: faceShape || 'Oval',
        confidence: 'High'
      };

      setResults(analysisResults);
      console.log('Results set:', analysisResults);
    } catch (error) {
      console.error('Analysis error:', error);
  
      const analysisResults = {
        skinTone: 'Neutral',
        bodyType: 'Rectangle',
        faceShape: 'Oval',
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
                    disabled={analyzing}
                    className="flex-1 bg-primary text-white px-6 py-3 rounded-full hover:bg-primary-dull transition-all disabled:opacity-50"
                  >
                    {analyzing ? 'Analyzing...' : 'Analyze Photo'}
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


