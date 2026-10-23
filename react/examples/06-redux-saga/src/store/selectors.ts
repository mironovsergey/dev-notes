import { calculateTotals, countItems, toCartLines } from '../domain';
import type { CartLine, Totals } from '../domain';
import { createSelector } from '@reduxjs/toolkit';
import { selectItems, selectPostponed } from './cart-slice';
import { selectProducts } from './catalog-slice';
import { selectDelivery } from './delivery-slice';
import { selectPromo } from './promo-slice';

/**
 * Селекторы среза приходят из `createSlice`, а производные данные, которым
 * нужно несколько срезов, собираются `createSelector` - он реэкспортирован
 * из reselect самим RTK, отдельная зависимость не нужна.
 */
export const selectCartLines = createSelector(
  [selectItems, selectProducts],
  (items, products): readonly CartLine[] => toCartLines(items, products),
);

export const selectPostponedLines = createSelector(
  [selectPostponed, selectProducts],
  (postponed, products): readonly CartLine[] => toCartLines(postponed, products),
);

export const selectTotals = createSelector(
  [selectCartLines, selectPromo, selectDelivery],
  (lines, promo, delivery): Totals => calculateTotals(lines, promo, delivery),
);

export const selectInCartByProductId = createSelector(
  [selectItems, selectPostponed],
  (items, postponed): ReadonlyMap<string, number> => {
    const countByProductId = new Map<string, number>();

    for (const item of [...items, ...postponed]) {
      countByProductId.set(item.productId, (countByProductId.get(item.productId) ?? 0) + item.qty);
    }

    return countByProductId;
  },
);

export const selectItemCount = createSelector([selectItems], (items) => countItems(items));
