import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';

let poseLandmarker = null;

/**
 * Loads the MediaPipe Pose Landmarker model from Google CDN.
 * Cached after first load — only one model instance exists per session.
 */
export const loadPoseModel = async () => {
  if (poseLandmarker) return poseLandmarker;

  const vision = await FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm'
  );

  poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
      delegate: 'GPU',
    },
    runningMode: 'IMAGE',
    numPoses: 1,
  });

  return poseLandmarker;
};

/**
 * Scans the torso width at a given percentage of the shoulder-to-hip span.
 * Returns the width in PIXELS.
 */
export const scanTorsoWidthAt = (ctx, canvasWidth, canvasHeight, landmarks, pct) => {
  const normalizeCoord = (value, max) => (value > 2 ? value : value * max);

  const lShoulder = landmarks[11];
  const rShoulder = landmarks[12];
  const lHip = landmarks[23];
  const rHip = landmarks[24];

  if (!lShoulder || !rShoulder || !lHip || !rHip) return 0;

  const shoulderY = (normalizeCoord(lShoulder.y, canvasHeight) + normalizeCoord(rShoulder.y, canvasHeight)) / 2;
  const hipY = (normalizeCoord(lHip.y, canvasHeight) + normalizeCoord(rHip.y, canvasHeight)) / 2;

  const y = Math.floor(shoulderY + (hipY - shoulderY) * pct);
  if (y < 0 || y >= canvasHeight) return 0;

  // Center X at this height
  const shoulderCenterX = (normalizeCoord(lShoulder.x, canvasWidth) + normalizeCoord(rShoulder.x, canvasWidth)) / 2;
  const hipCenterX = (normalizeCoord(lHip.x, canvasWidth) + normalizeCoord(rHip.x, canvasWidth)) / 2;
  const centerX = Math.floor(shoulderCenterX + (hipCenterX - shoulderCenterX) * pct);

  const rowData = ctx.getImageData(0, y, canvasWidth, 1).data;

  // Sample body color at the center (9-pixel average)
  let sumR = 0, sumG = 0, sumB = 0, samples = 0;
  for (let dx = -4; dx <= 4; dx++) {
    const sx = centerX + dx;
    if (sx >= 0 && sx < canvasWidth) {
      sumR += rowData[sx * 4];
      sumG += rowData[sx * 4 + 1];
      sumB += rowData[sx * 4 + 2];
      samples++;
    }
  }
  if (samples === 0) return 0;
  const bodyR = sumR / samples;
  const bodyG = sumG / samples;
  const bodyB = sumB / samples;

  const threshold = 40;

  // Scan LEFT from center — find body edge
  let left = centerX;
  let bgRun = 0;
  for (let x = centerX - 1; x >= 0; x--) {
    const dist = Math.sqrt(
      (rowData[x * 4] - bodyR) ** 2 +
      (rowData[x * 4 + 1] - bodyG) ** 2 +
      (rowData[x * 4 + 2] - bodyB) ** 2
    );
    if (dist > threshold) { if (++bgRun >= 4) break; }
    else { bgRun = 0; left = x; }
  }

  // Scan RIGHT from center — find body edge
  let right = centerX;
  bgRun = 0;
  for (let x = centerX + 1; x < canvasWidth; x++) {
    const dist = Math.sqrt(
      (rowData[x * 4] - bodyR) ** 2 +
      (rowData[x * 4 + 1] - bodyG) ** 2 +
      (rowData[x * 4 + 2] - bodyB) ** 2
    );
    if (dist > threshold) { if (++bgRun >= 4) break; }
    else { bgRun = 0; right = x; }
  }

  const width = right - left;
  if (width > 16 && width < canvasWidth * 0.90) {
    return width; // Return pixel width directly
  }
  return 0;
};

/**
 * Classifies body shape using measurement-based rules in pixel coordinates.
 */
export const classifyBodyShape = (ctx, canvasWidth, canvasHeight, landmarks, sex = 'Female') => {
  const notes = [];

  if (!landmarks || landmarks.length === 0) {
    return {
      success: false,
      type: 'Rectangle',
      confidence: 'Low',
      confidenceVal: 0.30,
      measurements: null,
      bodyProportion: 'Average',
      notes: ['No landmarks detected.'],
      error: 'Unable to detect a full-body pose. Please use a clear, full-body photo.'
    };
  }

  const lShoulder = landmarks[11];
  const rShoulder = landmarks[12];
  const lHip = landmarks[23];
  const rHip = landmarks[24];
  const lAnkle = landmarks[27];
  const rAnkle = landmarks[28];
  const lWrist = landmarks[15];
  const rWrist = landmarks[16];
  const nose = landmarks[0];

  const normalizeCoord = (value, max) => (value > 2 ? value : value * max);

  // Convert landmarks to pixel space for absolute ratios
  const noseY = nose ? normalizeCoord(nose.y, canvasHeight) : null;
  const shoulderY = (normalizeCoord(lShoulder.y, canvasHeight) + normalizeCoord(rShoulder.y, canvasHeight)) / 2;
  const hipY = (normalizeCoord(lHip.y, canvasHeight) + normalizeCoord(rHip.y, canvasHeight)) / 2;
  const ankleY = (normalizeCoord(lAnkle.y, canvasHeight) + normalizeCoord(rAnkle.y, canvasHeight)) / 2;

  const shoulderX1 = normalizeCoord(lShoulder.x, canvasWidth);
  const shoulderX2 = normalizeCoord(rShoulder.x, canvasWidth);
  const hipX1 = normalizeCoord(lHip.x, canvasWidth);
  const hipX2 = normalizeCoord(rHip.x, canvasWidth);

  // ── PREVENT HALLUCINATIONS: Validate pose quality ────────────────────────
  const keyJoints = [lShoulder, rShoulder, lHip, rHip, lAnkle, rAnkle];
  const lowVisibility = keyJoints.some(joint => !joint || (joint.visibility !== undefined && joint.visibility < 0.50));

  if (lowVisibility) {
    console.warn('[BodyShape] Pose quality low: Cropped joints detected.');
    return {
      success: false,
      type: 'Rectangle',
      confidence: 'Low',
      confidenceVal: 0.20,
      measurements: null,
      bodyProportion: 'Average',
      notes: ['Key joints cropped or obscured.'],
      error: 'Unable to determine confidently. Reason: Insufficient visual information.'
    };
  }

  const centerX = (shoulderX1 + shoulderX2 + hipX1 + hipX2) / 4;
  const shoulderWidth = Math.abs(shoulderX1 - shoulderX2);

  // 2. Arms covering waist check
  const lWristY = normalizeCoord(lWrist.y, canvasHeight);
  const rWristY = normalizeCoord(rWrist.y, canvasHeight);
  const lWristX = normalizeCoord(lWrist.x, canvasWidth);
  const rWristX = normalizeCoord(rWrist.x, canvasWidth);
  const isLeftWristCovering = lWrist && lWristY > shoulderY && lWristY < hipY && Math.abs(lWristX - centerX) < (shoulderWidth * 0.42);
  const isRightWristCovering = rWrist && rWristY > shoulderY && rWristY < hipY && Math.abs(rWristX - centerX) < (shoulderWidth * 0.42);

  if (isLeftWristCovering || isRightWristCovering) {
    console.warn('[BodyShape] Pose quality low: Arms covering waist.');
    return {
      success: false,
      type: 'Rectangle',
      confidence: 'Low',
      confidenceVal: 0.25,
      measurements: null,
      bodyProportion: 'Average',
      notes: ['Arms are covering the waist, blocking accurate measurement.'],
      error: 'Unable to determine confidently. Reason: Insufficient visual information.'
    };
  }

  // 3. Angled pose check
  const shoulderDepthDiff = Math.abs(lShoulder.z - rShoulder.z);
  const hipDepthDiff = Math.abs(lHip.z - rHip.z);
  if (shoulderDepthDiff > 0.15 || hipDepthDiff > 0.15) {
    console.warn('[BodyShape] Pose quality low: Angled pose.');
    return {
      success: false,
      type: 'Rectangle',
      confidence: 'Low',
      confidenceVal: 0.30,
      measurements: null,
      bodyProportion: 'Average',
      notes: ['Angled pose detected. Please stand straight and face the camera.'],
      error: 'Unable to determine confidently. Reason: Insufficient visual information.'
    };
  }

  notes.push('Full body pose detected successfully.');
  notes.push('Front-facing pose confirmed.');
  notes.push('Clear waist region confirmed.');

  // ── ESTIMATE MEASUREMENTS IN PIXELS ────────────────────────────────────────
  const isMale = sex?.toLowerCase() === 'male';

  const totalHeightPx = ankleY - (noseY !== null ? noseY : shoulderY - 0.15 * canvasHeight);

  // Scale factor: real-world height reference 66 inches (168 cm) / height in pixels
  const scaleInches = 66 / Math.max(totalHeightPx, 1.0);

  // Widths in pixels
  const hipWidthRaw = Math.abs(hipX1 - hipX2);

  // Scans in pixels
  const chestScan1 = scanTorsoWidthAt(ctx, canvasWidth, canvasHeight, landmarks, 0.18);
  const chestScan2 = scanTorsoWidthAt(ctx, canvasWidth, canvasHeight, landmarks, 0.24);
  let chestWidth = (chestScan1 + chestScan2) / 2;
  // Validate chest scan
  if (chestWidth <= 0 || chestWidth < shoulderWidth * 0.70 || chestWidth > shoulderWidth * 1.20) {
    chestWidth = shoulderWidth * 0.92; // fallback
    notes.push('Chest scan invalid (blended with background), using landmark fallback.');
  }

  const waistScan1 = scanTorsoWidthAt(ctx, canvasWidth, canvasHeight, landmarks, 0.40);
  const waistScan2 = scanTorsoWidthAt(ctx, canvasWidth, canvasHeight, landmarks, 0.46);
  const waistScan3 = scanTorsoWidthAt(ctx, canvasWidth, canvasHeight, landmarks, 0.52);
  const scans = [waistScan1, waistScan2, waistScan3].filter(w => w > 0);
  let waistWidth = scans.length > 0 ? Math.min(...scans) : 0;
  // Validate waist scan
  if (waistWidth <= 0 || waistWidth < shoulderWidth * 0.55 || waistWidth > shoulderWidth * 1.25) {
    waistWidth = isMale
      ? (shoulderWidth + hipWidthRaw) / 2 * 0.88
      : (shoulderWidth + hipWidthRaw) / 2 * 0.78; // fallback
    notes.push('Waist scan invalid (blended with background), using landmark fallback.');
  }

  const hipScan1 = scanTorsoWidthAt(ctx, canvasWidth, canvasHeight, landmarks, 0.96);
  const hipScan2 = scanTorsoWidthAt(ctx, canvasWidth, canvasHeight, landmarks, 1.02);
  let hipWidth = Math.max(hipScan1, hipScan2);
  // Validate hip scan: visible outer hip width cannot be narrower than joint scale or narrower than waist
  const minHipWidth = isMale ? hipWidthRaw * 1.22 : hipWidthRaw * 1.55;
  if (hipWidth <= 0 || hipWidth < minHipWidth || hipWidth < waistWidth * 1.02) {
    hipWidth = isMale ? hipWidthRaw * 1.45 : hipWidthRaw * 2.15; // fallback with outer adjustment
    notes.push('Hip scan invalid (blended with background), using landmark fallback.');
  }

  // Calculate Flat widths in inches
  const shoulderFlat = shoulderWidth * scaleInches;
  const chestFlat = chestWidth * scaleInches;
  const waistFlat = waistWidth * scaleInches;
  const hipFlat = hipWidth * scaleInches;

  // Convert to circumferences using ellipse multiplier (2.3)
  const shoulders = Math.round(shoulderFlat * 2.3);
  const chest = Math.round(chestFlat * 2.3);
  const waist = Math.round(waistFlat * 2.3);
  const hips = Math.round(hipFlat * 2.3);

  // Lengths in inches
  const torsoLength = Math.round((hipY - shoulderY) * scaleInches);
  const legLength = Math.round((ankleY - hipY) * scaleInches);

  // Proportions
  const legToTorso = legLength / Math.max(torsoLength, 1);
  const bodyProportion = legToTorso > 1.70 ? 'Long' : legToTorso < 1.35 ? 'Short' : 'Average';

  notes.push(`Estimated measurements (in): Shoulders ${shoulders}", Chest ${chest}", Waist ${waist}", Hips ${hips}".`);
  notes.push(`Estimated proportions: Torso ${torsoLength}", Legs ${legLength}" (${bodyProportion} proportions).`);

  // ── CLASSIFICATION RULES ──────────────────────────────────────────────────
  let predictedType = 'Rectangle';
  let confidenceVal = 0.50;

  // Ratios
  const waistToShoulder = waist / shoulders;
  const waistToHip = waist / hips;
  const shoulderToHip = shoulders / hips;

  if (isMale) {
    // ── MALE CLASSIFICATION ──────────────────────────────────────────────────
    if (waist > shoulders * 0.98 && waist > hips * 0.98) {
      predictedType = 'Oval';
    } else if (shoulders >= waist * 1.08 && shoulderToHip >= 0.98 && shoulderToHip <= 1.12) {
      predictedType = 'Trapezoid';
    } else if (shoulders >= waist * 1.18 && shoulderToHip > 1.12) {
      predictedType = 'Inverted Triangle';
    } else if (hips >= shoulders * 1.03) {
      predictedType = 'Pear';
    } else if (waist >= shoulders * 0.88 && waist >= hips * 0.88 && shoulderToHip >= 0.95 && shoulderToHip <= 1.05) {
      predictedType = 'Rectangle';
    } else if (waist > shoulders * 0.95 && waist >= hips * 0.95) {
      predictedType = 'Diamond';
    } else {
      predictedType = (shoulders > waist * 1.08) ? 'Trapezoid' : 'Rectangle';
    }
  } else {
    // ── FEMALE & UNISEX CLASSIFICATION ───────────────────────────────────────
    if (waist >= chest * 0.95 && waistToHip >= 0.82) {
      predictedType = 'Oval';
    } else if (waist > shoulders * 0.90 && waist > hips * 0.90) {
      predictedType = 'Diamond';
    } else if (shoulderToHip >= 0.90 && shoulderToHip <= 1.10 && waistToShoulder <= 0.83 && waistToHip <= 0.83) {
      predictedType = 'Hourglass';
    } else if (hips >= shoulders * 1.05 && waistToHip <= 0.85) {
      predictedType = 'Pear';
    } else if (shoulders >= hips * 1.05 && waistToShoulder <= 0.85) {
      predictedType = 'Inverted Triangle';
    } else if (shoulderToHip >= 0.90 && shoulderToHip <= 1.10 && waistToShoulder > 0.83 && waistToHip > 0.83) {
      predictedType = 'Rectangle';
    } else {
      if (hips > shoulders) predictedType = 'Pear';
      else if (shoulders > hips) predictedType = 'Inverted Triangle';
      else predictedType = 'Rectangle';
    }
  }

  // ── VALIDATION CHECKS ─────────────────────────────────────────────────────
  let validatedType = predictedType;

  if (validatedType === 'Hourglass') {
    if (waist > shoulders * 0.83 || waist > hips * 0.83) {
      notes.push(`Validation: Hourglass prediction rejected because waist (${waist}") is not narrow enough relative to shoulders/hips. Correcting.`);
      validatedType = 'Rectangle';
    }
  } else if (validatedType === 'Pear') {
    if (hips <= shoulders) {
      notes.push(`Validation: Pear prediction rejected because hips (${hips}") are not wider than shoulders (${shoulders}"). Correcting.`);
      validatedType = 'Rectangle';
    }
  } else if (validatedType === 'Inverted Triangle') {
    if (shoulders <= hips) {
      notes.push(`Validation: Inverted Triangle rejected because shoulders (${shoulders}") are not wider than hips (${hips}"). Correcting.`);
      validatedType = 'Rectangle';
    }
  } else if (validatedType === 'Oval') {
    if (waist < chest * 0.90 || waistToHip < 0.78) {
      notes.push(`Validation: Oval rejected because waist is narrow relative to chest/hips. Correcting.`);
      validatedType = 'Rectangle';
    }
  }

  notes.push(`Matched rule details: ${validatedType} validated against physical proportions.`);

  // ── CONFIDENCE SCORE ─────────────────────────────────────────────────────
  let matchStrength = 1.0;
  if (validatedType === 'Hourglass') {
    const waistGap = Math.max(0, 0.83 - Math.max(waistToShoulder, waistToHip));
    matchStrength = 0.60 + (waistGap / 0.20) * 0.40;
  } else if (validatedType === 'Oval') {
    const ovalExcess = Math.min(waist / chest, waistToHip) - 0.82;
    matchStrength = 0.65 + Math.min(0.35, Math.max(0, ovalExcess) / 0.15) * 0.35;
  } else if (validatedType === 'Pear') {
    const hipExcess = (hips / shoulders) - 1.02;
    matchStrength = 0.60 + Math.min(0.40, Math.max(0, hipExcess) / 0.15) * 0.40;
  } else if (validatedType === 'Inverted Triangle') {
    const shExcess = (shoulders / hips) - 1.05;
    matchStrength = 0.60 + Math.min(0.40, Math.max(0, shExcess) / 0.15) * 0.40;
  } else if (validatedType === 'Trapezoid') {
    const trapWidth = (shoulders / waist) - 1.08;
    matchStrength = 0.60 + Math.min(0.40, Math.max(0, trapWidth) / 0.15) * 0.40;
  } else {
    matchStrength = 0.78;
  }

  confidenceVal = Math.min(0.98, Math.max(0.30, matchStrength));
  const confidenceCategory = confidenceVal >= 0.82 ? 'High' : confidenceVal >= 0.60 ? 'Medium' : 'Low';

  notes.push(`Calculated confidence score: ${Math.round(confidenceVal * 100)}% (${confidenceCategory}).`);

  return {
    success: true,
    type: validatedType,
    confidence: confidenceCategory,
    confidenceVal: confidenceVal,
    measurements: {
      shoulders,
      chest,
      waist,
      hips,
      torsoLength,
      legLength
    },
    bodyProportion,
    notes
  };
};
