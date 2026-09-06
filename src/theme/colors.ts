/**
 * Палитра игры. Тема фиксированно светлая: themeParams телеграма игнорируем,
 * иначе в тёмной теме клиента бумажный фон поедет в серое.
 *
 * accent / ok / bad построены в oklch с одной светлотой L 0.54 — на бумажном
 * фоне они звучат одним голосом. Не подменять на системные синий/зелёный/красный.
 */
export const colors = {
  bg: '#FAF9F5', // тёплая бумага, фон экрана (не чистый белый)
  surface: '#FFFFFF', // карточки, варианты ответа
  sunken: '#F4F2ED', // подложка сегментированного контрола
  line: '#E2DFD8', // разделители и рамки
  ink: '#221F19', // основной текст
  ink2: '#5B5752', // вторичный текст
  muted: '#888681', // подписи, подзаголовки секций
  accent: '#007C99', // единственный акцент, приглушённый морской
  accentBg: '#D8F0F8', // заливка страны на карте, фон выбранного
  ok: '#328053', // верный ответ
  okBg: '#DDF4E4',
  bad: '#B14B41', // ошибка
  badBg: '#FFE7E3',
  warm: '#C77F3E', // серия дней, «внимание»
  /** Текст неактивного варианта после ответа. */
  inkDisabled: '#B4B1AA',
  /** Рамка вокруг флага, чтобы белые полотнища не сливались с карточкой. */
  flagBorder: 'rgba(34,31,25,.14)',
} as const;

export type ColorToken = keyof typeof colors;

/** Радиусы. Шаг не произвольный: чип < сегмент < строка < кнопка < карта. */
export const radius = {
  chip: 8,
  segment: 12,
  row: 14,
  button: 16,
  card: 16,
  map: 18,
  pill: 999,
} as const;

/** Шаг отступов — 4. Поля экрана 24, между секциями 24–28, внутри карточки 12–18. */
export const space = {
  screen: 24,
  section: 24,
  sectionLoose: 28,
  card: 16,
} as const;

export const font = {
  /** Только предмет вопроса и крупные цифры. */
  display: "'Literata', Georgia, 'Times New Roman', serif",
  /** Весь интерфейс. */
  ui: "'Golos Text', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
} as const;

/** CSS-переменные для :root — чтобы не тащить объект в каждый стиль. */
export function cssVariables(): string {
  const vars = Object.entries(colors)
    .map(([key, value]) => `  --c-${kebab(key)}: ${value};`)
    .join('\n');
  const radii = Object.entries(radius)
    .map(([key, value]) => `  --r-${kebab(key)}: ${value}px;`)
    .join('\n');
  return `${vars}\n${radii}\n  --font-display: ${font.display};\n  --font-ui: ${font.ui};`;
}

function kebab(s: string): string {
  return s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}
