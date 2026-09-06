import type { CSSProperties } from 'react';
import { Flag } from '../components/Flag';
import { ScoreRing } from '../components/ScoreRing';
import { Screen } from '../components/Screen';
import { haptic } from '../telegram/webapp';
import type { Game } from '../hooks/useGame';

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
          {game.weak.length > 0 ? (
            <button
              style={primary}
              onClick={() => {
                haptic.impact('light');
                game.startRetryRound();
              }}
            >
              Повторить ошибки · {game.weak.length}
            </button>
          ) : null}
          <button
            style={game.weak.length > 0 ? secondary : primary}
            onClick={() => {
              haptic.impact('light');
              game.startRound();
            }}
          >
            Ещё раунд
          </button>
          <button style={quiet} onClick={game.goHome}>
            На главную
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12 }}>
        <ScoreRing correct={correct} total={game.answers.length} />
      </div>

      <div style={verdict}>{summary(correct, game.answers.length)}</div>

      {mistakes.length > 0 ? (
        <div style={{ marginTop: 28 }}>
          <div style={label}>Над чем поработать</div>
          <div style={list}>
            {mistakes.map((a, i) => (
              <div
                key={a.question.country.code}
                style={i === 0 ? { ...row, borderTop: 'none' } : row}
              >
                <Flag code={a.question.country.code} size="sm" />
                <span style={rowCountry}>{a.question.country.nameRu}</span>
                <span style={rowCapital}>{a.question.country.capitalRu}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </Screen>
  );
}

/** Короткая оценка вместо процентов: цифра уже в кольце. */
function summary(correct: number, total: number): string {
  if (total === 0) return '';
  if (correct === total) return 'Без единой ошибки';
  if (correct === 0) return 'Ни одного верного — но теперь ты их видел';
  const share = correct / total;
  if (share >= 0.8) return 'Почти всё верно';
  if (share >= 0.5) return 'Больше половины';
  return 'Есть куда расти';
}

const verdict: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: 25,
  lineHeight: 1.2,
  fontWeight: 500,
  textAlign: 'center',
  marginTop: 20,
};

const label: CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '.1em',
  textTransform: 'uppercase',
  color: 'var(--c-muted)',
  marginBottom: 10,
};

const list: CSSProperties = {
  background: 'var(--c-surface)',
  border: '1px solid var(--c-line)',
  borderRadius: 'var(--r-card)',
  overflow: 'hidden',
};

const row: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '12px 14px',
  borderTop: '1px solid var(--c-line)',
  fontSize: 15,
};

const rowCountry: CSSProperties = { fontWeight: 600, flex: '0 1 auto' };
const rowCapital: CSSProperties = {
  marginLeft: 'auto',
  color: 'var(--c-ink2)',
  textAlign: 'right',
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
const secondary: CSSProperties = {
  width: '100%',
  height: 46,
  borderRadius: 'var(--r-button)',
  background: 'var(--c-surface)',
  border: '1px solid var(--c-line)',
  fontSize: 16,
  fontWeight: 600,
};
const quiet: CSSProperties = {
  width: '100%',
  height: 46,
  borderRadius: 'var(--r-button)',
  color: 'var(--c-ink2)',
  fontSize: 16,
  fontWeight: 600,
};
