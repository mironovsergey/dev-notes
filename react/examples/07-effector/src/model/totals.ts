import { combine } from 'effector';
import { calculateTotals, toCartLines } from '../domain';
import { $items, $postponed } from './cart';
import { $products } from './catalog';
import { $delivery } from './delivery';
import { $promo } from './promo';

/**
 * Производные данные - это тоже сторы.
 *
 * `combine` пересчитывает значение только при изменении источников, поэтому
 * отдельная библиотека мемоизации селекторов не нужна.
 */
export const $cartLines = combine($items, $products, (items, products) =>
  toCartLines(items, products),
);

export const $postponedLines = combine($postponed, $products, (postponed, products) =>
  toCartLines(postponed, products),
);

export const $totals = combine($cartLines, $promo, $delivery, (lines, promo, delivery) =>
  calculateTotals(lines, promo, delivery),
);
