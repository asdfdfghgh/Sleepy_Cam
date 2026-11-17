import {
  AppSettings,
  AssessmentFeedbackRecord,
  AudioAlertConfig,
  BaselineData,
  KssRating,
  SavedSessionRecord
} from '../types';
import { DEFAULT_AUDIO_CONFIG } from '../utils/audioAlertEngine';

const DB_NAME = 'sleepycam_db';
const DB_VERSION = 2;
const STORE_SESSIONS = 'sessions';
const STORE_KV = 'kv_store';
const STORE_FEEDBACK = 'assessment_feedback';
const LS_FEEDBACK_KEY = 'sleepycam_assessment_feedback';

export const DEFAULT_APP_SETTINGS: AppSettings = {
  theme: 'light',
  startupPage: 'home',
  language: 'en',
  defaultCameraId: '',
  resolution: '1280x720',
  defaultAssessmentDuration: 60,
  showOverlaysByDefault: true,
  pauseOnTabHidden: true,
  enablePostureWeight: true,
  desktopNotificationsEnabled: false,
  diagnosticsMode: false,
  privacyAccepted: false
};

export const DEFAULT_BASELINE_DATA: BaselineData = {
  ear: 0.28,
  mar: 0.16,
  blinkRate: 15,
  blinkDuration: 0.18,
  headPitch: 0.0,
  facialActivity: 52,
  postureScore: 90,
  isCalibrated: false,
  progressPct: 0
};

class StorageServiceClass {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private openDb(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB unavailable'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_SESSIONS)) {
          const store = db.createObjectStore(STORE_SESSIONS, { keyPath: 'id' });
          store.createIndex('startedAt', 'startedAt', { unique: false });
        }
        if (!db.objectStoreNames.contains(STORE_KV)) {
          db.createObjectStore(STORE_KV, { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains(STORE_FEEDBACK)) {
          const fbStore = db.createObjectStore(STORE_FEEDBACK, { keyPath: 'id' });
          fbStore.createIndex('recordedAt', 'recordedAt', { unique: false });
          fbStore.createIndex('sessionId', 'sessionId', { unique: false });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  private async getKv<T>(key: string): Promise<T | null> {
    try {
      const db = await this.openDb();
      return await new Promise<T | null>((resolve, reject) => {
        const tx = db.transaction(STORE_KV, 'readonly');
        const req = tx.objectStore(STORE_KV).get(key);
        req.onsuccess = () => resolve(req.result ? (req.result.value as T) : null);
        req.onerror = () => reject(req.error);
      });
    } catch {
      try {
        const raw = localStorage.getItem(`sleepycam_${key}`);
        return raw ? (JSON.parse(raw) as T) : null;
      } catch {
        return null;
      }
    }
  }

  private async setKv<T>(key: string, value: T): Promise<void> {
    try {
      localStorage.setItem(`sleepycam_${key}`, JSON.stringify(value));
    } catch {
      // Ignore quota errors
    }
    try {
      const db = await this.openDb();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_KV, 'readwrite');
        tx.objectStore(STORE_KV).put({ key, value });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      // Fallback already persisted in localStorage
    }
  }

  private async deleteKv(key: string): Promise<void> {
    try {
      localStorage.removeItem(`sleepycam_${key}`);
    } catch {}
    try {
      const db = await this.openDb();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_KV, 'readwrite');
        tx.objectStore(STORE_KV).delete(key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {}
  }

  public async getSettings(): Promise<AppSettings> {
    const stored = await this.getKv<Partial<AppSettings>>('settings');
    return { ...DEFAULT_APP_SETTINGS, ...(stored || {}) };
  }

  public async saveSettings(settings: AppSettings): Promise<void> {
    await this.setKv('settings', settings);
    try {
      localStorage.setItem('sleepycam_theme', settings.theme);
    } catch {}
  }

  public async getCalibration(): Promise<BaselineData> {
    const stored = await this.getKv<BaselineData>('calibration');
    if (stored) return stored;

    // Seamless migration from legacy keys if present
    try {
      const legacy =
        localStorage.getItem('sleepycam_baseline') ||
        localStorage.getItem('sleepycam_baseline_v2');
      if (legacy) {
        const parsed = JSON.parse(legacy) as BaselineData;
        await this.setKv('calibration', parsed);
        return parsed;
      }
    } catch {}

    return { ...DEFAULT_BASELINE_DATA };
  }

  public async saveCalibration(baseline: BaselineData): Promise<void> {
    await this.setKv('calibration', baseline);
  }

  public async clearCalibration(): Promise<BaselineData> {
    const fresh = { ...DEFAULT_BASELINE_DATA };
    await this.deleteKv('calibration');
    try {
      localStorage.removeItem('sleepycam_baseline');
      localStorage.removeItem('sleepycam_baseline_v2');
    } catch {}
    return fresh;
  }

  public async getKssRating(): Promise<KssRating | null> {
    return await this.getKv<KssRating>('kss');
  }

  public async saveKssRating(rating: KssRating): Promise<void> {
    await this.setKv('kss', rating);
  }

  public async getAudioConfig(): Promise<AudioAlertConfig> {
    const stored = await this.getKv<Partial<AudioAlertConfig>>('audio_config');
    return { ...DEFAULT_AUDIO_CONFIG, ...(stored || {}) };
  }

  public async saveAudioConfig(config: AudioAlertConfig): Promise<void> {
    await this.setKv('audio_config', config);
  }

  public async listSessions(): Promise<SavedSessionRecord[]> {
    try {
      const db = await this.openDb();
      const rows = await new Promise<SavedSessionRecord[]>((resolve, reject) => {
        const tx = db.transaction(STORE_SESSIONS, 'readonly');
        const req = tx.objectStore(STORE_SESSIONS).getAll();
        req.onsuccess = () => resolve((req.result as SavedSessionRecord[]) || []);
        req.onerror = () => reject(req.error);
      });
      return rows.sort((a, b) => b.startedAt - a.startedAt);
    } catch {
      return [];
    }
  }

  public async saveSession(record: SavedSessionRecord): Promise<void> {
    try {
      const db = await this.openDb();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_SESSIONS, 'readwrite');
        tx.objectStore(STORE_SESSIONS).put(record);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      // Ignore if IndexedDB blocked
    }
  }

  public async deleteSession(id: string): Promise<void> {
    try {
      const db = await this.openDb();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_SESSIONS, 'readwrite');
        tx.objectStore(STORE_SESSIONS).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {}
  }

  public async clearAllSessions(): Promise<void> {
    try {
      const db = await this.openDb();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_SESSIONS, 'readwrite');
        tx.objectStore(STORE_SESSIONS).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {}
  }

  public async listFeedback(): Promise<AssessmentFeedbackRecord[]> {
    try {
      const db = await this.openDb();
      const rows = await new Promise<AssessmentFeedbackRecord[]>((resolve, reject) => {
        const tx = db.transaction(STORE_FEEDBACK, 'readonly');
        const req = tx.objectStore(STORE_FEEDBACK).getAll();
        req.onsuccess = () => resolve((req.result as AssessmentFeedbackRecord[]) || []);
        req.onerror = () => reject(req.error);
      });
      if (rows.length > 0) {
        return rows.sort((a, b) => b.recordedAt - a.recordedAt);
      }
    } catch {
      // Fall back to localStorage below
    }

    try {
      const raw = localStorage.getItem(LS_FEEDBACK_KEY);
      const parsed = raw ? (JSON.parse(raw) as AssessmentFeedbackRecord[]) : [];
      return parsed.sort((a, b) => b.recordedAt - a.recordedAt);
    } catch {
      return [];
    }
  }

  public async saveFeedback(record: AssessmentFeedbackRecord): Promise<void> {
    try {
      const raw = localStorage.getItem(LS_FEEDBACK_KEY);
      const existing = raw ? (JSON.parse(raw) as AssessmentFeedbackRecord[]) : [];
      const next = [record, ...existing.filter((r) => r.id !== record.id)];
      localStorage.setItem(LS_FEEDBACK_KEY, JSON.stringify(next));
    } catch {
      // Ignore localStorage quota errors
    }

    try {
      const db = await this.openDb();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_FEEDBACK, 'readwrite');
        tx.objectStore(STORE_FEEDBACK).put(record);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      // Fallback already persisted in localStorage
    }
  }

  public async deleteFeedback(id: string): Promise<void> {
    try {
      const raw = localStorage.getItem(LS_FEEDBACK_KEY);
      if (raw) {
        const existing = JSON.parse(raw) as AssessmentFeedbackRecord[];
        localStorage.setItem(
          LS_FEEDBACK_KEY,
          JSON.stringify(existing.filter((r) => r.id !== id))
        );
      }
    } catch {}

    try {
      const db = await this.openDb();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_FEEDBACK, 'readwrite');
        tx.objectStore(STORE_FEEDBACK).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {}
  }

  public async clearAllFeedback(): Promise<void> {
    try {
      localStorage.removeItem(LS_FEEDBACK_KEY);
    } catch {}

    try {
      const db = await this.openDb();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_FEEDBACK, 'readwrite');
        tx.objectStore(STORE_FEEDBACK).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {}
  }

  public async exportAllDataJson(): Promise<string> {
    const [settings, calibration, kss, audioConfig, sessions, feedbackRecords] = await Promise.all([
      this.getSettings(),
      this.getCalibration(),
      this.getKssRating(),
      this.getAudioConfig(),
      this.listSessions(),
      this.listFeedback()
    ]);

    return JSON.stringify(
      {
        application: 'SleepyCam AI',
        schemaVersion: '2.1.0',
        exportedAt: new Date().toISOString(),
        privacyNote: '100% local data export; contains no raw camera frames or video recordings.',
        settings,
        calibration,
        lastKssRating: kss,
        audioConfig,
        sessions,
        feedbackRecords
      },
      null,
      2
    );
  }

  public async deleteAllLocalData(): Promise<void> {
    await Promise.all([
      this.clearAllSessions(),
      this.clearAllFeedback(),
      this.clearCalibration(),
      this.deleteKv('settings'),
      this.deleteKv('kss'),
      this.deleteKv('audio_config')
    ]);
    try {
      localStorage.removeItem('sleepycam_theme');
      localStorage.removeItem('sleepycam_audio_alert_config');
    } catch {}
  }
}

export const storageService = new StorageServiceClass();
