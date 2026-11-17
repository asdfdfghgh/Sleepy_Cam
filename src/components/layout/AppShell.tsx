// Robot Studio Compact Navigation Rail with Antenna Visor Emblem
import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Home,
  ScanFace,
  Activity,
  History,
  Settings,
  Camera,
  FileBarChart,
  Sun,
  Moon,
  Volume2,
  VolumeX,
  Menu,
  X
} from 'lucide-react';
import { AppRoute } from '../../types';
import { useAppContext } from '../../hooks/useAppContext';
import { PWAInstallButton } from '../pwa/PWAInstallButton';
import { OfflineIndicator } from '../pwa/OfflineIndicator';
import { RobotAntennaMark } from '../ui/robot-hero';
import { DeveloperFooter } from './DeveloperFooter';
import { cn } from '../../lib/utils';

interface RailItem {
  id: AppRoute;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  matchRoutes?: AppRoute[];
}

const PRIMARY_RAIL: RailItem[] = [
  { id: 'home', label: 'HOME', icon: Home },
  { id: 'assessment', label: 'SCAN', icon: ScanFace },
  { id: 'monitoring', label: 'MONITOR', icon: Activity },
  { id: 'history', label: 'HISTORY', icon: History, matchRoutes: ['history', 'reports'] },
  { id: 'settings', label: 'SETTINGS', icon: Settings, matchRoutes: ['settings', 'about'] }
];

const SECONDARY_UTIL: RailItem[] = [
  { id: 'setup', label: 'CAMERA', icon: Camera },
  { id: 'reports', label: 'REPORTS', icon: FileBarChart }
];

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    route,
    setRoute,
    settings,
    toggleTheme,
    audioConfig,
    toggleAudioMute,
    toast
  } = useAppContext();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigate = (target: AppRoute) => {
    setRoute(target);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen text-[#0a0b0e] dark:text-[#f4f6f8] flex flex-col lg:flex-row">
      {/* Compact Robot Studio Left Navigation Rail (Desktop) */}
      <aside
        className="hidden lg:flex lg:w-[92px] lg:shrink-0 lg:flex-col items-center justify-between py-5 border-r-2 border-dotted border-black/15 dark:border-white/15 bg-white/55 dark:bg-[#0e1014]/80 backdrop-blur-xl sticky top-0 h-screen z-30 no-print"
        aria-label="Primary HUD Navigation"
      >
        {/* Signature Mini Robot Antenna Head Emblem */}
        <button
          type="button"
          onClick={() => navigate('home')}
          title="SleepyCam Home"
          className="cursor-pointer focus:outline-none"
        >
          <RobotAntennaMark />
        </button>

        {/* Primary Rail Items: HOME / SCAN / MONITOR / HISTORY / SETTINGS */}
        <nav className="w-full px-2.5 space-y-2">
          {PRIMARY_RAIL.map((item) => {
            const Icon = item.icon;
            const active = item.matchRoutes
              ? item.matchRoutes.includes(route)
              : route === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(item.id)}
                title={item.label}
                className={cn(
                  'relative w-full flex flex-col items-center justify-center gap-1 py-2.5 rounded-2xl text-[10px] font-mono tracking-wider whitespace-nowrap shrink-0 transition-colors cursor-pointer',
                  active
                    ? 'text-black font-black'
                    : 'text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-white'
                )}
              >
                {active && (
                  <motion.div
                    layoutId="hudActiveRailPill"
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    className="absolute inset-0 rounded-2xl bg-[#00ffc6] shadow-[0_0_20px_rgba(0,255,198,0.45)]"
                  />
                )}
                <Icon
                  className={cn(
                    'relative z-10 w-4 h-4 transition-transform',
                    active && 'scale-105 text-black'
                  )}
                />
                <span className="relative z-10">{item.label}</span>
              </button>
            );
          })}

          <div className="my-2 border-b-2 border-dotted border-black/15 dark:border-white/15 mx-2" />

          {SECONDARY_UTIL.map((item) => {
            const Icon = item.icon;
            const active = route === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(item.id)}
                title={item.label}
                className={cn(
                  'relative w-full flex flex-col items-center justify-center gap-1 py-2 rounded-2xl text-[9px] font-mono tracking-wider whitespace-nowrap shrink-0 transition-colors cursor-pointer',
                  active
                    ? 'bg-white text-black font-bold shadow-[0_4px_14px_rgba(0,0,0,0.1)]'
                    : 'text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-white'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Quick Sensor / Theme / Audio Controls */}
        <div className="w-full px-2.5 space-y-2 flex flex-col items-center">
          <button
            type="button"
            onClick={toggleAudioMute}
            aria-label="Toggle audio alerts"
            title={audioConfig.audioEnabled ? 'Mute Alerts [M]' : 'Unmute Alerts [M]'}
            className={cn(
              'w-10 h-10 rounded-full border flex items-center justify-center transition-colors cursor-pointer shadow-xs',
              audioConfig.audioEnabled
                ? 'border-black/10 bg-[#00ffc6] text-black shadow-[0_0_14px_rgba(0,255,198,0.35)]'
                : 'border-black/10 dark:border-white/15 bg-white dark:bg-[#1a1d24] text-zinc-500'
            )}
          >
            {audioConfig.audioEnabled ? (
              <Volume2 className="w-4 h-4" />
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle color theme"
            title={settings.theme === 'dark' ? 'Switch to Robot Studio' : 'Switch to Night Visor'}
            className="w-10 h-10 rounded-full border border-black/10 dark:border-white/15 bg-white dark:bg-[#1a1d24] text-zinc-800 dark:text-zinc-200 hover:scale-105 flex items-center justify-center transition-all cursor-pointer shadow-xs"
          >
            {settings.theme === 'dark' ? (
              <Sun className="w-4 h-4 text-[#00ffc6]" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>

          <div className="w-full pt-0.5">
            <PWAInstallButton compact />
          </div>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="lg:hidden h-14 px-4 flex items-center justify-between border-b-2 border-dotted border-black/15 dark:border-white/15 bg-white/75 dark:bg-[#111317]/85 backdrop-blur-xl sticky top-0 z-30 no-print">
          <button
            type="button"
            onClick={() => navigate('home')}
            className="flex items-center gap-2 cursor-pointer"
          >
            <RobotAntennaMark className="scale-75 -ml-2" />
            <span className="font-display font-black text-sm tracking-wider text-black dark:text-white">
              SLEEPYCAM
            </span>
          </button>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleAudioMute}
              aria-label="Toggle audio alerts"
              className="p-2 rounded-full bg-white dark:bg-[#1a1d24] text-zinc-800 dark:text-zinc-200 shadow-xs cursor-pointer"
            >
              {audioConfig.audioEnabled ? (
                <Volume2 className="w-4 h-4 text-[#009977] dark:text-[#00ffc6]" />
              ) : (
                <VolumeX className="w-4 h-4 text-zinc-400" />
              )}
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle color theme"
              className="p-2 rounded-full bg-white dark:bg-[#1a1d24] text-zinc-800 dark:text-zinc-200 shadow-xs cursor-pointer"
            >
              {settings.theme === 'dark' ? (
                <Sun className="w-4 h-4 text-[#00ffc6]" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label="Open menu"
              className="p-2 rounded-full bg-white dark:bg-[#1a1d24] text-zinc-800 dark:text-zinc-200 shadow-xs cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </header>

        {mobileMenuOpen && (
          <div className="lg:hidden border-b border-black/10 dark:border-white/15 bg-white/95 dark:bg-[#14161b]/95 backdrop-blur-xl px-4 py-3 space-y-1 z-20 no-print">
            {[...PRIMARY_RAIL, ...SECONDARY_UTIL].map((item) => {
              const Icon = item.icon;
              const active = route === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigate(item.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-2.5 rounded-full text-xs font-mono tracking-wider',
                    active
                      ? 'bg-[#00ffc6] text-black font-bold'
                      : 'text-zinc-700 dark:text-zinc-300'
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
            <div className="pt-2">
              <PWAInstallButton />
            </div>
          </div>
        )}

        <OfflineIndicator />

        <main className="flex-1 flex flex-col pb-20 lg:pb-0">
          <div className="flex-1">{children}</div>
          <DeveloperFooter />
        </main>

        {/* Mobile Bottom HUD Navigation Bar */}
        <nav
          className="lg:hidden fixed bottom-0 inset-x-0 h-15 border-t border-black/10 dark:border-white/15 bg-white/88 dark:bg-[#111317]/92 backdrop-blur-xl flex items-center justify-around px-1 z-30 no-print"
          aria-label="Mobile HUD Navigation"
        >
          {PRIMARY_RAIL.map((item) => {
            const Icon = item.icon;
            const active = item.matchRoutes
              ? item.matchRoutes.includes(route)
              : route === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(item.id)}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-full text-[10px] font-mono tracking-wider whitespace-nowrap shrink-0 cursor-pointer min-w-[56px]',
                  active
                    ? 'bg-[#00ffc6] text-black font-bold shadow-[0_0_12px_rgba(0,255,198,0.4)]'
                    : 'text-zinc-600 dark:text-zinc-400'
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {toast && (
        <div
          role="status"
          className={cn(
            'fixed bottom-18 lg:bottom-6 right-6 z-50 px-5 py-2.5 rounded-full border text-xs font-bold shadow-2xl backdrop-blur-xl',
            toast.tone === 'success'
              ? 'bg-[#00ffc6] border-black/15 text-black'
              : toast.tone === 'warning'
              ? 'bg-amber-400 border-black/15 text-black'
              : 'bg-[#0a0a0a] border-white/15 text-white'
          )}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
};
