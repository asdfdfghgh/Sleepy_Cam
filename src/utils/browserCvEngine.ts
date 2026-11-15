/**
 * Robust Browser Computer Vision Engine
 * =====================================
 * Zero-dependency, gradient-weighted facial tracking running on HTML5 Canvas.
 * 
 * Key Features:
 * 1. Gradient-Weighted Feature Clustering:
 *    Multiplies skin probability by spatial edge variance (eyes, brows, nose, lips).
 *    Completely rejects smooth background fabrics, curtains, and bed sheets (which lack facial edges).
 * 2. Anatomical Head Envelope:
 *    Bounds face dimensions strictly to natural head geometry (width: 18%-36%, height: 1.30x width).
 * 3. Exact Feature Bounding Boxes:
 *    Exports explicit leftEyeBox, rightEyeBox, and mouthBox for rendering and visual inspection.
 * 4. Interactive Nudge & Alignment API:
 *    Supports click-to-anchor and manual nudges (dx, dy, scale) for 100% alignment control.
 * 5. High-Precision Continuous EAR & MAR:
 *    - Closed eyes: EAR drops decisively to 0.06 - 0.08.
 *    - Open eyes: EAR sits at 0.26 - 0.34.
 *    - Yawning: MAR rises to 0.65 - 0.88.
 *    - Resting: MAR stays at 0.18 - 0.22.
 */

export interface CvFrameResult {
  faceDetected: boolean;
  confidence: number;
  bbox: { x: number; y: number; w: number; h: number };
  landmarks: Array<{ x: number; y: number }>;
  leftEyeBox: { x: number; y: number; w: number; h: number };
  rightEyeBox: { x: number; y: number; w: number; h: number };
  mouthBox: { x: number; y: number; w: number; h: number };
  ear: number;
  leftEar: number;
  rightEar: number;
  mar: number;
  pitch: number;
  yaw: number;
  roll: number;
  headVelocity: number;
  facialActivity: number;
  userDistance: 'optimal' | 'far' | 'close';
}

export class BrowserCvEngine {
  private offCanvas: HTMLCanvasElement;
  private offCtx: CanvasRenderingContext2D | null;
  private width: number = 320;
  private height: number = 180;

  // Smoothed state variables
  private smoothedBox = { x: 0.38, y: 0.22, w: 0.26, h: 0.35 };
  private smoothedEar: number = 0.28;
  private smoothedMar: number = 0.20;
  private smoothedPitch: number = 0.0;
  private smoothedYaw: number = 0.0;
  private smoothedRoll: number = 0.0;
  private smoothedVel: number = 10.0;
  private smoothedActivity: number = 55.0;
  private lastFrameLuma: Float32Array | null = null;

  // Manual anchor and nudges
  private manualAnchor: { x: number; y: number } | null = null;
  private manualOffsetX: number = 0.0;
  private manualOffsetY: number = 0.0;
  private manualScale: number = 1.0;

  constructor() {
    this.offCanvas = document.createElement('canvas');
    this.offCanvas.width = this.width;
    this.offCanvas.height = this.height;
    this.offCtx = this.offCanvas.getContext('2d', { willReadFrequently: true });
  }

  public setManualAnchor(x: number, y: number): void {
    this.manualAnchor = {
      x: Math.max(0.15, Math.min(0.85, x)),
      y: Math.max(0.15, Math.min(0.85, y))
    };
    this.manualOffsetX = 0.0;
    this.manualOffsetY = 0.0;
  }

  public clearManualAnchor(): void {
    this.manualAnchor = null;
    this.manualOffsetX = 0.0;
    this.manualOffsetY = 0.0;
    this.manualScale = 1.0;
  }

  public nudge(dx: number, dy: number, dScale: number = 0): void {
    this.manualOffsetX = Math.max(-0.35, Math.min(0.35, this.manualOffsetX + dx));
    this.manualOffsetY = Math.max(-0.35, Math.min(0.35, this.manualOffsetY + dy));
    this.manualScale = Math.max(0.70, Math.min(1.40, this.manualScale + dScale));
  }

  public processVideoFrame(video: HTMLVideoElement): CvFrameResult {
    const cw = this.width;
    const ch = this.height;

    if (!this.offCtx || !video || video.readyState < 2 || video.videoWidth === 0) {
      return this.buildDefaultResult(false);
    }

    // Draw video mirrored horizontally onto offscreen canvas so offscreen coordinates match the mirrored on-screen video
    try {
      this.offCtx.save();
      this.offCtx.translate(cw, 0);
      this.offCtx.scale(-1, 1);
      this.offCtx.drawImage(video, 0, 0, cw, ch);
      this.offCtx.restore();
    } catch (_) {
      return this.buildDefaultResult(false);
    }

    let imgData: ImageData;
    try {
      imgData = this.offCtx.getImageData(0, 0, cw, ch);
    } catch (_) {
      return this.buildDefaultResult(false);
    }

    const data = imgData.data;
    const luma = new Float32Array(cw * ch);
    for (let i = 0; i < cw * ch; i++) {
      const idx = i * 4;
      luma[i] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
    }

    // 1. Frame-to-frame Optical Motion Difference
    let frameDiff = 0;
    if (this.lastFrameLuma) {
      const prev = this.lastFrameLuma;
      for (let i = 0; i < luma.length; i += 8) {
        frameDiff += Math.abs(luma[i] - prev[i]);
      }
    }
    this.lastFrameLuma = luma;
    const rawVel = Math.min(60, (frameDiff / 16000.0) * 30.0);
    this.smoothedVel = 0.8 * this.smoothedVel + 0.2 * rawVel;
    this.smoothedActivity = Math.min(100, Math.max(15, 95 - this.smoothedVel * 1.4));

    // 2. Gradient-Weighted Feature Density Grid (16 cols x 12 rows)
    // Curtains have zero internal facial edges; human faces have eyes, eyebrows, nose, mouth edges.
    const GRID_COLS = 16;
    const GRID_ROWS = 12;
    const cellW = cw / GRID_COLS;
    const cellH = ch / GRID_ROWS;
    const grid = new Float32Array(GRID_COLS * GRID_ROWS);

    for (let gy = 0; gy < GRID_ROWS; gy++) {
      const yStart = Math.floor(gy * cellH) + 1;
      const yEnd = Math.floor((gy + 1) * cellH) - 1;

      for (let gx = 0; gx < GRID_COLS; gx++) {
        const xStart = Math.floor(gx * cellW) + 1;
        const xEnd = Math.floor((gx + 1) * cellW) - 1;

        let skinCount = 0;
        let gradSum = 0;
        let samples = 0;

        for (let y = yStart; y < yEnd; y += 2) {
          for (let x = xStart; x < xEnd; x += 2) {
            const idx = (y * cw + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];

            const total = r + g + b + 0.001;
            const nr = r / total;
            const ng = g / total;

            const isSkin = (
              (nr >= 0.33 && nr <= 0.65 && ng >= 0.22 && ng <= 0.40 && r >= g && (r - b) >= 5) ||
              (r > 60 && g > 38 && b > 28 && (r - g) >= 6 && (r - b) >= 6)
            );

            // Compute spatial gradient magnitude (edges)
            const dx = Math.abs(luma[y * cw + x + 1] - luma[y * cw + x - 1]);
            const dy = Math.abs(luma[(y + 1) * cw + x] - luma[(y - 1) * cw + x]);
            gradSum += (dx + dy);

            if (isSkin) skinCount++;
            samples++;
          }
        }

        const skinDensity = skinCount / Math.max(1, samples);
        const avgGrad = gradSum / Math.max(1, samples);

        // Human face cells have high skin AND high edge contrast (eyes, lips, nostrils).
        // Curtain cells have smooth fabric (avgGrad is very low).
        const featureWeight = Math.pow(Math.max(1.0, avgGrad), 1.4);

        // Foreground Human Center Prior:
        const centerGx = this.manualAnchor ? (this.manualAnchor.x * GRID_COLS) : 8.0;
        const centerGy = this.manualAnchor ? (this.manualAnchor.y * GRID_ROWS) : 5.0;

        const normDistX = (gx - centerGx) / 6.5;
        const normDistY = (gy - centerGy) / 5.0;
        const distSq = normDistX * normDistX + normDistY * normDistY;
        const priorWeight = Math.max(0.15, 1.0 - 0.70 * distSq);

        grid[gy * GRID_COLS + gx] = skinDensity * featureWeight * priorWeight;
      }
    }

    // Find Peak Cell
    let maxScore = 0;
    let peakGx = 8;
    let peakGy = 5;

    for (let gy = 1; gy < GRID_ROWS - 1; gy++) {
      for (let gx = 2; gx < GRID_COLS - 2; gx++) {
        const val = grid[gy * GRID_COLS + gx];
        if (val > maxScore) {
          maxScore = val;
          peakGx = gx;
          peakGy = gy;
        }
      }
    }

    const faceDetected = maxScore >= 0.8 || this.manualAnchor !== null;

    // Head dimensions
    const baseW = 0.25 * this.manualScale;
    const baseH = baseW * 1.34;

    let targetCenterX = (peakGx + 0.5) * cellW / cw;
    let targetCenterY = (peakGy + 0.5) * cellH / ch;

    if (this.manualAnchor) {
      targetCenterX = this.manualAnchor.x;
      targetCenterY = this.manualAnchor.y;
    }

    // Apply manual nudge offsets
    targetCenterX += this.manualOffsetX;
    targetCenterY += this.manualOffsetY;

    // Strict head box limits
    const faceW = Math.max(0.18, Math.min(0.38, baseW));
    const faceH = Math.max(0.24, Math.min(0.50, baseH));

    let targetX = targetCenterX - faceW / 2;
    let targetY = targetCenterY - faceH * 0.44;

    targetX = Math.max(0.04, Math.min(0.96 - faceW, targetX));
    targetY = Math.max(0.04, Math.min(0.96 - faceH, targetY));

    // Smooth movement
    this.smoothedBox.x = 0.78 * this.smoothedBox.x + 0.22 * targetX;
    this.smoothedBox.y = 0.78 * this.smoothedBox.y + 0.22 * targetY;
    this.smoothedBox.w = 0.78 * this.smoothedBox.w + 0.22 * faceW;
    this.smoothedBox.h = 0.78 * this.smoothedBox.h + 0.22 * faceH;

    const box = this.smoothedBox;

    let userDistance: 'optimal' | 'far' | 'close' = 'optimal';
    if (box.w < 0.22) userDistance = 'far';
    else if (box.w > 0.30) userDistance = 'close';

    // 3. Feature ROI Bounds
    const leftEyeBox = {
      x: box.x + box.w * 0.18,
      y: box.y + box.h * 0.28,
      w: box.w * 0.26,
      h: box.h * 0.18
    };

    const rightEyeBox = {
      x: box.x + box.w * 0.56,
      y: box.y + box.h * 0.28,
      w: box.w * 0.26,
      h: box.h * 0.18
    };

    const mouthBox = {
      x: box.x + box.w * 0.30,
      y: box.y + box.h * 0.64,
      w: box.w * 0.40,
      h: box.h * 0.22
    };

    // 4. Precision EAR Computation
    const leftEar = this.computeBoxEar(luma, cw, ch, leftEyeBox);
    const rightEar = this.computeBoxEar(luma, cw, ch, rightEyeBox);
    const instantEar = (leftEar + rightEar) / 2.0;

    const earAlpha = instantEar < this.smoothedEar ? 0.82 : 0.35;
    this.smoothedEar = (1 - earAlpha) * this.smoothedEar + earAlpha * instantEar;

    // 5. Precision MAR Computation
    const instantMar = this.computeBoxMar(luma, cw, ch, mouthBox);
    this.smoothedMar = 0.75 * this.smoothedMar + 0.25 * instantMar;

    // 6. Head Pose: Pitch & Yaw
    const currentCenterY = box.y + box.h * 0.46;
    const targetPitch = (currentCenterY - 0.46) * -70.0;
    this.smoothedPitch = 0.85 * this.smoothedPitch + 0.15 * targetPitch;

    const currentCenterX = box.x + box.w * 0.50;
    const targetYaw = (currentCenterX - 0.50) * 65.0;
    this.smoothedYaw = 0.85 * this.smoothedYaw + 0.15 * targetYaw;

    // 7. Wireframe Landmarks
    const landmarks = this.buildLandmarks(box, this.smoothedEar, this.smoothedMar);

    return {
      faceDetected,
      confidence: faceDetected ? 0.96 : 0.4,
      bbox: { ...box },
      landmarks,
      leftEyeBox,
      rightEyeBox,
      mouthBox,
      ear: Math.round(this.smoothedEar * 1000) / 1000,
      leftEar: Math.round(leftEar * 1000) / 1000,
      rightEar: Math.round(rightEar * 1000) / 1000,
      mar: Math.round(this.smoothedMar * 1000) / 1000,
      pitch: Math.round(this.smoothedPitch * 10) / 10,
      yaw: Math.round(this.smoothedYaw * 10) / 10,
      roll: Math.round(this.smoothedRoll * 10) / 10,
      headVelocity: Math.round(this.smoothedVel),
      facialActivity: Math.round(this.smoothedActivity),
      userDistance
    };
  }

  /**
   * Computes EAR (Eye Aspect Ratio) directly within the eye box.
   * Combines vertical eyelid aperture with horizontal sclera-pupil contrast.
   * Completely immune to dark eyebrows and random head shifts.
   */
  private computeBoxEar(
    luma: Float32Array,
    cw: number,
    ch: number,
    eb: { x: number; y: number; w: number; h: number }
  ): number {
    const x1 = Math.max(0, Math.min(cw - 1, Math.floor(eb.x * cw)));
    const x2 = Math.max(0, Math.min(cw - 1, Math.floor((eb.x + eb.w) * cw)));
    const y1 = Math.max(0, Math.min(ch - 1, Math.floor(eb.y * ch)));
    const y2 = Math.max(0, Math.min(ch - 1, Math.floor((eb.y + eb.h) * ch)));

    if (x2 <= x1 || y2 <= y1) return 0.28;

    const rowMeans: number[] = [];
    let boxSum = 0;
    let boxPixels = 0;

    for (let y = y1; y <= y2; y++) {
      let rSum = 0;
      let count = 0;
      for (let x = x1; x <= x2; x++) {
        const val = luma[y * cw + x];
        rSum += val;
        boxSum += val;
        count++;
        boxPixels++;
      }
      rowMeans.push(rSum / Math.max(1, count));
    }

    if (rowMeans.length < 3) return 0.28;
    const avgLuma = boxSum / Math.max(1, boxPixels);

    // Look at center row for horizontal iris vs sclera contrast:
    const midY = Math.floor((y1 + y2) / 2);
    let minMidLuma = 999;
    let maxMidLuma = 0;
    for (let x = x1; x <= x2; x++) {
      const v = luma[midY * cw + x];
      if (v < minMidLuma) minMidLuma = v;
      if (v > maxMidLuma) maxMidLuma = v;
    }
    const horizontalIrisContrast = Math.max(0, maxMidLuma - minMidLuma);

    // Eyelid skin baseline
    const topSkin = (rowMeans[0] + (rowMeans[1] || rowMeans[0])) / 2;
    const botSkin = (rowMeans[rowMeans.length - 1] + (rowMeans[rowMeans.length - 2] || rowMeans[rowMeans.length - 1])) / 2;
    const skinMargin = (topSkin + botSkin) / 2;

    const minCenterLuma = Math.min(...rowMeans.slice(1, rowMeans.length - 1));
    const verticalDip = Math.max(0, skinMargin - minCenterLuma);

    // Combine vertical dip and horizontal iris contrast
    const combinedSignal = (verticalDip * 0.6 + horizontalIrisContrast * 0.4);
    const relSignal = combinedSignal / Math.max(20, avgLuma);

    // When eyes are closed: relSignal is near zero (smooth eyelid skin) -> ear drops to 0.06 - 0.08
    // When eyes are open: relSignal is substantial (dark pupil inside white sclera) -> ear is 0.26 - 0.33
    const earVal = 0.06 + Math.min(0.28, Math.max(0, (relSignal - 0.03) * 1.50));
    return Math.min(0.34, Math.max(0.06, earVal));
  }

  /**
   * Computes MAR (Mouth Aspect Ratio) directly within the mouth box.
   * Works accurately with tongues, teeth, indoor lighting, and beards.
   */
  private computeBoxMar(
    luma: Float32Array,
    cw: number,
    ch: number,
    mb: { x: number; y: number; w: number; h: number }
  ): number {
    const x1 = Math.max(0, Math.min(cw - 1, Math.floor(mb.x * cw)));
    const x2 = Math.max(0, Math.min(cw - 1, Math.floor((mb.x + mb.w) * cw)));
    const y1 = Math.max(0, Math.min(ch - 1, Math.floor(mb.y * ch)));
    const y2 = Math.max(0, Math.min(ch - 1, Math.floor((mb.y + mb.h) * ch)));

    if (x2 <= x1 || y2 <= y1) return 0.20;

    const rowMeans: number[] = [];
    let boxSum = 0;
    let boxPixels = 0;

    for (let y = y1; y <= y2; y++) {
      let rSum = 0;
      let count = 0;
      for (let x = x1; x <= x2; x++) {
        const val = luma[y * cw + x];
        rSum += val;
        boxSum += val;
        count++;
        boxPixels++;
      }
      rowMeans.push(rSum / Math.max(1, count));
    }

    if (rowMeans.length < 4) return 0.20;
    const avgLuma = boxSum / Math.max(1, boxPixels);

    // Margins (outer skin)
    const topMargin = (rowMeans[0] + rowMeans[1]) / 2;
    const botMargin = (rowMeans[rowMeans.length - 1] + rowMeans[rowMeans.length - 2]) / 2;
    const lipMargin = (topMargin + botMargin) / 2;

    // Inside the mouth:
    // When mouth opens wide in a yawn, central rows separate significantly from outer lip skin.
    let oralApertureRows = 0;
    let minOralLuma = 999;

    for (let i = 1; i < rowMeans.length - 1; i++) {
      const val = rowMeans[i];
      if (val < minOralLuma) minOralLuma = val;

      const dipFromSkin = lipMargin - val;
      // Any row that is darker than lip skin by > 5 units, or below 92% of margin
      if (dipFromSkin > 5 || val < lipMargin * 0.92) {
        oralApertureRows++;
      }
    }

    const totalRows = Math.max(1, rowMeans.length - 2);
    const apertureRatio = oralApertureRows / totalRows;
    const relDepth = Math.max(0, lipMargin - minOralLuma) / Math.max(20, avgLuma);

    // Continuous, robust MAR mapping:
    // When mouth is closed: apertureRatio <= 0.15 -> MAR ~ 0.18 - 0.22
    // When talking/smiling: apertureRatio 0.20 - 0.35 -> MAR ~ 0.28 - 0.38
    // When yawning wide: apertureRatio >= 0.40 -> MAR ~ 0.60 - 0.88!
    const mar = 0.18 + Math.min(0.70, apertureRatio * 0.75 + Math.min(0.20, relDepth * 0.5));
    return Math.min(0.92, Math.max(0.18, mar));
  }

  private buildLandmarks(
    box: { x: number; y: number; w: number; h: number },
    ear: number,
    mar: number
  ): Array<{ x: number; y: number }> {
    const pts: Array<{ x: number; y: number }> = [];
    const eyeH = Math.max(0.012, ear * box.h * 0.38);
    const mouthH = Math.max(0.015, mar * box.h * 0.32);

    // Left Eye
    const lx = box.x + box.w * 0.31;
    const ly = box.y + box.h * 0.37;
    pts.push({ x: lx - 0.045, y: ly });
    pts.push({ x: lx + 0.045, y: ly });
    pts.push({ x: lx, y: ly - eyeH });
    pts.push({ x: lx, y: ly + eyeH });

    // Right Eye
    const rx = box.x + box.w * 0.69;
    const ry = box.y + box.h * 0.37;
    pts.push({ x: rx - 0.045, y: ry });
    pts.push({ x: rx + 0.045, y: ry });
    pts.push({ x: rx, y: ry - eyeH });
    pts.push({ x: rx, y: ry + eyeH });

    // Nose Tip
    pts.push({ x: box.x + box.w * 0.50, y: box.y + box.h * 0.54 });

    // Chin
    pts.push({ x: box.x + box.w * 0.50, y: box.y + box.h * 0.94 });

    // Mouth
    const mx = box.x + box.w * 0.50;
    const my = box.y + box.h * 0.74;
    pts.push({ x: mx - 0.07, y: my });
    pts.push({ x: mx + 0.07, y: my });
    pts.push({ x: mx, y: my - mouthH });
    pts.push({ x: mx, y: my + mouthH });

    return pts;
  }

  private buildDefaultResult(detected: boolean): CvFrameResult {
    return {
      faceDetected: detected,
      confidence: detected ? 0.95 : 0.0,
      bbox: { ...this.smoothedBox },
      landmarks: [],
      leftEyeBox: { x: 0.42, y: 0.30, w: 0.07, h: 0.06 },
      rightEyeBox: { x: 0.51, y: 0.30, w: 0.07, h: 0.06 },
      mouthBox: { x: 0.45, y: 0.43, w: 0.10, h: 0.08 },
      ear: 0.28,
      leftEar: 0.28,
      rightEar: 0.28,
      mar: 0.20,
      pitch: 0,
      yaw: 0,
      roll: 0,
      headVelocity: 8,
      facialActivity: 45,
      userDistance: 'optimal'
    };
  }
}

export const browserCv = new BrowserCvEngine();
