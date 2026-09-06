import { useEffect } from 'react';
import { getBottomInset, getTopInset, getViewportHeight, onViewportChange } from '../telegram/webapp';

/**
 * Держит --tg-viewport-height и safe area в CSS-переменных.
 * Верстаем от них, а не от 100vh: в телеграме 100vh больше видимой области.
 */
export function useViewport(): void {
  useEffect(() => {
    const apply = () => {
      const root = document.documentElement.style;
      root.setProperty('--tg-viewport-height', `${getViewportHeight()}px`);
      root.setProperty('--tg-inset-top', `${getTopInset()}px`);
      root.setProperty('--tg-inset-bottom', `${getBottomInset()}px`);
    };
    apply();
    return onViewportChange(apply);
  }, []);
}
