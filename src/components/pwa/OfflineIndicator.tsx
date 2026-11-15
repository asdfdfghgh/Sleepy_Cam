import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-amber-500/15 border-b border-amber-500/30 text-amber-800 dark:text-amber-300 px-4 py-2 text-xs flex items-center justify-center gap-2"
    >
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span>
        Offline Mode active — face tracking, fatigue scoring, audio alerts, and session history remain fully functional locally.
      </span>
    </div>
  );
};
