/**
 * Счёт раунда кольцом. Дуга — доля верных ответов, цвет меняется от результата:
 * зелёный только за безошибочный раунд, красный — когда ошибок больше половины.
 */
export function ScoreRing({ correct, total }: { correct: number; total: number }) {
  const size = 132;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const share = total > 0 ? correct / total : 0;

  const color =
    share === 1 ? 'var(--c-ok)' : share >= 0.5 ? 'var(--c-accent)' : 'var(--c-bad)';

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Поворот на четверть: дуга должна начинаться сверху, а не справа. */}
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--c-line)"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${circumference * share} ${circumference}`}
          />
        </g>
      </svg>
      <div style={center}>
        <span style={{ ...big, color }}>{correct}</span>
        <span style={small}>из {total}</span>
      </div>
    </div>
  );
}

const center: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 2,
};

const big: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: 46,
  fontWeight: 500,
  lineHeight: 1,
};

const small: React.CSSProperties = {
  fontSize: 13,
  color: 'var(--c-muted)',
};
