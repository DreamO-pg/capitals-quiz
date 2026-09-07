import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { onBeforeClose } from '../telegram/webapp';
import type { Settings } from '../types';
import { DEFAULT_SETTINGS } from '../types';
import { applyAnswer, weakCodes } from '../engine/leitner';
import type { Answer, Progress, Question, Stats } from '../engine/model';
import { emptyStats, today } from '../engine/model';
import { buildRetryRound, buildRound, insertRetry } from '../engine/round';
import { bumpStreak, pushRound } from '../engine/serialize';
import { loadAll, saveProgress, saveSettings, saveStats } from '../engine/store';

export type Phase = 'loading' | 'idle' | 'question' | 'answer' | 'result';

export interface Game {
  phase: Phase;
  settings: Settings;
  progress: Progress;
  stats: Stats;
  question: Question | null;
  /** Номер текущего вопроса с единицы и длина раунда — для полосы прогресса. */
  position: { current: number; total: number };
  answers: Answer[];
  lastAnswer: Answer | null;
  weak: string[];
  changeSettings: (patch: Partial<Settings>) => void;
  startRound: () => void;
  startRetryRound: () => void;
  answer: (index: number) => void;
  next: () => void;
  goHome: () => void;
}

export function useGame(): Game {
  const [phase, setPhase] = useState<Phase>('loading');
  const [settings, setSettings] = useState<Settings>({ ...DEFAULT_SETTINGS });
  const [progress, setProgress] = useState<Progress>(new Map());
  const [stats, setStats] = useState<Stats>(emptyStats());
  const [queue, setQueue] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);

  // Для сохранения перед закрытием: эффект не должен зависеть от каждого ответа.
  const progressRef = useRef(progress);
  progressRef.current = progress;
  const statsRef = useRef(stats);
  statsRef.current = stats;
  const answersRef = useRef<Answer[]>(answers);
  answersRef.current = answers;
  const dirtyRef = useRef(false);
  /** Ответы текущего раунда уже учтены в статистике — второй раз не считаем. */
  const countedRef = useRef(true);
  // Подписка на закрытие окна вешается один раз, до объявления commit,
  // поэтому зовём его через ref, а не по значению.
  const commitRef = useRef<(finished: Answer[]) => void>(() => {});

  useEffect(() => {
    let alive = true;
    loadAll().then((saved) => {
      if (!alive) return;
      setProgress(saved.progress);
      setStats(saved.stats);
      setSettings(saved.settings);
      setPhase('idle');
    });
    return () => {
      alive = false;
    };
  }, []);

  // Телеграм может закрыть окно посреди раунда — успеваем записать прогресс.
  useEffect(
    () =>
      onBeforeClose(() => {
        if (!countedRef.current) {
          commitRef.current(answersRef.current);
          return;
        }
        if (!dirtyRef.current) return;
        dirtyRef.current = false;
        void saveProgress(progressRef.current);
      }),
    [],
  );

  const changeSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      void saveSettings(next);
      return next;
    });
  }, []);

  const begin = useCallback((questions: Question[]) => {
    if (questions.length === 0) return;
    countedRef.current = false;
    setQueue(questions);
    setIndex(0);
    setAnswers([]);
    setPhase('question');
  }, []);

  const startRound = useCallback(() => {
    begin(buildRound(settings, progress, today()));
  }, [begin, settings, progress]);

  const startRetryRound = useCallback(() => {
    const codes = weakCodes(progress);
    if (codes.length === 0) return;
    begin(buildRetryRound(settings, progress, codes));
  }, [begin, settings, progress]);

  const answer = useCallback(
    (chosen: number) => {
      const question = queue[index];
      if (!question || phase !== 'question') return;

      const correct = chosen === question.correctIndex;
      const day = today();

      setProgress((prev) => {
        const next = new Map(prev);
        next.set(question.country.code, applyAnswer(prev.get(question.country.code), correct, day));
        return next;
      });
      dirtyRef.current = true;

      setAnswers((prev) => [...prev, { question, chosenIndex: chosen, correct }]);
      // Ошибку переспрашиваем ещё в этом раунде, повтор — уже нет.
      if (!correct && !question.isRetry) {
        setQueue((prev) => insertRetry(prev, index, question.country, question.mode));
      }
      setPhase('answer');
    },
    [queue, index, phase],
  );

  /**
   * Учитывает ответы в статистике и записывает всё на диск.
   *
   * Вызывается не только на финише раунда, но и при уходе с экрана: раунд,
   * брошенный на середине, раньше пропадал целиком — игрок отвечал на семь
   * вопросов, жал «назад» и не находил в статистике ни одного.
   *
   * Считает из ref, а не из состояния: перед закрытием окна обновление состояния
   * может уже не успеть примениться, а записать надо наверняка.
   */
  const commit = useCallback(
    (finished: Answer[]) => {
      countedRef.current = true;
      dirtyRef.current = false;
      void saveProgress(progressRef.current);
      if (finished.length === 0) return;

      const day = today();
      const correct = finished.filter((a) => a.correct).length;
      const prev = statsRef.current;
      const byRegion = { ...prev.byRegion };
      for (const a of finished) {
        const r = a.question.country.region;
        const cell = byRegion[r] ?? { correct: 0, total: 0 };
        byRegion[r] = { correct: cell.correct + (a.correct ? 1 : 0), total: cell.total + 1 };
      }
      const next: Stats = {
        answers: prev.answers + finished.length,
        correct: prev.correct + correct,
        streak: bumpStreak(prev, day),
        lastPlayDay: day,
        byRegion,
        rounds: pushRound(prev, {
          day,
          mode: settings.mode,
          region: settings.region,
          correct,
          total: finished.length,
        }),
      };
      statsRef.current = next;
      setStats(next);
      void saveStats(next);
    },
    [settings],
  );

  commitRef.current = commit;

  const finish = useCallback(
    (finished: Answer[]) => {
      commit(finished);
      setPhase('result');
    },
    [commit],
  );

  const next = useCallback(() => {
    if (phase !== 'answer') return;
    const nextIndex = index + 1;
    if (nextIndex >= queue.length) {
      finish(answers);
      return;
    }
    setIndex(nextIndex);
    setPhase('question');
  }, [phase, index, queue.length, answers, finish]);

  const goHome = useCallback(() => {
    if (!countedRef.current) commit(answersRef.current);
    else if (dirtyRef.current) {
      dirtyRef.current = false;
      void saveProgress(progressRef.current);
    }
    setPhase('idle');
    setQueue([]);
    setAnswers([]);
    setIndex(0);
  }, []);

  const weak = useMemo(() => weakCodes(progress), [progress]);

  return {
    phase,
    settings,
    progress,
    stats,
    question: queue[index] ?? null,
    position: { current: Math.min(index + 1, queue.length), total: queue.length },
    answers,
    lastAnswer: answers[answers.length - 1] ?? null,
    weak,
    changeSettings,
    startRound,
    startRetryRound,
    answer,
    next,
    goHome,
  };
}
