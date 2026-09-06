import { useCallback, useEffect, useState } from 'react';
import { addToHomeScreen, checkHomeScreen } from '../telegram/webapp';
import type { HomeScreenStatus } from '../telegram/types';

/**
 * Предложение добавить игру на экран «Домой».
 *
 * Метод есть не во всех клиентах, и часть из них просто не отвечает на запрос
 * статуса. Поэтому строку показываем, только когда клиент внятно сказал
 * «не добавлено»; во всех остальных случаях — молчим, а не гадаем.
 */
export function useHomeScreen(): { canOffer: boolean; add: () => void } {
  const [status, setStatus] = useState<HomeScreenStatus>('unsupported');

  useEffect(() => {
    let alive = true;
    checkHomeScreen().then((s) => alive && setStatus(s));
    return () => {
      alive = false;
    };
  }, []);

  const add = useCallback(() => {
    addToHomeScreen();
    // Ответа на добавление телеграм не присылает: прячем строку сами,
    // чтобы она не мозолила глаза после нажатия.
    setStatus('added');
  }, []);

  return { canOffer: status === 'missed', add };
}
