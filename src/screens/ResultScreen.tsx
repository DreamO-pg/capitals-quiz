import type { CSSProperties } from 'react';
import { Flag } from '../components/Flag';
import { Screen } from '../components/Screen';
import type { Game } from '../hooks/useGame';

/** Временная разметка этапа 3. Кольцо счёта и разбор ошибок — этап 6. */
export function ResultScreen({ game }: { game: Game }) {
  const correct = game.answers.filter((a) => a.correct).length;
  // Одна страна — одна строка: повтор после ошибки внутри раунда даёт второй
  // промах по той же стране, и без схлопывания разбор пестрит дублями.
  const mistakes = [
    ...new Map(
      game.answers.filter((a) => !a.correct).map((a) => [a.question.country.code, a]),
    ).values(),
  ];

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
          {mistakes.map((a) => (
            <div key={a.question.country.code} style={row}>
              <Flag code={a.question.country.code} size="sm" />
              <span>
                {a.question.country.nameRu} — {a.question.country.capitalRu}
              </span>
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
const row: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  fontSize: 15,
  fontWeight: 600,
  padding: '6px 0',
};
const primary: CSSProperties = {
  width: '100%', height: 56, borderRadius: 'var(--r-button)',
  background: 'var(--c-accent)', color: '#fff', fontSize: 16, fontWeight: 600,
};
const secondary: CSSProperties = {
  width: '100%', height: 46, borderRadius: 'var(--r-button)',
  background: 'var(--c-surface)', border: '1px solid var(--c-line)', fontSize: 16, fontWeight: 600,
};
