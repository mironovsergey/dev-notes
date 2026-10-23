import type { Promo } from '../types';

export const PROMOS: readonly Promo[] = [
  { code: 'SALE10', kind: 'percent', value: 10, minSubtotal: 0 },
  { code: 'MINUS500', kind: 'fixed', value: 500, minSubtotal: 2000 },
  { code: 'FREESHIP', kind: 'freeDelivery', value: 0, minSubtotal: 1000 },
];

/** Коды, которые mock-API знает, но отклоняет с отдельным сообщением. */
export const EXPIRED_PROMO_CODES: readonly string[] = ['SUMMER2022'];
