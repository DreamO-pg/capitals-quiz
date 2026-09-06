import { useEffect, useRef, useState } from 'react';
import type { Ring } from '../data/shapes';
import type { Country } from '../types';
import type { Bbox } from '../engine/frame';

const HEIGHT = 330;
const TILE_ERRORS_BEFORE_FALLBACK = 4;

interface Geometry {
  shapes: Record<string, Ring[]>;
  world: [number, number][][];
}

let geometryPromise: Promise<Geometry> | null = null;
function loadGeometry(): Promise<Geometry> {
  if (!geometryPromise) {
    geometryPromise = Promise.all([import('../data/shapes'), import('../data/world')]).then(
      ([s, w]) => ({ shapes: s.SHAPES, world: w.WORLD }),
    );
  }
  return geometryPromise;
}

/**
 * Долготы четырёх точек в одной системе координат.
 *
 * Тихий океан пересекает антимеридиан: Палау стоит на +134°, Тонга на −175°,
 * и по сырым числам между ними 309° вместо настоящих пятидесяти. Если размах
 * получается больше половины окружности, переносим западное полушарие за +180 —
 * Leaflet такие долготы понимает и рисует их на той же стороне планеты.
 */
function longitudes(points: Country[]): number[] {
  const raw = points.map((p) => p.capitalLon);
  const span = Math.max(...raw) - Math.min(...raw);
  if (span <= 180) return raw;
  return raw.map((l) => (l < 0 ? l + 360 : l));
}

/**
 * Кадр под четыре точки: их общая рамка плюс поле, чтобы крайние маркеры
 * не липли к краю карты. Нижняя граница нужна на случай, когда все четыре
 * столицы оказались рядом.
 */
function frameForPoints(points: Country[], lons: number[]): Bbox {
  const lats = points.map((p) => p.capitalLat);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const padLon = Math.max((maxLon - minLon) * 0.35, 2);
  const padLat = Math.max((maxLat - minLat) * 0.35, 2);
  return [
    minLon - padLon,
    Math.max(-85, minLat - padLat),
    maxLon + padLon,
    Math.min(85, maxLat + padLat),
  ];
}

/**
 * Вопрос «страна на карте»: четыре пронумерованные точки, отвечаем нажатием
 * прямо по маркеру. Список вариантов внизу тут был бы лишним посредником.
 */
export function MapQuestion({
  options,
  answered,
  correctIndex,
  chosenIndex,
  onPick,
}: {
  options: Country[];
  answered: boolean;
  correctIndex: number;
  chosenIndex: number | null;
  onPick: (index: number) => void;
}) {
  const [geometry, setGeometry] = useState<Geometry | null>(null);
  const [offline, setOffline] = useState(() => !navigator.onLine);
  const [size, setSize] = useState({ width: 0, height: HEIGHT });
  const host = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  // Обработчик живёт в ref: пересоздавать карту на каждый ответ незачем.
  const pick = useRef(onPick);
  pick.current = onPick;

  const lons = longitudes(options);
  const frame = frameForPoints(options, lons);

  useEffect(() => {
    let alive = true;
    loadGeometry().then((g) => alive && setGeometry(g));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!box.current) return;
    const measure = () =>
      setSize({ width: box.current?.clientWidth ?? 0, height: box.current?.clientHeight ?? HEIGHT });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(box.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (offline || !geometry || !host.current) return;
    let disposed = false;
    let cleanup: (() => void) | undefined;

    (async () => {
      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');
      if (disposed || !host.current) return;

      const map = L.map(host.current, {
        attributionControl: true,
        zoomControl: false,
        zoomSnap: 0,
        zoomDelta: 0.5,
      });

      let errors = 0;
      const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '© OpenStreetMap',
      });
      tiles.on('tileerror', () => {
        errors += 1;
        if (errors >= TILE_ERRORS_BEFORE_FALLBACK) setOffline(true);
      });
      tiles.addTo(map);

      options.forEach((country, index) => {
        const marker = L.marker([country.capitalLat, lons[index]], {
          icon: L.divIcon({ className: '', html: pin(index + 1), iconSize: [34, 34], iconAnchor: [17, 17] }),
          keyboard: false,
        }).addTo(map);
        marker.on('click', () => pick.current(index));
      });

      const fit = () =>
        map.fitBounds(
          [
            [frame[1], frame[0]],
            [frame[3], frame[2]],
          ],
          { padding: [30, 30] },
        );
      fit();
      const observer = new ResizeObserver(() => {
        map.invalidateSize({ animate: false });
        fit();
      });
      observer.observe(host.current);

      cleanup = () => {
        observer.disconnect();
        map.remove();
      };
    })();

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [offline, geometry, options.map((o) => o.code).join()]);

  // После ответа перекрашиваем маркеры на месте, не пересобирая карту.
  useEffect(() => {
    if (!answered || !host.current) return;
    const pins = host.current.querySelectorAll<HTMLElement>('[data-pin]');
    pins.forEach((el) => {
      const index = Number(el.dataset.pin);
      if (index === correctIndex) paint(el, 'var(--c-ok)', 'var(--c-ok-bg)');
      else if (index === chosenIndex) paint(el, 'var(--c-bad)', 'var(--c-bad-bg)');
      else paint(el, 'var(--c-ink-disabled)', 'var(--c-surface)');
    });
  }, [answered, correctIndex, chosenIndex]);

  const px = (lon: number) => {
    const l = frame[2] > 180 && lon < frame[0] ? lon + 360 : lon;
    return ((l - frame[0]) / (frame[2] - frame[0])) * size.width;
  };
  const py = (lat: number) => ((frame[3] - lat) / (frame[3] - frame[1])) * size.height;

  return (
    <div ref={box} style={wrapper}>
      {offline && geometry && size.width > 0 ? (
        <svg width={size.width} height={size.height} style={{ display: 'block' }}>
          <rect width={size.width} height={size.height} fill="#EAF1F4" />
          {geometry.world.map((ring, i) => (
            <path
              key={i}
              d={ring.map(([l, b], j) => `${j ? 'L' : 'M'}${px(l).toFixed(1)},${py(b).toFixed(1)}`).join(' ') + ' Z'}
              fill="#F4F2ED"
              stroke="#DAD6CC"
              strokeWidth="0.8"
            />
          ))}
          {options.map((country, index) => (
            <g
              key={country.code}
              onClick={() => onPick(index)}
              style={{ cursor: 'pointer' }}
              transform={`translate(${px(lons[index])} ${py(country.capitalLat)})`}
            >
              <circle r="17" fill={pinFill(index, answered, correctIndex, chosenIndex)} stroke={pinStroke(index, answered, correctIndex, chosenIndex)} strokeWidth="2" />
              <text textAnchor="middle" dy="6" fontSize="16" fontWeight="600" fill="var(--c-ink)">
                {index + 1}
              </text>
            </g>
          ))}
        </svg>
      ) : (
        <div ref={host} style={{ height: '100%', background: 'var(--c-sunken)' }} />
      )}
      {offline ? <div style={offlineNote}>Карта из памяти — сеть недоступна</div> : null}
    </div>
  );
}

function pinFill(i: number, answered: boolean, correct: number, chosen: number | null): string {
  if (!answered) return '#FFFFFF';
  if (i === correct) return '#DDF4E4';
  if (i === chosen) return '#FFE7E3';
  return '#FFFFFF';
}
function pinStroke(i: number, answered: boolean, correct: number, chosen: number | null): string {
  if (!answered) return '#007C99';
  if (i === correct) return '#328053';
  if (i === chosen) return '#B14B41';
  return '#B4B1AA';
}

const pin = (n: number) =>
  `<span data-pin="${n - 1}" style="display:flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:999px;background:#fff;border:2px solid #007C99;color:#221F19;font:600 16px/1 var(--font-ui);box-sizing:border-box;box-shadow:0 1px 4px rgba(34,31,25,.2)">${n}</span>`;

function paint(el: HTMLElement, border: string, background: string) {
  el.style.borderColor = border;
  el.style.background = background;
}

const wrapper: React.CSSProperties = {
  position: 'relative',
  flex: 1,
  minHeight: HEIGHT,
  borderRadius: 'var(--r-map)',
  overflow: 'hidden',
  border: '1px solid var(--c-line)',
  background: 'var(--c-sunken)',
};

const offlineNote: React.CSSProperties = {
  position: 'absolute',
  left: 8,
  top: 8,
  zIndex: 500,
  background: 'rgba(255,255,255,.9)',
  borderRadius: 'var(--r-chip)',
  padding: '4px 8px',
  fontSize: 12,
  color: 'var(--c-ink2)',
};
