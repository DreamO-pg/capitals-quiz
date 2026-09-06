import type { CSSProperties } from 'react';
import { Screen, ScreenTitle } from '../components/Screen';
import { haptic } from '../telegram/webapp';
import { IconPlus } from '../components/icons';
import { useHomeScreen } from '../hooks/useHomeScreen';
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
  const learned = [...game.progress.values()].filter((c) => c.box >= 4).length;
  const home = useHomeScreen();

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
      <ScreenTitle>Столицы</ScreenTitle>

      {stats.answers > 0 ? (
        <div style={summary}>
          <Stat value={`${accuracy}%`} caption="точность" />
          <Stat value={String(stats.streak)} caption="серия" warm={stats.streak >= 3} />
          <Stat value={String(learned)} caption="выучено" />
        </div>
      ) : (
        <p style={intro}>
          195 стран, четыре режима. Раунд — десять вопросов, ошибки возвращаются чаще
          верных ответов.
        </p>
      )}

      {home.canOffer ? (
        <button
          style={homeRow}
          onClick={() => {
            haptic.impact('light');
            home.add();
          }}
        >
          <span style={{ display: 'flex', color: 'var(--c-accent)' }}>
            <IconPlus size={20} />
          </span>
          Добавить на экран «Домой»
        </button>
      ) : null}

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

function Stat({ value, caption, warm }: { value: string; caption: string; warm?: boolean }) {
  return (
    <div style={statBox}>
      <div style={{ ...statValue, color: warm ? 'var(--c-warm)' : 'var(--c-ink)' }}>{value}</div>
      <div style={statCaption}>{caption}</div>
    </div>
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

const summary: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr 1fr',
  gap: 8,
  marginTop: 18,
};

const statBox: CSSProperties = {
  background: 'var(--c-surface)',
  border: '1px solid var(--c-line)',
  borderRadius: 'var(--r-card)',
  padding: '12px 10px',
  textAlign: 'center',
};

const statValue: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: 26,
  fontWeight: 500,
  lineHeight: 1.1,
};

const statCaption: CSSProperties = {
  fontSize: 13,
  color: 'var(--c-muted)',
  marginTop: 2,
  whiteSpace: 'nowrap',
};

const intro: CSSProperties = {
  fontSize: 15,
  color: 'var(--c-ink2)',
  lineHeight: 1.45,
  margin: '12px 0 0',
};

const homeRow: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  width: '100%',
  marginTop: 16,
  padding: '12px 14px',
  background: 'var(--c-accent-bg)',
  border: 'none',
  borderRadius: 'var(--r-row)',
  fontSize: 15,
  fontWeight: 600,
  color: 'var(--c-ink)',
  textAlign: 'left',
};

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
