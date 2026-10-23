import { describe, expect, test } from 'vitest';
import { countItems, toCartLines, withoutItem, withQty } from './cart';
import { PRODUCTS } from './fixtures/products';
import type { CartItem } from './types';

const items: CartItem[] = [
  { productId: 'gummy-bears', qty: 3 },
  { productId: 'macarons', qty: 1 },
];

describe('операции над позициями корзины', () => {
  test('toCartLines соединяет позиции с товарами в исходном порядке', () => {
    const lines = toCartLines(items, PRODUCTS);

    expect(lines.map((line) => line.product.id)).toEqual(['gummy-bears', 'macarons']);
    expect(lines.map((line) => line.qty)).toEqual([3, 1]);
  });

  test('toCartLines отбрасывает позиции с неизвестным товаром', () => {
    const withUnknown: CartItem[] = [...items, { productId: 'нет-такого', qty: 5 }];

    expect(toCartLines(withUnknown, PRODUCTS)).toHaveLength(2);
    expect(toCartLines(items, [])).toEqual([]);
  });

  test('withQty меняет количество только указанной позиции и не мутирует исходный массив', () => {
    const updatedItems = withQty(items, 'macarons', 2);

    expect(updatedItems).toEqual([
      { productId: 'gummy-bears', qty: 3 },
      { productId: 'macarons', qty: 2 },
    ]);
    expect(items[1]).toEqual({ productId: 'macarons', qty: 1 });
    expect(withQty(items, 'нет-такого', 7)).toEqual(items);
  });

  test('withoutItem убирает позицию, отсутствие позиции не ошибка', () => {
    expect(withoutItem(items, 'gummy-bears')).toEqual([{ productId: 'macarons', qty: 1 }]);
    expect(withoutItem(items, 'нет-такого')).toEqual(items);
    expect(items).toHaveLength(2);
  });

  test('countItems складывает количества всех позиций', () => {
    expect(countItems(items)).toBe(4);
    expect(countItems([])).toBe(0);
  });
});
