import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Flag } from '../components/Flag';
import { MapQuestion } from '../components/MapQuestion';
import { IconCheck, IconCross } from '../components/icons';
import { RoundProgress } from '../components/RoundProgress';
import { Screen } from '../components/Screen';
import { haptic } from '../telegram/webapp';
import type { Mode } from '../types';
import type { Game } from '../hooks/useGame';

/** Сколько держим подсветку, прежде чем показать разбор. */
const HIGHLIGHT_MS = 520;

export function QuestionScreen({ game }: { game: Game }) {
  const q = game.question;
  const [chosen, setChosen] = useState<number | null>(null);
  const timer = useRef<number | null>(null);

  // Новый вопрос — снимаем подсветку. Ключ — позиция в раунде, а не страна:
  // повтор той же страны внутри раунда обязан сбросить состояние.
  useEffect(() => {
    setChosen(null);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [game.position.current, q?.country.code]);

  if (!q) return null;

  const answered = chosen !== null;

  const choose = (index: number) => {
    if (answered) return;
    setChosen(index);
    // Отклик сразу, вместе с подсветкой: задержка тут читается как лаг.
    if (index === q.correctIndex) haptic.success();
    else haptic.error();
    timer.current = window.setTimeout(() => game.answer(index), HIGHLIGHT_MS);
  };

  const showsFlag = q.mode === 'country_to_capital' || q.mode === 'country_to_map';
  const subject = q.mode === 'capital_to_country' ? q.country.capitalRu : q.country.nameRu;
  const subjectEn = q.mode === 'capital_to_country' ? q.country.capitalEn : q.country.nameEn;

  return (
    <Screen>
      <RoundProgress current={game.position.current} total={game.position.total} />

      {/* Ключ по номеру вопроса: смена вопроса должна перезапускать появление,
          иначе два подряд вопроса об одной стране визуально сливаются. */}
      <div key={game.position.current} style={appear}>
        <div style={prompt}>{PROMPT[q.mode]}</div>

      <div style={{ marginTop: 18 }}>
        {q.mode === 'flag_to_country' ? (
          <Flag code={q.country.code} size="xl" />
        ) : (
          <>
            {showsFlag ? <Flag code={q.country.code} size="lg" /> : null}
            <h1 style={{ ...title, marginTop: showsFlag ? 14 : 0 }}>{subject}</h1>
            <div style={subtitle}>{subjectEn}</div>
          </>
        )}
        </div>
      </div>

      {q.mode === 'country_to_map' ? (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, marginTop: 20 }}>
          <MapQuestion
            options={q.optionCountries}
            answered={answered}
            correctIndex={q.correctIndex}
            chosenIndex={chosen}
            onPick={choose}
          />
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 8, marginTop: 'auto', paddingTop: 28 }}>
          {q.options.map((option, i) => (
            <Option
              key={`${game.position.current}-${option}`}
              text={option}
              state={optionState(i, chosen, q.correctIndex)}
              onClick={() => choose(i)}
            />
          ))}
        </div>
      )}
    </Screen>
  );
}

/** Что от игрока хотят. Стоит над предметом вопроса, поэтому формулировка — повелительная. */
const PROMPT: Record<Mode, string> = {
  country_to_capital: 'Назови столицу',
  capital_to_country: 'Чья это столица?',
  flag_to_country: 'Чей это флаг?',
  country_to_map: 'Найди на карте',
};

type OptionState = 'idle' | 'correct' | 'wrong' | 'dimmed';

function optionState(index: number, chosen: number | null, correct: number): OptionState {
  if (chosen === null) return 'idle';
  if (index === correct) return 'correct';
  if (index === chosen) return 'wrong';
  return 'dimmed';
}

function Option({
  text,
  state,
  onClick,
}: {
  text: string;
  state: OptionState;
  onClick: () => void;
}) {
  const look = LOOK[state];
  return (
    <button
      onClick={onClick}
      disabled={state !== 'idle'}
      style={{
        ...option,
        background: look.background,
        borderColor: look.border,
        color: look.color,
      }}
    >
      <span>{text}</span>
      {state === 'correct' ? (
        <span style={{ color: 'var(--c-ok)', display: 'flex' }}>
          <IconCheck size={22} />
        </span>
      ) : null}
      {state === 'wrong' ? (
        <span style={{ color: 'var(--c-bad)', display: 'flex' }}>
          <IconCross size={22} />
        </span>
      ) : null}
    </button>
  );
}

const LOOK: Record<OptionState, { background: string; border: string; color: string }> = {
  idle: { background: 'var(--c-surface)', border: 'var(--c-line)', color: 'var(--c-ink)' },
  correct: { background: 'var(--c-ok-bg)', border: 'var(--c-ok)', color: 'var(--c-ink)' },
  wrong: { background: 'var(--c-bad-bg)', border: 'var(--c-bad)', color: 'var(--c-ink)' },
  // После ответа остальные варианты гаснут, но остаются читаемыми.
  dimmed: {
    background: 'var(--c-surface)',
    border: 'var(--c-line)',
    color: 'var(--c-ink-disabled)',
  },
};

const appear: CSSProperties = {
  animation: 'question-in 180ms ease-out both',
};

const prompt: CSSProperties = {
  fontSize: 13,
  color: 'var(--c-muted)',
  marginTop: 20,
};

const title: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: 46,
  lineHeight: 1.06,
  fontWeight: 500,
  margin: 0,
  letterSpacing: '-0.01em',
};

const subtitle: CSSProperties = {
  fontSize: 15,
  color: 'var(--c-muted)',
  marginTop: 6,
};

const option: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  width: '100%',
  minHeight: 56,
  padding: '14px 16px',
  textAlign: 'left',
  border: '1px solid',
  borderRadius: 'var(--r-row)',
  fontSize: 17,
  fontWeight: 500,
  // Подсветка мгновенная, но не рубленая: только цвет, без движения.
  transition: 'background-color 120ms linear, border-color 120ms linear, color 120ms linear',
};
