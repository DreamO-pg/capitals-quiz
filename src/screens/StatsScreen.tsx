import type { CSSProperties } from 'react';
import { Flag } from '../components/Flag';
import { Screen } from '../components/Screen';
import { BY_CODE } from '../data/countries';
import { REGION_LABEL } from '../types';
import type { Region } from '../types';
import type { Game } from '../hooks/useGame';

const REGIONS: Region[] = ['europe', 'asia', 'africa', 'americas', 'oceania'];

export function StatsScreen({ game }: { game: Game }) {
  const { stats, progress } = game;
  const accuracy = stats.answers > 0 ? Math.round((100 * stats.correct) / stats.answers) : 0;
  const learned = [...progress.values()].filter((c) => c.box >= 4).length;

  // Слабые вперёд самых слабых: сначала коробка, потом накопленные ошибки.
  const weak = game.weak
    .map((code) => ({ country: BY_CODE[code], card: progress.get(code)! }))
    .filter((x) => x.country)
    .sort((a, b) => a.card.box - b.card.box || b.card.errors - a.card.errors);

  return (
    <Screen>
      <h1 style={title}>Статистика</h1>

      <div style={tiles}>
        <Tile value={`${accuracy}%`} caption="точность" />
        <Tile value={String(stats.streak)} caption="серия" warm={stats.streak >= 3} />
        <Tile value={String(learned)} caption="выучено" />
      </div>

      <div style={{ marginTop: 28 }}>
        <div style={label}>Точность по регионам</div>
        {REGIONS.map((region) => {
          const cell = stats.byRegion[region];
          return (
            <RegionRow
              key={region}
              name={REGION_LABEL[region]}
              correct={cell?.correct ?? 0}
              total={cell?.total ?? 0}
            />
          );
        })}
      </div>

      {weak.length > 0 ? (
        <div style={{ marginTop: 28 }}>
          <div style={label}>Требуют повторения · {weak.length}</div>
          <div style={list}>
            {weak.slice(0, 30).map(({ country, card }, i) => (
              <div key={country.code} style={i === 0 ? { ...row, borderTop: 'none' } : row}>
                <Flag code={country.code} size="sm" />
                <span style={{ fontWeight: 600 }}>{country.nameRu}</span>
                <span style={rowRight}>
                  {country.capitalRu}
                  <span style={errors}> · {card.errors}</span>
                </span>
              </div>
            ))}
          </div>
          {weak.length > 30 ? (
            <div style={more}>и ещё {weak.length - 30}</div>
          ) : null}
        </div>
      ) : (
        <p style={empty}>
          {stats.answers === 0
            ? 'Сыграй раунд — здесь появится разбор по регионам и список того, что стоит повторить.'
            : 'Повторять пока нечего: всё, что встречалось, отвечено верно.'}
        </p>
      )}
    </Screen>
  );
}

function Tile({ value, caption, warm }: { value: string; caption: string; warm?: boolean }) {
  return (
    <div style={tile}>
      <div style={{ ...tileValue, color: warm ? 'var(--c-warm)' : 'var(--c-ink)' }}>{value}</div>
      <div style={tileCaption}>{caption}</div>
    </div>
  );
}

function RegionRow({ name, correct, total }: { name: string; correct: number; total: number }) {
  const share = total > 0 ? correct / total : 0;
  return (
    <div style={{ padding: '10px 0' }}>
      <div style={regionHead}>
        <span>{name}</span>
        <span style={{ color: total === 0 ? 'var(--c-muted)' : 'var(--c-ink2)' }}>
          {total === 0 ? '—' : `${Math.round(share * 100)}%`}
        </span>
      </div>
      <div style={track}>
        <div style={{ ...fill, width: `${share * 100}%` }} />
      </div>
    </div>
  );
}

const title: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: 32,
  fontWeight: 500,
  margin: '0 0 20px',
};

const tiles: CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 };

const tile: CSSProperties = {
  background: 'var(--c-surface)',
  border: '1px solid var(--c-line)',
  borderRadius: 'var(--r-card)',
  padding: '14px 12px',
  textAlign: 'center',
};

const tileValue: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: 26,
  fontWeight: 500,
  lineHeight: 1.1,
};

const tileCaption: CSSProperties = {
  fontSize: 13,
  color: 'var(--c-muted)',
  marginTop: 4,
  whiteSpace: 'nowrap',
};

const label: CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '.1em',
  textTransform: 'uppercase',
  color: 'var(--c-muted)',
  marginBottom: 8,
};

const regionHead: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: 15,
  fontWeight: 600,
  marginBottom: 6,
};

const track: CSSProperties = {
  height: 6,
  borderRadius: 999,
  background: 'var(--c-sunken)',
  overflow: 'hidden',
};

const fill: CSSProperties = { height: '100%', background: 'var(--c-accent)', borderRadius: 999 };

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

const rowRight: CSSProperties = { marginLeft: 'auto', color: 'var(--c-ink2)', textAlign: 'right' };
const errors: CSSProperties = { color: 'var(--c-bad)' };
const more: CSSProperties = { fontSize: 13, color: 'var(--c-muted)', marginTop: 10 };
const empty: CSSProperties = {
  fontSize: 15,
  color: 'var(--c-ink2)',
  lineHeight: 1.45,
  marginTop: 28,
};
