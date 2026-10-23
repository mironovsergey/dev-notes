import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { errorMessage, fetchProducts, type LoadStatus, type Product } from '../domain';

interface CatalogValue {
  products: readonly Product[];
  status: LoadStatus;
  error: string | null;
  reload: () => void;
}

/**
 * Каталог вынесен в отдельный контекст: он загружается один раз и почти не
 * меняется, тогда как корзина меняется постоянно. Одно общее значение на все
 * заставляло бы потребителей каталога перерисовываться на каждое действие с
 * корзиной.
 */
const CatalogContext = createContext<CatalogValue | null>(null);

interface CatalogState {
  products: readonly Product[];
  status: LoadStatus;
  error: string | null;
}

const INITIAL_CATALOG: CatalogState = { products: [], status: 'loading', error: null };

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [catalog, setCatalog] = useState(INITIAL_CATALOG);
  const [reloadAttempt, setReloadAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    fetchProducts(controller.signal)
      .then((products) => {
        setCatalog({ products, status: 'ready', error: null });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        setCatalog({
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
    setCatalog(INITIAL_CATALOG);
    setReloadAttempt((current) => current + 1);
  }, []);

  // Значение контекста стабилизируется: новый объект на каждом рендере
  // провайдера перерисовывал бы всех потребителей.
  const value = useMemo(() => ({ ...catalog, reload }), [catalog, reload]);

  return <CatalogContext value={value}>{children}</CatalogContext>;
}

export function useCatalog(): CatalogValue {
  const catalog = useContext(CatalogContext);

  if (catalog === null) {
    throw new Error('useCatalog вызван вне CatalogProvider');
  }

  return catalog;
}
