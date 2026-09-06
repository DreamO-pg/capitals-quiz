import { BY_CODE } from '../data/countries';
import type { Settings } from '../types';
import { storage } from '../telegram/webapp';
import type { Progress, Stats } from './model';
import {
  SHARD_THRESHOLD,
  decodeProgress,
  decodeSettings,
  decodeStats,
  encodeProgress,
  encodeSettings,
  encodeStats,
} from './serialize';

/**
 * Прогресс, статистика и настройки в CloudStorage (в браузере — в localStorage).
 * Пишем не после каждого вопроса, а в конце раунда и перед закрытием окна:
 * CloudStorage ходит по сети, дёргать его на каждый тап незачем.
 */

const KEY_PROGRESS = 'progress';
const KEY_STATS = 'stats';
const KEY_SETTINGS = 'settings';

/** Маркер в основном ключе: прогресс разъехался по регионам. */
const SHARDED = '*';
const REGION_KEYS = ['europe', 'asia', 'africa', 'americas', 'oceania'] as const;
const shardKey = (region: string) => `${KEY_PROGRESS}_${region.slice(0, 2)}`;

export interface Saved {
  progress: Progress;
  stats: Stats;
  settings: Settings;
}

export async function loadAll(): Promise<Saved> {
  const head = await storage.getMany([KEY_PROGRESS, KEY_STATS, KEY_SETTINGS]);

  let progress: Progress;
  if (head[KEY_PROGRESS] === SHARDED) {
    const shards = await storage.getMany(REGION_KEYS.map(shardKey));
    progress = new Map();
    for (const raw of Object.values(shards)) {
      for (const [code, card] of decodeProgress(raw)) progress.set(code, card);
    }
  } else {
    progress = decodeProgress(head[KEY_PROGRESS]);
  }

  return {
    progress,
    stats: decodeStats(head[KEY_STATS]),
    settings: decodeSettings(head[KEY_SETTINGS]),
  };
}

/**
 * 195 стран укладываются примерно в 2000 символов — обычно это один ключ.
 * Если когда-нибудь перестанет влезать в лимит значения, раскладываем по регионам.
 */
export async function saveProgress(progress: Progress): Promise<void> {
  const encoded = encodeProgress(progress);
  if (encoded.length <= SHARD_THRESHOLD) {
    await storage.set(KEY_PROGRESS, encoded);
    return;
  }

  const byRegion = new Map<string, string[]>();
  for (const [code, card] of progress) {
    const region = BY_CODE[code]?.region ?? 'asia';
    const list = byRegion.get(region) ?? [];
    list.push(`${code}:${card.box}:${card.errors}:${card.lastDay}`);
    byRegion.set(region, list);
  }
  await Promise.all(
    REGION_KEYS.map((region) => storage.set(shardKey(region), (byRegion.get(region) ?? []).join(';'))),
  );
  await storage.set(KEY_PROGRESS, SHARDED);
}

export async function saveStats(stats: Stats): Promise<void> {
  await storage.set(KEY_STATS, encodeStats(stats));
}

export async function saveSettings(settings: Settings): Promise<void> {
  await storage.set(KEY_SETTINGS, encodeSettings(settings));
}

export async function saveAll(saved: Saved): Promise<void> {
  await Promise.all([
    saveProgress(saved.progress),
    saveStats(saved.stats),
    saveSettings(saved.settings),
  ]);
}

/** Сбрасывает прогресс и статистику. Настройки переживают сброс — это не прогресс. */
export async function resetAll(): Promise<void> {
  await Promise.all([
    storage.remove(KEY_PROGRESS),
    storage.remove(KEY_STATS),
    ...REGION_KEYS.map((r) => storage.remove(shardKey(r))),
  ]);
}
