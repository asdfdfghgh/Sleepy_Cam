import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  AppRoute,
  AppSettings,
  AudioAlertConfig,
  BaselineData,
  CameraDeviceOption,
  FatigueWeightConfig,
  KssRating,
  SavedSessionRecord
} from '../types';
import { DEFAULT_FATIGUE_WEIGHTS, KSS_LEVELS } from '../utils/mathFormulas';
import { audioAlert, DEFAULT_AUDIO_CONFIG } from '../utils/audioAlertEngine';
import {
  DEFAULT_APP_SETTINGS,
  DEFAULT_BASELINE_DATA,
  storageService
} from '../services/StorageService';
import { cameraService } from '../services/CameraService';

interface ToastMessage {
  id: string;
  text: string;
  tone: 'info' | 'success' | 'warning';
}

interface AppContextValue {
  route: AppRoute;
  setRoute: (route: AppRoute) => void;
  settings: AppSettings;
  updateSettings: (partial: Partial<AppSettings>) => Promise<void>;
  toggleTheme: () => void;
  baseline: BaselineData;
  saveBaseline: (next: BaselineData) => Promise<void>;
  clearBaseline: () => Promise<void>;
  kssRating: KssRating | null;
  selectKssLevel: (level: number) => Promise<void>;
  audioConfig: AudioAlertConfig;
  updateAudioConfig: (partial: Partial<AudioAlertConfig>) => Promise<void>;
  toggleAudioMute: () => void;
  fatigueWeights: FatigueWeightConfig;
  setFatigueWeights: React.Dispatch<React.SetStateAction<FatigueWeightConfig>>;
  sessions: SavedSessionRecord[];
  saveSessionRecord: (record: SavedSessionRecord) => Promise<void>;
  deleteSessionRecord: (id: string) => Promise<void>;
  clearAllSessionRecords: () => Promise<void>;
  wipeAllData: () => Promise<void>;
  selectedReportId: string | null;
  openSessionReport: (id: string) => void;
  cameras: CameraDeviceOption[];
  refreshCameras: () => Promise<CameraDeviceOption[]>;
  toast: ToastMessage | null;
  showToast: (text: string, tone?: ToastMessage['tone']) => void;
  isHydrated: boolean;
}

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [route, setRoute] = useState<AppRoute>('home');
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [baseline, setBaseline] = useState<BaselineData>(DEFAULT_BASELINE_DATA);
  const [kssRating, setKssRating] = useState<KssRating | null>(null);
  const [audioConfig, setAudioConfig] = useState<AudioAlertConfig>(DEFAULT_AUDIO_CONFIG);
  const [fatigueWeights, setFatigueWeights] = useState<FatigueWeightConfig>(DEFAULT_FATIGUE_WEIGHTS);
  const [sessions, setSessions] = useState<SavedSessionRecord[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [cameras, setCameras] = useState<CameraDeviceOption[]>([]);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);

  const showToast = useCallback((text: string, tone: ToastMessage['tone'] = 'info') => {
    const id = `${Date.now()}`;
    setToast({ id, text, tone });
    setTimeout(() => {
      setToast((cur) => (cur?.id === id ? null : cur));
    }, 3500);
  }, []);

  const applyThemeToDom = useCallback((theme: 'dark' | 'light') => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', theme === 'dark' ? '#111317' : '#cecbcb');
    }
  }, []);

  const refreshCameras = useCallback(async () => {
    const list = await cameraService.listVideoDevices();
    setCameras(list);
    return list;
  }, []);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      storageService.getSettings(),
      storageService.getCalibration(),
      storageService.getKssRating(),
      storageService.getAudioConfig(),
      storageService.listSessions(),
      cameraService.listVideoDevices()
    ]).then(([loadedSettings, loadedBaseline, loadedKss, loadedAudio, loadedSessions, camList]) => {
      if (!mounted) return;
      setSettings(loadedSettings);
      applyThemeToDom(loadedSettings.theme);
      setBaseline(loadedBaseline);
      setKssRating(loadedKss);
      setAudioConfig(loadedAudio);
      audioAlert.updateConfig(loadedAudio);
      setSessions(loadedSessions);
      setCameras(camList);
      if (loadedSessions.length > 0) {
        setSelectedReportId(loadedSessions[0].id);
      }
      if (loadedSettings.startupPage && loadedSettings.startupPage !== 'home') {
        setRoute(loadedSettings.startupPage);
      }
      setIsHydrated(true);
    });

    return () => {
      mounted = false;
    };
  }, [applyThemeToDom]);

  const updateSettings = useCallback(
    async (partial: Partial<AppSettings>) => {
      setSettings((prev) => {
        const next = { ...prev, ...partial };
        applyThemeToDom(next.theme);
        void storageService.saveSettings(next);
        return next;
      });
    },
    [applyThemeToDom]
  );

  const toggleTheme = useCallback(() => {
    setSettings((prev) => {
      const nextTheme: 'dark' | 'light' = prev.theme === 'dark' ? 'light' : 'dark';
      const next = { ...prev, theme: nextTheme };
      applyThemeToDom(nextTheme);
      void storageService.saveSettings(next);
      return next;
    });
  }, [applyThemeToDom]);

  const saveBaseline = useCallback(async (next: BaselineData) => {
    setBaseline(next);
    await storageService.saveCalibration(next);
  }, []);

  const clearBaseline = useCallback(async () => {
    const cleared = await storageService.clearCalibration();
    setBaseline(cleared);
    showToast('Calibration profile cleared', 'info');
  }, [showToast]);

  const selectKssLevel = useCallback(
    async (level: number) => {
      const info = KSS_LEVELS[level];
      if (!info) return;
      const rating: KssRating = {
        level,
        label: info.label,
        description: info.description,
        category: info.category,
        ratedAt: Date.now()
      };
      setKssRating(rating);
      await storageService.saveKssRating(rating);
      showToast(`Sleepiness rated: KSS ${level}/9 — ${info.label}`, 'success');
    },
    [showToast]
  );

  const updateAudioConfig = useCallback(async (partial: Partial<AudioAlertConfig>) => {
    const next = audioAlert.updateConfig(partial);
    setAudioConfig(next);
    await storageService.saveAudioConfig(next);
  }, []);

  const toggleAudioMute = useCallback(() => {
    const enabled = audioAlert.toggleMute();
    const next = audioAlert.getConfig();
    setAudioConfig(next);
    void storageService.saveAudioConfig(next);
    showToast(enabled ? 'Audio alerts enabled' : 'Audio alerts muted', 'info');
  }, [showToast]);

  const saveSessionRecord = useCallback(async (record: SavedSessionRecord) => {
    await storageService.saveSession(record);
    setSessions((prev) => [record, ...prev.filter((s) => s.id !== record.id)]);
    setSelectedReportId(record.id);
  }, []);

  const deleteSessionRecord = useCallback(
    async (id: string) => {
      await storageService.deleteSession(id);
      setSessions((prev) => {
        const remaining = prev.filter((s) => s.id !== id);
        setSelectedReportId((cur) => (cur === id ? remaining[0]?.id ?? null : cur));
        return remaining;
      });
      showToast('Session removed from local storage', 'info');
    },
    [showToast]
  );

  const clearAllSessionRecords = useCallback(async () => {
    await storageService.clearAllSessions();
    setSessions([]);
    setSelectedReportId(null);
    showToast('All saved session history cleared', 'info');
  }, [showToast]);

  const wipeAllData = useCallback(async () => {
    await storageService.deleteAllLocalData();
    setSettings(DEFAULT_APP_SETTINGS);
    applyThemeToDom(DEFAULT_APP_SETTINGS.theme);
    setBaseline(DEFAULT_BASELINE_DATA);
    setKssRating(null);
    const resetAudio = audioAlert.updateConfig(DEFAULT_AUDIO_CONFIG);
    setAudioConfig(resetAudio);
    setSessions([]);
    setSelectedReportId(null);
    showToast('All local SleepyCam data deleted', 'warning');
  }, [applyThemeToDom, showToast]);

  const openSessionReport = useCallback((id: string) => {
    setSelectedReportId(id);
    setRoute('reports');
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (e.key.toUpperCase() === 'M') {
        toggleAudioMute();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [toggleAudioMute]);

  return (
    <AppContext.Provider
      value={{
        route,
        setRoute,
        settings,
        updateSettings,
        toggleTheme,
        baseline,
        saveBaseline,
        clearBaseline,
        kssRating,
        selectKssLevel,
        audioConfig,
        updateAudioConfig,
        toggleAudioMute,
        fatigueWeights,
        setFatigueWeights,
        sessions,
        saveSessionRecord,
        deleteSessionRecord,
        clearAllSessionRecords,
        wipeAllData,
        selectedReportId,
        openSessionReport,
        cameras,
        refreshCameras,
        toast,
        showToast,
        isHydrated
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useAppContext must be used inside AppProvider');
  }
  return ctx;
}
