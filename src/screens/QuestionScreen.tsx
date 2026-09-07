import type { CSSProperties } from 'react';
import { Flag } from '../components/Flag';
import { IconCheck, IconCross } from '../components/icons';
import { MapCard } from '../components/MapCard';
import { MapQuestion } from '../components/MapQuestion';
import { RoundProgress } from '../components/RoundProgress';
import { Screen } from '../components/Screen';
import { contextLine } from '../engine/context';
import { haptic } from '../telegram/webapp';
import type { Mode } from '../types';
import type { Game } from '../hooks/useGame';

/** Что от игрока хотят. Стоит над предметом вопроса, поэтому формулировка — повелительная. */
const PROMPT: Record<Mode, string> = {
  country_to_capital: 'Назови столицу',
  capital_to_country: 'Чья это столица?',
  flag_to_country: 'Чей это флаг?',
  country_to_map: 'Найди на карте',
};

/**
 * Вопрос и его разбор — один экран, без перехода и без панели поверх.
 *
 * После ответа варианты остаются на месте и держат свои цвета: именно по ним
 * читается «верно или нет», и закрывать их чем бы то ни было нельзя. Карта
 * занимает пустоту, которая до ответа висела между названием страны и вариантами.
 */
export function QuestionScreen({ game }: { game: Game }) {
  const q = game.question;

  // Своего состояния у экрана нет: что выбрано, знает движок.
  const answered = game.phase === 'answer';
  const answer = answered ? game.lastAnswer : null;
  const chosen = answer?.chosenIndex ?? null;

  if (!q) return null;

  const choose = (index: number) => {
    if (answered) return;
    if (index === q.correctIndex) haptic.success();
    else haptic.error();
    game.answer(index);
  };

  const country = q.country;
  const onMap = q.mode === 'country_to_map';
  const showsFlag = q.mode === 'country_to_capital' || onMap;
  const subject = q.mode === 'capital_to_country' ? country.capitalRu : country.nameRu;
  const subjectEn = q.mode === 'capital_to_country' ? country.capitalEn : country.nameEn;

  return (
    <Screen
      footer={
        answered ? (
          <button
            style={primary}
            onClick={() => {
              haptic.impact('light');
              game.next();
            }}
          >
            Дальше
          </button>
        ) : undefined
      }
    >
      <RoundProgress current={game.position.current} total={game.position.total} />

      {answered && answer ? (
        <div style={head}>
          <div style={verdictRow}>
            <Flag code={country.code} size="md" />
            <span
              style={{ ...verdict, color: answer.correct ? 'var(--c-ok)' : 'var(--c-bad)' }}
            >
              {answer.correct ? 'Верно' : 'Неверно'}
            </span>
          </div>
          <div style={pair}>
            {country.nameRu} <span style={pairDash}>—</span>{' '}
            <span style={pairCapital}>{country.capitalRu}</span>
          </div>
          <div style={latin}>
            {country.nameEn} — {country.capitalEn}
          </div>
        </div>
      ) : (
        <div key={game.position.current} style={{ ...head, animation: 'question-in 180ms ease-out both' }}>
          <div style={prompt}>{PROMPT[q.mode]}</div>
          <div style={{ marginTop: 18 }}>
            {q.mode === 'flag_to_country' ? (
              <Flag code={country.code} size="xl" />
            ) : (
              <>
                {showsFlag ? <Flag code={country.code} size="lg" /> : null}
                <h1 style={{ ...title, marginTop: showsFlag ? 14 : 0 }}>{subject}</h1>
                <div style={subtitle}>{subjectEn}</div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Середина: до ответа её занимают растянутые варианты, после — карта.
          Скроллится только она, поэтому варианты и «Дальше» всегда на виду. */}
      {onMap ? (
        <div style={middle}>
          <MapQuestion
            options={q.optionCountries}
            answered={answered}
            correctIndex={q.correctIndex}
            chosenIndex={chosen}
            onPick={choose}
          />
        </div>
      ) : answered ? (
        <div style={middle}>
          <div style={mapSlot}>
            <MapCard
              country={country}
              wrong={answer && !answer.correct ? q.optionCountries[answer.chosenIndex] : null}
              height={200}
            />
          </div>
          <div style={context}>{contextLine(country)}</div>
          {country.note ? <p style={note}>{country.note}</p> : null}
        </div>
      ) : null}

      {onMap && answered ? (
        <div style={{ paddingTop: 12 }}>
          <div style={context}>{contextLine(country)}</div>
          {country.note ? <p style={note}>{country.note}</p> : null}
        </div>
      ) : null}

      {!onMap ? (
        <div style={answered ? optionsDone : optionsLive}>
          {q.options.map((option, i) => (
            <Option
              key={`${game.position.current}-${option}`}
              text={option}
              state={optionState(i, chosen, q.correctIndex)}
              stretch={!answered}
              onClick={() => choose(i)}
            />
          ))}
        </div>
      ) : null}
    </Screen>
  );
}

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
  stretch,
  onClick,
}: {
  text: string;
  state: OptionState;
  stretch: boolean;
  onClick: () => void;
}) {
  const look = LOOK[state];
  return (
    <button
      onClick={onClick}
      disabled={state !== 'idle'}
      style={{
        ...option,
        // До ответа варианты делят свободную высоту: иначе на высоком экране
        // между вопросом и ними висит добрая треть пустого места.
        flex: stretch ? '1 1 0' : '0 0 auto',
        minHeight: stretch ? 56 : 46,
        maxHeight: stretch ? 72 : undefined,
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
  dimmed: {
    background: 'var(--c-surface)',
    border: 'var(--c-line)',
    color: 'var(--c-ink-disabled)',
  },
};

const head: CSSProperties = { flex: '0 0 auto' };

const middle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  WebkitOverflowScrolling: 'touch',
  display: 'flex',
  flexDirection: 'column',
};

const prompt: CSSProperties = { fontSize: 13, color: 'var(--c-muted)', marginTop: 20 };

const title: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: 46,
  lineHeight: 1.06,
  fontWeight: 500,
  margin: 0,
  letterSpacing: '-0.01em',
};

const subtitle: CSSProperties = { fontSize: 15, color: 'var(--c-muted)', marginTop: 6 };

const verdictRow: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  marginTop: 18,
};

const verdict: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: 25,
  lineHeight: 1.2,
  fontWeight: 500,
};

const pair: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: 26,
  fontWeight: 500,
  lineHeight: 1.2,
  marginTop: 8,
};

const pairDash: CSSProperties = { color: 'var(--c-muted)' };
const pairCapital: CSSProperties = { color: 'var(--c-accent)' };
const latin: CSSProperties = { fontSize: 13, color: 'var(--c-muted)', marginTop: 4 };

const mapSlot: CSSProperties = {
  marginTop: 14,
  animation: 'map-in 220ms cubic-bezier(.2,.7,.3,1) both',
};

const context: CSSProperties = {
  fontSize: 15,
  color: 'var(--c-ink2)',
  marginTop: 12,
  lineHeight: 1.4,
};

const note: CSSProperties = {
  fontSize: 15,
  color: 'var(--c-ink2)',
  lineHeight: 1.45,
  margin: '12px 0 0',
  paddingTop: 12,
  borderTop: '1px solid var(--c-line)',
};

const optionsLive: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  flex: 1,
  minHeight: 0,
  paddingTop: 24,
  // Варианты растягиваются, но не безгранично: строка в сто пикселей высотой
  // выглядит нелепо. Остаток высоты делим поровну сверху и снизу, чтобы он не
  // собирался в одну заметную дыру.
  justifyContent: 'center',
};

/**
 * После ответа список уплотняется: попадать пальцем в него уже не нужно,
 * а освободившиеся пиксели уходят карте и пояснению.
 */
const optionsDone: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  flex: '0 0 auto',
  paddingTop: 12,
};

const option: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  width: '100%',
  padding: '10px 16px',
  textAlign: 'left',
  border: '1px solid',
  borderRadius: 'var(--r-row)',
  fontSize: 17,
  fontWeight: 500,
  transition: 'background-color 120ms linear, border-color 120ms linear, color 120ms linear',
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
