import type { CSSProperties } from 'react';
import { Flag } from './Flag';
import { MapCard } from './MapCard';
import { contextLine } from '../engine/context';
import { haptic } from '../telegram/webapp';
import type { Answer } from '../engine/model';

/**
 * Итог вопроса — панелью поверх того же экрана, а не отдельной страницей.
 * Вопрос остаётся виден сверху: так связь «страна → где она на карте»
 * не рвётся переходом, и ответ читается сразу после нажатия.
 */
export function AnswerSheet({ answer, onNext }: { answer: Answer; onNext: () => void }) {
  const { question, correct } = answer;
  const country = question.country;
  const chosen = question.options[answer.chosenIndex];

  return (
    <div style={sheet}>
      <div style={grabber} />

      <div style={scroll}>
        <div style={verdictRow}>
          <Flag code={country.code} size="md" />
          <span style={{ ...verdict, color: correct ? 'var(--c-ok)' : 'var(--c-bad)' }}>
            {correct ? 'Верно' : 'Неверно'}
          </span>
          {!correct ? <span style={chosenNote}>вместо «{chosen}»</span> : null}
        </div>

        <div style={pair}>
          <span style={pairCountry}>{country.nameRu}</span>
          <span style={pairDash}>—</span>
          <span style={pairCapital}>{country.capitalRu}</span>
        </div>
        <div style={latin}>
          {country.nameEn} — {country.capitalEn}
        </div>

        <div style={{ marginTop: 14 }}>
          <MapCard
            country={country}
            wrong={correct ? null : question.optionCountries[answer.chosenIndex]}
          />
        </div>

        <div style={context}>{contextLine(country)}</div>

        {country.note ? <p style={note}>{country.note}</p> : null}
      </div>

      <div style={footer}>
        <button
          style={primary}
          onClick={() => {
            haptic.impact('light');
            onNext();
          }}
        >
          Дальше
        </button>
      </div>
    </div>
  );
}

const sheet: CSSProperties = {
  position: 'absolute',
  left: 0,
  right: 0,
  bottom: 0,
  maxHeight: '78%',
  display: 'flex',
  flexDirection: 'column',
  background: 'var(--c-bg)',
  borderTopLeftRadius: 20,
  borderTopRightRadius: 20,
  borderTop: '1px solid var(--c-line)',
  // Единственная тень в игре: панель обязана читаться как слой над вопросом.
  boxShadow: '0 -8px 28px rgba(34,31,25,.10)',
  animation: 'sheet-in 220ms cubic-bezier(.2,.7,.3,1) both',
  // Выше 1000: столько Leaflet даёт своим контролам, и подпись карты из вопроса
  // иначе всплывает поверх панели прямо на кнопке «Дальше».
  zIndex: 1200,
};

const grabber: CSSProperties = {
  width: 36,
  height: 4,
  borderRadius: 999,
  background: 'var(--c-line)',
  margin: '8px auto 0',
  flex: '0 0 auto',
};

const scroll: CSSProperties = {
  overflowY: 'auto',
  WebkitOverflowScrolling: 'touch',
  padding: '12px var(--screen-pad) 4px',
  minHeight: 0,
};

const verdictRow: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  flexWrap: 'wrap',
};

const verdict: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: 25,
  lineHeight: 1.2,
  fontWeight: 500,
};

const chosenNote: CSSProperties = {
  fontSize: 14,
  color: 'var(--c-muted)',
};

const pair: CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  gap: 8,
  flexWrap: 'wrap',
  marginTop: 10,
};

const pairCountry: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: 26,
  fontWeight: 500,
  lineHeight: 1.15,
};

const pairDash: CSSProperties = { color: 'var(--c-muted)' };

const pairCapital: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: 26,
  fontWeight: 500,
  lineHeight: 1.15,
  color: 'var(--c-accent)',
};

const latin: CSSProperties = { fontSize: 13, color: 'var(--c-muted)', marginTop: 4 };

const context: CSSProperties = {
  fontSize: 15,
  color: 'var(--c-ink2)',
  marginTop: 14,
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

const footer: CSSProperties = {
  padding: '12px var(--screen-pad)',
  paddingBottom: 'calc(12px + var(--tg-inset-bottom))',
  flex: '0 0 auto',
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
