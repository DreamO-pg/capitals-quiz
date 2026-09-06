import { useCallback, useState } from 'react';
import { AnswerScreen } from './screens/AnswerScreen';
import { HomeScreen } from './screens/HomeScreen';
import { QuestionScreen } from './screens/QuestionScreen';
import { ResultScreen } from './screens/ResultScreen';
import { StatsScreen } from './screens/StatsScreen';
import { useBackButton } from './hooks/useBackButton';
import { useViewport } from './hooks/useViewport';
import type { Screen as ScreenName } from './types';

export function App() {
  useViewport();
  const [screen, setScreen] = useState<ScreenName>('home');

  const go = useCallback((next: ScreenName) => setScreen(next), []);
  const home = useCallback(() => setScreen('home'), []);

  // На главной кнопки «назад» нет — оттуда выход только закрытием окна.
  useBackButton(screen !== 'home', home);

  switch (screen) {
    case 'question':
      return <QuestionScreen />;
    case 'answer':
      return <AnswerScreen />;
    case 'result':
      return <ResultScreen />;
    case 'stats':
      return <StatsScreen />;
    case 'home':
    default:
      return <HomeScreen go={go} />;
  }
}
