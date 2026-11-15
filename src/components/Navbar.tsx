import React from 'react';
import { Activity, Eye, Sliders, Database, FileText, Code2, ShieldAlert } from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  fatigueScore: number;
  fatigueTier: string;
  tierColor: string;
  isCalibrated: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  fatigueScore,
  fatigueTier,
  tierColor,
  isCalibrated
}) => {
  const navItems = [
    { id: 'detector', label: 'Live Detector', icon: Eye },
    { id: 'simulator', label: 'Behavioral Simulator', icon: Sliders },
    { id: 'training', label: 'ML Training Studio', icon: Database },
    { id: 'reports', label: 'Session Reports', icon: FileText },
    { id: 'code', label: 'Code & Math Docs', icon: Code2 },
  ];

  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-cyan-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Activity className="w-5 h-5 text-slate-950 font-bold" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg tracking-wider text-slate-100">SLEEPYCAM</span>
              <span className="text-xs px-1.5 py-0.5 rounded font-mono font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                AI v1.0
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono hidden sm:block">
              Multimodal Real-Time Fatigue & Sleepiness Detection
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex space-x-1 sm:space-x-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-slate-800 text-cyan-400 shadow-sm border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span className="hidden md:inline">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Real-time Badge */}
        <div className="flex items-center space-x-3">
          <div className="hidden lg:flex items-center space-x-2 bg-slate-900/90 border border-slate-800 px-3 py-1 rounded-full">
            <span className={`w-2 h-2 rounded-full ${isCalibrated ? 'bg-emerald-400 animate-pulse' : 'bg-yellow-400'}`} />
            <span className="text-[11px] font-mono text-slate-300">
              {isCalibrated ? 'BASELINE SYNCED' : 'CALIBRATING'}
            </span>
          </div>

          <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
            <div className="text-right">
              <div className="text-[10px] font-mono text-slate-400 uppercase leading-none">Fatigue Score</div>
              <div className="text-sm font-mono font-bold leading-tight" style={{ color: tierColor }}>
                {Math.round(fatigueScore)} <span className="text-xs font-normal text-slate-500">/100</span>
              </div>
            </div>
            <span
              className="text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase"
              style={{ backgroundColor: `${tierColor}20`, color: tierColor, border: `1px solid ${tierColor}40` }}
            >
              {fatigueTier}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
