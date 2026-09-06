/** Общие типы игры. Данные стран приедут на этапе 2. */

export type Region = 'europe' | 'asia' | 'africa' | 'americas' | 'oceania';

export const REGION_LABEL: Record<Region | 'world', string> = {
  world: 'Весь мир',
  europe: 'Европа',
  asia: 'Азия',
  africa: 'Африка',
  americas: 'Америка',
  oceania: 'Океания',
};

export type RegionFilter = Region | 'world';

export type Tier = 'easy' | 'medium' | 'hard';

export type Mode =
  | 'country_to_capital'
  | 'capital_to_country'
  | 'flag_to_country'
  | 'country_to_map';

export const MODE_LABEL: Record<Mode, string> = {
  country_to_capital: 'Страна → столица',
  capital_to_country: 'Столица → страна',
  flag_to_country: 'Флаг → страна',
  country_to_map: 'Страна → на карте',
};

export type Difficulty = 'easy' | 'all';

export interface Country {
  code: string; // ISO 3166-1 alpha-2, "PT"
  nameRu: string; // "Португалия"
  nameEn: string; // "Portugal"
  capitalRu: string; // "Лиссабон"
  capitalEn: string; // "Lisbon"
  capitalLat: number; // 38.7223
  capitalLon: number; // -9.1393
  bbox: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
  neighborsRu: string[]; // сухопутные соседи
  seaRu?: string; // "Атлантический океан"
  region: Region;
  /** Подрегион по-русски: «Западная Европа». Идёт в строку контекста под картой. */
  subregionRu: string;
  tier: Tier;
  note?: string; // "Парламент заседает в Гааге, но столица — Амстердам"
}

export interface Settings {
  mode: Mode;
  region: RegionFilter;
  difficulty: Difficulty;
}

export const DEFAULT_SETTINGS: Settings = {
  mode: 'country_to_capital',
  region: 'world',
  difficulty: 'easy',
};

/** Экраны переключаются одним состоянием: это одно окно, а не сайт. */
export type Screen = 'home' | 'question' | 'answer' | 'result' | 'stats';
