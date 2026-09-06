import type { CSSProperties } from 'react';
import { Screen } from '../components/Screen';
import { REGION_LABEL } from '../types';
import type { Region } from '../types';
import type { Game } from '../hooks/useGame';

/** Временная разметка этапа 3. Полноценная статистика — этап 6. */
export function StatsScreen({ game }: { game: Game }) {
  const { stats } = game;
  const accuracy = stats.answers > 0 ? Math.round((100 * stats.correct) / stats.answers) : 0;

  return (
    <Screen>
      <h1 style={title}>Статистика</h1>
      <div style={row}>
        <span>Всего ответов</span>
        <b>{stats.answers}</b>
      </div>
      <div style={row}>
        <span>Точность</span>
        <b>{accuracy}%</b>
      </div>
      <div style={row}>
        <span>Серия дней</span>
        <b>{stats.streak}</b>
      </div>
      <div style={row}>
        <span>Нужно повторить</span>
        <b>{game.weak.length}</b>
      </div>

      {Object.keys(stats.byRegion).length > 0 ? (
        <div style={{ marginTop: 24 }}>
          <div style={label}>По регионам</div>
          {Object.entries(stats.byRegion).map(([region, v]) => (
            <div key={region} style={row}>
              <span>{REGION_LABEL[region as Region] ?? region}</span>
              <b>{v.total > 0 ? Math.round((100 * v.correct) / v.total) : 0}%</b>
            </div>
          ))}
        </div>
      ) : null}
    </Screen>
  );
}

const title: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: 32,
  fontWeight: 500,
  margin: '0 0 16px',
};
const row: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: 15,
  padding: '6px 0',
  color: 'var(--c-ink2)',
};
const label: CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '.1em',
  textTransform: 'uppercase',
  color: 'var(--c-muted)',
  marginBottom: 8,
};
