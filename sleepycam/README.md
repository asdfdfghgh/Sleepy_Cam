# SleepyCam AI: Real-Time Multimodal Fatigue & Sleepiness Detection System

**SleepyCam AI** is a real-time computer-vision and machine-learning system designed to detect user fatigue, drowsiness, and microsleep-like events via a local webcam. 

Unlike naive "eyes closed = asleep" detectors, SleepyCam AI analyzes **multimodal behavioral dynamics over rolling temporal windows (30–60s)**, calibrates to an individual's **personalized biometric baseline**, and synthesizes facial, ocular, oral, head kinematic, and posture signals into an interpretable **0–100 Fatigue Score**.

---

## 1. System Architecture

```
                                  +---------------------+
                                  |    Webcam Stream    |
                                  +----------+----------+
                                             |
                   +-------------------------+-------------------------+
                   |                                                   |
                   v                                                   v
      +------------------------+                          +------------------------+
      |  MediaPipe Face Mesh   |                          |     MediaPipe Pose     |
      |   (468 3D Landmarks)   |                          |    (Shoulders/Neck)    |
      +------------+-----------+                          +-----------+------------+
                   |                                                   |
      +------------+---------------------------+                       |
      |                    |                   |                       |
      v                    v                   v                       v
+------------+      +------------+      +------------+          +------------+
| Eye Tracker|      |Mouth/Yawn  |      | Head Pose  |          |  Posture   |
| (EAR/PERC) |      |   (MAR)    |      | (PnP 3D)   |          | (Slouching)|
+-----+------+      +-----+------+      +-----+------+          +-----+------+
      |                   |                   |                       |
      +-------------------+-------------------+-----------------------+
                                  |
                                  v
                    +---------------------------+
                    | 2-Minute Personal Baseline|
                    |    (Individual Norms)     |
                    +-------------+-------------+
                                  |
                                  v
                    +---------------------------+
                    | 18-Feature Vector Engine  |
                    +-------------+-------------+
                                  |
                   +--------------+--------------+
                   |                             |
                   v                             v
      +-------------------------+   +-------------------------+
      | Mode 1: Heuristic Engine|   | Mode 2: ML Model (RF/XGB)|
      |  (Weighted Biometrics)  |   |   (Trained Classifier)  |
      +------------+------------+   +------------+------------+
                   |                             |
                   +--------------+--------------+
                                  |
                                  v
                    +---------------------------+
                    |  0–100 Fatigue Score &    |
                    |  Microsleep Event Engine  |
                    +-------------+-------------+
                                  |
                   +--------------+--------------+
                   |                             |
                   v                             v
      +-------------------------+   +-------------------------+
      |   OpenCV Real-Time HUD  |   | Post-Session Analytics  |
      |   Dashboard & Sparkline |   |   (CSV + 4-Panel PNG)   |
      +-------------------------+   +-------------------------+
```

---

## 2. Mathematical Formulations

### 2.1 Eye Aspect Ratio (EAR)
Originally formulated by Soukupová and Čech (2016), the Eye Aspect Ratio measures eye opening using 6 landmark coordinates per eye:
$$EAR = \frac{||p_2 - p_6|| + ||p_3 - p_5||}{2 \times ||p_1 - p_4||}$$

Where:
- $p_1, p_4$ are the horizontal outer and inner corners of the eye.
- $p_2, p_6$ and $p_3, p_5$ are vertical pairs of upper and lower eyelid points.
- The average EAR across both eyes is:
$$EAR_{avg} = \frac{EAR_{left} + EAR_{right}}{2}$$

When eyes are open, EAR typically hovers between **0.25 and 0.35**. During blinks and eye closures, EAR rapidly drops towards **0.05 – 0.15**.

---

### 2.2 Percentage of Eye Closure (PERCLOS)
PERCLOS is an established ocular metric for driver drowsiness monitoring (Federal Highway Administration / NHTSA). It measures the proportion of time the eyelids cover at least 75–80% of the pupil over a specified rolling window $T$ (e.g., $T = 45$ seconds):

$$\text{PERCLOS} = \left( \frac{1}{T} \int_{t-T}^{t} \mathbb{I}\left( EAR(\tau) < \theta_{\text{closure}} \right) d\tau \right) \times 100\%$$

Where:
- $\theta_{\text{closure}} = 0.75 \times EAR_{\text{baseline}}$
- $\mathbb{I}(\cdot)$ is the indicator function (1 if closed, 0 otherwise).

**Clinical Thresholds**:
- $< 10\%$: Alert / Awake
- $12\% - 20\%$: Moderate drowsiness
- $> 25\%$: High risk of sleep onset / severe fatigue

---

### 2.3 Mouth Aspect Ratio (MAR) & Yawn Detection
To measure oral expansion without mistaking speech or smiling for yawning, MAR uses 8 lip landmarks:

$$MAR = \frac{||p_{13} - p_{14}|| + ||p_{82} - p_{87}|| + ||p_{312} - p_{317}||}{3 \times ||p_{78} - p_{308}||}$$

A genuine yawn is identified using **temporal thresholding**:
$$\text{Yawn Event} \iff MAR(t) \ge \theta_{\text{yawn}} \quad \text{for } 1.5\,\text{s} \le \Delta t \le 8.0\,\text{s}$$
This temporal barrier filters out rapid mouth openings such as speaking or laughing.

---

### 2.4 Head Pose Estimation (Perspective-n-Point)
Head orientation is estimated by solving the 2D-to-3D Perspective-n-Point ($PnP$) problem. Using canonical 3D facial coordinates $\mathbf{P}_i \in \mathbb{R}^3$ (nose tip, chin, eye corners, mouth corners) and their detected 2D pixel projections $\mathbf{p}_i \in \mathbb{R}^2$:

$$s \begin{bmatrix} u \\ v \\ 1 \end{bmatrix} = \mathbf{K} \left[ \mathbf{R} \mid \mathbf{t} \right] \begin{bmatrix} X \\ Y \\ Z \\ 1 \end{bmatrix}$$

Using Levenberg-Marquardt optimization via OpenCV `solvePnP`, we extract the rotation matrix $\mathbf{R} \in SO(3)$ and decompose it into Euler angles:
- **Pitch ($\theta_x$)**: Vertical head nodding and downward drooping.
- **Yaw ($\theta_y$)**: Horizontal turning left/right.
- **Roll ($\theta_z$)**: Head tilt sideways.

Head angular velocity is computed via Euclidean delta over time:
$$\omega(t) = \frac{\sqrt{(\Delta \theta_x)^2 + (\Delta \theta_y)^2 + (\Delta \theta_z)^2}}{\Delta t}$$

---

### 2.5 Personalized Baseline Normalization
Because natural eye anatomy, blink frequency, and resting posture vary widely across individuals, absolute thresholds lead to false positives. SleepyCam AI implements **relative deviation normalization**:

$$\Delta_{\text{rel}} EAR(t) = \frac{EAR(t) - EAR_{\text{baseline}}}{EAR_{\text{baseline}}}$$
$$\Delta Pitch(t) = Pitch(t) - Pitch_{\text{baseline}}$$

During the initial 2-minute calibration period, robust statistical percentiles (70th percentile for EAR, median for pitch and facial activity) are derived to eliminate noise and settling movements.

---

### 2.6 Heuristic Fatigue Score (0–100)
The continuous score balances weighted behavioral penalties:

$$\text{Score}_{\text{raw}} = \sum_{k} w_k \cdot \phi_k(t)$$

| Component $\phi_k$ | Weight $w_k$ | Clinical Rationale |
|:---|:---:|:---|
| **PERCLOS** | 0.28 | Percentage of eye closure over 45s window |
| **Prolonged Eye Closures** | 0.20 | Blinks $> 0.45$s and active closure duration |
| **Blink Frequency Abnormality**| 0.10 | Deviation from baseline (fluttering or fixed staring) |
| **Yawn Frequency & Duration** | 0.14 | Sustained yawns per minute |
| **Head Kinematics & Nodding** | 0.14 | Repeated head dropping cycles and downward pitch |
| **Posture Deterioration** | 0.08 | Slouching and shoulder tilt drift |
| **Reduced Facial Activity** | 0.06 | Mask-like facial immobility |

Exponential smoothing prevents abrupt frame jitter:
$$S(t) = (1 - \alpha) S(t - 1) + \alpha \text{Score}_{\text{raw}}(t) \quad (\alpha = 0.12)$$

---

## 3. Score Interpretation

| Score Range | Interpretation | Visual Indicator | Recommended Action |
|:---:|:---:|:---:|:---|
| **0 – 20** | **AWAKE** | Emerald Green | Normal focus; optimal responsiveness |
| **20 – 40** | **NORMAL** | Cyan Blue | Nominal baseline state |
| **40 – 60** | **GETTING TIRED** | Warm Yellow | Early drowsiness; hydrate, stretch |
| **60 – 80** | **TIRED** | Orange | Noticeable fatigue; take a 10m break |
| **80 – 95** | **VERY TIRED** | Red-Orange | Impaired vigilance; avoid safety-critical tasks |
| **95 – 100** | **BRO YOU NEED SLEEP**| Flashing Crimson | Critical fatigue; immediate rest recommended |

> **IMPORTANT DISCLAIMER**: SleepyCam AI is an experimental computer-vision research tool. It does not provide medical diagnoses or replace certified industrial/automotive driver monitoring hardware.

---

## 4. Installation & Requirements

### System Requirements
- Standard laptop or desktop CPU (No dedicated GPU required)
- Python 3.8+
- USB or integrated webcam (or use `--synthetic` for headless simulation)

### Setup
```bash
# 1. Clone repository and navigate to directory
cd sleepycam

# 2. Create virtual environment
python3 -m venv venv
source venv/bin/activate    # On Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt
```

---

## 5. How to Run

### 5.1 Standard Live Webcam Mode
Runs with default 2-minute baseline calibration:
```bash
python main.py
```

### 5.2 Fast Testing / Quick Calibration Mode
Runs a 10-second quick calibration for immediate testing:
```bash
python main.py --quick-calib 10
```

### 5.3 Simulated Feed Mode (No Camera Required)
Generates synthetic animated facial landmarks transitioning through awake, yawning, nodding, and microsleep cycles:
```bash
python main.py --synthetic
```

### 5.4 Data Collection Mode
Enables hotkeys to tag live frames with ground-truth states:
```bash
python main.py --collect-data
```
**Labeling Hotkeys:**
- `A` = Awake (Class 0)
- `S` = Slightly Tired (Class 1)
- `T` = Tired (Class 2)
- `V` = Very Tired (Class 3)
- `L` = Toggle facial landmark wireframe
- `C` = Recalibrate baseline
- `M` = Toggle between Heuristic and ML mode
- `Q` / `ESC` = Quit session and generate report

---

## 6. Machine Learning Pipeline

### 6.1 Training the Models
To train the classifier on collected or generated data:
```bash
python train.py --generate-synthetic
```
The pipeline automatically:
1. Loads `data/fatigue_dataset.csv`.
2. Cleans missing values and scales features via `StandardScaler`.
3. Performs stratified 80/20 train/test splitting.
4. Trains **Logistic Regression**, **Random Forest**, and **XGBoost / Gradient Boosting**.
5. Prints Accuracy, Macro F1, Weighted F1, and Confusion Matrices.
6. Serializes the champion model to `models/best_model.joblib` and `models/scaler.joblib`.

---

## 7. Session Report Artifacts

When pressing `Q` to quit, SleepyCam AI compiles telemetry into:
1. **`reports/session_report_<timestamp>.csv`**: Full chronological frame-by-frame feature logs and summary metrics.
2. **`reports/session_report_<timestamp>.png`**: High-resolution 4-panel analytical graphic:
   - Panel 1: Continuous Fatigue Score Timeline with color-coded risk bands.
   - Panel 2: Ocular Kinematics (EAR & PERCLOS synchronized).
   - Panel 3: Head Pitch & Velocity Nodding Trajectory.
   - Panel 4: Duration distribution across all 6 fatigue tiers.
