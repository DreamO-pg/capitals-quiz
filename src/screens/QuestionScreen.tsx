import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { FitTitle } from '../components/FitTitle';
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
                <FitTitle text={subject} style={{ marginTop: showsFlag ? 14 : 0 }} />
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
        <ScrollArea>
          <div style={mapSlot}>
            <MapCard
              country={country}
              wrong={answer && !answer.correct ? q.optionCountries[answer.chosenIndex] : null}
            />
          </div>
          <div style={context}>{contextLine(country)}</div>
          {country.note ? <p style={note}>{country.note}</p> : null}
        </ScrollArea>
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
              onClick={() => choose(i)}
            />
          ))}
        </div>
      ) : null}
    </Screen>
  );
}

/**
 * Прокручиваемая середина экрана с подсказкой, что ниже есть продолжение.
 *
 * Место после ответа кончается: карта, контекст, пояснение и четыре варианта
 * на невысоком экране разом не помещаются. Обрезать пояснение молча нельзя —
 * текст, оборванный на полуслове, читается как поломка, а не как «прокрути».
 */
function ScrollArea({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState(false);

  const check = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setMore(el.scrollHeight - el.scrollTop - el.clientHeight > 4);
  }, []);

  useEffect(() => {
    check();
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(check);
    observer.observe(el);
    for (const child of Array.from(el.children)) observer.observe(child);
    return () => observer.disconnect();
  }, [check, children]);

  return (
    <div style={scrollWrap}>
      <div ref={ref} style={middle} onScroll={check}>
        {children}
      </div>
      {more ? <div style={fade} /> : null}
    </div>
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
  dimmed: {
    background: 'var(--c-surface)',
    border: 'var(--c-line)',
    color: 'var(--c-ink-disabled)',
  },
};

const head: CSSProperties = { flex: '0 0 auto' };

const scrollWrap: CSSProperties = {
  position: 'relative',
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
};

/** Мягкий край: показывает, что содержимое продолжается, без полосы прокрутки. */
const fade: CSSProperties = {
  position: 'absolute',
  left: 0,
  right: 0,
  bottom: 0,
  height: 28,
  pointerEvents: 'none',
  background: 'linear-gradient(to bottom, rgba(250,249,245,0), var(--c-bg))',
};

const middle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  WebkitOverflowScrolling: 'touch',
  display: 'flex',
  flexDirection: 'column',
};

const prompt: CSSProperties = { fontSize: 13, color: 'var(--c-muted)', marginTop: 20 };

const subtitle: CSSProperties = { fontSize: 15, color: 'var(--c-muted)', marginTop: 6 };

const verdictRow: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  marginTop: 12,
};

const verdict: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: 25,
  lineHeight: 1.2,
  fontWeight: 500,
};

const pair: CSSProperties = {
  fontFamily: 'var(--font-display)',
  overflowWrap: 'anywhere',
  fontSize: 26,
  fontWeight: 500,
  lineHeight: 1.2,
  marginTop: 8,
};

const pairDash: CSSProperties = { color: 'var(--c-muted)' };
const pairCapital: CSSProperties = { color: 'var(--c-accent)' };
const latin: CSSProperties = { fontSize: 13, color: 'var(--c-muted)', marginTop: 4 };

const mapSlot: CSSProperties = {
  // Карта забирает свободное место, но сжиматься не даёт: иначе на низком экране
  // она схлопывается в полоску, а контекст и пояснение выдавливаются совсем.
  // Расти — да, ужиматься — нет, и тогда лишнее честно уходит в прокрутку.
  display: 'flex',
  flex: '1 0 160px',
  marginTop: 14,
  animation: 'map-in 220ms cubic-bezier(.2,.7,.3,1) both',
};

const context: CSSProperties = {
  flex: '0 0 auto',
  fontSize: 15,
  color: 'var(--c-ink2)',
  marginTop: 10,
  lineHeight: 1.4,
};

const note: CSSProperties = {
  flex: '0 0 auto',
  fontSize: 14,
  color: 'var(--c-ink2)',
  lineHeight: 1.4,
  margin: '10px 0 0',
  paddingTop: 10,
  borderTop: '1px solid var(--c-line)',
};

/**
 * До ответа список стоит по центру свободной высоты.
 *
 * Растягивать сами варианты нельзя: после ответа им приходится ужиматься, чтобы
 * освободить место карте, и скачок высоты в глаза бросается сильнее, чем пустота,
 * ради которой всё затевалось. Поэтому размер у варианта один и тот же всегда,
 * а свободное место просто делится поровну сверху и снизу.
 */
const optionsLive: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  flex: 1,
  minHeight: 0,
  paddingTop: 24,
  justifyContent: 'center',
};

const optionsDone: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  flex: '0 0 auto',
  paddingTop: 14,
};

const option: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  width: '100%',
  // Один размер до и после ответа: скачок высоты бросается в глаза сильнее,
  // чем выигранные им пиксели. 52 — компромисс между удобством нажатия и
  // местом, которое после ответа нужно карте и пояснению.
  minHeight: 52,
  flex: '0 0 auto',
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
