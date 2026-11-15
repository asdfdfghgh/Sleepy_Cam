# SleepyCam AI v2.0.0

**On-Device Behavioral Fatigue & Sleepiness Monitoring Application (Web App, Installable PWA & Desktop Packaging Ready)**

SleepyCam AI observes eye openness, blink dynamics, PERCLOS, yawning kinematics, and sustained eye closures locally using MediaPipe Face Landmarker. Every frame is processed directly on your device—zero video frames are ever stored or uploaded.

---

## Key Features & Validated Engine Preservation

- **Privacy-First Camera Activation**: Camera remains strictly off on the Home screen until you explicitly start a preview, calibration, quick assessment, or live monitoring session.
- **Face Distance & Eye Landmark Guards**: Computes isotropic pixel distances (`distPx`) and marks eyes as `UNCERTAIN` whenever eye pixel width falls below `18px` or face frame coverage falls below `5.5%`.
- **Beard- & Smile-Immune Mouth Detection**: Tracks inner-lip landmarks (`13, 14, 78, 308`) and differentiates wide smiles and speech from sustained yawns.
- **Personalized 4-Step Geometric Eye Calibration**: Calibrates open/partial/closed EAR boundaries independently per eye without resetting observable fatigue indicators to zero.
- **Dual Fatigue Scoring Engine**: Combines **65% Absolute Observable Fatigue Indicators** + **35% Personal Behavioral Deviation** alongside an independent **Karolinska Sleepiness Scale (KSS 1–9)** rating (`0%` head-nodding weight).
- **Independent Microsleep State Machine & Web Audio Alerts**: Synthesizes 3 non-blocking Web Audio alert tones offline upon sustained bilateral eye closure, with immediate `[M]` keyboard/button mute, configurable cooldown, and optional desktop notifications.
- **Local IndexedDB Persistence & Multi-Format Exports**: Stores session summaries cleanly in `sleepycam_db` IndexedDB with CSV, PDF (`jspdf`), JSON, and print-ready reports.
- **Offline PWA Support**: Pre-caches the application shell and bundled `/models/face_landmarker.task` and `/wasm/*` files for reliable offline operation.

---

## Architecture Overview

- `src/services/StorageService.ts` — IndexedDB persistence (`sleepycam_db`) for settings, calibration, KSS ratings, and session history.
- `src/services/CameraService.ts` — Camera device enumeration, resolution selection, and user-friendly error recovery.
- `src/services/ReportService.ts` — CSV, PDF, JSON, and printable report generators.
- `src/services/PlatformAdapter.ts` — Web / installed PWA / Tauri desktop runtime detection and notification bridge.
- `src/services/cv/CvPipelineServices.ts` — Modular wrappers (`FaceDetectionService`, `EyeAnalysisService`, `MouthAnalysisService`, `CalibrationService`, `FatigueScoringService`, `EventDetectionService`, `SessionService`) delegating directly to validated math in `src/utils/faceLandmarkerEngine.ts` and `src/utils/mathFormulas.ts`.
- `src/hooks/useFatigueMonitor.ts` — Single-source-of-truth detection loop, Pause/Resume/Stop session controls, Quick Assessment wall-clock timer, and Advanced Diagnostics checklist.

---

## Running & Deploying

### 1. Web App (Local Dev & Production Deploy)
```bash
npm install
npm run dev      # Starts Vite dev server on http://localhost:3000
npm run build    # Builds production web + PWA bundle into dist/
```
Compatible directly with AI Studio preview & Cloud Run deployment.

### 2. Install as a Desktop/Mobile Web App (PWA)
Open the deployed web app over HTTPS (or localhost) in Chrome/Edge and click **Install App** in the sidebar or browser address bar. Offline mode automatically serves cached MediaPipe assets.

### 3. Desktop Application Packaging (Tauri v2)
A complete Tauri v2 configuration lives in `src-tauri/` (`tauri.conf.json`, `Cargo.toml`, `capabilities/default.json`, and app icons in `src-tauri/icons/`).

**Prerequisites on your build machine**:
- Node.js 20+
- [Rust & Cargo](https://rustup.rs/)
- Platform WebView dependencies (e.g., WebView2 on Windows, Xcode Command Line Tools on macOS, `libwebkit2gtk` on Linux)

**Build Desktop Installer**:
```bash
npm install
npm run build
npx @tauri-apps/cli@latest dev     # Launch desktop dev window
npx @tauri-apps/cli@latest build   # Package Windows (.msi / .exe), macOS (.dmg), or Linux (.AppImage / .deb)
```

---

## Privacy & Non-Clinical Disclaimer

SleepyCam AI processes all video frames locally in memory and saves only numeric session statistics in local browser/desktop IndexedDB storage. You can export or permanently delete all stored data at any time inside **Settings -> Data & Privacy**. SleepyCam AI provides behavioral fatigue indicators for personal awareness and is not a medical device.

---

## Release Notes — v2.0.0
- Complete product UI redesign with Dark Navy default + Light theme switcher, responsive Sidebar & Mobile navigation.
- Added Home onboarding with pre-camera privacy guarantee and dedicated Camera Setup & Calibration screen.
- Added standalone Quick Assessment flow (`10s / 30s / 60s / 120s`) with preliminary 10-second indicator readout and completion summary.
- Added Pause/Resume/Stop monitoring lifecycle, Session History filtering, and PDF/CSV/JSON report exports.
- Added Progressive Web App offline bundling (`vite-plugin-pwa`) and Tauri v2 desktop configuration.
