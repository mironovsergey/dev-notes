import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  type ActionDispatch,
  type ReactNode,
} from 'react';
import { calculateTotals } from '../domain';
import type { Totals } from '../domain';
import { cartReducer, INITIAL_CART_STATE, type CartAction, type CartState } from './cart-reducer';

/**
 * Клиентское состояние - редьюсер и два контекста.
 *
 * Библиотеки состояния в варианте нет: то, чем владеет приложение, держит
 * сам React, а все, что связано с сервером, закрывают `use`, действия и
 * переходы.
 */
const CartStateContext = createContext<CartState | null>(null);
const CartDispatchContext = createContext<ActionDispatch<[action: CartAction]> | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, INITIAL_CART_STATE);

  return (
    <CartStateContext value={state}>
      <CartDispatchContext value={dispatch}>{children}</CartDispatchContext>
    </CartStateContext>
  );
}

export function useCartState(): CartState {
  const state = useContext(CartStateContext);

  if (state === null) {
    throw new Error('useCartState вызван вне CartProvider');
  }

  return state;
}

export function useCartDispatch(): ActionDispatch<[action: CartAction]> {
  const dispatch = useContext(CartDispatchContext);

  if (dispatch === null) {
    throw new Error('useCartDispatch вызван вне CartProvider');
  }

  return dispatch;
}

export function useTotals(): Totals {
  const { items, promo, delivery } = useCartState();

  return useMemo(() => calculateTotals(items, promo, delivery), [items, promo, delivery]);
}

export function useItemCount(): number {
  const { items } = useCartState();

  return useMemo(() => items.reduce((sum, line) => sum + line.qty, 0), [items]);
}

export function useInCartByProductId(): ReadonlyMap<string, number> {
  const { items, postponed } = useCartState();

  return useMemo(() => {
    const countByProductId = new Map<string, number>();

    for (const line of [...items, ...postponed]) {
      countByProductId.set(
        line.product.id,
        (countByProductId.get(line.product.id) ?? 0) + line.qty,
      );
    }

    return countByProductId;
  }, [items, postponed]);
}
