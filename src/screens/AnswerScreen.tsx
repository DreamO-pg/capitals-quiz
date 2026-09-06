import type { CSSProperties } from 'react';
import { Screen } from '../components/Screen';
import type { Game } from '../hooks/useGame';

/** Временная разметка этапа 3. Вердикт, карта и пояснение — этапы 4–5. */
export function AnswerScreen({ game }: { game: Game }) {
  const a = game.lastAnswer;
  if (!a) return null;
  const { question, correct } = a;

  return (
    <Screen
      footer={
        <button style={primary} onClick={game.next}>
          Дальше
        </button>
      }
    >
      <div style={{ ...verdict, color: correct ? 'var(--c-ok)' : 'var(--c-bad)' }}>
        {correct ? 'Верно' : 'Неверно'}
      </div>
      <div style={{ fontSize: 17, marginTop: 8 }}>
        {question.country.nameRu} — {question.country.capitalRu}
      </div>
      {!correct ? (
        <div style={{ fontSize: 15, color: 'var(--c-ink2)', marginTop: 4 }}>
          Ты выбрал: {question.options[a.chosenIndex]}
        </div>
      ) : null}
      {question.country.note ? (
        <p style={{ fontSize: 15, color: 'var(--c-ink2)', marginTop: 16 }}>
          {question.country.note}
        </p>
      ) : null}
    </Screen>
  );
}

const verdict: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: 25,
  lineHeight: 1.2,
  fontWeight: 500,
};

const primary: CSSProperties = {
  width: '100%',
  height: 56,
  borderRadius: 'var(--r-button)',
  background: 'var(--c-accent)',
  color: '#fff',
  fontSize: 16,
  fontWeight: 600,
};
