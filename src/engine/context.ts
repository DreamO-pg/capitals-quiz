import type { Country } from '../types';

/**
 * Строка под картой: где это и с кем граничит.
 * «Западная Европа · единственный сосед — Испания»
 *
 * Море называем только у стран без сухопутных соседей — там оно и есть ответ
 * на вопрос «где это». У материковых стран список соседей говорит больше.
 */
export function contextLine(country: Country): string {
  const parts: string[] = [];
  if (country.subregionRu) parts.push(country.subregionRu);

  const n = country.neighborsRu;
  if (n.length === 0) {
    if (country.seaRu) parts.push(country.seaRu);
    else parts.push('без сухопутных соседей');
  } else if (n.length === 1) {
    parts.push(`единственный сосед — ${n[0]}`);
  } else if (n.length <= 3) {
    parts.push(`соседи — ${n.join(', ')}`);
  } else {
    parts.push(`${n.length} ${plural(n.length)}, среди них ${n.slice(0, 2).join(' и ')}`);
  }

  return parts.join(' · ');
}

/** Стран с 22+ соседями не бывает, поэтому хватает двух форм. */
function plural(n: number): string {
  return n >= 2 && n <= 4 ? 'соседа' : 'соседей';
}
