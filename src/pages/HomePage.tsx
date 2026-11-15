import React, { Suspense } from 'react';
import { motion } from 'motion/react';
import {
  Clock,
  Activity,
  Camera,
  Sparkles,
  CheckCircle2,
  ArrowUpRight
} from 'lucide-react';
import { useAppContext } from '../hooks/useAppContext';
import { Button } from '../components/ui/Primitives';
import { RobotCanvas } from '../components/ui/robot-hero';
import { NumberTicker } from '../components/21st/NumberTicker';

export const HomePage: React.FC = () => {
  const { setRoute, baseline, sessions, cameras, openSessionReport, settings } = useAppContext();
  const latestSession = sessions[0] || null;
  const isDark = settings.theme === 'dark';

  return (
    <section
      className="relative w-full h-[calc(100dvh-7.5rem)] lg:h-dvh min-h-[600px] overflow-hidden flex flex-col justify-between"
      style={{
        background: isDark
          ? 'linear-gradient(to bottom, #16181d 0%, #111317 55%, #0c0d10 68%, #13151a 100%)'
          : 'linear-gradient(to bottom, #cecbcb 0%, #cecbcb 55%, #9a9a9a 65%, #bebebe 100%)'
      }}
    >
      {/* Giant Studio Watermark Typography behind 3D Robot */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden select-none"
        style={{ zIndex: 0 }}
      >
        <h2
          className="font-display font-black uppercase whitespace-nowrap"
          style={{
            color: isDark ? '#ffffff' : '#000000',
            opacity: isDark ? 0.06 : 0.13,
            letterSpacing: '-0.05em',
            fontSize: 'clamp(4.2rem, 15vw, 13.5rem)',
            lineHeight: 1,
            transform: 'translate(0px, -10px)'
          }}
        >
          SLEEPYCAM
        </h2>
      </div>

      {/* Interactive 3D Robot Hero (pointer-tracking head & blinking #00ffc6 eyes; click for heart eyes) */}
      <Suspense fallback={null}>
        <RobotCanvas
          color={isDark ? '#8e939b' : '#c4c4c4'}
          scale={1.06}
          pantallaColor="#00ffc6"
          pantallaBrillo={1.25}
          blinkCycle={3.0}
          metalness={0.0}
          className="absolute inset-0 z-10"
        />
      </Suspense>

      {/* Top Minimal Brand Pill Bar (Leaves Robot Center 100% Unobstructed) */}
      <div className="relative z-20 pointer-events-none pt-5 sm:pt-7 px-4 sm:px-8">
        <div className="max-w-5xl mx-auto flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pointer-events-auto">
            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/90 dark:bg-[#1a1d24]/90 text-black dark:text-white shadow-[0_4px_14px_rgba(0,0,0,0.08)]">
              <span className="w-2 h-2 rounded-full bg-[#00ffc6] shadow-[0_0_8px_#00ffc6]" />
              <span className="font-mono text-[11px] font-bold tracking-widest uppercase">
                SLEEPYCAM · OCULAR AI
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => setRoute('setup')}>
                <Camera className="w-3.5 h-3.5" />
                <span>Camera</span>
              </Button>
              <Button variant="primary" size="sm" onClick={() => setRoute('assessment')}>
                <Clock className="w-3.5 h-3.5" />
                <span>Quick Scan</span>
              </Button>
            </div>
          </div>

          <div className="w-full studio-dotted-rule opacity-80" />
        </div>
      </div>

      {/* Bottom Compact Action & Status Dock (Unobstructed 3D Robot Center) */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-20 pointer-events-none px-4 sm:px-8 pb-6 sm:pb-8"
      >
        <div className="max-w-3xl mx-auto flex flex-col items-center text-center gap-4 pointer-events-auto">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <Button
              variant="primary"
              size="lg"
              onClick={() => setRoute('assessment')}
              className="min-w-[180px]"
            >
              <Clock className="w-4 h-4" />
              <span>QUICK SCAN</span>
            </Button>

            <Button
              variant="secondary"
              size="lg"
              onClick={() => setRoute('monitoring')}
              className="min-w-[196px]"
            >
              <Activity className="w-4 h-4" />
              <span>LIVE MONITORING</span>
            </Button>
          </div>

          {/* Crisp White / Matte Visor Status Pill Strip */}
          <div className="w-full max-w-2xl rounded-full bg-white/92 dark:bg-[#0e1014]/92 border border-black/10 dark:border-white/15 backdrop-blur-md px-5 py-2.5 shadow-[0_8px_28px_rgba(0,0,0,0.12)] grid grid-cols-3 gap-2 divide-x divide-black/10 dark:divide-white/15 text-left">
            <button
              type="button"
              onClick={() => setRoute('setup')}
              className="group flex items-center justify-between pr-2 cursor-pointer"
            >
              <div className="min-w-0">
                <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
                  Camera
                </span>
                <span className="text-xs font-mono font-bold text-black dark:text-white truncate block">
                  {cameras.length > 0 ? `${cameras.length} Ready` : 'Standby'}
                </span>
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-black dark:group-hover:text-[#00ffc6] shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => setRoute('setup')}
              className="group flex items-center justify-between px-2.5 cursor-pointer"
            >
              <div className="min-w-0">
                <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5 text-[#008f70] dark:text-[#00ffc6]" />
                  Calibration
                </span>
                <span className="text-xs font-mono font-bold truncate block">
                  {baseline.isCalibrated ? (
                    <span className="inline-flex items-center gap-1 text-[#007a5f] dark:text-[#00ffc6]">
                      <CheckCircle2 className="w-3 h-3 shrink-0" />
                      {baseline.geometricCalibration?.quality || 'OK'}
                    </span>
                  ) : (
                    <span className="text-amber-700 dark:text-amber-400">Needed</span>
                  )}
                </span>
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-black dark:group-hover:text-[#00ffc6] shrink-0" />
            </button>

            <button
              type="button"
              onClick={() =>
                latestSession ? openSessionReport(latestSession.id) : setRoute('history')
              }
              className="group flex items-center justify-between pl-2.5 cursor-pointer"
            >
              <div className="min-w-0">
                <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
                  Last Session
                </span>
                {latestSession ? (
                  <span className="text-xs font-mono font-bold text-black dark:text-[#00ffc6] tabular-nums">
                    <NumberTicker value={latestSession.avgFatigueScore} decimals={0} />
                    /100
                  </span>
                ) : (
                  <span className="text-xs font-mono font-bold text-zinc-500 dark:text-zinc-400">
                    No runs
                  </span>
                )}
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-black dark:group-hover:text-[#00ffc6] shrink-0" />
            </button>
          </div>
        </div>
      </motion.div>
    </section>
  );
};
