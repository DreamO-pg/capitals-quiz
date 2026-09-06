import type { CSSProperties, ReactNode } from 'react';

/**
 * Оболочка экрана: отступ под шапку телеграма сверху, поля 24,
 * скролл живёт здесь, а не в body.
 */
export function Screen({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  return (
    <div style={wrap}>
      <div style={scroll}>{children}</div>
      {footer ? <div style={footerBar}>{footer}</div> : null}
    </div>
  );
}

const wrap: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  minHeight: 0,
  paddingTop: 'var(--tg-inset-top)',
};

const scroll: CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  WebkitOverflowScrolling: 'touch',
  padding: '16px var(--screen-pad) 24px',
};

const footerBar: CSSProperties = {
  padding: '12px var(--screen-pad)',
  paddingBottom: 'calc(12px + var(--tg-inset-bottom))',
  background: 'var(--c-bg)',
  borderTop: '1px solid var(--c-line)',
};

/** Заглушка на время сборки каркаса. Уйдёт по мере наполнения экранов. */
export function Placeholder({ title, hint }: { title: string; hint: string }) {
  return (
    <div>
      <h1
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 32,
          fontWeight: 500,
          lineHeight: 1.1,
          margin: '0 0 8px',
        }}
      >
        {title}
      </h1>
      <p style={{ margin: 0, fontSize: 13, color: 'var(--c-muted)' }}>{hint}</p>
    </div>
  );
}
