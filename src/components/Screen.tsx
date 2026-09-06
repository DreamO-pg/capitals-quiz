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
  // Колонка нужна экрану вопроса: варианты прижимаются к низу через marginTop: auto.
  display: 'flex',
  flexDirection: 'column',
};

const footerBar: CSSProperties = {
  padding: '12px var(--screen-pad)',
  paddingBottom: 'calc(12px + var(--tg-inset-bottom))',
  background: 'var(--c-bg)',
  borderTop: '1px solid var(--c-line)',
};

/** Заголовок экрана. Literata 32, единый для всех экранов кроме вопроса. */
export function ScreenTitle({ children }: { children: ReactNode }) {
  return (
    <h1
      style={{
        fontFamily: 'var(--font-display)',
        fontSize: 32,
        fontWeight: 500,
        lineHeight: 1.1,
        margin: 0,
      }}
    >
      {children}
    </h1>
  );
}
