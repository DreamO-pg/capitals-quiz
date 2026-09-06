/**
 * Минимальные типы Telegram WebApp — только то, что игра действительно трогает.
 * Официальных типов нет, SDK подключён скриптом, поэтому описываем сами.
 */

export type HapticNotification = 'error' | 'success' | 'warning';
export type HapticImpact = 'light' | 'medium' | 'heavy' | 'rigid' | 'soft';

export type HomeScreenStatus = 'unsupported' | 'unknown' | 'added' | 'missed';

export interface TelegramBackButton {
  isVisible: boolean;
  show(): void;
  hide(): void;
  onClick(cb: () => void): void;
  offClick(cb: () => void): void;
}

export interface TelegramHaptic {
  impactOccurred(style: HapticImpact): void;
  notificationOccurred(type: HapticNotification): void;
  selectionChanged(): void;
}

/** Все методы асинхронные и колбэчные — наружу отдаём промисы. */
export interface TelegramCloudStorage {
  setItem(key: string, value: string, cb?: (err: string | null, ok?: boolean) => void): void;
  getItem(key: string, cb: (err: string | null, value?: string) => void): void;
  getItems(keys: string[], cb: (err: string | null, values?: Record<string, string>) => void): void;
  removeItem(key: string, cb?: (err: string | null, ok?: boolean) => void): void;
  removeItems(keys: string[], cb?: (err: string | null, ok?: boolean) => void): void;
  getKeys(cb: (err: string | null, keys?: string[]) => void): void;
}

export interface TelegramWebApp {
  version: string;
  platform: string;
  colorScheme: 'light' | 'dark';
  viewportHeight: number;
  viewportStableHeight: number;
  isExpanded: boolean;
  isVerticalSwipesEnabled?: boolean;
  safeAreaInset?: { top: number; bottom: number; left: number; right: number };
  contentSafeAreaInset?: { top: number; bottom: number; left: number; right: number };

  ready(): void;
  expand(): void;
  close(): void;
  isVersionAtLeast(version: string): boolean;

  setHeaderColor(color: string): void;
  setBackgroundColor(color: string): void;
  setBottomBarColor?(color: string): void;

  enableVerticalSwipes?(): void;
  disableVerticalSwipes?(): void;
  enableClosingConfirmation?(): void;

  onEvent(event: string, cb: (...args: unknown[]) => void): void;
  offEvent(event: string, cb: (...args: unknown[]) => void): void;

  checkHomeScreenStatus?(cb: (status: HomeScreenStatus) => void): void;
  addToHomeScreen?(): void;

  BackButton: TelegramBackButton;
  HapticFeedback: TelegramHaptic;
  CloudStorage: TelegramCloudStorage;
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}
