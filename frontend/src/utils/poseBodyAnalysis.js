import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';

let poseLandmarker = null;

/**
 * Loads the MediaPipe Pose Landmarker model from Google CDN.
 */
export const loadPoseModel = async () => {
  if (poseLandmarker) return poseLandmarker;
  
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm"
  );
  
  poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
      delegate: "GPU"
    },
    runningMode: "IMAGE",
    numPoses: 1
  });
  
  return poseLandmarker;
};

/**
 * Classifies the body shape based on width measurements.
 * All widths should be on the same normalized scale (0-1).
 * 
 * IMPORTANT: MediaPipe hip landmarks (23/24) sit at the femoral heads INSIDE the pelvis,
 * so they systematically underestimate outer hip contour width. Shoulder landmarks (11/12)
 * are at the glenohumeral joints, closer to the body surface.
 * We apply an anatomical correction factor to hip width to compensate.
 */
export const classifyBodyShape = (shoulderWidth, waistWidth, hipWidth) => {
  if (!shoulderWidth || !waistWidth || !hipWidth || shoulderWidth < 0.01 || waistWidth < 0.01 || hipWidth < 0.01) {
    return 'Rectangle';
  }

  // Anatomical correction: hip skeleton width → outer hip contour
  const adjHip = hipWidth * 1.30;

  const waistToShoulder = waistWidth / shoulderWidth;
  const waistToHip = waistWidth / adjHip;
  const hipToShoulder = adjHip / shoulderWidth;
  const shoulderToHip = shoulderWidth / adjHip;

  console.log(`[BodyShape] ratios (hip×1.30) → w/s=${waistToShoulder.toFixed(3)}, w/h=${waistToHip.toFixed(3)}, h/s=${hipToShoulder.toFixed(3)}, s/h=${shoulderToHip.toFixed(3)}`);
  console.log(`[BodyShape] widths → shoulder=${shoulderWidth.toFixed(4)}, waist=${waistWidth.toFixed(4)}, hip=${hipWidth.toFixed(4)} (adj=${adjHip.toFixed(4)})`);

  // Hourglass: Waist clearly narrower than both shoulders and hips, shoulders ≈ hips
  if (waistToShoulder < 0.82 && waistToHip < 0.82 && Math.abs(hipToShoulder - 1) < 0.22) {
    return 'Hourglass';
  }
  // Pear: Hips wider than shoulders, waist smaller than hips
  if (hipToShoulder > 1.10 && waistToHip < 0.88) {
    return 'Pear';
  }
  // Inverted Triangle: Shoulders much wider than hips
  if (shoulderToHip > 1.15 && waistToShoulder < 0.88) {
    return 'Inverted Triangle';
  }
  // Trapezoid: Shoulders slightly wider, defined waist (athletic build)
  if (shoulderToHip > 1.08 && waistToShoulder < 0.90) {
    return 'Trapezoid';
  }
  // Oval: Waist wider than both shoulders and hips
  if (waistToShoulder > 0.98 && waistToHip > 0.98) {
    return 'Oval';
  }
  // Diamond: Waist close to or wider than both, hips >= shoulders
  if (hipToShoulder > 1.0 && waistWidth > Math.max(shoulderWidth, adjHip) * 0.93) {
    return 'Diamond';
  }
  
  // Default fallback
  return 'Rectangle';
};

/**
 * Scan waist width on the ORIGINAL image (no bg removal needed).
 * Uses pose landmarks to find the body center, then scans outward
 * to find edges where color changes significantly.
 * Scans multiple rows in the waist region and returns the NARROWEST width (normalized 0-1).
 */
export const scanWaistWidth = (ctx, canvasWidth, canvasHeight, landmarks) => {
  const lShoulder = landmarks[11];
  const rShoulder = landmarks[12];
  const lHip = landmarks[23];
  const rHip = landmarks[24];
  
  const shoulderY = ((lShoulder.y + rShoulder.y) / 2) * canvasHeight;
  const hipY = ((lHip.y + rHip.y) / 2) * canvasHeight;
  
  // Body center X from pose landmarks (average of all 4 torso joints)
  const centerX = Math.floor(((lShoulder.x + rShoulder.x + lHip.x + rHip.x) / 4) * canvasWidth);
  
  let narrowest = Infinity;
  
  // Scan rows from 30% to 55% between shoulder and hip (waist region)
  for (let pct = 0.30; pct <= 0.55; pct += 0.025) {
    const y = Math.floor(shoulderY + (hipY - shoulderY) * pct);
    if (y < 0 || y >= canvasHeight) continue;
    
    const rowData = ctx.getImageData(0, y, canvasWidth, 1).data;
    
    // Sample body color at center (7-pixel average for robustness against patterns)
    let sumR = 0, sumG = 0, sumB = 0, samples = 0;
    for (let dx = -3; dx <= 3; dx++) {
      const sx = centerX + dx;
      if (sx >= 0 && sx < canvasWidth) {
        sumR += rowData[sx * 4];
        sumG += rowData[sx * 4 + 1];
        sumB += rowData[sx * 4 + 2];
        samples++;
      }
    }
    if (samples === 0) continue;
    const bodyR = sumR / samples;
    const bodyG = sumG / samples;
    const bodyB = sumB / samples;
    
    const threshold = 55;
    
    // Scan LEFT from center — find body edge
    let left = centerX;
    let bgRun = 0;
    for (let x = centerX - 1; x >= 0; x--) {
      const dist = Math.sqrt(
        (rowData[x*4] - bodyR)**2 + (rowData[x*4+1] - bodyG)**2 + (rowData[x*4+2] - bodyB)**2
      );
      if (dist > threshold) {
        bgRun++;
        if (bgRun >= 4) break; // 4 consecutive "different" pixels = real edge
      } else {
        bgRun = 0;
        left = x;
      }
    }
    
    // Scan RIGHT from center — find body edge
    let right = centerX;
    bgRun = 0;
    for (let x = centerX + 1; x < canvasWidth; x++) {
      const dist = Math.sqrt(
        (rowData[x*4] - bodyR)**2 + (rowData[x*4+1] - bodyG)**2 + (rowData[x*4+2] - bodyB)**2
      );
      if (dist > threshold) {
        bgRun++;
        if (bgRun >= 4) break;
      } else {
        bgRun = 0;
        right = x;
      }
    }
    
    const width = right - left;
    if (width > 10 && width < narrowest) narrowest = width;
  }
  
  const result = narrowest < Infinity ? narrowest / canvasWidth : 0;
  console.log(`[BodyShape] waist scan: narrowest=${narrowest}px, normalized=${result.toFixed(4)}`);
  return result;
};
