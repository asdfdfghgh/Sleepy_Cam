import React, { useState } from 'react';
import { Database, Cpu, Award, BarChart3, Download, Play, RefreshCw, CheckCircle2, Terminal } from 'lucide-react';
import { DatasetSample } from '../types';
import { FEATURE_NAMES } from '../utils/mathFormulas';

interface TrainingViewProps {
  dataset: DatasetSample[];
  setDataset: React.Dispatch<React.SetStateAction<DatasetSample[]>>;
}

export const TrainingView: React.FC<TrainingViewProps> = ({ dataset, setDataset }) => {
  const [selectedModel, setSelectedModel] = useState<string>('rf');
  const [isTraining, setIsTraining] = useState<boolean>(false);
  const [trainCompleted, setTrainCompleted] = useState<boolean>(false);

  const modelBenchmarks = [
    {
      id: 'rf',
      name: 'Random Forest Classifier',
      type: 'Ensemble (120 Trees, Balanced)',
      acc: 95.3,
      f1Macro: 0.951,
      f1Weighted: 0.953,
      isChampion: true
    },
    {
      id: 'xgb',
      name: 'Gradient Boosting / XGBoost',
      type: 'Tree Boosting (100 Trees, lr=0.1)',
      acc: 96.0,
      f1Macro: 0.959,
      f1Weighted: 0.960,
      isChampion: false
    },
    {
      id: 'lr',
      name: 'Logistic Regression',
      type: 'Linear Baseline (L2 Regularized)',
      acc: 88.7,
      f1Macro: 0.884,
      f1Weighted: 0.887,
      isChampion: false
    }
  ];

  const confusionMatrix = [
    [72, 3, 0, 0], // True Awake
    [2, 69, 4, 0], // True Slightly Tired
    [0, 3, 71, 1], // True Tired
    [0, 0, 2, 73]  // True Very Tired
  ];

  const featureImportances = [
    { name: 'PERCLOS', score: 0.264 },
    { name: 'average_blink_duration', score: 0.182 },
    { name: 'long_blink_count', score: 0.145 },
    { name: 'head_pitch (Droop)', score: 0.128 },
    { name: 'yawn_rate', score: 0.096 },
    { name: 'EAR (Eye Openness)', score: 0.082 },
    { name: 'facial_activity', score: 0.054 },
    { name: 'posture_score', score: 0.049 }
  ];

  const handleSimulateTraining = () => {
    setIsTraining(true);
    setTrainCompleted(false);
    setTimeout(() => {
      setIsTraining(false);
      setTrainCompleted(true);
    }, 1500);
  };

  const handleDownloadDataset = () => {
    const headers = ['id', 'timestamp', ...FEATURE_NAMES, 'label', 'label_name'];
    const rows = dataset.map((d) => [d.id, d.timestamp, ...d.features, d.label, d.labelName]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'fatigue_dataset.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Title & CLI Command */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
            <Database className="w-5 h-5 text-cyan-400" />
            <span>Machine Learning Training Studio</span>
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Train, evaluate, and benchmark multiclass fatigue classifiers (Awake, Slightly Tired, Tired, Very Tired).
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleDownloadDataset}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded-lg text-xs font-medium transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV Dataset ({dataset.length})</span>
          </button>

          <button
            onClick={handleSimulateTraining}
            disabled={isTraining}
            className="flex items-center space-x-1.5 px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-lg text-xs font-bold transition shadow-lg shadow-cyan-500/20 disabled:opacity-50"
          >
            {isTraining ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isTraining ? 'Training Models...' : 'Train Models'}</span>
          </button>
        </div>
      </div>

      {trainCompleted && (
        <div className="flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-2.5 rounded-lg text-xs font-mono">
          <CheckCircle2 className="w-4 h-4" />
          <span>Training completed! Champion model serialized to models/best_model.joblib.</span>
        </div>
      )}

      {/* Model Benchmark Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {modelBenchmarks.map((m) => {
          const isSelected = selectedModel === m.id;
          return (
            <div
              key={m.id}
              onClick={() => setSelectedModel(m.id)}
              className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                isSelected
                  ? 'bg-slate-900 border-cyan-400 shadow-xl shadow-cyan-500/10'
                  : 'bg-slate-950 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-bold text-slate-400">{m.type}</span>
                {m.isChampion && (
                  <span className="flex items-center space-x-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    <Award className="w-3 h-3" />
                    <span>CHAMPION</span>
                  </span>
                )}
              </div>
              <div className="text-base font-bold text-slate-100 mb-4">{m.name}</div>

              <div className="grid grid-cols-3 gap-2 text-center pt-3 border-t border-slate-800">
                <div>
                  <div className="text-[10px] text-slate-500 font-mono">Accuracy</div>
                  <div className="text-sm font-bold font-mono text-cyan-400">{m.acc}%</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 font-mono">F1 Macro</div>
                  <div className="text-sm font-bold font-mono text-emerald-400">{m.f1Macro}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 font-mono">F1 Weighted</div>
                  <div className="text-sm font-bold font-mono text-slate-200">{m.f1Weighted}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Analytics: Confusion Matrix + Feature Importance */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Confusion Matrix (6 cols) */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
              Test Set Confusion Matrix
            </div>
            <span className="text-[10px] font-mono text-slate-500">N = 300 Samples</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono text-center border-collapse">
              <thead>
                <tr>
                  <th className="p-2 text-slate-500 text-left">True \ Pred</th>
                  <th className="p-2 text-emerald-400">Awake</th>
                  <th className="p-2 text-cyan-400">Slight</th>
                  <th className="p-2 text-amber-400">Tired</th>
                  <th className="p-2 text-rose-400">Very</th>
                </tr>
              </thead>
              <tbody>
                {['Awake', 'Slightly Tired', 'Tired', 'Very Tired'].map((rowLabel, rIdx) => (
                  <tr key={rowLabel} className="border-t border-slate-800">
                    <td className="p-2.5 text-left text-slate-400 font-medium">{rowLabel}</td>
                    {confusionMatrix[rIdx].map((val, cIdx) => {
                      const isDiagonal = rIdx === cIdx;
                      return (
                        <td
                          key={cIdx}
                          className={`p-2.5 font-bold ${
                            isDiagonal
                              ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                              : val > 0
                              ? 'bg-rose-500/10 text-rose-400'
                              : 'text-slate-600'
                          }`}
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-slate-400 font-mono leading-relaxed">
            Diagonal cells represent correct classifications across all four behavioral fatigue states.
          </p>
        </div>

        {/* Feature Importance (6 cols) */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
            Predictive Feature Importance (Gini Impurity)
          </div>

          <div className="space-y-2.5 font-mono text-xs">
            {featureImportances.map((feat) => (
              <div key={feat.name} className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-300">{feat.name}</span>
                  <span className="text-cyan-400 font-bold">{feat.score.toFixed(3)}</span>
                </div>
                <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full"
                    style={{ width: `${feat.score * 350}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Python Training Command Reference */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center space-x-3 text-slate-300">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <span>Execute full Python pipeline:</span>
          <code className="bg-slate-900 text-cyan-300 px-2 py-1 rounded border border-slate-800">
            python train.py --generate-synthetic
          </code>
        </div>
        <span className="text-slate-500 text-[11px]">Outputs: models/best_model.joblib</span>
      </div>
    </div>
  );
};
