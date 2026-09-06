import type { Mode, RegionFilter, Settings } from '../types';
import { DEFAULT_SETTINGS } from '../types';
import type { Progress, RoundRecord, Stats } from './model';
import { emptyStats } from './model';

/**
 * CloudStorage — это ключ-значение: значение до 4096 символов. Поэтому всё пишется
 * строками без JSON: у JSON на 195 стран уходит втрое больше места на одни кавычки.
 *
 * progress: `PT:3:0:1738;ES:5:1:1737` — код : коробка : ошибки : день последнего показа
 * stats:    `1|ответы|верно|серия|деньИгры|регионы|раунды`
 * settings: `c|w|e` — режим | регион | сложность
 */

export const MAX_VALUE_LENGTH = 4096;
/** Запас до лимита: за ним прогресс шардируется по регионам. */
export const SHARD_THRESHOLD = 3800;

/* ─────────────────────────── progress ─────────────────────────── */

export function encodeProgress(progress: Progress): string {
  const parts: string[] = [];
  for (const [code, c] of progress) {
    parts.push(`${code}:${c.box}:${c.errors}:${c.lastDay}`);
  }
  return parts.join(';');
}

export function decodeProgress(raw: string | null): Progress {
  const progress: Progress = new Map();
  if (!raw) return progress;
  for (const part of raw.split(';')) {
    if (!part) continue;
    const [code, box, errors, lastDay] = part.split(':');
    const b = Number(box);
    const e = Number(errors);
    const d = Number(lastDay);
    // Битую запись молча пропускаем: лучше потерять одну страну, чем весь прогресс.
    if (!code || !Number.isFinite(b) || !Number.isFinite(e) || !Number.isFinite(d)) continue;
    progress.set(code, {
      box: Math.min(5, Math.max(1, Math.round(b))),
      errors: Math.max(0, Math.round(e)),
      lastDay: Math.round(d),
    });
  }
  return progress;
}

/* ─────────────────────────── settings ─────────────────────────── */

const MODE_CODE: Record<Mode, string> = {
  country_to_capital: 'c',
  capital_to_country: 'a',
  flag_to_country: 'f',
  country_to_map: 'm',
};
const MODE_BY_CODE = invert(MODE_CODE) as Record<string, Mode>;

const REGION_CODE: Record<RegionFilter, string> = {
  world: 'w',
  europe: 'e',
  asia: 'a',
  africa: 'f',
  americas: 'm',
  oceania: 'o',
};
const REGION_BY_CODE = invert(REGION_CODE) as Record<string, RegionFilter>;

function invert(map: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(map).map(([k, v]) => [v, k]));
}

export function encodeSettings(s: Settings): string {
  return `${MODE_CODE[s.mode]}|${REGION_CODE[s.region]}|${s.difficulty === 'easy' ? 'e' : 'a'}`;
}

export function decodeSettings(raw: string | null): Settings {
  if (!raw) return { ...DEFAULT_SETTINGS };
  const [m, r, d] = raw.split('|');
  return {
    mode: MODE_BY_CODE[m] ?? DEFAULT_SETTINGS.mode,
    region: REGION_BY_CODE[r] ?? DEFAULT_SETTINGS.region,
    difficulty: d === 'a' ? 'all' : 'easy',
  };
}

/* ─────────────────────────── stats ─────────────────────────── */

const STATS_VERSION = '1';
/** Больше двадцати раундов не храним: это и лимит значения, и предел полезности. */
export const MAX_ROUNDS = 20;

export function encodeStats(s: Stats): string {
  const regions = Object.entries(s.byRegion)
    .map(([r, v]) => `${REGION_CODE[r as RegionFilter] ?? r}:${v.correct}/${v.total}`)
    .join(',');
  const rounds = s.rounds
    .slice(-MAX_ROUNDS)
    .map((r) => `${r.day}.${MODE_CODE[r.mode]}.${REGION_CODE[r.region]}.${r.correct}.${r.total}`)
    .join(',');
  return [STATS_VERSION, s.answers, s.correct, s.streak, s.lastPlayDay, regions, rounds].join('|');
}

export function decodeStats(raw: string | null): Stats {
  const stats = emptyStats();
  if (!raw) return stats;
  const [version, answers, correct, streak, lastDay, regions, rounds] = raw.split('|');
  if (version !== STATS_VERSION) return stats;

  stats.answers = toInt(answers);
  stats.correct = toInt(correct);
  stats.streak = toInt(streak);
  stats.lastPlayDay = toInt(lastDay);

  for (const part of (regions ?? '').split(',')) {
    if (!part) continue;
    const [code, pair] = part.split(':');
    const [c, t] = (pair ?? '').split('/');
    const region = REGION_BY_CODE[code];
    if (!region) continue;
    stats.byRegion[region] = { correct: toInt(c), total: toInt(t) };
  }

  for (const part of (rounds ?? '').split(',')) {
    if (!part) continue;
    const [day, mode, region, c, t] = part.split('.');
    const m = MODE_BY_CODE[mode];
    const r = REGION_BY_CODE[region];
    if (!m || !r) continue;
    stats.rounds.push({ day: toInt(day), mode: m, region: r, correct: toInt(c), total: toInt(t) });
  }
  return stats;
}

function toInt(v: string | undefined): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

/** Обновляет серию дней: вчера играл — плюс один, пропустил — начинаем заново. */
export function bumpStreak(stats: Stats, day: number): number {
  if (stats.lastPlayDay === day) return stats.streak;
  if (stats.lastPlayDay === day - 1) return stats.streak + 1;
  return 1;
}

export function pushRound(stats: Stats, record: RoundRecord): RoundRecord[] {
  return [...stats.rounds, record].slice(-MAX_ROUNDS);
}
