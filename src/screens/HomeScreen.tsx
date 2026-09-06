import type { CSSProperties } from 'react';
import { Placeholder, Screen } from '../components/Screen';
import { haptic } from '../telegram/webapp';
import { MODE_LABEL, REGION_LABEL } from '../types';
import type { Difficulty, Mode, RegionFilter } from '../types';
import type { Game } from '../hooks/useGame';

const MODES: Mode[] = [
  'country_to_capital',
  'capital_to_country',
  'flag_to_country',
  'country_to_map',
];
const REGIONS: RegionFilter[] = ['world', 'europe', 'asia', 'africa', 'americas', 'oceania'];
const DIFFICULTIES: [Difficulty, string][] = [
  ['easy', 'Только простые'],
  ['all', 'Все страны'],
];

/** Главная: настройки раунда и короткая сводка. */
export function HomeScreen({ game, openStats }: { game: Game; openStats: () => void }) {
  const { settings, stats } = game;
  const accuracy = stats.answers > 0 ? Math.round((100 * stats.correct) / stats.answers) : 0;

  const pick = <T,>(value: T, apply: (v: T) => void) => () => {
    haptic.selection();
    apply(value);
  };

  return (
    <Screen
      footer={
        <div style={{ display: 'grid', gap: 8 }}>
          <button
            style={primary}
            onClick={() => {
              haptic.impact('light');
              game.startRound();
            }}
          >
            Играть
          </button>
          {game.weak.length > 0 ? (
            <button style={secondary} onClick={game.startRetryRound}>
              Повторить ошибки · {game.weak.length}
            </button>
          ) : null}
        </div>
      }
    >
      <Placeholder title="Столицы" hint={`Точность ${accuracy}% · серия ${stats.streak}`} />

      <Section title="Режим">
        {MODES.map((m) => (
          <Chip
            key={m}
            active={settings.mode === m}
            onClick={pick(m, (mode) => game.changeSettings({ mode }))}
          >
            {MODE_LABEL[m]}
          </Chip>
        ))}
      </Section>

      <Section title="Регион">
        {REGIONS.map((r) => (
          <Chip
            key={r}
            active={settings.region === r}
            onClick={pick(r, (region) => game.changeSettings({ region }))}
          >
            {REGION_LABEL[r]}
          </Chip>
        ))}
      </Section>

      <Section title="Сложность">
        {DIFFICULTIES.map(([d, text]) => (
          <Chip
            key={d}
            active={settings.difficulty === d}
            onClick={pick(d, (difficulty) => game.changeSettings({ difficulty }))}
          >
            {text}
          </Chip>
        ))}
      </Section>

      <div style={{ height: 24 }} />
      <button style={secondary} onClick={openStats}>
        Статистика
      </button>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 24 }}>
      <div style={label}>{title}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{children}</div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 12px',
        borderRadius: 'var(--r-chip)',
        fontSize: 15,
        fontWeight: 600,
        background: active ? 'var(--c-accent-bg)' : 'var(--c-surface)',
        border: `1px solid ${active ? 'var(--c-accent)' : 'var(--c-line)'}`,
        color: active ? 'var(--c-accent)' : 'var(--c-ink)',
      }}
    >
      {children}
    </button>
  );
}

const label: CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '.1em',
  textTransform: 'uppercase',
  color: 'var(--c-muted)',
  marginBottom: 8,
};
const primary: CSSProperties = {
  width: '100%', height: 56, borderRadius: 'var(--r-button)',
  background: 'var(--c-accent)', color: '#fff', fontSize: 16, fontWeight: 600,
};
const secondary: CSSProperties = {
  width: '100%', height: 46, borderRadius: 'var(--r-button)',
  background: 'var(--c-surface)', border: '1px solid var(--c-line)', fontSize: 16, fontWeight: 600,
};
