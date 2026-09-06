import type { CSSProperties } from 'react';

/**
 * Флаги лежат в src/assets/flags — туда их кладёт scripts/build-countries.mjs,
 * ровно 195 штук под наши страны. Vite инлайнит их в бандл как data-URI,
 * поэтому за флагом не уходит ни одного сетевого запроса: важно и для офлайна,
 * и для скорости первого кадра.
 *
 * Глоб по node_modules тянул все 267 флагов пакета, включая флаги территорий
 * с детальными гербами — они весят в разы больше и в игре не нужны.
 */
const FLAGS = import.meta.glob('../assets/flags/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const BY_CODE: Record<string, string> = Object.fromEntries(
  Object.entries(FLAGS).map(([path, url]) => [path.slice(-6, -4), url]),
);

export type FlagSize = 'xl' | 'lg' | 'md' | 'sm';

/** Пропорция 22:15 — заметно спокойнее, чем 3:2 исходников. */
const SIZES: Record<FlagSize, { width: number; height: number; radius: number }> = {
  // xl — сам предмет вопроса в режиме «флаг → страна», не подпись к нему.
  xl: { width: 132, height: 90, radius: 8 },
  lg: { width: 52, height: 35, radius: 5 },
  md: { width: 36, height: 24, radius: 4 },
  sm: { width: 26, height: 18, radius: 3 },
};

/**
 * Флаг показывается везде, где названа страна, а не только в режиме «флаг → страна».
 * Рамка обязательна: без неё белые полотнища (Япония, Финляндия) сливаются с карточкой.
 */
export function Flag({ code, size = 'md' }: { code: string; size?: FlagSize }) {
  const url = BY_CODE[code];
  const { width, height, radius } = SIZES[size];

  const style: CSSProperties = {
    width,
    height,
    flex: `0 0 ${width}px`,
    borderRadius: radius,
    border: '1px solid var(--c-flag-border)',
    objectFit: 'cover',
    display: 'block',
    background: 'var(--c-sunken)',
  };

  // Нет файла — показываем пустую рамку того же размера, чтобы вёрстка не прыгала.
  if (!url) return <span style={style} aria-hidden />;

  return <img src={url} width={width} height={height} style={style} alt="" draggable={false} />;
}
