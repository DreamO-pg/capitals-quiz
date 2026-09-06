import type { CSSProperties } from 'react';
import { Placeholder, Screen } from '../components/Screen';
import { haptic, isTelegram, platform, version } from '../telegram/webapp';
import type { Screen as ScreenName } from '../types';

/**
 * Каркас главной. Выбор режима/региона/сложности и сводка приедут этапами 3 и 6 —
 * пока здесь только навигация, чтобы проверить связку с телеграмом.
 */
export function HomeScreen({ go }: { go: (s: ScreenName) => void }) {
  return (
    <Screen
      footer={
        <button
          style={primary}
          onClick={() => {
            haptic.impact('light');
            go('question');
          }}
        >
          Играть
        </button>
      }
    >
      <Placeholder title="Столицы" hint="Каркас собран. Экраны наполняются по этапам." />

      <div style={{ height: 24 }} />

      <button style={secondary} onClick={() => go('stats')}>
        Статистика
      </button>

      <div style={{ height: 28 }} />

      {/* Служебная плашка — видно, что SDK подцепился. Уберётся на этапе 7. */}
      <div style={debugCard}>
        <div style={debugLabel}>Среда</div>
        <div style={debugRow}>
          <span>Окружение</span>
          <b>{isTelegram ? 'Telegram' : 'Браузер'}</b>
        </div>
        <div style={debugRow}>
          <span>Платформа</span>
          <b>{platform}</b>
        </div>
        <div style={debugRow}>
          <span>Bot API</span>
          <b>{version}</b>
        </div>
      </div>
    </Screen>
  );
}

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
  color: 'var(--c-ink)',
  fontSize: 16,
  fontWeight: 600,
};

const debugCard: CSSProperties = {
  background: 'var(--c-surface)',
  border: '1px solid var(--c-line)',
  borderRadius: 'var(--r-card)',
  padding: 16,
};

const debugLabel: CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '.1em',
  textTransform: 'uppercase',
  color: 'var(--c-muted)',
  marginBottom: 10,
};

const debugRow: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: 15,
  padding: '4px 0',
  color: 'var(--c-ink2)',
};
