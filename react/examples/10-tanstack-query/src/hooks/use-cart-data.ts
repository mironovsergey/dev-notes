import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { calculateTotals, countItems, toCartLines } from '../domain';
import type { CartLine, Product, Totals } from '../domain';
import { productsQuery } from '../api/queries';
import { useCartStore } from '../store/cart-store';

const NO_PRODUCTS: readonly Product[] = [];

/**
 * Клиентское состояние и серверное соединяются здесь.
 *
 * Позиции корзины лежат в сторе, товары - в кеше запроса; строки и итоги
 * собираются из того и другого. Каталог не копируется в стор: `useQuery`
 * отдаст те же данные любому компоненту, который запросит тот же ключ.
 */
export function useCartLines(): readonly CartLine[] {
  const items = useCartStore((store) => store.items);
  const { data } = useQuery(productsQuery());
  const products = data ?? NO_PRODUCTS;

  return useMemo(() => toCartLines(items, products), [items, products]);
}

export function usePostponedLines(): readonly CartLine[] {
  const postponed = useCartStore((store) => store.postponed);
  const { data } = useQuery(productsQuery());
  const products = data ?? NO_PRODUCTS;

  return useMemo(() => toCartLines(postponed, products), [postponed, products]);
}

export function useTotals(): Totals {
  const lines = useCartLines();
  const promo = useCartStore((store) => store.promo);
  const delivery = useCartStore((store) => store.delivery);

  return useMemo(() => calculateTotals(lines, promo, delivery), [lines, promo, delivery]);
}

export function useInCartByProductId(): ReadonlyMap<string, number> {
  const items = useCartStore((store) => store.items);
  const postponed = useCartStore((store) => store.postponed);

  return useMemo(() => {
    const countByProductId = new Map<string, number>();

    for (const item of [...items, ...postponed]) {
      countByProductId.set(item.productId, (countByProductId.get(item.productId) ?? 0) + item.qty);
    }

    return countByProductId;
  }, [items, postponed]);
}

export function useItemCount(): number {
  const items = useCartStore((store) => store.items);

  return useMemo(() => countItems(items), [items]);
}
