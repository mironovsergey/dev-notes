import { createContext, useContext, type ReactNode } from 'react';
import type { RootStore } from './root-store';

/**
 * Стор передается обычным контекстом React.
 *
 * Собственные `Provider` и `inject` удалены из `mobx-react-lite` 5:
 * библиотека больше не занимается доставкой стора по дереву.
 */
const StoreContext = createContext<RootStore | null>(null);

export function StoreProvider({ store, children }: { store: RootStore; children: ReactNode }) {
  return <StoreContext value={store}>{children}</StoreContext>;
}

export function useStores(): RootStore {
  const store = useContext(StoreContext);

  if (store === null) {
    throw new Error('useStores вызван вне StoreProvider');
  }

  return store;
}
