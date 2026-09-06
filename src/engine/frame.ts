import type { Country } from '../types';

export type Bbox = [number, number, number, number];

/**
 * Насколько раздвигаем рамку страны. Смысл всей карты в том, чтобы страна была
 * видна в окружении: показали Минск — рядом должны оказаться Польша, Литва,
 * Украина и Россия. Плотно по границам страна висит в пустоте и ничего не объясняет.
 */
const EXPAND = 2.2;

/**
 * Предел поля вокруг страны, в градусах.
 *
 * Без него правило 2.2× ломается на гигантах: Россия тянется на 153° долготы,
 * и умножение давало кадр в 336° — планета целиком, да ещё и с запасом.
 * Странам такого размера соседей показывать не нужно, они и так на виду.
 * До двадцати градусов размаха ограничение не срабатывает вовсе, и правило
 * остаётся ровно тем, что задумано.
 */
const MAX_MARGIN = 12;

/**
 * Меньше этого кадр становится планом города. У Ватикана собственная рамка —
 * полтора километра, и без нижней границы карта показала бы улицы вместо Рима.
 */
const MIN_SPAN = 1.6;

export function frameFor(country: Country): Bbox {
  const [minLon, minLat, maxLon, maxLat] = country.bbox;
  const centerLon = (minLon + maxLon) / 2;
  const centerLat = (minLat + maxLat) / 2;

  const halfLon = half(maxLon - minLon);
  const halfLat = half(maxLat - minLat);

  return [
    centerLon - halfLon,
    Math.max(-85, centerLat - halfLat),
    centerLon + halfLon,
    Math.min(85, centerLat + halfLat),
  ];
}

export function inFrame(frame: Bbox, lat: number, lon: number): boolean {
  // Рамки стран через антимеридиан живут в сдвинутых долготах (Россия, Фиджи).
  const l = lon < frame[0] && frame[2] > 180 ? lon + 360 : lon;
  return l >= frame[0] && l <= frame[2] && lat >= frame[1] && lat <= frame[3];
}

/** Половина итогового размаха по одной оси. */
function half(span: number): number {
  const margin = Math.min((span * (EXPAND - 1)) / 2, MAX_MARGIN);
  return Math.max(span / 2 + margin, MIN_SPAN / 2);
}

/** Пересекается ли рамка страны с кадром — нужно, чтобы понять, кого рисовать вокруг. */
export function overlaps(frame: Bbox, bbox: Bbox): boolean {
  const shift = frame[2] > 180 && bbox[2] < frame[0];
  const minLon = shift ? bbox[0] + 360 : bbox[0];
  const maxLon = shift ? bbox[2] + 360 : bbox[2];
  return !(maxLon < frame[0] || minLon > frame[2] || bbox[3] < frame[1] || bbox[1] > frame[3]);
}
