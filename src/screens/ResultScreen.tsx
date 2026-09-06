import type { CSSProperties } from 'react';
import { Screen } from '../components/Screen';
import type { Game } from '../hooks/useGame';

/** Временная разметка этапа 3. Кольцо счёта и разбор ошибок — этап 6. */
export function ResultScreen({ game }: { game: Game }) {
  const correct = game.answers.filter((a) => a.correct).length;
  const mistakes = game.answers.filter((a) => !a.correct);

  return (
    <Screen
      footer={
        <div style={{ display: 'grid', gap: 8 }}>
          <button style={primary} onClick={game.startRound}>
            Ещё раунд
          </button>
          <button style={secondary} onClick={game.goHome}>
            На главную
          </button>
        </div>
      }
    >
      <h1 style={title}>
        {correct} из {game.answers.length}
      </h1>
      {mistakes.length > 0 ? (
        <div style={{ marginTop: 24 }}>
          <div style={label}>Ошибки</div>
          {mistakes.map((a, i) => (
            <div key={i} style={row}>
              {a.question.country.nameRu} — {a.question.country.capitalRu}
            </div>
          ))}
        </div>
      ) : null}
    </Screen>
  );
}

const title: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: 46,
  fontWeight: 500,
  margin: 0,
};
const label: CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '.1em',
  textTransform: 'uppercase',
  color: 'var(--c-muted)',
  marginBottom: 8,
};
const row: CSSProperties = { fontSize: 15, fontWeight: 600, padding: '6px 0' };
const primary: CSSProperties = {
  width: '100%', height: 56, borderRadius: 'var(--r-button)',
  background: 'var(--c-accent)', color: '#fff', fontSize: 16, fontWeight: 600,
};
const secondary: CSSProperties = {
  width: '100%', height: 46, borderRadius: 'var(--r-button)',
  background: 'var(--c-surface)', border: '1px solid var(--c-line)', fontSize: 16, fontWeight: 600,
};
