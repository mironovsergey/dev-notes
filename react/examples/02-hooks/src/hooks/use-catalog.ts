import { useCallback, useEffect, useState } from 'react';
import { errorMessage, fetchProducts, type LoadStatus, type Product } from '../domain';

interface CatalogState {
  products: readonly Product[];
  status: LoadStatus;
  error: string | null;
}

interface Catalog extends CatalogState {
  reload: () => void;
}

const INITIAL_STATE: CatalogState = { products: [], status: 'loading', error: null };

/**
 * Загружает каталог и следит за состоянием запроса.
 *
 * Эффект повторяется при изменении `reloadAttempt`, поэтому повтор после ошибки - это
 * просто увеличение счетчика. Функция очистки отменяет запрос: так ответ
 * размонтированного компонента не попадет в setState. Сам сброс в состояние
 * загрузки выполняет обработчик повтора: синхронный `setState` в теле эффекта
 * дал бы лишний каскадный рендер.
 */
export function useCatalog(): Catalog {
  const [state, setState] = useState<CatalogState>(INITIAL_STATE);
  const [reloadAttempt, setReloadAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    fetchProducts(controller.signal)
      .then((products) => {
        setState({ products, status: 'ready', error: null });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        setState({
          products: [],
          status: 'error',
          error: errorMessage(error, 'Не удалось загрузить каталог'),
        });
      });

    return () => {
      controller.abort();
    };
  }, [reloadAttempt]);

  const reload = useCallback(() => {
    setState(INITIAL_STATE);
    setReloadAttempt((current) => current + 1);
  }, []);

  return { ...state, reload };
}
