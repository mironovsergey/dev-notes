import { useMemo } from 'react';
import { calculateTotals, countItems, toCartLines } from '../domain';
import type { CartLine, Totals } from '../domain';
import { useShopStore } from './store';

/**
 * Производные данные считаются в компоненте, а не в селекторе.
 *
 * Селектор, собирающий массив или объект, возвращал бы новую ссылку на
 * каждом вызове, и компонент ушел бы в бесконечный цикл перерисовок
 * (Maximum update depth exceeded). Поэтому из стора берутся исходные срезы,
 * а результат мемоизируется.
 */
export function useCartLines(): readonly CartLine[] {
  const items = useShopStore((store) => store.items);
  const products = useShopStore((store) => store.products);

  return useMemo(() => toCartLines(items, products), [items, products]);
}

export function usePostponedLines(): readonly CartLine[] {
  const postponed = useShopStore((store) => store.postponed);
  const products = useShopStore((store) => store.products);

  return useMemo(() => toCartLines(postponed, products), [postponed, products]);
}

export function useTotals(): Totals {
  const lines = useCartLines();
  const promo = useShopStore((store) => store.promo);
  const delivery = useShopStore((store) => store.delivery);

  return useMemo(() => calculateTotals(lines, promo, delivery), [lines, promo, delivery]);
}

export function useInCartByProductId(): ReadonlyMap<string, number> {
  const items = useShopStore((store) => store.items);
  const postponed = useShopStore((store) => store.postponed);

  return useMemo(() => {
    const countByProductId = new Map<string, number>();

    for (const item of [...items, ...postponed]) {
      countByProductId.set(item.productId, (countByProductId.get(item.productId) ?? 0) + item.qty);
    }

    return countByProductId;
  }, [items, postponed]);
}

export function useItemCount(): number {
  const items = useShopStore((store) => store.items);

  return useMemo(() => countItems(items), [items]);
}
