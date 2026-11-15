/**
 * Web Audio Alert Engine
 * =======================
 * Non-blocking, zero-dependency audio synthesizer using standard HTML5 Web Audio API.
 * 
 * Complies with all requirements:
 * - Offline-capable: 100% synthesized in-browser, no external audio files or network requests.
 * - Non-blocking: scheduled asynchronously on AudioContext timeline; zero camera frame stutter.
 * - Short alert sequence: 3 crisp attention-grabbing beeps with smooth gain envelope.
 * - Cooldown enforcement & persistent event interval repeat.
 * - User-controllable: immediate mute support, volume control, and active cancellation on recovery.
 */

import { AudioAlertConfig } from '../types';

export const DEFAULT_AUDIO_CONFIG: AudioAlertConfig = {
  audioEnabled: true,
  volume: 0.8,
  beepDuration: 0.12,
  cooldownSec: 5.0,
  microsleepThresholdSec: 1.5,
  repeatIntervalSec: 3.0
};

const STORAGE_KEY = 'sleepycam_audio_alert_config';

class AudioAlertEngine {
  private ctx: AudioContext | null = null;
  private config: AudioAlertConfig = { ...DEFAULT_AUDIO_CONFIG };
  private lastAlertTimeMs: number = 0;
  private isAlertSequencePlaying: boolean = false;
  private activeOscillators: OscillatorNode[] = [];
  private activeGains: GainNode[] = [];

  constructor() {
    this.loadConfig();
  }

  public getConfig(): AudioAlertConfig {
    return { ...this.config };
  }

  public updateConfig(partial: Partial<AudioAlertConfig>): AudioAlertConfig {
    this.config = { ...this.config, ...partial };
    this.saveConfig();
    return { ...this.config };
  }

  public toggleMute(): boolean {
    this.config.audioEnabled = !this.config.audioEnabled;
    this.saveConfig();
    if (!this.config.audioEnabled) {
      this.stopAlert();
    }
    return this.config.audioEnabled;
  }

  private loadConfig(): void {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.config = { ...DEFAULT_AUDIO_CONFIG, ...parsed };
      }
    } catch (_) {
      this.config = { ...DEFAULT_AUDIO_CONFIG };
    }
  }

  private saveConfig(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config));
    } catch (_) {}
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.ctx = new AudioCtxClass();
      }
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    return this.ctx;
  }

  /**
   * Attempts to play a microsleep alert sequence if not muted and cooldown has elapsed.
   * Returns true if audio alert was actually scheduled/played, false otherwise.
   */
  public triggerMicrosleepAlert(force: boolean = false): boolean {
    if (!this.config.audioEnabled) {
      return false;
    }

    const now = performance.now();
    const cooldownMs = this.config.cooldownSec * 1000;

    if (!force && now - this.lastAlertTimeMs < cooldownMs) {
      return false;
    }

    const ctx = this.getAudioContext();
    if (!ctx) return false;

    this.lastAlertTimeMs = now;
    this.playThreeBeepSequence(ctx);
    return true;
  }

  /**
   * Check if cooldown has expired for repeat alerts during persistent events
   */
  public canRepeatAlert(): boolean {
    if (!this.config.audioEnabled) return false;
    const now = performance.now();
    const repeatMs = this.config.repeatIntervalSec * 1000;
    return now - this.lastAlertTimeMs >= repeatMs;
  }

  /**
   * Synthesizes 3 short, urgent beeps (880Hz, 880Hz, 1046Hz) with smooth fade envelope
   */
  private playThreeBeepSequence(ctx: AudioContext): void {
    this.stopAlert(); // cancel any ongoing sounds first

    const now = ctx.currentTime;
    const beepDur = Math.max(0.06, Math.min(0.25, this.config.beepDuration));
    const pauseDur = 0.08;
    const frequencies = [880, 880, 1046]; // A5, A5, C6 (clear alert pattern)
    const masterVolume = Math.max(0.0, Math.min(1.0, this.config.volume));

    this.isAlertSequencePlaying = true;

    frequencies.forEach((freq, idx) => {
      const startTime = now + idx * (beepDur + pauseDur);
      const stopTime = startTime + beepDur;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      // Envelope: Fast attack (0.01s) and decay to prevent audible pop/click
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.exponentialRampToValueAtTime(masterVolume, startTime + 0.015);
      gain.gain.setValueAtTime(masterVolume, stopTime - 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, stopTime);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(stopTime);

      this.activeOscillators.push(osc);
      this.activeGains.push(gain);

      osc.onended = () => {
        if (idx === frequencies.length - 1) {
          this.isAlertSequencePlaying = false;
        }
      };
    });
  }

  /**
   * Immediately stops any currently sounding alert (e.g. upon user recovery or mute toggle)
   */
  public stopAlert(): void {
    try {
      this.activeOscillators.forEach((osc) => {
        try {
          osc.stop();
          osc.disconnect();
        } catch (_) {}
      });
      this.activeGains.forEach((g) => {
        try {
          g.disconnect();
        } catch (_) {}
      });
    } catch (_) {}

    this.activeOscillators = [];
    this.activeGains = [];
    this.isAlertSequencePlaying = false;
  }
}

export const audioAlert = new AudioAlertEngine();
