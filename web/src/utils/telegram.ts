export interface TelegramWebApp {
  initData?: string;
  colorScheme?: 'light' | 'dark';
  ready: () => void;
  expand: () => void;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  openLink?: (url: string) => void;
  openTelegramLink?: (url: string) => void;
  BackButton?: {
    show: () => void;
    hide: () => void;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
  };
  HapticFeedback?: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    selectionChanged: () => void;
  };
  onEvent?: (eventType: string, cb: () => void) => void;
  offEvent?: (eventType: string, cb: () => void) => void;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
  }
}

export function getTgWebApp(): TelegramWebApp | undefined {
  return window.Telegram?.WebApp;
}

export function initTelegramApp(): void {
  const tg = getTgWebApp();
  if (!tg) return;
  try {
    tg.ready();
    tg.expand();
  } catch {
    // ignore outside Telegram
  }
}

export function syncTelegramChrome(isDark: boolean): void {
  const bg = isDark ? '#0D1117' : '#F6F8FC';
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', bg);

  const tg = getTgWebApp();
  if (!tg) return;
  try {
    tg.setHeaderColor?.(bg);
    tg.setBackgroundColor?.(bg);
  } catch {
    // ignore on older Telegram clients
  }
}

export function hapticLight(): void {
  try {
    getTgWebApp()?.HapticFeedback?.impactOccurred('light');
  } catch {
    // ignore
  }
}

export function openExternalUrl(url: string): void {
  const tg = getTgWebApp();
  if (tg) {
    try {
      if (url.startsWith('https://t.me/')) {
        tg.openTelegramLink?.(url);
        return;
      }
      tg.openLink?.(url);
      return;
    } catch {
      // fallback to window.open
    }
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}
