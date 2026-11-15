import { AppSettings, CameraDeviceOption, CameraErrorInfo } from '../types';

const RESOLUTION_MAP: Record<AppSettings['resolution'], { width: number; height: number }> = {
  '640x480': { width: 640, height: 480 },
  '1280x720': { width: 1280, height: 720 },
  '1920x1080': { width: 1920, height: 1080 }
};

class CameraServiceClass {
  public async listVideoDevices(): Promise<CameraDeviceOption[]> {
    if (!navigator?.mediaDevices?.enumerateDevices) {
      return [];
    }
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices
        .filter((d) => d.kind === 'videoinput')
        .map((d, index) => ({
          deviceId: d.deviceId,
          label: d.label || `Camera ${index + 1}`
        }));
    } catch {
      return [];
    }
  }

  public async startStream(
    options: {
      deviceId?: string;
      resolution?: AppSettings['resolution'];
      onEnded?: () => void;
    } = {}
  ): Promise<MediaStream> {
    if (!navigator?.mediaDevices?.getUserMedia) {
      throw this.mapError(new Error('NotFoundError'));
    }

    const res = RESOLUTION_MAP[options.resolution || '1280x720'];
    const videoConstraints: MediaTrackConstraints = {
      width: { ideal: res.width },
      height: { ideal: res.height },
      facingMode: 'user'
    };

    if (options.deviceId) {
      videoConstraints.deviceId = { exact: options.deviceId };
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: false
      });

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack && options.onEnded) {
        videoTrack.addEventListener('ended', options.onEnded);
      }
      return stream;
    } catch (err) {
      throw this.mapError(err);
    }
  }

  public stopStream(stream: MediaStream | null): void {
    if (!stream) return;
    stream.getTracks().forEach((track) => {
      try {
        track.stop();
      } catch {}
    });
  }

  public mapError(err: unknown): CameraErrorInfo {
    const rawName =
      err && typeof err === 'object' && 'name' in err
        ? String((err as { name: string }).name)
        : err instanceof Error
        ? err.message
        : String(err);

    if (rawName.includes('NotAllowed') || rawName.includes('PermissionDenied')) {
      return {
        code: 'CAMERA_PERMISSION_DENIED',
        title: 'Camera permission denied',
        message: 'SleepyCam AI needs camera access to observe facial, eye, and mouth indicators locally.',
        guidance:
          'Allow camera access in your browser or OS privacy settings, then click Retry Camera.'
      };
    }

    if (rawName.includes('NotReadable') || rawName.includes('TrackStartError')) {
      return {
        code: 'CAMERA_IN_USE',
        title: 'Camera is busy',
        message: 'Another application or browser tab is currently using the selected webcam.',
        guidance:
          'Close other video calls or camera apps, select another camera if available, and retry.'
      };
    }

    if (rawName.includes('Overconstrained') || rawName.includes('NotFound') || rawName.includes('DevicesNotFound')) {
      return {
        code: 'NO_CAMERA_FOUND',
        title: 'No camera detected',
        message: 'No accessible webcam was found on this device.',
        guidance:
          'Connect a webcam or switch to another camera in Settings, or run Synthetic Preview in Diagnostics.'
      };
    }

    return {
      code: 'CAMERA_DISCONNECTED',
      title: 'Camera disconnected',
      message: 'The active camera stream stopped unexpectedly.',
      guidance: 'Check your camera cable or permissions and click Retry Camera.'
    };
  }
}

export const cameraService = new CameraServiceClass();
