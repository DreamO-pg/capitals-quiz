import type { Country, Mode, RegionFilter, Settings, Tier } from '../types';

/** День с эпохи. Всё расписание Лейтнера живёт в этих числах — они компактны в хранилище. */
export function today(): number {
  return Math.floor(Date.now() / 86_400_000);
}

/** Что мы знаем про страну: коробка Лейтнера, накопленные ошибки, когда показывали. */
export interface CardState {
  box: number; // 1–5
  errors: number;
  lastDay: number;
}

export type Progress = Map<string, CardState>;

export interface RoundRecord {
  day: number;
  mode: Mode;
  region: RegionFilter;
  correct: number;
  total: number;
}

export interface Stats {
  answers: number;
  correct: number;
  /** Серия дней подряд с игрой. */
  streak: number;
  lastPlayDay: number;
  /** Правильно/всего по регионам — для экрана статистики. */
  byRegion: Record<string, { correct: number; total: number }>;
  /** Последние 20 раундов, новые в конце. */
  rounds: RoundRecord[];
}

export function emptyStats(): Stats {
  return { answers: 0, correct: 0, streak: 0, lastPlayDay: 0, byRegion: {}, rounds: [] };
}

/** Вопрос: что показываем, какие варианты, какой из них верный. */
export interface Question {
  mode: Mode;
  country: Country;
  /** Тексты вариантов в порядке показа. */
  options: string[];
  /** Страны, стоящие за вариантами — нужны флагам и разбору ошибок. */
  optionCountries: Country[];
  correctIndex: number;
  /** Повтор после ошибки внутри этого же раунда. */
  isRetry: boolean;
}

export interface Answer {
  question: Question;
  chosenIndex: number;
  correct: boolean;
}

export const TIERS: Tier[] = ['easy', 'medium', 'hard'];

export const DEFAULT_ROUND_SIZE = 10;

export function isSettings(v: unknown): v is Settings {
  if (!v || typeof v !== 'object') return false;
  const s = v as Settings;
  return Boolean(s.mode && s.region && s.difficulty);
}
