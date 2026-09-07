import { useCallback } from 'react';
import { HomeScreen } from './screens/HomeScreen';
import { QuestionScreen } from './screens/QuestionScreen';
import { ResultScreen } from './screens/ResultScreen';
import { StatsScreen } from './screens/StatsScreen';
import { useBackButton } from './hooks/useBackButton';
import { useGame } from './hooks/useGame';
import { useViewport } from './hooks/useViewport';
import { Screen } from './components/Screen';
import { useState } from 'react';

export function App() {
  useViewport();
  const game = useGame();
  // Статистика — единственный экран вне игрового цикла, поэтому живёт отдельным флагом.
  const [statsOpen, setStatsOpen] = useState(false);

  const back = useCallback(() => {
    if (statsOpen) setStatsOpen(false);
    else game.goHome();
  }, [statsOpen, game]);

  const inGame = game.phase === 'question' || game.phase === 'answer' || game.phase === 'result';
  useBackButton(statsOpen || inGame, back);

  if (game.phase === 'loading') return <Screen>{null}</Screen>;
  if (statsOpen) return <StatsScreen game={game} />;

  switch (game.phase) {
    // Вопрос и его итог — один экран: итог выезжает панелью поверх вопроса.
    case 'question':
    case 'answer':
      return <QuestionScreen game={game} />;
    case 'result':
      return <ResultScreen game={game} />;
    default:
      return <HomeScreen game={game} openStats={() => setStatsOpen(true)} />;
  }
}
