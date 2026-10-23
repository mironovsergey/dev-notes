import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  type ActionDispatch,
  type ReactNode,
} from 'react';
import { calculateTotals, countItems, toCartLines, type CartLine, type Totals } from '../domain';
import { useCatalog } from './catalog-context';
import {
  countInCart,
  INITIAL_SHOP_STATE,
  shopReducer,
  type ShopAction,
  type ShopState,
} from './shop-reducer';

/**
 * Состояние и `dispatch` разнесены по двум контекстам.
 *
 * `dispatch` из `useReducer` стабилен, поэтому компонент, которому нужны только
 * действия (например, кнопка «В корзину»), не перерисовывается при каждом
 * изменении корзины.
 */
const ShopStateContext = createContext<ShopState | null>(null);
const ShopDispatchContext = createContext<ActionDispatch<[action: ShopAction]> | null>(null);

export function ShopProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(shopReducer, INITIAL_SHOP_STATE);

  return (
    <ShopStateContext value={state}>
      <ShopDispatchContext value={dispatch}>{children}</ShopDispatchContext>
    </ShopStateContext>
  );
}

/** Значение контекста никогда не бывает пустым внутри провайдера; снаружи это ошибка сборки дерева. */
export function useShopState(): ShopState {
  const state = useContext(ShopStateContext);

  if (state === null) {
    throw new Error('useShopState вызван вне ShopProvider');
  }

  return state;
}

export function useShopDispatch(): ActionDispatch<[action: ShopAction]> {
  const dispatch = useContext(ShopDispatchContext);

  if (dispatch === null) {
    throw new Error('useShopDispatch вызван вне ShopProvider');
  }

  return dispatch;
}

/** Строки корзины: позиции соединяются с товарами каталога. */
export function useCartLines(): { lines: readonly CartLine[]; postponed: readonly CartLine[] } {
  const { items, postponed } = useShopState();
  const { products } = useCatalog();

  return useMemo(
    () => ({
      lines: toCartLines(items, products),
      postponed: toCartLines(postponed, products),
    }),
    [items, postponed, products],
  );
}

export function useTotals(): Totals {
  const { promo, delivery } = useShopState();
  const { lines } = useCartLines();

  return useMemo(() => calculateTotals(lines, promo, delivery), [lines, promo, delivery]);
}

export function useInCartByProductId(): ReadonlyMap<string, number> {
  const { items, postponed } = useShopState();

  return useMemo(() => countInCart(items, postponed), [items, postponed]);
}

export function useItemCount(): number {
  const { items } = useShopState();

  return useMemo(() => countItems(items), [items]);
}
