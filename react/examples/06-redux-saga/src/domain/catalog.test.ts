import { describe, expect, test } from 'vitest';
import { filterProducts } from './catalog';
import { PRODUCTS } from './fixtures/products';

describe('filterProducts', () => {
  test('без условий возвращает весь каталог', () => {
    expect(filterProducts(PRODUCTS, { query: '', category: 'all' })).toHaveLength(PRODUCTS.length);
  });

  test('отбирает по категории', () => {
    const bakeryProducts = filterProducts(PRODUCTS, { query: '', category: 'bakery' });

    expect(bakeryProducts.map((product) => product.id)).toEqual(['cupcake', 'donut', 'macarons']);
  });

  test('ищет подстроку без учета регистра и пробелов по краям', () => {
    const foundProducts = filterProducts(PRODUCTS, { query: '  ПОНЧ ', category: 'all' });

    expect(foundProducts.map((product) => product.id)).toEqual(['donut']);
  });

  test('условия складываются, несовпадение дает пустой список', () => {
    expect(filterProducts(PRODUCTS, { query: 'пончик', category: 'frozen' })).toEqual([]);
  });
});
