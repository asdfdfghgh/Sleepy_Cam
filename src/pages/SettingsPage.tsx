import React, { useState } from 'react';
import {
  RefreshCw,
  Volume2,
  Trash2,
  Download,
  Bell,
  ShieldCheck
} from 'lucide-react';
import { useAppContext } from '../hooks/useAppContext';
import { storageService } from '../services/StorageService';
import { platformAdapter } from '../services/PlatformAdapter';
import { audioAlert } from '../utils/audioAlertEngine';
import { Card, Button, Toggle } from '../components/ui/Primitives';
import { SegmentedControl, SettingsSlider } from '../components/21st/InteractiveControls';

export const SettingsPage: React.FC = () => {
  const {
    settings,
    updateSettings,
    baseline,
    clearBaseline,
    audioConfig,
    updateAudioConfig,
    sessions,
    clearAllSessionRecords,
    wipeAllData,
    cameras,
    refreshCameras,
    showToast,
    setRoute
  } = useAppContext();

  const [confirmWipe, setConfirmWipe] = useState(false);

  const handleExportAll = async () => {
    const json = await storageService.exportAllDataJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sleepycam_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('All local data exported as JSON', 'success');
  };

  const handleEnableNotifications = async () => {
    const perm = await platformAdapter.requestNotificationPermission();
    if (perm === 'granted') {
      await updateSettings({ desktopNotificationsEnabled: true });
      showToast('System notifications enabled for microsleep alerts', 'success');
    } else {
      await updateSettings({ desktopNotificationsEnabled: false });
      showToast('Notification permission not granted', 'warning');
    }
  };

  const handleTestBeep = () => {
    const prevEnabled = audioConfig.audioEnabled;
    if (!prevEnabled) {
      audioAlert.updateConfig({ audioEnabled: true });
    }
    audioAlert.triggerMicrosleepAlert(true);
    if (!prevEnabled) {
      setTimeout(() => audioAlert.updateConfig({ audioEnabled: false }), 700);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">
          HUD Settings
        </h1>
        <p className="text-xs font-mono uppercase tracking-wider text-zinc-600 dark:text-[#00ffc6]/85 mt-0.5">
          SYSTEM PREFERENCES · AUDIO ENGINE · LOCAL DATA CONTROL
        </p>
      </div>

      {/* 1. Appearance & Startup */}
      <Card className="p-6 space-y-5">
        <h2 className="font-display font-semibold text-base text-slate-900 dark:text-white">
          Interface &amp; Startup
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
          <div className="space-y-2">
            <div className="font-medium text-slate-700 dark:text-slate-300">Theme Mode</div>
            <SegmentedControl
              value={settings.theme}
              onChange={(v) => updateSettings({ theme: v })}
              options={[
                { value: 'light', label: 'Robot Studio' },
                { value: 'dark', label: 'Night Visor' }
              ]}
            />
          </div>

          <div className="space-y-2">
            <div className="font-medium text-slate-700 dark:text-slate-300">Startup View</div>
            <SegmentedControl
              value={settings.startupPage}
              onChange={(v) => updateSettings({ startupPage: v })}
              options={[
                { value: 'home', label: 'Home' },
                { value: 'assessment', label: 'Scan' },
                { value: 'monitoring', label: 'Monitor' }
              ]}
            />
          </div>
        </div>
      </Card>

      {/* 2. Camera */}
      <Card className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-semibold text-base text-slate-900 dark:text-white">
            Optical Input
          </h2>
          <Button variant="ghost" size="sm" onClick={() => refreshCameras()}>
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
          <div className="space-y-2">
            <label
              htmlFor="settings-default-cam"
              className="font-medium text-slate-700 dark:text-slate-300 block"
            >
              Default Camera
            </label>
            <select
              id="settings-default-cam"
              value={settings.defaultCameraId}
              onChange={(e) => updateSettings({ defaultCameraId: e.target.value })}
              className="w-full rounded-full border border-black/15 dark:border-white/15 bg-zinc-50 dark:bg-[#0a0a0a] px-3.5 py-2 text-zinc-800 dark:text-zinc-200"
            >
              <option value="">System Default Camera</option>
              {cameras.map((c) => (
                <option key={c.deviceId} value={c.deviceId}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <div className="font-medium text-slate-700 dark:text-slate-300">Capture Resolution</div>
            <SegmentedControl
              value={settings.resolution}
              onChange={(v) => updateSettings({ resolution: v })}
              options={[
                { value: '640x480', label: '480p' },
                { value: '1280x720', label: '720p HD' },
                { value: '1920x1080', label: '1080p' }
              ]}
            />
          </div>
        </div>
      </Card>

      {/* 3. Monitoring */}
      <Card className="p-6 space-y-5">
        <h2 className="font-display font-semibold text-base text-slate-900 dark:text-white">
          Detection &amp; Scan Preferences
        </h2>

        <div className="space-y-2 text-xs">
          <div className="font-medium text-slate-700 dark:text-slate-300">
            Default Quick Scan Window
          </div>
          <SegmentedControl
            value={settings.defaultAssessmentDuration}
            onChange={(v) => updateSettings({ defaultAssessmentDuration: v })}
            options={[
              { value: 10, label: '10s' },
              { value: 30, label: '30s' },
              { value: 60, label: '60s' },
              { value: 120, label: '120s' }
            ]}
          />
        </div>

        <Toggle
          checked={settings.showOverlaysByDefault}
          onChange={(v) => updateSettings({ showOverlaysByDefault: v })}
          label="Show facial landmark overlays"
          description="Displays eye contours, inner-lip landmarks, and face distance frame."
        />

        <Toggle
          checked={settings.pauseOnTabHidden}
          onChange={(v) => updateSettings({ pauseOnTabHidden: v })}
          label="Auto-pause monitoring when tab is hidden"
          description="Freezes tracking state when switching away from SleepyCam."
        />

        <Toggle
          checked={settings.enablePostureWeight}
          onChange={(v) => updateSettings({ enablePostureWeight: v })}
          label="Include posture support feature (5% max)"
          description="Head nodding stays at 0%; subtle slouch adds a small supporting cue."
        />

        <Toggle
          checked={settings.diagnosticsMode}
          onChange={(v) => updateSettings({ diagnosticsMode: v })}
          label="Diagnostics & Validation Mode"
          description="Shows score audit weights, synthetic input mode, and ground-truth checks."
        />

        <div className="flex items-center justify-between pt-3 border-t border-black/10 dark:border-white/12">
          <div>
            <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
              System Notifications
            </div>
            <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
              Status: {platformAdapter.getNotificationPermission()}
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={handleEnableNotifications}>
            <Bell className="w-3.5 h-3.5" />
            <span>
              {settings.desktopNotificationsEnabled ? 'Enabled' : 'Enable Notifications'}
            </span>
          </Button>
        </div>
      </Card>

      {/* 4. Audio */}
      <Card className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-semibold text-base text-slate-900 dark:text-white">
            Microsleep Audio Alerts
          </h2>
          <Button variant="secondary" size="sm" onClick={handleTestBeep}>
            <Volume2 className="w-3.5 h-3.5 text-[#007a5f] dark:text-[#00ffc6]" />
            <span>Test Beep</span>
          </Button>
        </div>

        <Toggle
          checked={audioConfig.audioEnabled}
          onChange={(v) => updateAudioConfig({ audioEnabled: v })}
          label="Enable audible closure alarms"
          description="Synthesized locally via Web Audio API. Press M anytime to mute."
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-1">
          <SettingsSlider
            label="Alert Volume"
            valueDisplay={`${Math.round(audioConfig.volume * 100)}%`}
            value={audioConfig.volume}
            min={0.1}
            max={1}
            step={0.05}
            onChange={(v) => updateAudioConfig({ volume: v })}
          />
          <SettingsSlider
            label="Closure Delay"
            valueDisplay={`${audioConfig.microsleepThresholdSec.toFixed(1)}s`}
            value={audioConfig.microsleepThresholdSec}
            min={1.0}
            max={3.5}
            step={0.1}
            onChange={(v) => updateAudioConfig({ microsleepThresholdSec: v })}
          />
          <SettingsSlider
            label="Alert Cooldown"
            valueDisplay={`${audioConfig.cooldownSec.toFixed(1)}s`}
            value={audioConfig.cooldownSec}
            min={2}
            max={15}
            step={0.5}
            onChange={(v) => updateAudioConfig({ cooldownSec: v })}
          />
          <SettingsSlider
            label="Repeat Interval"
            valueDisplay={`${audioConfig.repeatIntervalSec.toFixed(1)}s`}
            value={audioConfig.repeatIntervalSec}
            min={1.5}
            max={10}
            step={0.5}
            onChange={(v) => updateAudioConfig({ repeatIntervalSec: v })}
          />
        </div>
      </Card>

      {/* 5. Data & Privacy */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-[#007a5f] dark:text-[#00ffc6]" />
          <h2 className="font-display font-semibold text-base text-slate-900 dark:text-white">
            Local Storage &amp; Privacy
          </h2>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          IndexedDB stores <strong>{sessions.length}</strong> session summaries and{' '}
          <strong>{baseline.isCalibrated ? '1 calibrated profile' : 'no profile'}</strong>. Zero
          video frames are stored or uploaded.
        </p>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button variant="secondary" size="sm" onClick={handleExportAll}>
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON Backup</span>
          </Button>
          <Button variant="secondary" size="sm" onClick={() => clearBaseline()}>
            <span>Clear Calibration</span>
          </Button>
          <Button variant="secondary" size="sm" onClick={() => clearAllSessionRecords()}>
            <span>Clear History</span>
          </Button>
          {!confirmWipe ? (
            <Button variant="danger" size="sm" onClick={() => setConfirmWipe(true)}>
              <Trash2 className="w-3.5 h-3.5" />
              <span>Wipe All Data</span>
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="danger"
                size="sm"
                onClick={async () => {
                  await wipeAllData();
                  setConfirmWipe(false);
                }}
              >
                <span>Confirm Erase</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmWipe(false)}>
                <span>Cancel</span>
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* 6. Methodology Shortcut */}
      <Card className="p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-semibold text-sm text-slate-900 dark:text-white">
            SleepyCam AI · v2.0.0
          </h2>
          <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-0.5">
            Runtime: {platformAdapter.getPlatformLabel()}
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setRoute('about')}>
          <span>Methodology &amp; Simulator</span>
        </Button>
      </Card>
    </div>
  );
};
