import { useEffect, useRef, useState } from 'react';
import type { Ring } from '../data/shapes';
import { COUNTRIES } from '../data/countries';
import type { Country } from '../types';
import { frameFor, inFrame, overlaps } from '../engine/frame';
import { Globe } from './Globe';
import { StaticMap } from './StaticMap';

/** Высота по умолчанию, когда её никто не задал явно. */
const DEFAULT_HEIGHT = 250;
/** Тайлы иногда не приходят по одному — паникуем только на устойчивом отказе. */
const TILE_ERRORS_BEFORE_FALLBACK = 4;

interface Geometry {
  shapes: Record<string, Ring[]>;
  world: [number, number][][];
}

/** Геометрия нужна только здесь, поэтому грузится отдельным куском и один раз. */
let geometryPromise: Promise<Geometry> | null = null;
function loadGeometry(): Promise<Geometry> {
  if (!geometryPromise) {
    geometryPromise = Promise.all([import('../data/shapes'), import('../data/world')]).then(
      ([s, w]) => ({ shapes: s.SHAPES, world: w.WORLD }),
    );
  }
  return geometryPromise;
}

export function MapCard({
  country,
  wrong,
  height,
}: {
  country: Country;
  wrong?: Country | null;
  /** Не задана — карта растягивается по контейнеру и забирает свободное место. */
  height?: number;
}) {
  const [geometry, setGeometry] = useState<Geometry | null>(null);
  const [offline, setOffline] = useState(() => !navigator.onLine);
  // Запасной карте нужны числа: SVG не умеет рисоваться в процентах родителя.
  const [size, setSize] = useState({ width: 0, height: height ?? DEFAULT_HEIGHT });
  const host = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);

  const frame = frameFor(country);
  // Второй маркер ставим, только если промах виден в этом же кадре.
  const wrongPoint =
    wrong && inFrame(frame, wrong.capitalLat, wrong.capitalLon)
      ? { lat: wrong.capitalLat, lon: wrong.capitalLon }
      : null;

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
      setSize({
        width: box.current?.clientWidth ?? 0,
        height: box.current?.clientHeight ?? height ?? DEFAULT_HEIGHT,
      });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(box.current);
    return () => observer.disconnect();
  }, [height]);

  // Leaflet поднимаем только когда сеть есть и геометрия уже приехала.
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
        // Управление не блокируем: подвигать и отзумить — часть объяснения.
        scrollWheelZoom: true,
        // Дробный зум обязателен. По целым ступеням fitBounds округляет вниз,
        // и кадр вроде Саудовской Аравии раскрывается вдвое шире нужного —
        // на таком масштабе OpenStreetMap уже не подписывает ни страны, ни моря.
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

      const rings = geometry.shapes[country.code];
      if (rings) {
        L.polygon(
          rings.map((ring) => ring.map(([lon, lat]) => [lat, lon] as [number, number])),
          // Силуэт должен запоминаться, поэтому заливка плотная, а не намёком.
          { color: '#007C99', weight: 1.8, fillColor: '#D8F0F8', fillOpacity: 0.72 },
        ).addTo(map);
      }

      L.marker([country.capitalLat, country.capitalLon], {
        icon: L.divIcon({ className: '', html: DOT, iconSize: [16, 16], iconAnchor: [8, 8] }),
        keyboard: false,
      }).addTo(map);

      if (wrongPoint) {
        L.marker([wrongPoint.lat, wrongPoint.lon], {
          icon: L.divIcon({ className: '', html: RING, iconSize: [18, 18], iconAnchor: [9, 9] }),
          keyboard: false,
        }).addTo(map);
      }

      const fit = () =>
        map.fitBounds(
          [
            [frame[1], frame[0]],
            [frame[3], frame[2]],
          ],
          { padding: [24, 24] },
        );
      fit();

      // Виджет может смениться в размерах уже после первого кадра — например,
      // пока едет анимация выезда. Пересчитываем кадр, а не оставляем кривой.
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
  }, [country.code, offline, geometry, wrongPoint?.lat, wrongPoint?.lon]);

  return (
    <div ref={box} style={{ ...wrapper, ...(height ? { height } : { flex: '1 0 auto', minHeight: 160 }) }}>
      {offline && geometry && size.width > 0 ? (
        <StaticMap
          frame={frame}
          nearby={COUNTRIES.filter(
            (c) => c.code !== country.code && overlaps(frame, c.bbox),
          )
            .map((c) => geometry.shapes[c.code])
            .filter(Boolean)}
          shape={geometry.shapes[country.code] ?? null}
          lat={country.capitalLat}
          lon={country.capitalLon}
          wrong={wrongPoint}
          width={size.width}
          height={size.height}
        />
      ) : (
        <div ref={host} style={{ height: '100%', background: 'var(--c-sunken)' }} />
      )}

      {/* Глобус поверх карты и всегда виден: без него кадр не привязан к планете. */}
      <div style={globeSlot}>
        {geometry ? <Globe lat={country.capitalLat} lon={country.capitalLon} rings={geometry.world} /> : null}
      </div>

      {offline ? <div style={offlineNote}>Карта из памяти — сеть недоступна</div> : null}
    </div>
  );
}

const DOT =
  '<span style="display:block;width:16px;height:16px;border-radius:999px;background:#007C99;border:3px solid #fff;box-sizing:border-box"></span>';
const RING =
  '<span style="display:block;width:18px;height:18px;border-radius:999px;border:2.5px solid #B14B41;background:rgba(255,255,255,.5);box-sizing:border-box"></span>';

const wrapper: React.CSSProperties = {
  position: 'relative',
  borderRadius: 'var(--r-map)',
  overflow: 'hidden',
  border: '1px solid var(--c-line)',
  background: 'var(--c-sunken)',
};

// Правый верхний угол: снизу Leaflet рисует свою подпись, и глобус её перекрывал.
const globeSlot: React.CSSProperties = {
  position: 'absolute',
  right: 8,
  top: 8,
  zIndex: 500,
  pointerEvents: 'none',
  filter: 'drop-shadow(0 1px 3px rgba(34,31,25,.18))',
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
