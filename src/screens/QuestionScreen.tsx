import type { CSSProperties } from 'react';
import { Screen } from '../components/Screen';
import type { Game } from '../hooks/useGame';

/**
 * Временная разметка этапа 3: движок уже настоящий, оформление приедет на этапе 4.
 * Нужна, чтобы полный раунд можно было пройти и проверить руками.
 */
export function QuestionScreen({ game }: { game: Game }) {
  const q = game.question;
  if (!q) return null;

  const subject =
    q.mode === 'country_to_capital' || q.mode === 'flag_to_country' || q.mode === 'country_to_map'
      ? q.country.nameRu
      : q.country.capitalRu;

  return (
    <Screen>
      <div style={counter}>
        {game.position.current} из {game.position.total}
        {q.isRetry ? ' · повтор' : ''}
      </div>
      <h1 style={title}>{subject}</h1>
      <div style={{ display: 'grid', gap: 8, marginTop: 24 }}>
        {q.options.map((option, i) => (
          <button key={option} style={optionButton} onClick={() => game.answer(i)}>
            {option}
          </button>
        ))}
      </div>
    </Screen>
  );
}

const counter: CSSProperties = {
  fontSize: 13,
  color: 'var(--c-muted)',
};

const title: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: 46,
  lineHeight: 1.06,
  fontWeight: 500,
  margin: '8px 0 0',
};

const optionButton: CSSProperties = {
  minHeight: 46,
  padding: '12px 16px',
  textAlign: 'left',
  background: 'var(--c-surface)',
  border: '1px solid var(--c-line)',
  borderRadius: 'var(--r-row)',
  fontSize: 17,
  fontWeight: 500,
};
