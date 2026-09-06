/**
 * Контурные иконки 24×24, штрих 1.7, скруглённые концы.
 * Эмодзи в интерфейсе нет: флаг — это данные, а не иконка.
 */
const base = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export function IconCheck({ size = 24 }: { size?: number }) {
  return (
    <svg {...base} width={size} height={size}>
      <path d="M4.5 12.5 9.5 17.5 19.5 7" />
    </svg>
  );
}

export function IconCross({ size = 24 }: { size?: number }) {
  return (
    <svg {...base} width={size} height={size}>
      <path d="M6.5 6.5 17.5 17.5M17.5 6.5 6.5 17.5" />
    </svg>
  );
}

export function IconChart({ size = 24 }: { size?: number }) {
  return (
    <svg {...base} width={size} height={size}>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </svg>
  );
}

export function IconRepeat({ size = 24 }: { size?: number }) {
  return (
    <svg {...base} width={size} height={size}>
      <path d="M4 9a8 8 0 0 1 13.7-5.6L20 6M20 15a8 8 0 0 1-13.7 5.6L4 18" />
      <path d="M20 3v3h-3M4 21v-3h3" />
    </svg>
  );
}

export function IconPlus({ size = 24 }: { size?: number }) {
  return (
    <svg {...base} width={size} height={size}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
