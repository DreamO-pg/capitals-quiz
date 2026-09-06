import type { CSSProperties } from 'react';
import { Flag } from '../components/Flag';
import { MapCard } from '../components/MapCard';
import { Screen } from '../components/Screen';
import { contextLine } from '../engine/context';
import type { Game } from '../hooks/useGame';

export function AnswerScreen({ game }: { game: Game }) {
  const a = game.lastAnswer;
  if (!a) return null;
  const { question, correct } = a;
  const country = question.country;

  return (
    <Screen
      footer={
        <button style={primary} onClick={game.next}>
          Дальше
        </button>
      }
    >
      <div style={verdictRow}>
        <Flag code={country.code} size="md" />
        <span style={{ ...verdict, color: correct ? 'var(--c-ok)' : 'var(--c-bad)' }}>
          {correct ? 'Верно' : 'Неверно'}
        </span>
      </div>

      <div style={card}>
        <div style={pairRow}>
          <span style={pairLabel}>Страна</span>
          <span style={pairValue}>{country.nameRu}</span>
        </div>
        <div style={divider} />
        <div style={pairRow}>
          <span style={pairLabel}>Столица</span>
          <span style={pairValue}>{country.capitalRu}</span>
        </div>
        <div style={latin}>
          {country.nameEn} — {country.capitalEn}
        </div>
      </div>

      {!correct ? (
        <div style={chosenRow}>
          Ты выбрал <b style={{ fontWeight: 600 }}>{question.options[a.chosenIndex]}</b>
        </div>
      ) : null}

      <div style={mapSlot}>
        <MapCard country={country} wrong={correct ? null : question.optionCountries[a.chosenIndex]} />
      </div>

      <div style={context}>{contextLine(country)}</div>

      {country.note ? <p style={note}>{country.note}</p> : null}
    </Screen>
  );
}

const verdictRow: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  marginTop: 8,
};

const verdict: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: 25,
  lineHeight: 1.2,
  fontWeight: 500,
};

const card: CSSProperties = {
  marginTop: 20,
  background: 'var(--c-surface)',
  border: '1px solid var(--c-line)',
  borderRadius: 'var(--r-card)',
  padding: 16,
};

const pairRow: CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  gap: 16,
};

const pairLabel: CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '.1em',
  textTransform: 'uppercase',
  color: 'var(--c-muted)',
  flex: '0 0 auto',
};

const pairValue: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: 26,
  fontWeight: 500,
  lineHeight: 1.15,
  textAlign: 'right',
};

const divider: CSSProperties = {
  height: 1,
  background: 'var(--c-line)',
  margin: '12px 0',
};

const latin: CSSProperties = {
  fontSize: 13,
  color: 'var(--c-muted)',
  marginTop: 12,
};

const chosenRow: CSSProperties = {
  fontSize: 15,
  color: 'var(--c-ink2)',
  marginTop: 12,
};

const mapSlot: CSSProperties = {
  marginTop: 20,
  // Карта выезжает снизу — единственное движение на этом экране.
  animation: 'map-in 220ms cubic-bezier(.2,.7,.3,1) both',
};

const context: CSSProperties = {
  fontSize: 15,
  color: 'var(--c-ink2)',
  marginTop: 20,
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

const primary: CSSProperties = {
  width: '100%',
  height: 56,
  borderRadius: 'var(--r-button)',
  background: 'var(--c-accent)',
  color: '#fff',
  fontSize: 16,
  fontWeight: 600,
};
