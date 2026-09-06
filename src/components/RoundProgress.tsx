import type { CSSProperties } from 'react';

/**
 * Полоса раунда: по делению на вопрос. Повтор после ошибки не удлиняет раунд,
 * поэтому число делений постоянно и полоса не дёргается.
 */
export function RoundProgress({ current, total }: { current: number; total: number }) {
  return (
    <div style={wrap} aria-label={`Вопрос ${current} из ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          style={{
            ...tick,
            background:
              i < current - 1
                ? 'var(--c-accent)'
                : i === current - 1
                  ? 'var(--c-accent)'
                  : 'var(--c-line)',
            opacity: i < current - 1 ? 0.4 : 1,
          }}
        />
      ))}
    </div>
  );
}

const wrap: CSSProperties = {
  display: 'flex',
  gap: 4,
  height: 3,
};

const tick: CSSProperties = {
  flex: 1,
  height: 3,
  borderRadius: 999,
};
