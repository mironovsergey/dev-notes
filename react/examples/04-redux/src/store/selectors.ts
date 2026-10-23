import { calculateTotals, countItems, toCartLines } from '../domain';
import type { CartLine, Totals } from '../domain';
import { createSelector } from 'reselect';
import type { RootState } from './types';

/** Простые селекторы: читают срез как есть, мемоизация им не нужна. */
export const selectProducts = (state: RootState) => state.catalog.products;
export const selectCatalogStatus = (state: RootState) => state.catalog.status;
export const selectCatalogError = (state: RootState) => state.catalog.error;
export const selectCartItems = (state: RootState) => state.cart.items;
export const selectPostponedItems = (state: RootState) => state.cart.postponed;
export const selectPromo = (state: RootState) => state.promo;
export const selectDelivery = (state: RootState) => state.delivery;
export const selectCheckout = (state: RootState) => state.checkout;

/** Подписка точечная: страница перерисовывается только на открытие и закрытие окна. */
export const selectIsCheckoutOpen = (state: RootState) => state.checkout.isOpen;

/**
 * Производные данные - через `createSelector`.
 *
 * `useSelector` сравнивает результат по ссылке: селектор, создающий массив или
 * объект на каждом вызове, перерисовывал бы компонент на каждое действие.
 * Мемоизированный селектор пересчитывает результат, только если изменился
 * хотя бы один входной срез.
 */
export const selectCartLines = createSelector(
  [selectCartItems, selectProducts],
  (items, products): readonly CartLine[] => toCartLines(items, products),
);

export const selectPostponedLines = createSelector(
  [selectPostponedItems, selectProducts],
  (postponed, products): readonly CartLine[] => toCartLines(postponed, products),
);

export const selectTotals = createSelector(
  [selectCartLines, selectPromo, selectDelivery],
  (lines, promo, delivery): Totals => calculateTotals(lines, promo, delivery),
);

export const selectInCartByProductId = createSelector(
  [selectCartItems, selectPostponedItems],
  (items, postponed): ReadonlyMap<string, number> => {
    const countByProductId = new Map<string, number>();

    for (const item of [...items, ...postponed]) {
      countByProductId.set(item.productId, (countByProductId.get(item.productId) ?? 0) + item.qty);
    }

    return countByProductId;
  },
);

export const selectItemCount = createSelector([selectCartItems], (items) => countItems(items));
