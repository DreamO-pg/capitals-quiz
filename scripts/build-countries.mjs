/**
 * Собирает src/data/countries.ts из открытых данных. Запускать вручную:
 *
 *   node scripts/build-countries.mjs
 *
 * Источники (все без ключей и регистрации):
 *   mledoze/countries  — названия ru/en, сухопутные границы, регион, членство в ООН
 *   Wikidata SPARQL    — русские названия столиц и координаты
 *   Natural Earth 10m  — bbox страны
 *
 * Редакторские решения (спорные столицы, сложность, моря, пояснения) — в curation.mjs.
 * Скачанное кешируется в .cache/, чтобы не дёргать сеть на каждый прогон.
 */

import { copyFile, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CAPITAL_CHOICE,
  CAPITAL_EN_OVERRIDE,
  CAPITAL_RU_OVERRIDE,
  EASY,
  EN_NAME_OVERRIDE,
  HARD,
  NOTES,
  RU_NAME_OVERRIDE,
  SEA,
  SUBREGION_RU,
} from './curation.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = join(ROOT, '.cache');
const OUT = join(ROOT, 'src/data/countries.ts');
const FLAGS_OUT = join(ROOT, 'src/assets/flags');
const FLAGS_SRC = join(ROOT, 'node_modules/country-flag-icons/3x2');

const MLEDOZE = 'https://raw.githubusercontent.com/mledoze/countries/master/countries.json';
const NATURAL_EARTH =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_countries.geojson';
const SPARQL = 'https://query.wikidata.org/sparql';

/** Ватикан и Палестина — не члены ООН, но в игре нужны. */
const EXTRA = ['VA', 'PS'];

const REGION_BY_SOURCE = {
  Europe: 'europe',
  Asia: 'asia',
  Africa: 'africa',
  Americas: 'americas',
  Oceania: 'oceania',
};

const warnings = [];
const warn = (msg) => warnings.push(msg);

async function cached(name, url) {
  await mkdir(CACHE, { recursive: true });
  const file = join(CACHE, name);
  if (existsSync(file)) return readFile(file, 'utf8');
  process.stderr.write(`скачиваю ${name}…\n`);
  const res = await fetch(url, { headers: { 'User-Agent': 'capitals-quiz/0.1' } });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  const text = await res.text();
  await writeFile(file, text);
  return text;
}

/* ─────────────────────────── Wikidata ─────────────────────────── */

async function fetchCapitals(codes) {
  const rows = [];
  // Запрос по 60 кодов за раз: длинный VALUES упирается в таймаут сервиса.
  for (let i = 0; i < codes.length; i += 60) {
    const chunk = codes.slice(i, i + 60);
    const values = chunk.map((c) => `"${c}"`).join(' ');
    const query = `
      SELECT ?iso2 ?capitalEn ?capitalRu ?coord ?rank ?end WHERE {
        VALUES ?iso2 { ${values} }
        ?country wdt:P297 ?iso2 .
        ?country p:P36 ?st .
        ?st ps:P36 ?cap .
        ?st wikibase:rank ?rank .
        OPTIONAL { ?st pq:P582 ?end }
        OPTIONAL { ?cap wdt:P625 ?coord }
        ?cap rdfs:label ?capitalRu . FILTER(lang(?capitalRu)="ru")
        OPTIONAL { ?cap rdfs:label ?capitalEn . FILTER(lang(?capitalEn)="en") }
      }`;
    const cacheName = `wd_${i}.json`;
    const file = join(CACHE, cacheName);
    let text;
    if (existsSync(file)) {
      text = await readFile(file, 'utf8');
    } else {
      process.stderr.write(`Wikidata: страны ${i}–${i + chunk.length}…\n`);
      const res = await fetch(`${SPARQL}?query=${encodeURIComponent(query)}`, {
        headers: { Accept: 'application/sparql-results+json', 'User-Agent': 'capitals-quiz/0.1' },
      });
      if (!res.ok) throw new Error(`Wikidata → ${res.status}`);
      text = await res.text();
      await writeFile(file, text);
    }
    for (const b of JSON.parse(text).results.bindings) {
      const m = /Point\(([-\d.eE]+) ([-\d.eE]+)\)/.exec(b.coord?.value ?? '');
      rows.push({
        iso2: b.iso2.value,
        // У части городов (Сент-Джонс) в Wikidata нет английского ярлыка —
        // подставим название из mledoze при выборе столицы.
        en: b.capitalEn?.value ?? null,
        ru: b.capitalRu.value,
        lon: m ? Number(m[1]) : null,
        lat: m ? Number(m[2]) : null,
        rank: b.rank.value.split('#')[1],
        ended: Boolean(b.end),
      });
    }
  }
  return rows;
}

/** Из нескольких столиц выбираем одну: сначала курация, потом источник, потом ранг. */
function pickCapital(iso2, rows, sourceCapital) {
  const all = rows.filter((r) => r.iso2 === iso2 && r.rank !== 'DeprecatedRank' && r.lat !== null);
  if (all.length === 0) return null;
  const norm = (s) => s.toLowerCase().replace(/[^a-zа-я]/gi, '');

  // Столицу с истёкшим статусом берём только если она названа в курации явно:
  // так Малабо остаётся ответом, хотя Wikidata уже перевела статус на Сьюдад-де-ла-Пас.
  const chosen = CAPITAL_CHOICE[iso2];
  if (chosen) {
    const hit = all.find((r) => r.en && norm(r.en) === norm(chosen));
    if (hit) return hit;
    warn(`${iso2}: столица «${chosen}» из курации не найдена в Wikidata`);
  }

  const mine = all.filter((r) => !r.ended);
  if (mine.length === 0) return null;
  if (sourceCapital) {
    const hit = mine.find((r) => r.en && norm(r.en) === norm(sourceCapital));
    if (hit) return hit;
  }
  const preferred = mine.find((r) => r.rank === 'PreferredRank');
  if (preferred) return preferred;
  if (mine.length > 1) {
    warn(`${iso2}: несколько столиц, взял первую — ${mine.map((r) => r.en).join(', ')}`);
  }
  return mine[0];
}

/* ───────────────────── Natural Earth: bbox ───────────────────── */

/** Площадь кольца по формуле шнурков — нужна только для сравнения полигонов. */
function ringArea(ring) {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    a += (ring[j][0] + ring[i][0]) * (ring[j][1] - ring[i][1]);
  }
  return Math.abs(a / 2);
}

/** bbox одного кольца с разворотом долгот через антимеридиан. */
function ringBbox(ring) {
  const lons = ring.map((p) => p[0]);
  const lats = ring.map((p) => p[1]);
  let minLon = Math.min(...lons);
  let maxLon = Math.max(...lons);
  if (maxLon - minLon > 180) {
    const shifted = lons.map((l) => (l < 0 ? l + 360 : l));
    minLon = Math.min(...shifted);
    maxLon = Math.max(...shifted);
  }
  return [minLon, Math.min(...lats), maxLon, Math.max(...lats)];
}

const spanOf = (b) => b[2] - b[0];
const contains = (b, lon, lat) => {
  const l = lon < b[0] - 1e-9 && b[2] > 180 ? lon + 360 : lon;
  return l >= b[0] - 0.05 && l <= b[2] + 0.05 && lat >= b[1] - 0.05 && lat <= b[3] + 0.05;
};
const union = (a, b) => [
  Math.min(a[0], b[0]),
  Math.min(a[1], b[1]),
  Math.max(a[2], b[2]),
  Math.max(a[3], b[3]),
];

/**
 * Рамка страны для карты. Берём не всю геометрию — иначе у Франции в кадр попадёт
 * Гвиана, у Испании Канары, и карта покажет пол-планеты. Правило такое:
 *
 *   основа — самый крупный полигон;
 *   если столица лежит не на нём (Кирибати: Тарава против Киритимати),
 *   берём полигон со столицей и объединяем с основным — но только если рамка
 *   от этого не расползается больше чем втрое. Иначе оставляем один остров со столицей.
 *
 * Полигоны через антимеридиан (Россия, Фиджи) считаются в сдвинутых долготах,
 * поэтому maxLon у них может быть больше 180 — Leaflet такие границы понимает.
 */
function bboxOf(geometry, lon, lat, label) {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  const boxes = polygons.map((poly) => ({ box: ringBbox(poly[0]), area: ringArea(poly[0]) }));
  if (boxes.length === 0) return null;

  const largest = boxes.reduce((a, b) => (b.area > a.area ? b : a));
  if (lon === null || lat === null) return largest.box;

  const holding = boxes.filter((b) => contains(b.box, lon, lat));
  if (holding.length === 0) {
    warn(`${label}: столица не попала ни в один полигон, рамка по крупнейшему`);
    return union(largest.box, [lon - 0.3, lat - 0.3, lon + 0.3, lat + 0.3]);
  }
  const capitalBox = holding.reduce((a, b) => (b.area > a.area ? b : a));
  if (capitalBox === largest) return largest.box;

  const merged = union(largest.box, capitalBox.box);
  if (spanOf(merged) > spanOf(largest.box) * 3 + 5) {
    warn(`${label}: столица на отдельном острове, рамка по нему (${capitalBox.box.map((n) => n.toFixed(1)).join(', ')})`);
    return capitalBox.box;
  }
  return merged;
}

const round3 = (b) => b.map((n) => Math.round(n * 1000) / 1000);

function indexNaturalEarth(geojson, cca3ToCca2) {
  const byIso2 = new Map();
  for (const feature of geojson.features) {
    const p = feature.properties;
    const candidates = [p.ISO_A2, p.ISO_A2_EH, cca3ToCca2.get(p.ADM0_A3), cca3ToCca2.get(p.ISO_A3)];
    const iso2 = candidates.find((c) => c && c !== '-99');
    if (!iso2 || byIso2.has(iso2)) continue;
    byIso2.set(iso2, feature.geometry);
  }
  return byIso2;
}

/* ─────────────────────────── Флаги ─────────────────────────── */

/**
 * Кладём в проект только флаги наших 195 стран.
 * В пакете их 267, и лишние — это флаги территорий с детальными гербами:
 * они весят в тридцать раз больше обычного полотнища и раздувают бандл впустую.
 */
async function copyFlags(codes) {
  await mkdir(FLAGS_OUT, { recursive: true });
  const existing = await readdir(FLAGS_OUT).catch(() => []);
  const wanted = new Set(codes.map((c) => `${c}.svg`));
  for (const file of existing) {
    if (!wanted.has(file)) await rm(join(FLAGS_OUT, file));
  }
  let bytes = 0;
  for (const code of codes) {
    const from = join(FLAGS_SRC, `${code}.svg`);
    if (!existsSync(from)) {
      warn(`${code}: нет флага в country-flag-icons`);
      continue;
    }
    await copyFile(from, join(FLAGS_OUT, `${code}.svg`));
    bytes += (await readFile(from)).length;
  }
  process.stderr.write(`флагов скопировано: ${codes.length}, ${Math.round(bytes / 1024)} КБ\n`);
}

/* ─────────────────────────── Сборка ─────────────────────────── */

const ts = (s) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

async function main() {
  const all = JSON.parse(await cached('mledoze.json', MLEDOZE));

  const targets = all.filter((c) => c.unMember || EXTRA.includes(c.cca2));
  if (targets.length !== 195) warn(`ожидалось 195 стран, получилось ${targets.length}`);

  // Русские названия берём по всему датасету: соседом может быть Косово или Тайвань.
  const ruByCca3 = new Map();
  const cca3ToCca2 = new Map();
  for (const c of all) {
    const ru = RU_NAME_OVERRIDE[c.cca2] ?? c.translations?.rus?.common ?? c.name.common;
    ruByCca3.set(c.cca3, ru);
    cca3ToCca2.set(c.cca3, c.cca2);
  }

  const codes = targets.map((c) => c.cca2);
  const capitals = await fetchCapitals(codes);

  const ne = JSON.parse(await cached('ne_10m.geojson', NATURAL_EARTH));
  const geometries = indexNaturalEarth(ne, cca3ToCca2);

  const out = [];
  for (const c of targets) {
    const iso2 = c.cca2;
    const cap = pickCapital(iso2, capitals, c.capital?.[0]);
    if (!cap) {
      warn(`${iso2} ${c.name.common}: столица не найдена в Wikidata — пропущена`);
      continue;
    }
    const geometry = geometries.get(iso2);
    if (!geometry) warn(`${iso2} ${c.name.common}: нет геометрии в Natural Earth`);
    const bbox = geometry ? round3(bboxOf(geometry, cap.lon, cap.lat, `${iso2} ${c.name.common}`)) : null;

    // Wikidata иногда бежит впереди: отдаёт строящуюся или свежеперенесённую
    // столицу там, где общепринятый ответ ещё старый. Сверяем и показываем разницу.
    const fromSource = c.capital?.[0];
    if (fromSource && cap.en && !CAPITAL_CHOICE[iso2]) {
      const n = (x) => x.toLowerCase().replace(/[^a-z]/g, '');
      if (n(cap.en) !== n(fromSource)) {
        warn(`${iso2} ${c.name.common}: Wikidata «${cap.en}», mledoze «${fromSource}» — проверить`);
      }
    }

    const region = REGION_BY_SOURCE[c.region];
    if (!region) warn(`${iso2}: неизвестный регион «${c.region}»`);
    if (!SUBREGION_RU[c.subregion]) warn(`${iso2}: нет перевода подрегиона «${c.subregion}»`);

    const neighbors = (c.borders ?? []).map((b) => ruByCca3.get(b) ?? b).sort((a, b) => a.localeCompare(b, 'ru'));

    out.push({
      code: iso2,
      nameRu: RU_NAME_OVERRIDE[iso2] ?? c.translations?.rus?.common ?? c.name.common,
      nameEn: EN_NAME_OVERRIDE[iso2] ?? c.name.common,
      capitalRu: CAPITAL_RU_OVERRIDE[iso2] ?? cap.ru,
      capitalEn: CAPITAL_EN_OVERRIDE[iso2] ?? cap.en ?? c.capital?.[0] ?? cap.ru,
      capitalLat: Math.round(cap.lat * 10000) / 10000,
      capitalLon: Math.round(cap.lon * 10000) / 10000,
      bbox: bbox ?? [cap.lon - 0.5, cap.lat - 0.5, cap.lon + 0.5, cap.lat + 0.5],
      neighborsRu: neighbors,
      seaRu: SEA[iso2],
      region: region ?? 'asia',
      subregionRu: SUBREGION_RU[c.subregion] ?? '',
      tier: EASY.includes(iso2) ? 'easy' : HARD.includes(iso2) ? 'hard' : 'medium',
      note: NOTES[iso2],
    });
  }

  out.sort((a, b) => a.nameRu.localeCompare(b.nameRu, 'ru'));

  const body = out
    .map((c) => {
      const lines = [
        `    code: ${ts(c.code)},`,
        `    nameRu: ${ts(c.nameRu)},`,
        `    nameEn: ${ts(c.nameEn)},`,
        `    capitalRu: ${ts(c.capitalRu)},`,
        `    capitalEn: ${ts(c.capitalEn)},`,
        `    capitalLat: ${c.capitalLat},`,
        `    capitalLon: ${c.capitalLon},`,
        `    bbox: [${c.bbox.join(', ')}],`,
        `    neighborsRu: [${c.neighborsRu.map(ts).join(', ')}],`,
      ];
      if (c.seaRu) lines.push(`    seaRu: ${ts(c.seaRu)},`);
      lines.push(
        `    region: ${ts(c.region)},`,
        `    subregionRu: ${ts(c.subregionRu)},`,
        `    tier: ${ts(c.tier)},`,
      );
      if (c.note) lines.push(`    note: ${ts(c.note)},`);
      return `  {\n${lines.join('\n')}\n  },`;
    })
    .join('\n');

  const header = `// Файл собран скриптом scripts/build-countries.mjs — руками не править.
// Источники: mledoze/countries (названия, границы, регионы), Wikidata (столицы
// и координаты), Natural Earth 10m (bbox). Редакторская часть — scripts/curation.mjs.
//
// bbox — рамка самого крупного полигона страны, без заморских территорий.
// У стран через антимеридиан (Россия, Фиджи, Кирибати) maxLon больше 180 — так и надо.
// Микрогосударствам рамка достаётся крошечная: минимальный охват карта задаёт сама.

import type { Country } from '../types';

export const COUNTRIES: Country[] = [
${body}
];

export const BY_CODE: Record<string, Country> = Object.fromEntries(
  COUNTRIES.map((c) => [c.code, c]),
);
`;

  await writeFile(OUT, header);
  await copyFlags(out.map((c) => c.code));

  const byRegion = {};
  const byTier = {};
  for (const c of out) {
    byRegion[c.region] = (byRegion[c.region] ?? 0) + 1;
    byTier[c.tier] = (byTier[c.tier] ?? 0) + 1;
  }
  process.stderr.write(`\nстран: ${out.length}\nпо регионам: ${JSON.stringify(byRegion)}\nпо сложности: ${JSON.stringify(byTier)}\n`);
  if (warnings.length) {
    process.stderr.write(`\nпредупреждения (${warnings.length}):\n`);
    for (const w of warnings) process.stderr.write(`  ! ${w}\n`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
