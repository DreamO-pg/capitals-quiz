import { COUNTRIES } from '../data/countries';
import type { Country, Mode, Settings } from '../types';
import { dueDay, isDue } from './leitner';
import type { Progress, Question } from './model';
import { DEFAULT_ROUND_SIZE } from './model';

export type Rng = () => number;

const defaultRng: Rng = Math.random;

function shuffle<T>(items: T[], rng: Rng): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Ниже этого раунд получается вырожденным: десять вопросов не из чего собрать,
 * а дистракторы начинают повторяться от вопроса к вопросу.
 */
const MIN_POOL = 16;

/**
 * Страны, доступные при текущих настройках.
 *
 * «Только простые» в узком регионе даёт слишком мало: в Африке простых девять,
 * в Океании две. Поэтому фильтр не жёсткий — если простых не хватает на раунд,
 * подмешиваем средний тир, а в крайнем случае берём регион целиком.
 * Лучше показать Фиджи рядом с Австралией, чем раунд из двух вопросов.
 */
export function poolFor(settings: Settings): Country[] {
  const inRegion = COUNTRIES.filter(
    (c) => settings.region === 'world' || c.region === settings.region,
  );
  if (settings.difficulty !== 'easy') return inRegion;

  const easy = inRegion.filter((c) => c.tier === 'easy');
  if (easy.length >= MIN_POOL) return easy;

  const easyAndMedium = inRegion.filter((c) => c.tier !== 'hard');
  if (easyAndMedium.length >= MIN_POOL) return easyAndMedium;

  return inRegion;
}

/* ─────────────────────────── Дистракторы ─────────────────────────── */

/** Текст варианта зависит от режима: где-то отвечаем столицей, где-то страной. */
export function optionText(country: Country, mode: Mode): string {
  return mode === 'country_to_capital' ? country.capitalRu : country.nameRu;
}

/**
 * Неправильные варианты — из того же региона и по возможности того же тира.
 * Случайные страны с разных континентов делают вопрос бессмысленно лёгким:
 * Улан-Батор среди европейских столиц виден сразу, думать не надо.
 */
export function pickDistractors(
  answer: Country,
  mode: Mode,
  count = 3,
  rng: Rng = defaultRng,
): Country[] {
  const taken = new Set([optionText(answer, mode)]);
  const usable = (c: Country) => c.code !== answer.code && !taken.has(optionText(c, mode));

  // Ищем по кругам: свой регион и тир → свой регион → свой тир → кто угодно.
  const circles: Country[][] = [
    COUNTRIES.filter((c) => c.region === answer.region && c.tier === answer.tier),
    COUNTRIES.filter((c) => c.region === answer.region),
    COUNTRIES.filter((c) => c.tier === answer.tier),
    COUNTRIES,
  ];

  const picked: Country[] = [];
  for (const circle of circles) {
    if (picked.length >= count) break;
    for (const c of shuffle(circle.filter(usable), rng)) {
      if (picked.length >= count) break;
      picked.push(c);
      taken.add(optionText(c, mode));
    }
  }
  return picked;
}

export function makeQuestion(
  country: Country,
  mode: Mode,
  rng: Rng = defaultRng,
  isRetry = false,
): Question {
  const distractors = pickDistractors(country, mode, 3, rng);
  const all = shuffle([country, ...distractors], rng);
  return {
    mode,
    country,
    options: all.map((c) => optionText(c, mode)),
    optionCountries: all,
    correctIndex: all.findIndex((c) => c.code === country.code),
    isRetry,
  };
}

/* ─────────────────────────── Сбор раунда ─────────────────────────── */

/** Примерно столько вопросов раунда отдаём повторению, остальное — новому материалу. */
const REVIEW_SHARE = 0.6;

/**
 * Раунд — не случайные десять стран. Шесть мест уходит на то, что пора повторить
 * (низкие коробки и просроченные), четыре — на новое и давно не встречавшееся.
 * Если повторять нечего, места отдаются новому, и наоборот: раунд всегда полный.
 */
export function buildRound(
  settings: Settings,
  progress: Progress,
  day: number,
  size = DEFAULT_ROUND_SIZE,
  rng: Rng = defaultRng,
): Question[] {
  const pool = poolFor(settings);
  if (pool.length === 0) return [];

  const seen: Country[] = [];
  const fresh: Country[] = [];
  for (const c of pool) {
    (progress.has(c.code) ? seen : fresh).push(c);
  }

  // Самое просроченное вперёд. Сортировать строго по коробке нельзя: первая
  // коробка пополняется каждым промахом и тогда навсегда съедает все слоты
  // повторения — страны из третьей коробки не всплывают и никогда не дозревают.
  const due = seen
    .filter((c) => isDue(progress.get(c.code)!, day))
    .sort((a, a2) => {
      const x = progress.get(a.code)!;
      const y = progress.get(a2.code)!;
      return dueDay(x) - dueDay(y) || x.box - y.box;
    });

  const stale = seen
    .filter((c) => !isDue(progress.get(c.code)!, day))
    .sort((a, a2) => progress.get(a.code)!.lastDay - progress.get(a2.code)!.lastDay);

  // В маленьком регионе раунд короче: повторять один и тот же вопрос дважды хуже.
  const target = Math.min(size, pool.length);
  const wantReview = Math.min(Math.round(target * REVIEW_SHARE), due.length);
  const chosen: Country[] = [];
  const used = new Set<string>();
  const take = (list: Country[], n: number) => {
    for (const c of list) {
      if (n <= 0) break;
      if (used.has(c.code)) continue;
      used.add(c.code);
      chosen.push(c);
      n--;
    }
  };

  // Слоты повторения делим: большая часть слабым, но часть обязательно достаётся
  // дозревающим, иначе они простаивают в очереди за вечно свежими ошибками.
  const urgent = due.filter((c) => progress.get(c.code)!.box <= 2);
  const maturing = due.filter((c) => progress.get(c.code)!.box > 2);
  take(urgent, Math.ceil(wantReview * 0.6));
  take(maturing, wantReview - chosen.length);
  take(due, wantReview - chosen.length);

  take(shuffle(fresh, rng), target - chosen.length);
  // Не хватило нового — добираем просроченным, потом давно виденным.
  take(due, target - chosen.length);
  take(stale, target - chosen.length);

  return shuffle(chosen, rng).map((c) => makeQuestion(c, settings.mode, rng));
}

/** «Повторить ошибки»: только коробки 1–2, порядок от самой слабой. */
export function buildRetryRound(
  settings: Settings,
  progress: Progress,
  codes: string[],
  size = DEFAULT_ROUND_SIZE,
  rng: Rng = defaultRng,
): Question[] {
  const wanted = new Set(codes);
  const list = COUNTRIES.filter((c) => wanted.has(c.code)).sort(
    (a, b) => (progress.get(a.code)?.box ?? 1) - (progress.get(b.code)?.box ?? 1),
  );
  return list.slice(0, size).map((c) => makeQuestion(c, settings.mode, rng));
}

/**
 * Ошибся — страна вернётся через два-три вопроса, ещё внутри этого раунда.
 * Длину раунда держим прежней: повтор вытесняет последний ещё не показанный вопрос,
 * который никуда не денется и придёт в следующий раз по расписанию.
 */
export function insertRetry(
  queue: Question[],
  currentIndex: number,
  country: Country,
  mode: Mode,
  rng: Rng = defaultRng,
): Question[] {
  const gap = 2 + Math.floor(rng() * 2); // 2 или 3
  const at = currentIndex + gap;
  if (at >= queue.length) return queue; // раунд кончается раньше — повторим в следующем
  const next = [...queue];
  next.splice(at, 0, makeQuestion(country, mode, rng, true));
  next.pop();
  return next;
}
