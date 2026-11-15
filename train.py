"""
SleepyCam AI - Model Training & Evaluation Pipeline
===================================================
Loads behavioral feature datasets, preprocesses and scales data,
trains Logistic Regression, Random Forest, and Gradient Boosting / XGBoost models,
evaluates performance metrics (Accuracy, Precision, Recall, F1, Confusion Matrix),
and serializes the champion model using Joblib.

Usage:
  python train.py                       # Train on data/fatigue_dataset.csv
  python train.py --generate-synthetic  # Seed synthetic training samples if no dataset exists
"""

import os
import sys
import argparse
from typing import Tuple, Dict, Any
import numpy as np
import pandas as pd

# Add src/ to Python import path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))

try:
    import joblib
except ImportError:
    joblib = None

try:
    from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
    from sklearn.preprocessing import StandardScaler
    from sklearn.linear_model import LogisticRegression
    from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
    from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, f1_score
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False

try:
    import xgboost as xgb
    XGB_AVAILABLE = True
except ImportError:
    xgb = None
    XGB_AVAILABLE = False

from fatigue import FEATURE_NAMES
from data_logger import LABEL_NAMES


def generate_synthetic_dataset(num_samples: int = 1500, output_path: str = "data/fatigue_dataset.csv") -> pd.DataFrame:
    """
    Generates a realistic synthetic behavioral dataset for bootstrapping and testing
    the training pipeline before manual data collection.
    """
    print(f"[Dataset] Generating {num_samples} realistic synthetic behavioral samples...")
    np.random.seed(42)

    rows = []
    # 4 classes: 0=Awake, 1=Slightly Tired, 2=Tired, 3=Very Tired
    samples_per_class = num_samples // 4

    for label in range(4):
        label_name = LABEL_NAMES[label]
        for _ in range(samples_per_class):
            if label == 0:  # Awake
                ear = np.random.normal(0.29, 0.02)
                perclos = np.random.uniform(0.0, 5.0)
                blink_rate = np.random.normal(14.0, 3.0)
                avg_blink_dur = np.random.normal(0.18, 0.03)
                long_blinks = 0
                mar = np.random.normal(0.24, 0.03)
                yawn_rate = 0.0
                avg_yawn_dur = 0.0
                pitch = np.random.normal(0.0, 4.0)
                yaw = np.random.normal(0.0, 5.0)
                roll = np.random.normal(0.0, 3.0)
                vel = np.random.normal(12.0, 4.0)
                nod_freq = 0.0
                facial_act = np.random.normal(55.0, 8.0)
                posture = np.random.normal(90.0, 5.0)
                posture_chg = np.random.normal(2.0, 1.0)

            elif label == 1:  # Slightly Tired
                ear = np.random.normal(0.26, 0.02)
                perclos = np.random.uniform(5.0, 12.0)
                blink_rate = np.random.normal(19.0, 4.0)
                avg_blink_dur = np.random.normal(0.22, 0.04)
                long_blinks = int(np.random.choice([0, 1], p=[0.7, 0.3]))
                mar = np.random.normal(0.28, 0.05)
                yawn_rate = np.random.choice([0.0, 0.5, 1.0], p=[0.6, 0.3, 0.1])
                avg_yawn_dur = 1.5 if yawn_rate > 0 else 0.0
                pitch = np.random.normal(-3.0, 5.0)
                yaw = np.random.normal(0.0, 6.0)
                roll = np.random.normal(0.0, 4.0)
                vel = np.random.normal(15.0, 5.0)
                nod_freq = 0.0
                facial_act = np.random.normal(42.0, 7.0)
                posture = np.random.normal(82.0, 6.0)
                posture_chg = np.random.normal(4.0, 2.0)

            elif label == 2:  # Tired
                ear = np.random.normal(0.22, 0.025)
                perclos = np.random.uniform(14.0, 28.0)
                blink_rate = np.random.normal(24.0, 5.0)
                avg_blink_dur = np.random.normal(0.32, 0.06)
                long_blinks = int(np.random.choice([1, 2, 3], p=[0.5, 0.35, 0.15]))
                mar = np.random.normal(0.38, 0.08)
                yawn_rate = np.random.choice([1.0, 2.0, 3.0], p=[0.4, 0.4, 0.2])
                avg_yawn_dur = np.random.normal(2.5, 0.5) if yawn_rate > 0 else 0.0
                pitch = np.random.normal(-9.0, 6.0)
                yaw = np.random.normal(0.0, 7.0)
                roll = np.random.normal(0.0, 5.0)
                vel = np.random.normal(22.0, 7.0)
                nod_freq = np.random.choice([0.0, 1.0, 2.0], p=[0.5, 0.35, 0.15])
                facial_act = np.random.normal(26.0, 6.0)
                posture = np.random.normal(68.0, 8.0)
                posture_chg = np.random.normal(8.0, 3.0)

            else:  # 3: Very Tired
                ear = np.random.normal(0.16, 0.03)
                perclos = np.random.uniform(30.0, 65.0)
                blink_rate = np.random.normal(11.0, 6.0) # Slower / droopy staring
                avg_blink_dur = np.random.normal(0.55, 0.15)
                long_blinks = int(np.random.choice([3, 4, 6], p=[0.3, 0.4, 0.3]))
                mar = np.random.normal(0.52, 0.12)
                yawn_rate = np.random.choice([2.0, 3.0, 4.0], p=[0.3, 0.4, 0.3])
                avg_yawn_dur = np.random.normal(3.4, 0.7)
                pitch = np.random.normal(-18.0, 8.0) # Pronounced downward droop
                yaw = np.random.normal(0.0, 9.0)
                roll = np.random.normal(0.0, 6.0)
                vel = np.random.normal(28.0, 9.0)
                nod_freq = np.random.choice([1.0, 2.0, 4.0], p=[0.2, 0.5, 0.3])
                facial_act = np.random.normal(14.0, 5.0)
                posture = np.random.normal(48.0, 10.0)
                posture_chg = np.random.normal(14.0, 4.0)

            ear = max(0.05, ear)
            left_ear = ear * np.random.normal(1.0, 0.03)
            right_ear = ear * np.random.normal(1.0, 0.03)

            row = [
                ear, left_ear, right_ear, perclos,
                blink_rate, avg_blink_dur, long_blinks,
                mar, yawn_rate, avg_yawn_dur,
                pitch, yaw, roll, vel, nod_freq,
                facial_act, posture, posture_chg,
                label, label_name
            ]
            rows.append(row)

    cols = FEATURE_NAMES + ["label", "label_name"]
    df = pd.DataFrame(rows, columns=cols)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    df.to_csv(output_path, index=False)
    print(f"[Dataset] Saved {len(df)} samples to {output_path}")
    return df


def train_and_evaluate(dataset_path: str = "data/fatigue_dataset.csv", output_dir: str = "models"):
    """Loads dataset, trains models, evaluates with metrics, and saves the best model."""
    if not SKLEARN_AVAILABLE:
        print("[Error] scikit-learn is required for training models.")
        return

    os.makedirs(output_dir, exist_ok=True)

    # 1. Load Dataset
    if not os.path.exists(dataset_path):
        print(f"[Notice] Dataset '{dataset_path}' not found. Generating synthetic dataset...")
        df = generate_synthetic_dataset(output_path=dataset_path)
    else:
        df = pd.read_csv(dataset_path)

    print(f"[Data] Loaded dataset with {len(df)} rows.")

    # Validate feature columns
    missing_cols = [c for c in FEATURE_NAMES if c not in df.columns]
    if missing_cols or "label" not in df.columns:
        print(f"[Warning] Dataset is missing required columns: {missing_cols}. Rebuilding synthetic dataset...")
        df = generate_synthetic_dataset(output_path=dataset_path)

    # Filter out rows with invalid or null labels
    df = df.dropna(subset=["label"])
    df = df[df["label"].isin([0, 1, 2, 3, "0", "1", "2", "3"])]
    df["label"] = df["label"].astype(int)

    if len(df) < 50:
        print(f"[Notice] Dataset only has {len(df)} samples (<50). Augmenting with synthetic samples...")
        synth = generate_synthetic_dataset(num_samples=1200, output_path="data/temp_synth.csv")
        df = pd.concat([df, synth], ignore_index=True)

    X = df[FEATURE_NAMES].values
    y = df["label"].values

    # Impute missing values with medians
    col_medians = np.nanmedian(X, axis=0)
    for i in range(X.shape[1]):
        X[np.isnan(X[:, i]), i] = col_medians[i]

    # Class distribution check
    unique, counts = np.unique(y, return_counts=True)
    print("\n[Data] Class Distribution:")
    for u, c in zip(unique, counts):
        name = LABEL_NAMES[u] if u < len(LABEL_NAMES) else f"Class {u}"
        pct = (c / len(y)) * 100.0
        print(f"  [{u}] {name:15s}: {c} samples ({pct:.1f}%)")

    # Train / Test Split (Stratified 80/20)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )

    # Feature Scaling
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # Candidate Models
    models: Dict[str, Any] = {
        "Logistic Regression (Baseline)": LogisticRegression(
            max_iter=1000, class_weight="balanced", random_state=42
        ),
        "Random Forest Classifier": RandomForestClassifier(
            n_estimators=120, max_depth=10, class_weight="balanced", random_state=42
        )
    }

    if XGB_AVAILABLE:
        models["XGBoost Classifier"] = xgb.XGBClassifier(
            n_estimators=100, max_depth=5, learning_rate=0.1, random_state=42, eval_metric="mlogloss"
        )
    else:
        models["Gradient Boosting Classifier"] = GradientBoostingClassifier(
            n_estimators=100, max_depth=4, learning_rate=0.1, random_state=42
        )

    best_model_name = None
    best_model = None
    best_f1 = -1.0
    results = {}

    print("\n" + "=" * 65)
    print(f"{'MODEL EVALUATION & BENCHMARKING':^65}")
    print("=" * 65)

    for name, model in models.items():
        print(f"\n---> Training: {name}...")
        model.fit(X_train_scaled, y_train)

        # Predictions
        y_pred = model.predict(X_test_scaled)

        acc = accuracy_score(y_test, y_pred)
        f1_macro = f1_score(y_test, y_pred, average="macro")
        f1_weighted = f1_score(y_test, y_pred, average="weighted")

        results[name] = {
            "accuracy": acc,
            "f1_macro": f1_macro,
            "f1_weighted": f1_weighted,
            "model": model,
            "pred": y_pred
        }

        print(f"     Accuracy:    {acc * 100:.2f}%")
        print(f"     F1 (Macro):  {f1_macro:.4f}")
        print(f"     F1 (Weight): {f1_weighted:.4f}")

        if f1_macro > best_f1:
            best_f1 = f1_macro
            best_model_name = name
            best_model = model

    # Detailed Evaluation of Best Model
    print("\n" + "=" * 65)
    print(f"  CHAMPION MODEL: {best_model_name} (Macro F1: {best_f1:.4f})")
    print("=" * 65)

    best_pred = results[best_model_name]["pred"]
    print("\nClassification Report:")
    print(classification_report(y_test, best_pred, target_names=LABEL_NAMES, digits=4))

    print("Confusion Matrix:")
    cm = confusion_matrix(y_test, best_pred)
    print(cm)

    # Feature Importance for Tree Models
    if hasattr(best_model, "feature_importances_"):
        print("\nTop 7 Predictive Features (Feature Importance):")
        importances = best_model.feature_importances_
        indices = np.argsort(importances)[::-1]
        for i in range(min(7, len(FEATURE_NAMES))):
            idx = indices[i]
            bar = "#" * int(importances[idx] * 40)
            print(f"  {FEATURE_NAMES[idx]:22s}: {importances[idx]:.4f}  {bar}")

    # Serialize Best Model & Scaler
    if joblib is not None:
        model_save_path = os.path.join(output_dir, "best_model.joblib")
        scaler_save_path = os.path.join(output_dir, "scaler.joblib")

        joblib.dump(best_model, model_save_path)
        joblib.dump(scaler, scaler_save_path)

        print(f"\n[Artifact] Best model saved to:  {model_save_path}")
        print(f"[Artifact] Scaler saved to:      {scaler_save_path}")
    else:
        print("[Warning] joblib not available; skipped saving model artifacts.")

    print("\n[Done] Training pipeline completed successfully.")


def main():
    parser = argparse.ArgumentParser(description="SleepyCam AI - Model Training Pipeline")
    parser.add_argument("--dataset", type=str, default="data/fatigue_dataset.csv", help="Path to input CSV dataset")
    parser.add_argument("--output-dir", type=str, default="models", help="Directory to save serialized models")
    parser.add_argument("--generate-synthetic", action="store_true", help="Generate synthetic dataset for bootstrap testing")

    args = parser.parse_args()

    if args.generate_synthetic:
        generate_synthetic_dataset(output_path=args.dataset)

    train_and_evaluate(dataset_path=args.dataset, output_dir=args.output_dir)


if __name__ == "__main__":
    main()
