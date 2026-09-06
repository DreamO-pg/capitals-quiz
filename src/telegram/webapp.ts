import { colors } from '../theme/colors';
import type {
  HapticImpact,
  HapticNotification,
  HomeScreenStatus,
  TelegramWebApp,
} from './types';

/**
 * Единственная точка входа в Telegram WebApp.
 *
 * Правило: наружу отсюда не торчит ни одного места, где отсутствие телеграма
 * ломает игру. Нет window.Telegram.WebApp — работаем в браузере: хранилище
 * localStorage, тактильного отклика нет, BackButton — no-op.
 */

const app: TelegramWebApp | undefined =
  typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined;

/**
 * Скрипт telegram-web-app.js подсовывает заглушку WebApp и в обычном браузере:
 * там platform === 'unknown' и version === '6.0'. Считать это телеграмом нельзя —
 * иначе покажем строку «добавить на экран Домой» там, где её некуда добавлять.
 */
export const isTelegram = Boolean(app) && app!.platform !== 'unknown';

/** Проглатываем WebAppMethodUnsupported на старых клиентах. */
function attempt(label: string, fn: () => void): boolean {
  try {
    fn();
    return true;
  } catch (err) {
    if (import.meta.env.DEV) console.warn(`[tg] ${label} недоступен:`, err);
    return false;
  }
}

function supports(version: string): boolean {
  if (!app) return false;
  try {
    return app.isVersionAtLeast(version);
  } catch {
    return false;
  }
}

/**
 * Разворачиваем окно и красим шапку в цвет бумаги.
 * Вызывать один раз на маунте корневого компонента.
 */
export function initWebApp(): void {
  if (!app) {
    document.documentElement.style.setProperty('--tg-viewport-height', `${window.innerHeight}px`);
    return;
  }
  attempt('ready', () => app.ready());
  attempt('expand', () => app.expand());
  // Без этого свайп по списку ответов сворачивает окно телеграма.
  if (supports('7.7')) attempt('disableVerticalSwipes', () => app.disableVerticalSwipes?.());
  attempt('setHeaderColor', () => app.setHeaderColor(colors.bg));
  attempt('setBackgroundColor', () => app.setBackgroundColor(colors.bg));
  if (supports('7.10')) attempt('setBottomBarColor', () => app.setBottomBarColor?.(colors.bg));
}

/* ─────────────────────────── Вьюпорт ─────────────────────────── */

/** Высота, на которую можно верстать: 100vh в телеграме врёт. */
export function getViewportHeight(): number {
  if (app && app.viewportStableHeight > 0) return app.viewportStableHeight;
  return typeof window !== 'undefined' ? window.innerHeight : 0;
}

/** Отступ сверху под шапку телеграма (safe area устройства + контент). */
export function getTopInset(): number {
  if (!app) return 0;
  const safe = app.safeAreaInset?.top ?? 0;
  const content = app.contentSafeAreaInset?.top ?? 0;
  return safe + content;
}

export function getBottomInset(): number {
  return app?.safeAreaInset?.bottom ?? 0;
}

/** Подписка на изменение вьюпорта. Возвращает функцию отписки. */
export function onViewportChange(cb: () => void): () => void {
  if (!app) {
    window.addEventListener('resize', cb);
    return () => window.removeEventListener('resize', cb);
  }
  const handler = () => cb();
  const events = ['viewportChanged', 'safeAreaChanged', 'contentSafeAreaChanged'];
  events.forEach((e) => attempt(`onEvent ${e}`, () => app.onEvent(e, handler)));
  return () => {
    events.forEach((e) => attempt(`offEvent ${e}`, () => app.offEvent(e, handler)));
  };
}

/** Событие перед закрытием мини-приложения — последний шанс сохранить прогресс. */
export function onBeforeClose(cb: () => void): () => void {
  const handler = () => cb();
  if (app) {
    attempt('onEvent', () => app.onEvent('webAppClosed', handler));
  }
  // Работает и в телеграме, и в браузере: телеграм не всегда шлёт webAppClosed.
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', handler);

  function onVisibility() {
    if (document.visibilityState === 'hidden') cb();
  }

  return () => {
    if (app) attempt('offEvent', () => app.offEvent('webAppClosed', handler));
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pagehide', handler);
  };
}

/* ───────────────────────── Кнопка «назад» ───────────────────────── */

/**
 * Показывает системную кнопку «назад» и вешает обработчик.
 * Свою стрелку не рисуем — этим занимается телеграм.
 */
export function showBackButton(onClick: () => void): () => void {
  if (!app) return () => {};
  const handler = () => onClick();
  attempt('BackButton.onClick', () => app.BackButton.onClick(handler));
  attempt('BackButton.show', () => app.BackButton.show());
  return () => {
    attempt('BackButton.offClick', () => app.BackButton.offClick(handler));
    attempt('BackButton.hide', () => app.BackButton.hide());
  };
}

/* ─────────────────────── Тактильный отклик ─────────────────────── */

export const haptic = {
  success(): void {
    attempt('haptic.success', () => app?.HapticFeedback.notificationOccurred('success'));
  },
  error(): void {
    attempt('haptic.error', () => app?.HapticFeedback.notificationOccurred('error'));
  },
  notify(type: HapticNotification): void {
    attempt('haptic.notify', () => app?.HapticFeedback.notificationOccurred(type));
  },
  /** На переключении чипов и сегментов. */
  selection(): void {
    attempt('haptic.selection', () => app?.HapticFeedback.selectionChanged());
  },
  impact(style: HapticImpact = 'light'): void {
    attempt('haptic.impact', () => app?.HapticFeedback.impactOccurred(style));
  },
};

/* ───────────────────────── Хранилище ───────────────────────── */

const LS_PREFIX = 'capitals:';

/**
 * CloudStorage телеграма, а вне телеграма — localStorage.
 * Один интерфейс, всё в промисах: колбэчный API наружу не протекает.
 */
export const storage = {
  async get(key: string): Promise<string | null> {
    if (!app || !supports('6.9')) return lsGet(key);
    return new Promise((resolve) => {
      try {
        app.CloudStorage.getItem(key, (err, value) => {
          if (err) {
            if (import.meta.env.DEV) console.warn('[tg] CloudStorage.getItem:', err);
            resolve(lsGet(key));
          } else {
            resolve(value ? value : null);
          }
        });
      } catch {
        resolve(lsGet(key));
      }
    });
  },

  async getMany(keys: string[]): Promise<Record<string, string | null>> {
    if (keys.length === 0) return {};
    if (!app || !supports('6.9')) {
      return Object.fromEntries(keys.map((k) => [k, lsGet(k)]));
    }
    return new Promise((resolve) => {
      try {
        app.CloudStorage.getItems(keys, (err, values) => {
          if (err || !values) {
            if (import.meta.env.DEV) console.warn('[tg] CloudStorage.getItems:', err);
            resolve(Object.fromEntries(keys.map((k) => [k, lsGet(k)])));
          } else {
            resolve(Object.fromEntries(keys.map((k) => [k, values[k] || null])));
          }
        });
      } catch {
        resolve(Object.fromEntries(keys.map((k) => [k, lsGet(k)])));
      }
    });
  },

  async set(key: string, value: string): Promise<boolean> {
    // Пишем всегда и в локальное хранилище: оно переживёт офлайн и даёт
    // мгновенное чтение на старте, пока облако ещё отвечает.
    lsSet(key, value);
    if (!app || !supports('6.9')) return true;
    return new Promise((resolve) => {
      try {
        app.CloudStorage.setItem(key, value, (err, ok) => {
          if (err && import.meta.env.DEV) console.warn('[tg] CloudStorage.setItem:', err);
          resolve(!err && ok !== false);
        });
      } catch {
        resolve(false);
      }
    });
  },

  async remove(key: string): Promise<void> {
    lsRemove(key);
    if (!app || !supports('6.9')) return;
    return new Promise((resolve) => {
      try {
        app.CloudStorage.removeItem(key, () => resolve());
      } catch {
        resolve();
      }
    });
  },
};

function lsGet(key: string): string | null {
  try {
    return localStorage.getItem(LS_PREFIX + key);
  } catch {
    return null;
  }
}

function lsSet(key: string, value: string): void {
  try {
    localStorage.setItem(LS_PREFIX + key, value);
  } catch {
    /* приватный режим — просто теряем локальную копию */
  }
}

function lsRemove(key: string): void {
  try {
    localStorage.removeItem(LS_PREFIX + key);
  } catch {
    /* ignore */
  }
}

/* ─────────────────── Добавление на домашний экран ─────────────────── */

/** 'unsupported' — метода нет вообще, строку на главной просто не показываем. */
export async function checkHomeScreen(): Promise<HomeScreenStatus> {
  if (!app || !supports('8.0') || typeof app.checkHomeScreenStatus !== 'function') {
    return 'unsupported';
  }
  return new Promise((resolve) => {
    let settled = false;
    const done = (s: HomeScreenStatus) => {
      if (!settled) {
        settled = true;
        resolve(s);
      }
    };
    // Клиент может не ответить вовсе — не висим на промисе бесконечно.
    const timer = setTimeout(() => done('unsupported'), 2500);
    try {
      app.checkHomeScreenStatus?.((status) => {
        clearTimeout(timer);
        done(status);
      });
    } catch {
      clearTimeout(timer);
      done('unsupported');
    }
  });
}

export function addToHomeScreen(): void {
  attempt('addToHomeScreen', () => app?.addToHomeScreen?.());
}

export const platform = app?.platform ?? 'browser';
export const version = app?.version ?? '0.0';
