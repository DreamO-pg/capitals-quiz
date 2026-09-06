import type { Ring } from '../data/shapes';
import type { Bbox } from '../engine/frame';

/**
 * Запасная карта, когда тайлы OpenStreetMap недоступны.
 *
 * Соседей рисуем теми же контурами, что и саму страну: они уже загружены,
 * и это единственный способ показать окружение. Грубый контур суши от глобуса
 * тут не годится — на кадре в десяток градусов он вырождается в редкие
 * диагонали, и страна снова висит в пустоте.
 *
 * Проекция простая равнопромежуточная: на кадре в несколько градусов
 * искажение незаметно, а Меркатор тут только усложнил бы код.
 */
export function StaticMap({
  frame,
  nearby,
  shape,
  lat,
  lon,
  wrong,
  width,
  height,
}: {
  frame: Bbox;
  /** Контуры стран, попадающих в кадр, — фон и соседи. */
  nearby: Ring[][];
  shape: Ring[] | null;
  lat: number;
  lon: number;
  wrong?: { lat: number; lon: number } | null;
  width: number;
  height: number;
}) {
  const [minLon, minLat, maxLon, maxLat] = frame;
  const sx = width / (maxLon - minLon);
  const sy = height / (maxLat - minLat);
  const px = (l: number) => ((l < minLon && maxLon > 180 ? l + 360 : l) - minLon) * sx;
  const py = (b: number) => (maxLat - b) * sy;

  const toPath = (rings: [number, number][][]) =>
    rings
      .map((ring) => ring.map(([l, b], i) => `${i ? 'L' : 'M'}${px(l).toFixed(1)},${py(b).toFixed(1)}`).join(' ') + ' Z')
      .join(' ');

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      <rect width={width} height={height} fill="#EAF1F4" />
      {nearby.map((rings, i) => (
        <path key={i} d={toPath(rings)} fill="#F4F2ED" stroke="#DAD6CC" strokeWidth="0.8" />
      ))}
      {shape ? <path d={toPath(shape)} fill="#D8F0F8" stroke="#007C99" strokeWidth="1.2" /> : null}
      {wrong ? (
        <circle cx={px(wrong.lon)} cy={py(wrong.lat)} r="6" fill="none" stroke="#B14B41" strokeWidth="2.5" />
      ) : null}
      <circle cx={px(lon)} cy={py(lat)} r="5" fill="#007C99" stroke="#FFFFFF" strokeWidth="2" />
    </svg>
  );
}
