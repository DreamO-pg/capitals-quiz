import { useEffect } from 'react';
import { showBackButton } from '../telegram/webapp';

/**
 * Пока active — показана системная кнопка «назад» телеграма.
 * Свою стрелку не рисуем нигде.
 */
export function useBackButton(active: boolean, onBack: () => void): void {
  useEffect(() => {
    if (!active) return;
    return showBackButton(onBack);
  }, [active, onBack]);
}
