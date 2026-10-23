import { useCallback, useMemo, useState } from 'react';
import { countItems, withoutItem, withQty, type CartItem, type Product } from '../domain';

interface CartState {
  items: readonly CartItem[];
  postponed: readonly CartItem[];
}

interface Cart extends CartState {
  /** productId → количество в корзине, включая отложенное. */
  inCartByProductId: ReadonlyMap<string, number>;
  itemCount: number;
  add: (product: Product) => void;
  changeQty: (product: Product, qty: number) => void;
  remove: (productId: string) => void;
  postpone: (productId: string) => void;
  restore: (productId: string) => void;
  clear: () => void;
}

const EMPTY_CART: CartState = { items: [], postponed: [] };

function quantityOf(items: readonly CartItem[], productId: string): number {
  return items.find((item) => item.productId === productId)?.qty ?? 0;
}

/**
 * Состояние корзины и операции над ним.
 *
 * Позиции и отложенное хранятся одним объектом: операции переносят товар между
 * списками, и раздельные состояния пришлось бы менять двумя вызовами подряд.
 * Апдейтеры чистые и возвращают прежний объект, когда менять нечего, - React
 * тогда пропускает повторный рендер. Обработчики обернуты в `useCallback` с
 * пустым списком зависимостей: состояние читается из аргумента апдейтера,
 * поэтому функции стабильны и не ломают `memo` у дочерних компонентов.
 */
export function useCart(): Cart {
  const [state, setState] = useState<CartState>(EMPTY_CART);

  const add = useCallback((product: Product) => {
    setState((current) => {
      const activeQty = quantityOf(current.items, product.id);
      const postponedQty = quantityOf(current.postponed, product.id);

      if (activeQty + postponedQty >= product.stock) {
        return current;
      }

      if (postponedQty > 0) {
        return {
          items: current.items,
          postponed: withQty(current.postponed, product.id, postponedQty + 1),
        };
      }

      return {
        items:
          activeQty === 0
            ? [...current.items, { productId: product.id, qty: 1 }]
            : withQty(current.items, product.id, activeQty + 1),
        postponed: current.postponed,
      };
    });
  }, []);

  const changeQty = useCallback((product: Product, qty: number) => {
    if (qty < 1 || qty > product.stock) {
      return;
    }

    setState((current) => ({
      items: withQty(current.items, product.id, qty),
      postponed: withQty(current.postponed, product.id, qty),
    }));
  }, []);

  const remove = useCallback((productId: string) => {
    setState((current) => ({
      items: withoutItem(current.items, productId),
      postponed: withoutItem(current.postponed, productId),
    }));
  }, []);

  const postpone = useCallback((productId: string) => {
    setState((current) => {
      const item = current.items.find((candidate) => candidate.productId === productId);

      if (item === undefined) {
        return current;
      }

      return {
        items: withoutItem(current.items, productId),
        postponed: [...current.postponed, item],
      };
    });
  }, []);

  const restore = useCallback((productId: string) => {
    setState((current) => {
      const item = current.postponed.find((candidate) => candidate.productId === productId);

      if (item === undefined) {
        return current;
      }

      return {
        items: [...current.items, item],
        postponed: withoutItem(current.postponed, productId),
      };
    });
  }, []);

  const clear = useCallback(() => {
    setState(EMPTY_CART);
  }, []);

  const inCartByProductId = useMemo(() => {
    const countByProductId = new Map<string, number>();

    for (const item of [...state.items, ...state.postponed]) {
      countByProductId.set(item.productId, (countByProductId.get(item.productId) ?? 0) + item.qty);
    }

    return countByProductId;
  }, [state]);

  const itemCount = useMemo(() => countItems(state.items), [state.items]);

  return {
    ...state,
    inCartByProductId,
    itemCount,
    add,
    changeQty,
    remove,
    postpone,
    restore,
    clear,
  };
}
