import React, { useState } from 'react';
import { Download, CheckCircle2 } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { canInstall, isInstalled, promptInstall } = usePWAInstall();
  const [installing, setInstalling] = useState(false);

  if (isInstalled) {
    return (
      <div className="flex items-center gap-2 text-xs text-emerald-500 dark:text-emerald-400 px-2.5 py-1.5">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">App Installed</span>
      </div>
    );
  }

  if (!canInstall) return null;

  const handleClick = async () => {
    setInstalling(true);
    try {
      await promptInstall();
    } finally {
      setInstalling(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={installing}
      className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-full bg-[#00ffc6] text-black hover:bg-[#00e5b2] shadow-[0_0_16px_rgba(0,255,198,0.35)] text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer transition-all"
    >
      <Download className="w-3.5 h-3.5 shrink-0" />
      <span>{installing ? 'Installing...' : compact ? 'Install' : 'Install App'}</span>
    </button>
  );
};
