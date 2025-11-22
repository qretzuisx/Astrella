import React, { useState, useRef } from 'react';
import { bodyTypeList, skinToneList, faceShapeList } from '../assets/assets';

const ImageAnalysis = ({ onAnalysisComplete, onClose }) => {
  const [image, setImage] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState(null);
  const [preview, setPreview] = useState(null);
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);

  // Analyze skin tone from image
  const analyzeSkinTone = (imageData, width, height) => {
    // Sample pixels from face area (center-top region)
    const startX = Math.floor(width * 0.3);
    const endX = Math.floor(width * 0.7);
    const startY = Math.floor(height * 0.1);
    const endY = Math.floor(height * 0.4);

    let totalR = 0, totalG = 0, totalB = 0;
    let sampleCount = 0;

    for (let y = startY; y < endY; y += 5) {
      for (let x = startX; x < endX; x += 5) {
        const index = (y * width + x) * 4;
        const r = imageData[index];
        const g = imageData[index + 1];
        const b = imageData[index + 2];

        // Skip very dark or very light pixels (likely not skin)
        if (r > 50 && r < 240 && g > 50 && g < 240 && b > 50 && b < 240) {
          totalR += r;
          totalG += g;
          totalB += b;
          sampleCount++;
        }
      }
    }

    if (sampleCount === 0) return null;

    const avgR = totalR / sampleCount;
    const avgG = totalG / sampleCount;
    const avgB = totalB / sampleCount;

    // Determine skin tone based on RGB values
    // Warm tones: higher red/yellow
    // Cool tones: higher blue
    // Neutral: balanced
    const redYellow = avgR + avgG;
    const blue = avgB;

    if (redYellow > blue * 1.3) {
      return 'Warm';
    } else if (blue > redYellow * 1.1) {
      return 'Cold';
    } else {
      return 'Neutral';
    }
  };

  // Analyze body proportions (simplified)
  const analyzeBodyType = (imageData, width, height) => {
    // This is a simplified analysis
    // In a real app, you'd use pose detection models
    // For now, we'll use basic width measurements at different heights

    const shoulderY = Math.floor(height * 0.2);
    const waistY = Math.floor(height * 0.5);
    const hipY = Math.floor(height * 0.65);

    const getWidth = (y) => {
      let leftEdge = width;
      let rightEdge = 0;
      
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4;
        const r = imageData[index];
        const g = imageData[index + 1];
        const b = imageData[index + 2];
        const brightness = (r + g + b) / 3;
        
        // Find body edges (darker areas or significant color changes)
        if (brightness < 200) {
          if (x < leftEdge) leftEdge = x;
          if (x > rightEdge) rightEdge = x;
        }
      }
      
      return rightEdge - leftEdge;
    };

    const shoulderWidth = getWidth(shoulderY);
    const waistWidth = getWidth(waistY);
    const hipWidth = getWidth(hipY);

    // Simple classification
    if (waistWidth < shoulderWidth * 0.8 && waistWidth < hipWidth * 0.8) {
      return 'Hourglass';
    } else if (hipWidth > shoulderWidth * 1.1) {
      return 'Pear';
    } else if (Math.abs(shoulderWidth - waistWidth) < shoulderWidth * 0.1 && 
               Math.abs(waistWidth - hipWidth) < waistWidth * 0.1) {
      return 'Rectangle';
    } else {
      return 'Diamond';
    }
  };

  // Analyze face shape (simplified)
  const analyzeFaceShape = (imageData, width, height) => {
    // Simplified face shape detection
    // In reality, you'd need face detection models
    // This is a placeholder that returns a reasonable default
    
    // For now, we'll return a random but reasonable guess
    // In production, you'd use face-api.js or similar
    const faceShapes = ['Oval', 'Round', 'Square', 'Heart', 'Diamond'];
    
    // Simple heuristic: analyze face area proportions
    const faceTop = Math.floor(height * 0.1);
    const faceBottom = Math.floor(height * 0.4);
    const faceHeight = faceBottom - faceTop;
    const faceCenterX = Math.floor(width / 2);
    
    // Get face width at different heights
    const topWidth = getFaceWidth(imageData, width, faceTop + faceHeight * 0.2);
    const midWidth = getFaceWidth(imageData, width, faceTop + faceHeight * 0.5);
    const bottomWidth = getFaceWidth(imageData, width, faceTop + faceHeight * 0.8);
    
    // Classify based on proportions
    if (midWidth > topWidth && midWidth > bottomWidth) {
      return 'Diamond';
    } else if (bottomWidth > topWidth * 1.2) {
      return 'Heart';
    } else if (Math.abs(topWidth - bottomWidth) < topWidth * 0.1) {
      return 'Square';
    } else if (topWidth > midWidth * 1.1) {
      return 'Round';
    } else {
      return 'Oval';
    }
  };

  const getFaceWidth = (imageData, width, y) => {
    let leftEdge = width;
    let rightEdge = 0;
    const centerX = Math.floor(width / 2);
    
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      const r = imageData[index];
      const g = imageData[index + 1];
      const b = imageData[index + 2];
      const brightness = (r + g + b) / 3;
      
      // Detect face edges (skin-colored pixels)
      if (r > 100 && g > 80 && b > 60 && brightness < 220) {
        if (x < leftEdge) leftEdge = x;
        if (x > rightEdge) rightEdge = x;
      }
    }
    
    return rightEdge - leftEdge;
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

  const analyzeImage = () => {
    if (!image) return;

    setAnalyzing(true);

    // Use setTimeout to allow UI to update
    setTimeout(() => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        
        // Set canvas size
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw image to canvas
        ctx.drawImage(img, 0, 0);
        
        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Analyze attributes
        const skinTone = analyzeSkinTone(imageData.data, canvas.width, canvas.height) || 'Neutral';
        const bodyType = analyzeBodyType(imageData.data, canvas.width, canvas.height) || 'Rectangle';
        const faceShape = analyzeFaceShape(imageData.data, canvas.width, canvas.height) || 'Oval';
        
        const analysisResults = {
          skinTone,
          bodyType,
          faceShape,
          confidence: 'Medium' // Simplified
        };
        
        setResults(analysisResults);
        setAnalyzing(false);
      };
      img.src = image;
    }, 100);
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
                        <label className="text-sm text-gray-600">Skin Tone:</label>
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
                        <label className="text-sm text-gray-600">Body Type:</label>
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
                        <label className="text-sm text-gray-600">Face Shape:</label>
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
                      Review and adjust the detected attributes if needed
                    </p>
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={handleConfirm}
                      className="flex-1 bg-primary text-white px-6 py-3 rounded-full hover:bg-primary-dull transition-all"
                    >
                      Use These Attributes
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

