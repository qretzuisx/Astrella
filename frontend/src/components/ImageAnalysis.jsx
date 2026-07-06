import React, { useState, useRef, useEffect } from 'react';
import * as faceapi from '@vladmandic/face-api';
import { loadPoseModel, classifyBodyShape } from '../utils/poseBodyAnalysis';
import { bodyTypeList, skinToneList, faceShapeList } from '../assets/assets';

// ─── Confidence badge styling ──────────────────────────────────────────────
const CONF_STYLE = {
  High:   'bg-green-500/10 text-green-500 border-green-500/20',
  Medium: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  Low:    'bg-red-500/10 text-red-500 border-red-500/20',
};

/**
 * ScanResultCard
 * Renders a premium dashboard showing measurements, confidence dials,
 * and step-by-step AI reasoning.
 */
const ScanResultCard = ({ result, onApply }) => {
  const handleApply = () => {
    onApply(result);
  };

  const attributes = [
    {
      key: 'bodyType',
      label: 'Body Shape',
      value: result.bodyShape?.value || result.bodyType,
      confidence: result.bodyShape?.confidence ? Math.round(result.bodyShape.confidence * 100) : 85,
    },
    {
      key: 'skinTone',
      label: 'Skin Undertone',
      value: result.skinUndertone?.value || result.skinTone,
      confidence: result.skinUndertone?.confidence ? Math.round(result.skinUndertone.confidence * 100) : 82,
    },
    {
      key: 'faceShape',
      label: 'Face Shape',
      value: result.faceShapeObj?.value || result.faceShape,
      confidence: result.faceShapeObj?.confidence ? Math.round(result.faceShapeObj.confidence * 100) : 88,
    },
  ];

  return (
    <div className="mt-4 rounded-3xl bg-white border border-gray-100 overflow-hidden shadow-sm space-y-5 p-5">


      {/* Dials / Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {attributes.map(attr => {
          const isHigh = attr.confidence >= 82;
          const isMedium = attr.confidence >= 60 && attr.confidence < 82;
          const confLabel = isHigh ? 'High' : isMedium ? 'Medium' : 'Low';
          const confColor = isHigh ? 'text-green-500' : isMedium ? 'text-yellow-500' : 'text-red-500';

          return (
            <div key={attr.key} className="bg-gray-50/50 border border-gray-100 rounded-2xl p-4 flex flex-col justify-between space-y-3">
              <div>
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">{attr.label}</span>
                <h3 className="text-base font-black text-primary tracking-tight mt-1 capitalize">{attr.value}</h3>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="relative w-7 h-7 flex items-center justify-center shrink-0">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="14" cy="14" r="10" stroke="#E5E7EB" strokeWidth="2.5" fill="transparent" />
                    <circle cx="14" cy="14" r="10" stroke={isHigh ? '#22C55E' : isMedium ? '#EAB308' : '#EF4444'} strokeWidth="2.5" fill="transparent"
                      strokeDasharray="62.8"
                      strokeDashoffset={62.8 - (62.8 * attr.confidence) / 100}
                    />
                  </svg>
                  <span className="absolute text-[8px] font-black text-primary">{attr.confidence}%</span>
                </div>
                <span className={`text-[9px] font-black uppercase tracking-wider ${confColor}`}>{confLabel}</span>
              </div>
            </div>
          );
        })}
      </div>


      {/* Apply Button */}
      <div className="pt-2">
        <button
          onClick={handleApply}
          className="w-full bg-primary text-white py-4 rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-primary-dull transition-all shadow-md active:scale-[0.99]"
        >
          Confirm Attributes & Apply recommendations
        </button>
      </div>
    </div>
  );
};

const ImageAnalysis = ({ sex = 'Female', onAnalysisComplete, onClose }) => {
  const [image, setImage] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState('');
  const [preview, setPreview] = useState(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [analysisResult, setAnalysisResult] = useState(null);
  const [showGuidelines, setShowGuidelines] = useState(true);
  const fileInputRef = useRef(null);

  // Sync profile gender within the scanner modal
  const [scannerSex, setScannerSex] = useState(sex || 'Female');

  useEffect(() => {
    if (sex) setScannerSex(sex);
  }, [sex]);

  // Ref to track the current analysis session ID to prevent race conditions
  const analysisIdRef = useRef(0);

  // Load face-api models
  useEffect(() => {
    let mounted = true;
    const loadModels = async () => {
      try {
        const MODEL_URL = '/models';
        
        if (faceapi.tf && typeof faceapi.tf.ready === 'function') {
          try {
            await faceapi.tf.ready();
          } catch (readyErr) {
            console.warn('[Scan] tf.ready err:', readyErr);
          }
        }

        const toLoad = [];
        if (!faceapi.nets.tinyFaceDetector.isLoaded) {
          toLoad.push(faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL));
        }
        if (!faceapi.nets.faceLandmark68Net.isLoaded) {
          toLoad.push(faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL));
        }
        if (toLoad.length > 0) await Promise.all(toLoad);
        if (mounted) setModelsLoaded(true);
      } catch (e) {
        console.error('Failed to load face-api models:', e);
        if (mounted) {
          setModelsLoaded(false);
          setAnalysisError('Failed to load face detection models. Please refresh the page.');
        }
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
        default: h = 0;
      }
    }
    return { h: h * 360, s, l };
  };

  const resizeImage = (imgElement, maxDim = 800) => {
    const w = imgElement.naturalWidth || imgElement.videoWidth || imgElement.width;
    const h = imgElement.naturalHeight || imgElement.videoHeight || imgElement.height;
    const scale = (w > maxDim || h > maxDim) ? maxDim / Math.max(w, h) : 1;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    canvas.getContext('2d').drawImage(imgElement, 0, 0, canvas.width, canvas.height);
    return canvas;
  };

  const cloneCanvas = (src) => {
    const dst = document.createElement('canvas');
    dst.width = src.width;
    dst.height = src.height;
    dst.getContext('2d').drawImage(src, 0, 0);
    return dst;
  };

  const cropFaceFromPose = (canvas, poseLandmarks) => {
    const w = canvas.width;
    const h = canvas.height;

    const nose = poseLandmarks[0];
    const leftEar = poseLandmarks[7];
    const rightEar = poseLandmarks[8];
    const leftShoulder = poseLandmarks[11];
    const rightShoulder = poseLandmarks[12];

    if (!nose) return null;

    let faceWidth = 0;
    if (leftEar && rightEar && Math.abs(leftEar.x - rightEar.x) > 0.01) {
      faceWidth = Math.abs(leftEar.x - rightEar.x) * w;
    } else if (leftShoulder && rightShoulder) {
      faceWidth = Math.abs(leftShoulder.x - rightShoulder.x) * w * 0.30;
    } else {
      faceWidth = w * 0.15;
    }

    const cx = nose.x * w;
    const cy = nose.y * h;

    const boxW = faceWidth * 2.0;
    const boxH = faceWidth * 2.2;

    const startX = Math.max(0, Math.floor(cx - boxW / 2));
    const startY = Math.max(0, Math.floor(cy - boxH * 0.55));
    const endX   = Math.min(w, Math.floor(cx + boxW / 2));
    const endY   = Math.min(h, Math.floor(cy + boxH * 0.45));

    const cropW = endX - startX;
    const cropH = endY - startY;

    if (cropW <= 10 || cropH <= 10) return null;

    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = 160;
    cropCanvas.height = 160;
    const ctx = cropCanvas.getContext('2d');
    ctx.drawImage(canvas, startX, startY, cropW, cropH, 0, 0, 160, 160);

    return {
      canvas: cropCanvas,
      offsetX: startX,
      offsetY: startY,
      scaleX: cropW / 160,
      scaleY: cropH / 160
    };
  };

  // ── SKIN UNDERTONE SAMPLING & ANALYSIS ─────────────────────────────────────
  const analyzeSkinTone = (imgElement, faceLandmarks, poseLandmarks = null) => {
    try {
      const srcW = imgElement.width;
      const srcH = imgElement.height;
      if (!srcW || !srcH) return { tone: 'Neutral', confidence: 'Low', confidenceVal: 0.48, status: 'Low Confidence' };

      const canvas = document.createElement('canvas');
      const ctx    = canvas.getContext('2d');
      canvas.width  = srcW;
      canvas.height = srcH;
      ctx.drawImage(imgElement, 0, 0, srcW, srcH);

      let regions = [];
      if (faceLandmarks) {
        const lm = faceLandmarks.positions;
        const foreheadX = (lm[19].x + lm[24].x) / 2;
        regions = [
          { x: foreheadX - 18, y: lm[19].y - 20, w: 36, h: 20 },  // forehead
          { x: lm[3].x,        y: lm[31].y,       w: 24, h: 24 },  // left cheek
          { x: lm[13].x - 24,  y: lm[31].y,       w: 24, h: 24 },  // right cheek
          { x: lm[30].x - 8,   y: lm[30].y,       w: 16, h: 14 },  // nose tip
          { x: lm[8].x  - 12,  y: lm[8].y  - 8,   w: 24, h: 16 },  // chin
        ];
      } else if (poseLandmarks) {
        const nose = poseLandmarks[0];
        if (nose) {
          const cx = nose.x * srcW;
          const cy = nose.y * srcH;
          const boxW = srcW * 0.08;
          regions = [
            { x: cx - boxW * 0.4, y: cy - boxW * 0.3, w: boxW * 0.8, h: boxW * 0.6 }
          ];
        }
      }

      if (regions.length === 0) {
        regions = [
          { x: canvas.width * 0.44, y: canvas.height * 0.12, w: canvas.width * 0.12, h: canvas.height * 0.08 }
        ];
      }

      let skinPixels = [];
      regions.forEach(region => {
        const startX = Math.max(0, Math.floor(region.x));
        const startY = Math.max(0, Math.floor(region.y));
        const endX   = Math.min(canvas.width,  Math.floor(region.x + region.w));
        const endY   = Math.min(canvas.height, Math.floor(region.y + region.h));
        const rw = endX - startX, rh = endY - startY;
        if (rw <= 0 || rh <= 0) return;

        const { data } = ctx.getImageData(startX, startY, rw, rh);
        for (let row = 0; row < rh; row += 2) {
          for (let col = 0; col < rw; col += 2) {
            const idx = (row * rw + col) * 4;
            const r = data[idx], g = data[idx + 1], b = data[idx + 2];
            const hsl = rgbToHsl(r, g, b);
            
            // STRICT SKIN PIXEL FILTER:
            const isSkinLike = (
              hsl.h >= 4 && hsl.h <= 40 &&
              hsl.s >= 0.12 && hsl.s <= 0.70 &&
              hsl.l >= 0.22 && hsl.l <= 0.82 &&
              r > g && g > b &&
              (r - b) > 12 &&
              (r - g) > 8
            );
            if (isSkinLike) skinPixels.push({ r, g, b, h: hsl.h, s: hsl.s, l: hsl.l });
          }
        }
      });

      if (skinPixels.length < 15) {
        return { tone: 'Neutral', confidence: 'Low', confidenceVal: 0.48, status: 'Low Confidence' };
      }

      skinPixels.sort((a, b) => (a.r + a.g + a.b) - (b.r + b.g + b.b));
      const median = skinPixels[Math.floor(skinPixels.length / 2)];

      let warmthScore = 0;
      const h = median.h;
      const r = median.r;
      const g = median.g;
      const b = median.b;

      if (h > 24) warmthScore += 0.40;
      else if (h < 17) warmthScore -= 0.40;

      const gbRatio = (g - b) / r;
      if (gbRatio > 0.13) warmthScore += 0.50;
      else if (gbRatio < 0.08) warmthScore -= 0.50;

      const rbRatio = r / Math.max(b, 1);
      if (rbRatio > 1.42) warmthScore += 0.30;
      else if (rbRatio < 1.28) warmthScore -= 0.30;

      warmthScore = Math.max(-1.0, Math.min(1.0, warmthScore));

      let lightConfPenalty = 0;
      if (median.l > 0.78 || median.l < 0.28) {
        lightConfPenalty = 0.20;
      }

      const WARM_THRESHOLD = 0.35;
      const COOL_THRESHOLD = -0.35;

      let tone = 'Neutral';
      let confidenceVal = 0.85;

      if (warmthScore >= WARM_THRESHOLD) {
        tone = 'Warm';
        const gap = warmthScore - WARM_THRESHOLD;
        confidenceVal = 0.60 + (gap / (1.0 - WARM_THRESHOLD)) * 0.38 - lightConfPenalty;
      } else if (warmthScore <= COOL_THRESHOLD) {
        tone = 'Cool';
        const gap = Math.abs(warmthScore) - Math.abs(COOL_THRESHOLD);
        confidenceVal = 0.60 + (gap / (1.0 - Math.abs(COOL_THRESHOLD))) * 0.38 - lightConfPenalty;
      } else {
        tone = 'Neutral';
        const centerCloseness = 1.0 - Math.abs(warmthScore) / Math.max(0.01, WARM_THRESHOLD);
        confidenceVal = 0.65 + centerCloseness * 0.33 - lightConfPenalty;
      }

      confidenceVal = Math.min(0.98, Math.max(0.30, confidenceVal));
      
      let confidence = 'Medium';
      let status = 'Confidence OK';
      if (confidenceVal >= 0.82) {
        confidence = 'High';
      } else if (confidenceVal < 0.60) {
        confidence = 'Low';
        status = 'Low Confidence';
      }

      return { tone, confidence, confidenceVal, status };
    } catch (error) {
      console.error('Skin tone analysis error:', error);
      return { tone: 'Neutral', confidence: 'Low', confidenceVal: 0.48, status: 'Low Confidence' };
    }
  };

  // ── FACE SHAPE MEASUREMENT & RULES ─────────────────────────────────────────
  const analyzeFaceShape = (imgElement, faceLandmarks) => {
    try {
      if (!faceLandmarks) {
        console.warn('[FaceShape] No face landmarks detected — Oval (Low confidence)');
        return { shape: 'Oval', confidence: 'Low', confidenceVal: 0.45 };
      }

      const lm = faceLandmarks.positions;
      const faceWidth     = Math.abs(lm[2].x  - lm[14].x);
      const jawWidth      = Math.abs(lm[4].x  - lm[12].x);
      const foreheadWidth = Math.abs(lm[17].x - lm[26].x);
      const faceHeight    = Math.abs(lm[8].y  - ((lm[19].y + lm[24].y) / 2));
      const faceLength    = faceHeight * 1.45;

      const lenToWidth = faceLength / faceWidth;
      const foreheadToWidth = foreheadWidth / faceWidth;
      const jawToWidth = jawWidth / faceWidth;
      const foreheadToJaw = foreheadWidth / jawWidth;

      let shape = 'Oval';
      let matchScore = 0.80;

      if (foreheadToJaw > 1.25 && jawToWidth < 0.80) {
        shape = 'Heart';
        matchScore = 0.88;
      } else if (foreheadToWidth < 0.90 && jawToWidth < 0.80 && foreheadWidth < faceWidth && jawWidth < faceWidth) {
        shape = 'Diamond';
        matchScore = 0.90;
      } else if (lenToWidth > 1.45) {
        shape = 'Oblong';
        matchScore = 0.89;
      } else if (lenToWidth <= 1.34) {
        if (jawToWidth > 0.90 && foreheadToWidth > 0.90) {
          shape = 'Square';
          matchScore = 0.92;
        } else if (jawToWidth > 0.80 && foreheadToWidth > 0.80) {
          shape = 'Round';
          matchScore = 0.94;
        } else {
          shape = 'Oval';
          matchScore = 0.85;
        }
      } else {
        shape = 'Oval';
        matchScore = 0.85;
      }

      const confidenceVal = Math.min(0.98, Math.max(0.30, matchScore));
      const confidenceCategory = confidenceVal >= 0.82 ? 'High' : confidenceVal >= 0.60 ? 'Medium' : 'Low';

      return { shape, confidence: confidenceCategory, confidenceVal };
    } catch (error) {
      console.error('Face shape analysis error:', error);
      return { shape: 'Oval', confidence: 'Low', confidenceVal: 0.45 };
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith('image/')) {
       alert('Please upload a valid image file');
       return;
    }
    console.log('[Scan] 📁 New image selected:', file.name, `(${(file.size / 1024).toFixed(1)} KB, ${file.type})`);
    
    // Clear previous scan state completely
    setAnalysisResult(null);
    setAnalysisError('');
    
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      setPreview(dataUrl);
      setImage(dataUrl);
      setShowGuidelines(false);
    };
    reader.readAsDataURL(file);
  };

  const handleChange = () => {
    setPreview(null);
    setImage(null);
    setAnalysisResult(null);
    setAnalysisError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── CORE SCAN PIPELINE ─────────────────────────────────────────────────────
  const analyzeImage = async () => {
    if (!image || !modelsLoaded) {
      alert(!image ? 'Please choose a photo first.' : 'Loading models... please try again.');
      return;
    }

    const currentId = ++analysisIdRef.current;
    console.log('[Scan] 🚀 Starting AI image analysis scan. Scan ID:', currentId, 'Selected Sex:', scannerSex);

    setAnalyzing(true);
    setAnalysisResult(null);
    setAnalysisError('');
    setAnalysisProgress('Loading image...');

    try {
      const originalImg = new Image();
      originalImg.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        originalImg.onload = resolve;
        originalImg.onerror = reject;
        originalImg.src = image.startsWith('data:') ? image : `${image}?t=${Date.now()}`;
      });

      if (analysisIdRef.current !== currentId) return;

      setAnalysisProgress('Preparing image...');
      const analysisImg = resizeImage(originalImg, 1200);

      if (analysisIdRef.current !== currentId) return;

      setAnalysisProgress('Detecting body shape...');
      const poseLandmarker = await loadPoseModel();

      if (analysisIdRef.current !== currentId) return;

      const freshCanvasForPose = cloneCanvas(analysisImg);
      const poseResults = await poseLandmarker.detect(freshCanvasForPose);

      if (analysisIdRef.current !== currentId) return;

      let bodyTypeResult;
      if (poseResults?.landmarks?.length > 0) {
        const waistCtx = freshCanvasForPose.getContext('2d');
        bodyTypeResult = classifyBodyShape(waistCtx, freshCanvasForPose.width, freshCanvasForPose.height, poseResults.landmarks[0], scannerSex);
      } else {
        bodyTypeResult = {
          success: false,
          type: 'Rectangle',
          confidence: 'Low',
          confidenceVal: 0.20,
          notes: ['No pose landmarks detected.'],
          error: 'Unable to detect a full-body pose. Please use a clear, full-body photo.'
        };
      }

      if (!bodyTypeResult.success) {
        setAnalysisResult({
          failedQuality: true,
          error: bodyTypeResult.error || 'Insufficient visual information.',
          notes: bodyTypeResult.notes
        });
        setAnalyzing(false);
        setAnalysisProgress('');
        return;
      }

      if (analysisIdRef.current !== currentId) return;

      setAnalysisProgress('Analyzing face...');
      let faceLandmarks = null;
      let targetImg = analysisImg;

      const crop = cropFaceFromPose(analysisImg, poseResults.landmarks[0]);
      if (crop) {
        const detection = await faceapi
          .detectSingleFace(crop.canvas, new faceapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.15 }))
          .withFaceLandmarks();

        if (detection) {
          faceLandmarks = detection.landmarks;
          targetImg = crop.canvas;
        }
      }

      if (analysisIdRef.current !== currentId) return;

      setAnalysisProgress('Analyzing skin tone & face shape...');
      const skinToneResult = analyzeSkinTone(targetImg, faceLandmarks, poseResults.landmarks[0]);
      const faceShapeResult = analyzeFaceShape(targetImg, faceLandmarks);

      if (analysisIdRef.current !== currentId) return;

      // Compile structured JSON response
      const finalResult = {
        success: true,
        skinTone:           skinToneResult.tone,
        skinToneConfidence: skinToneResult.confidence,
        bodyType:           bodyTypeResult.type,
        bodyTypeConfidence: bodyTypeResult.confidence,
        faceShape:          faceShapeResult.shape,
        faceShapeConfidence:faceShapeResult.confidence,
        sex:                scannerSex, // return scan gender
        
        bodyShape: {
          value: bodyTypeResult.type,
          confidence: bodyTypeResult.confidenceVal
        },
        faceShapeObj: {
          value: faceShapeResult.shape,
          confidence: faceShapeResult.confidenceVal
        },
        skinUndertone: {
          value: skinToneResult.tone,
          confidence: skinToneResult.confidenceVal
        },
        bodyProportion: {
          value: bodyTypeResult.bodyProportion,
          confidence: 0.85
        },
        measurements: bodyTypeResult.measurements,
        notes: [
          `Profile gender ruleset applied: ${scannerSex}.`,
          ...bodyTypeResult.notes,
          `Face shape estimated as ${faceShapeResult.shape} (confidence: ${Math.round(faceShapeResult.confidenceVal * 100)}%).`,
          `Skin undertone estimated as ${skinToneResult.tone} (confidence: ${Math.round(skinToneResult.confidenceVal * 100)}%, ${skinToneResult.status}).`,
          `Validated prediction attributes correctly against visual proportions.`
        ]
      };

      const belowThreshold = bodyTypeResult.confidenceVal < 0.60 || faceShapeResult.confidenceVal < 0.60 || skinToneResult.confidenceVal < 0.60;
      if (belowThreshold) {
        finalResult.failedQuality = true;
        finalResult.error = 'Unable to confidently determine body profile.';
      }

      setAnalysisResult(finalResult);
    } catch (error) {
      if (analysisIdRef.current !== currentId) return;
      console.error('[Scan] Analysis failed:', error);
      setAnalysisError('Analysis failed. Please try again.');
    } finally {
      if (analysisIdRef.current === currentId) {
        setAnalyzing(false);
        setAnalysisProgress('');
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[110] sm:p-4 animate-in fade-in duration-200">
      <div className={`bg-white sm:rounded-[40px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.2)] ${preview ? 'max-w-2xl' : showGuidelines ? 'max-w-4xl' : 'max-w-2xl'} w-full border border-primary/5 relative transition-all duration-300`}>
        <div className="p-4 sm:p-6 lg:p-8 py-4 lg:py-5 pb-8 sm:pb-6 pb-[env(safe-area-inset-bottom,24px)]">
          <div className="flex justify-between items-center mb-5 leading-none sticky top-0 bg-white/95 backdrop-blur-md z-20 py-3 border-b border-gray-100">
            <div>
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
              <div className="space-y-2 mb-5 sm:mb-6 text-center px-4">
                <h3 className="text-base sm:text-lg font-black text-primary uppercase tracking-widest">Get the best matches</h3>
                <p className="text-gray-500 text-xs sm:text-sm font-medium max-w-sm mx-auto leading-relaxed">A clear photo helps our AI find the <span className="text-primary font-bold">perfect fit</span> for you.</p>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mb-6 sm:mb-8">
                <div className="bg-green-50/40 rounded-[28px] p-5 sm:p-6 border border-green-100 relative group overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-8 left-4 sm:top-4 bg-green-500 text-white text-[9px] sm:text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest z-10 shadow-md">Ideal</div>
                  <div className="mb-5 rounded-[20px] overflow-hidden shadow-xl transition-transform group-hover:scale-[1.01] duration-300 bg-white aspect-square">
                    <img src="/guidelines/guideline_do_ideal.png" alt="Ideal Shot" className="w-full h-full object-cover" />
                  </div>
                  <div className="space-y-2 font-black text-xs sm:text-sm uppercase tracking-widest text-green-700 flex items-center gap-2">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    Full-Body Look
                    <p className="normal-case text-[11px] sm:text-xs text-green-800/60 font-medium tracking-normal mt-0.5">Show your whole body from head to toe in good light.</p>
                  </div>
                </div>
                
                <div className="space-y-6">
                  <div className="text-[9px] font-black text-red-500 uppercase tracking-[0.2em] px-2 mb-1">What to avoid</div>
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div className="bg-red-50/20 rounded-[20px] p-3 sm:p-4 border border-red-50 text-center">
                      <div className="relative rounded-[12px] overflow-hidden aspect-square mb-2 grayscale-[0.6] bg-white">
                        <img src="/guidelines/guideline_dont_half.png" alt="Half Body" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 flex items-center justify-center bg-red-500/5">
                          <svg className="w-6 h-6 sm:w-8 sm:h-8 text-red-500 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                        </div>
                      </div>
                      <div className="text-[9px] font-black text-red-800 uppercase tracking-widest">Half-Body</div>
                    </div>
                    
                    <div className="bg-red-50/20 rounded-[20px] p-3 sm:p-4 border border-red-50 text-center">
                      <div className="relative rounded-[12px] overflow-hidden aspect-square mb-2 grayscale-[0.6] bg-white">
                        <img src="/guidelines/guideline_dont_mirror.png" alt="Mirror Selfie" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 flex items-center justify-center bg-red-500/5">
                          <svg className="w-6 h-6 sm:w-8 sm:h-8 text-red-500 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                        </div>
                      </div>
                      <div className="text-[9px] font-black text-red-800 uppercase tracking-widest">Mirror Selfie</div>
                    </div>
                    
                    <div className="bg-red-50/25 rounded-[24px] p-3 sm:p-4 border border-red-50 col-span-2 flex gap-4 sm:gap-6 items-center">
                      <div className="relative rounded-[12px] overflow-hidden aspect-square h-20 sm:h-24 grayscale-[0.6] shrink-0 shadow-lg bg-white">
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
                  className="w-full sm:w-auto bg-primary text-white px-10 py-4.5 sm:px-14 sm:py-5 rounded-full hover:bg-primary-dull transition-all text-xs sm:text-sm font-black uppercase tracking-[0.2em] shadow-xl active:scale-95"
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
                <div className="space-y-4">
                  {/* PREMIUM GENDER SELECTOR ON CHOOSE STATE */}
                  <div className="flex items-center justify-center gap-3 bg-gray-50 p-3 rounded-2xl border border-gray-100 max-w-md mx-auto">
                    <span className="text-[10px] font-black text-primary uppercase tracking-widest">Scan Profile Gender:</span>
                    <div className="flex gap-1.5">
                      {['Female', 'Male', 'Unisex'].map(s => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setScannerSex(s)}
                          className={`px-3.5 py-1.5 rounded-full text-[9.5px] font-black uppercase tracking-widest border transition-all ${scannerSex === s ? 'bg-primary text-white border-primary shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:border-primary/20'}`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="border-2 border-dashed border-primary/20 bg-primary/5 rounded-[32px] p-8 sm:p-20 text-center group hover:bg-primary/10 hover:border-primary/40 transition-all cursor-pointer relative" onClick={() => fileInputRef.current?.click()}>
                    <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                    <div className="w-20 h-20 bg-white rounded-full mx-auto mb-8 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-500 text-primary">
                      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                    </div>
                    <h4 className="text-lg font-black text-primary uppercase tracking-widest mb-2">Select Your Photo</h4>
                    <button className="bg-primary text-white px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest shadow-md">Choose Photo</button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 sm:space-y-5">
                  <div className="overflow-hidden rounded-[20px] sm:rounded-[28px] border border-gray-100 bg-gray-50/40">
                    <img
                      src={preview}
                      alt="Preview"
                      className="w-full max-h-[160px] sm:max-h-[200px] lg:max-h-[180px] xl:max-h-[200px] object-contain object-center block mx-auto"
                    />
                  </div>
                  
                  {/* PREMIUM GENDER ADJUSTER IN PREVIEW */}
                  {!analyzing && !analysisResult && (
                    <div className="flex items-center justify-between bg-gray-50 px-4 py-3 rounded-2xl border border-gray-100/60">
                      <span className="text-[10px] font-black text-primary uppercase tracking-widest">Adjust Scan Gender:</span>
                      <div className="flex gap-1.5">
                        {['Female', 'Male', 'Unisex'].map(s => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setScannerSex(s)}
                            className={`px-3.5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all ${scannerSex === s ? 'bg-primary text-white border-primary shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:border-primary/20'}`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {analyzing && (
                    <div className="bg-blue-50 border border-blue-200 rounded-3xl p-5 flex items-center justify-center gap-4 animate-pulse">
                      <div className="animate-spin h-6 w-6 border-3 border-blue-600 border-t-transparent rounded-full"></div>
                      <span className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-800">{analysisProgress}</span>
                    </div>
                  )}

                  {/* FAILED QUALITY WARNING OVERLAY */}
                  {analysisResult?.failedQuality && !analyzing && (
                    <div className="bg-red-50/80 border border-red-200 rounded-[32px] p-6 text-center space-y-4">
                      <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                      </div>
                      
                      <div className="space-y-1.5">
                        <h3 className="text-base font-black text-red-900 uppercase tracking-wider">Unable to determine attributes confidently.</h3>
                        <p className="text-xs font-bold text-red-700/80">The uploaded photo doesn't contain enough visual details for a highly-accurate profile.</p>
                      </div>

                      <div className="bg-white rounded-2xl p-4 text-left border border-red-100/60 max-w-md mx-auto space-y-2">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Recommended Guidelines:</p>
                        <ul className="text-xs font-bold text-gray-700 list-disc list-inside space-y-1">
                          <li>Full body shot (head to toe visible)</li>
                          <li>Stand front-facing straight to the camera</li>
                          <li>Pose neutrally with arms slightly away from sides</li>
                          <li>Ensure clear lighting (avoid heavy shadows or dark rooms)</li>
                        </ul>
                      </div>

                      {analysisResult.notes && (
                        <div className="text-left text-[10px] text-red-700/60 max-w-md mx-auto bg-red-100/30 p-3 rounded-xl border border-red-100 font-mono">
                          <strong>Scan Log:</strong>
                          <ul className="list-decimal pl-4 mt-1 space-y-0.5">
                            {analysisResult.notes.map((n, i) => <li key={i}>{n}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* PREMIUM ANALYSIS RESULTS DASHBOARD */}
                  {analysisResult && !analysisResult.failedQuality && !analyzing && (
                    <ScanResultCard
                      result={analysisResult}
                      onApply={(updated) => {
                        setAnalysisResult(updated);
                        onAnalysisComplete({
                          ...updated,
                          sex: scannerSex // apply gender change back to form
                        });
                      }}
                    />
                  )}
                  
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-1">
                    <button
                      onClick={analyzeImage}
                      disabled={analyzing || !modelsLoaded || !image}
                      className="flex-1 bg-primary text-white px-8 py-5 rounded-full hover:bg-primary-dull transition-all disabled:opacity-50 text-xs font-black uppercase tracking-[0.2em] shadow-[0_15px_30px_rgba(22,43,105,0.2)]"
                    >
                      {analyzing ? 'Analyzing Profile...' : 'Start AI Analysis'}
                    </button>
                    <button
                      onClick={handleChange}
                      disabled={analyzing}
                      className="px-8 py-5 bg-white text-gray-600 border-2 border-gray-200 rounded-full hover:bg-gray-50 text-xs font-black uppercase tracking-[0.2em]"
                    >
                      Change
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
