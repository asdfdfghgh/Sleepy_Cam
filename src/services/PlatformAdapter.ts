export type RuntimePlatform = 'web' | 'pwa' | 'tauri-desktop';

class PlatformAdapterClass {
  public isTauriDesktop(): boolean {
    if (typeof window === 'undefined') return false;
    return '__TAURI_INTERNALS__' in window || '__TAURI__' in window;
  }

  public isStandalonePwa(): boolean {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
    );
  }

  public getPlatform(): RuntimePlatform {
    if (this.isTauriDesktop()) return 'tauri-desktop';
    if (this.isStandalonePwa()) return 'pwa';
    return 'web';
  }

  public getPlatformLabel(): string {
    const platform = this.getPlatform();
    if (platform === 'tauri-desktop') return 'Desktop App';
    if (platform === 'pwa') return 'Installed Web App';
    return 'Web Browser';
  }

  public canNotify(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  public getNotificationPermission(): NotificationPermission | 'unsupported' {
    if (!this.canNotify()) return 'unsupported';
    return Notification.permission;
  }

  public async requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
    if (!this.canNotify()) return 'unsupported';
    try {
      return await Notification.requestPermission();
    } catch {
      return Notification.permission;
    }
  }

  public sendNotification(title: string, body: string): boolean {
    if (!this.canNotify() || Notification.permission !== 'granted') {
      return false;
    }
    try {
      new Notification(title, {
        body,
        icon: '/pwa-192x192.png',
        tag: 'sleepycam-alert'
      });
      return true;
    } catch {
      return false;
    }
  }
}

export const platformAdapter = new PlatformAdapterClass();
