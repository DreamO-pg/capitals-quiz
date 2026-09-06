import type { CardState, Progress } from './model';

/**
 * Интервал показа по коробке, в днях. Коробка 1 — «завтра не жди, спрошу сегодня же».
 * Дальше растёт примерно вдвое: 1, 3, 7, 16.
 */
const INTERVAL = [0, 0, 1, 3, 7, 16];

export const MAX_BOX = 5;
export const MIN_BOX = 1;

export function newCard(day: number): CardState {
  return { box: MIN_BOX, errors: 0, lastDay: day };
}

/** Верно — коробка выше, ошибся — сразу в первую. Промежуточных ступеней нет намеренно. */
export function applyAnswer(card: CardState | undefined, correct: boolean, day: number): CardState {
  const base = card ?? { box: MIN_BOX, errors: 0, lastDay: day };
  return {
    box: correct ? Math.min(MAX_BOX, base.box + 1) : MIN_BOX,
    errors: base.errors + (correct ? 0 : 1),
    lastDay: day,
  };
}

/** День, начиная с которого страну снова стоит показать. */
export function dueDay(card: CardState): number {
  return card.lastDay + (INTERVAL[card.box] ?? 0);
}

export function isDue(card: CardState, day: number): boolean {
  return dueDay(card) <= day;
}

/**
 * Страны, требующие повторения: низкие коробки, но только те, где были промахи.
 *
 * Одной коробки мало: страна, угаданная с первого раза, сразу оказывается во второй,
 * и без проверки ошибок «Повторить ошибки» предлагало бы повторить безошибочный раунд.
 * В первой коробке страна оказывается только после промаха, так что условие
 * отсекает ровно выученное с ходу.
 */
export function weakCodes(progress: Progress): string[] {
  const weak: string[] = [];
  for (const [code, card] of progress) {
    if (card.box <= 2 && card.errors > 0) weak.push(code);
  }
  return weak;
}
