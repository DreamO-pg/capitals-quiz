import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

const MAX = 46;
const MIN = 26;

/**
 * Название страны как можно крупнее, но чтобы влезало.
 *
 * Считать размер по длине слова не выходит: ширина букв слишком разная.
 * «Лихтенштейн» и «Таджикистан» — по одиннадцать знаков, а по ширине
 * отличаются заметно, и любая константа промахивается то в одну сторону,
 * то в другую. Поэтому меряем по месту и уменьшаем кегль, пока не влезет.
 *
 * Перенос по словам оставляем обычный: длинное слово должно именно вылезти,
 * иначе цикл его не заметит и остановится раньше времени.
 */
export function FitTitle({ text, style }: { text: string; style?: CSSProperties }) {
  const ref = useRef<HTMLHeadingElement>(null);
  const [ready, setReady] = useState(false);

  // Пока Literata не загрузилась, меряем запасной шрифт и промахиваемся.
  useEffect(() => {
    let alive = true;
    document.fonts?.ready.then(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, []);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const fit = () => {
      let size = MAX;
      el.style.fontSize = `${size}px`;
      while (size > MIN && el.scrollWidth > el.clientWidth) {
        size -= 1;
        el.style.fontSize = `${size}px`;
      }
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    return () => observer.disconnect();
  }, [text, ready]);

  return (
    <h1 ref={ref} style={{ ...base, ...style }}>
      {text}
    </h1>
  );
}

const base: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: MAX,
  lineHeight: 1.06,
  fontWeight: 500,
  margin: 0,
  letterSpacing: '-0.01em',
};
