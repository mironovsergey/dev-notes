import { describe, expect, test } from 'vitest';
import { PRODUCTS } from './fixtures/products';
import { PROMOS } from './fixtures/promos';
import { calculateTotals, formatPrice, isPromoApplicable } from './pricing';
import type { CartLine, Product, Promo } from './types';

function productFixture(id: string): Product {
  const foundProduct = PRODUCTS.find((candidate) => candidate.id === id);

  if (foundProduct === undefined) {
    throw new Error(`В фикстурах нет товара ${id}`);
  }

  return foundProduct;
}

function promoFixture(code: string): Promo {
  const foundPromo = PROMOS.find((candidate) => candidate.code === code);

  if (foundPromo === undefined) {
    throw new Error(`В фикстурах нет промокода ${code}`);
  }

  return foundPromo;
}

const lines: CartLine[] = [
  { product: productFixture('macarons'), qty: 1 }, // 2490 ₽
  { product: productFixture('gummy-bears'), qty: 3 }, // 2070 ₽, скидка за количество 103 ₽
];

describe('calculateTotals', () => {
  test('пустая корзина ничего не стоит, включая доставку', () => {
    expect(calculateTotals([], null, 'courier')).toEqual({
      subtotal: 0,
      discounts: [],
      deliveryCost: 0,
      total: 0,
    });
  });

  test('скидка за количество считается по каждой позиции от трех штук', () => {
    const totals = calculateTotals(lines, null, 'pickup');

    expect(totals.subtotal).toBe(4560);
    expect(totals.discounts).toEqual([
      { kind: 'quantity', label: 'Скидка за количество (от 3 шт.)', amount: 103 },
    ]);
    expect(totals.total).toBe(4457);
  });

  test('процентный промокод применяется после скидки за количество', () => {
    const totals = calculateTotals(lines, promoFixture('SALE10'), 'pickup');

    expect(totals.discounts.map((discount) => discount.amount)).toEqual([103, 445]);
    expect(totals.total).toBe(4560 - 103 - 445);
  });

  test('фиксированный промокод не превышает оставшуюся сумму', () => {
    const cartBelowThreshold: CartLine[] = [{ product: productFixture('gummy-bears'), qty: 1 }]; // 690 < порога 2000

    expect(
      calculateTotals(cartBelowThreshold, promoFixture('MINUS500'), 'pickup').discounts,
    ).toEqual([]);
    const totals = calculateTotals(lines, promoFixture('MINUS500'), 'pickup');

    expect(totals.discounts[1]).toEqual({ kind: 'promo', label: 'Промокод MINUS500', amount: 500 });
  });

  test('курьер бесплатен от 3000 после скидок, иначе 300', () => {
    expect(calculateTotals(lines, null, 'courier').deliveryCost).toBe(0);
    const singleItemCart: CartLine[] = [{ product: productFixture('cake-pops'), qty: 1 }];

    expect(calculateTotals(singleItemCart, null, 'courier').deliveryCost).toBe(300);
    expect(calculateTotals(singleItemCart, null, 'post').deliveryCost).toBe(200);
    expect(calculateTotals(singleItemCart, null, 'pickup').deliveryCost).toBe(0);
  });

  test('промокод freeDelivery обнуляет только стоимость доставки', () => {
    const singleItemCart: CartLine[] = [{ product: productFixture('cake-pops'), qty: 1 }];
    const totals = calculateTotals(singleItemCart, promoFixture('FREESHIP'), 'post');

    expect(totals.discounts).toEqual([]);
    expect(totals.deliveryCost).toBe(0);
    expect(totals.total).toBe(1490);
  });

  test('порог промокода сравнивается с подытогом до скидок', () => {
    expect(isPromoApplicable(promoFixture('FREESHIP'), 999)).toBe(false);
    expect(isPromoApplicable(promoFixture('FREESHIP'), 1000)).toBe(true);
  });
});

test('formatPrice groups thousands and appends the currency', () => {
  expect(formatPrice(1234567)).toBe('1\u00a0234\u00a0567\u00a0₽');
  expect(formatPrice(0)).toBe('0\u00a0₽');
  expect(formatPrice(-500)).toBe('−500\u00a0₽');
});
