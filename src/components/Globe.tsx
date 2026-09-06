/**
 * Врезка-глобус: маленький шар в углу карты с точкой в центре.
 * Отвечает на вопрос, который карта в упор не решает, — где этот кусок на планете.
 *
 * Ортографическая проекция, инлайновый SVG, никаких библиотек.
 * Шар всегда повёрнут к зрителю нужной страной, поэтому точка всегда в центре,
 * а материки вокруг показывают, что это за часть света.
 */

const RADIUS = 30;
const SIZE = RADIUS * 2 + 4;

export function Globe({ lat, lon, rings }: { lat: number; lon: number; rings: [number, number][][] }) {
  const paths = rings.map((ring) => project(ring, lat, lon)).filter((d) => d.length > 0);

  return (
    <svg
      width={SIZE}
      height={SIZE}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      style={{ display: 'block' }}
      aria-hidden
    >
      <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="#FFFFFF" stroke="#E2DFD8" strokeWidth="1" />
      {/* Экватор и меридиан — без них шар читается плоским кругом. */}
      <ellipse
        cx={SIZE / 2}
        cy={SIZE / 2}
        rx={RADIUS}
        ry={RADIUS * Math.abs(Math.sin((lat * Math.PI) / 180))}
        fill="none"
        stroke="#EFEDE7"
        strokeWidth="0.8"
      />
      {paths.map((segments, i) =>
        segments.map((segment, j) => (
          <path key={`${i}-${j}`} d={segment} fill="#E7E4DC" stroke="#D6D2C8" strokeWidth="0.5" />
        )),
      )}
      <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="#DAD6CC" strokeWidth="1" />
      <circle cx={SIZE / 2} cy={SIZE / 2} r="3.4" fill="#007C99" stroke="#FFFFFF" strokeWidth="1.4" />
    </svg>
  );
}

const rad = (deg: number) => (deg * Math.PI) / 180;

/**
 * Кольцо в набор путей. Точки на обратной стороне шара пропускаем и рвём путь:
 * иначе Австралия соединится с Гренландией прямой через весь глобус.
 */
function project(ring: [number, number][], centerLat: number, centerLon: number): string[] {
  const phi0 = rad(centerLat);
  const lambda0 = rad(centerLon);
  const sinPhi0 = Math.sin(phi0);
  const cosPhi0 = Math.cos(phi0);

  const segments: string[] = [];
  let current: string[] = [];

  for (const [lon, lat] of ring) {
    const phi = rad(lat);
    const dLambda = rad(lon) - lambda0;
    const cosC = sinPhi0 * Math.sin(phi) + cosPhi0 * Math.cos(phi) * Math.cos(dLambda);
    if (cosC < 0) {
      if (current.length > 2) segments.push(`${current.join(' ')} Z`);
      current = [];
      continue;
    }
    const x = SIZE / 2 + RADIUS * Math.cos(phi) * Math.sin(dLambda);
    const y =
      SIZE / 2 - RADIUS * (cosPhi0 * Math.sin(phi) - sinPhi0 * Math.cos(phi) * Math.cos(dLambda));
    current.push(`${current.length === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`);
  }
  if (current.length > 2) segments.push(`${current.join(' ')} Z`);
  return segments;
}
