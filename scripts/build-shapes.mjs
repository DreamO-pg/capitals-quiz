/**
 * Собирает геометрию для карты. Запускать после build-countries.mjs:
 *
 *   node scripts/build-shapes.mjs
 *
 * Даёт два файла:
 *   src/data/shapes.ts — упрощённые контуры 195 стран, заливка на карте;
 *   src/data/world.ts  — грубый контур суши для врезки-глобуса и офлайн-карты.
 *
 * Оба подключаются динамическим импортом: в первый кадр игры геометрия не нужна,
 * она требуется только на экране ответа.
 */

import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = join(ROOT, '.cache');

/* ───────────────────── Упрощение линий ───────────────────── */

/** Расстояние от точки до отрезка, в градусах. Для наших масштабов плоскости хватает. */
function segmentDistance(p, a, b) {
  let x = a[0];
  let y = a[1];
  let dx = b[0] - x;
  let dy = b[1] - y;
  if (dx !== 0 || dy !== 0) {
    const t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);
    if (t > 1) {
      x = b[0];
      y = b[1];
    } else if (t > 0) {
      x += dx * t;
      y += dy * t;
    }
  }
  dx = p[0] - x;
  dy = p[1] - y;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Дуглас — Пекер. Итеративный, без рекурсии: у крупных стран кольца на десятки тысяч точек. */
function simplify(points, tolerance) {
  if (points.length <= 3) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [first, last] = stack.pop();
    let maxDist = -1;
    let index = -1;
    for (let i = first + 1; i < last; i++) {
      const d = segmentDistance(points[i], points[first], points[last]);
      if (d > maxDist) {
        maxDist = d;
        index = i;
      }
    }
    if (maxDist > tolerance && index > 0) {
      keep[index] = 1;
      stack.push([first, index], [index, last]);
    }
  }
  const out = [];
  for (let i = 0; i < points.length; i++) if (keep[i]) out.push(points[i]);
  return out;
}

const round = (n, digits) => Number(n.toFixed(digits));

/**
 * Кольцо после упрощения может выродиться в отрезок — такие выкидываем:
 * залить их нечем, а место в бандле они занимают.
 */
function prepareRing(ring, tolerance, digits) {
  let simplified = simplify(ring, tolerance);
  // Микрогосударство целиком меньше допуска: упрощать нечего, берём как есть,
  // иначе Ватикан схлопывается в отрезок и на карте не рисуется вовсе.
  if (simplified.length < 4) simplified = ring;
  if (simplified.length < 4) return null;
  return simplified.map((p) => [round(p[0], digits), round(p[1], digits)]);
}

function polygonsOf(geometry) {
  if (!geometry) return [];
  return geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
}

/* ───────────────────── Контуры стран ───────────────────── */

/**
 * Точность подбираем под размер страны: у России и у Монако один допуск дал бы
 * либо мусорный вес, либо треугольник вместо княжества.
 *
 * Ориентир — то, что реально видно. Карта кадрируется по bbox, страна занимает
 * около половины ширины виджета, то есть примерно 160 точек экрана. Детали
 * мельче span/160 не различить, поэтому берём span/110: чуть подробнее предела
 * видимости, с запасом на приближение пальцами.
 */
function toleranceFor(bbox) {
  const span = Math.max(bbox[2] - bbox[0], bbox[3] - bbox[1]);
  return Math.min(0.4, Math.max(0.0004, span / 90));
}

/** Мелкие острова у больших стран в кадр не попадают — держим только заметные кольца. */
function ringArea(ring) {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    a += (ring[j][0] + ring[i][0]) * (ring[j][1] - ring[i][1]);
  }
  return Math.abs(a / 2);
}

async function buildShapes(countries) {
  const ne = JSON.parse(await readFile(join(CACHE, 'ne_10m.geojson'), 'utf8'));
  const cca2ByAdm = new Map();
  const byIso2 = new Map();
  for (const f of ne.features) {
    const p = f.properties;
    const iso2 = [p.ISO_A2, p.ISO_A2_EH].find((c) => c && c !== '-99');
    if (iso2 && !byIso2.has(iso2)) byIso2.set(iso2, f.geometry);
    if (p.ADM0_A3) cca2ByAdm.set(p.ADM0_A3, iso2);
  }

  const shapes = {};
  let points = 0;
  const missing = [];

  for (const c of countries) {
    const geometry = byIso2.get(c.code);
    if (!geometry) {
      missing.push(c.code);
      continue;
    }
    const tolerance = toleranceFor(c.bbox);
    // Знаков ровно столько, сколько несёт смысл при выбранном допуске.
    const digits = tolerance < 0.005 ? 4 : tolerance < 0.02 ? 3 : 2;
    const rings = [];
    const polys = polygonsOf(geometry);
    const areas = polys.map((poly) => ringArea(poly[0]));
    const biggest = Math.max(...areas);
    polys.forEach((poly, i) => {
      // Кольца мельче сотой доли главного в кадре не различить.
      if (areas[i] < biggest / 100) return;
      const ring = prepareRing(poly[0], tolerance, digits);
      if (ring) rings.push(ring);
    });
    if (rings.length === 0) {
      missing.push(c.code);
      continue;
    }
    shapes[c.code] = rings;
    for (const r of rings) points += r.length;
  }

  const body = Object.entries(shapes)
    .map(([code, rings]) => `  ${code}: ${JSON.stringify(rings)},`)
    .join('\n');

  await writeFile(
    join(ROOT, 'src/data/shapes.ts'),
    `// Файл собран скриптом scripts/build-shapes.mjs — руками не править.
// Упрощённые контуры стран для заливки на карте. Точность подобрана под размер
// страны, координаты в порядке [долгота, широта] — как в GeoJSON.
//
// Подключается динамическим импортом: на главном экране геометрия не нужна.

export type Ring = [number, number][];

export const SHAPES: Record<string, Ring[]> = {
${body}
};
`,
  );
  return { count: Object.keys(shapes).length, points, missing };
}

/* ───────────────────── Контур суши для глобуса ───────────────────── */

/**
 * Врезке-глобусу и офлайн-карте нужен грубый силуэт материков: без него
 * шар в углу — просто круг с точкой и ничего не объясняет.
 */
async function buildWorld() {
  const path = join(CACHE, 'ne_110m.geojson');
  if (!existsSync(path)) throw new Error('нет .cache/ne_110m.geojson');
  const ne = JSON.parse(await readFile(path, 'utf8'));

  const rings = [];
  for (const f of ne.features) {
    for (const poly of polygonsOf(f.geometry)) {
      if (ringArea(poly[0]) < 12) continue; // мелкие острова на шаре не видны
      const ring = prepareRing(poly[0], 0.9, 1);
      if (ring) rings.push(ring);
    }
  }

  await writeFile(
    join(ROOT, 'src/data/world.ts'),
    `// Файл собран скриптом scripts/build-shapes.mjs — руками не править.
// Грубый контур суши: врезка-глобус на экране ответа и запасная карта,
// когда тайлы OpenStreetMap недоступны. Координаты [долгота, широта].

export const WORLD: [number, number][][] = ${JSON.stringify(rings)};
`,
  );
  return { rings: rings.length, points: rings.reduce((n, r) => n + r.length, 0) };
}

/* ───────────────────── Запуск ───────────────────── */

const listPath = join(CACHE, 'countries.json');
if (!existsSync(listPath)) {
  throw new Error('нет .cache/countries.json — сначала запусти build-countries.mjs');
}
const countries = JSON.parse(await readFile(listPath, 'utf8'));

const shapes = await buildShapes(countries);
const world = await buildWorld();

const size = async (f) => Math.round((await readFile(join(ROOT, f))).length / 1024);
process.stderr.write(
  `контуров стран: ${shapes.count}, точек ${shapes.points}, ${await size('src/data/shapes.ts')} КБ\n` +
    `контур суши: колец ${world.rings}, точек ${world.points}, ${await size('src/data/world.ts')} КБ\n`,
);
if (shapes.missing.length) {
  process.stderr.write(`! нет геометрии: ${shapes.missing.join(', ')}\n`);
}
