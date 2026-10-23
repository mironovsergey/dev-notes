import { describe, expect, test } from 'vitest';
import { countItems, PRODUCTS, type Order, type Product, type Promo } from '../domain';
import {
  countInCart,
  INITIAL_SHOP_STATE,
  shopReducer,
  type ShopAction,
  type ShopState,
} from './shop-reducer';

function productFixture(id: string): Product {
  const foundProduct = PRODUCTS.find((candidate) => candidate.id === id);

  if (foundProduct === undefined) {
    throw new Error(`В фикстурах нет товара ${id}`);
  }

  return foundProduct;
}

const bears = productFixture('gummy-bears');
const macarons = productFixture('macarons');

/** Последовательно применяет действия к начальному состоянию. */
function reduceAll(
  actions: readonly ShopAction[],
  from: ShopState = INITIAL_SHOP_STATE,
): ShopState {
  return actions.reduce(shopReducer, from);
}

const ORDER: Order = { id: 'L-1001', total: 2070, createdAt: '2026-09-22T10:00:00.000Z' };
const PROMO: Promo = { code: 'SALE10', kind: 'percent', value: 10, minSubtotal: 0 };

describe('редьюсер магазина', () => {
  test('добавление накапливает количество одной позиции', () => {
    const state = reduceAll([
      { type: 'cart/added', product: bears },
      { type: 'cart/added', product: bears },
    ]);

    expect(state.items).toEqual([{ productId: 'gummy-bears', qty: 2 }]);
  });

  test('добавление сверх остатка возвращает прежнее состояние', () => {
    const atStockLimit = reduceAll([
      { type: 'cart/added', product: macarons },
      { type: 'cart/added', product: macarons },
    ]);
    const afterExtraClick = shopReducer(atStockLimit, { type: 'cart/added', product: macarons });

    expect(macarons.stock).toBe(2);
    expect(afterExtraClick).toBe(atStockLimit);
  });

  test('отложенная позиция уходит из корзины и возвращается с прежним количеством', () => {
    const postponed = reduceAll([
      { type: 'cart/added', product: bears },
      { type: 'cart/added', product: bears },
      { type: 'cart/postponed', productId: 'gummy-bears' },
    ]);

    expect(postponed.items).toEqual([]);
    expect(postponed.postponed).toEqual([{ productId: 'gummy-bears', qty: 2 }]);

    const restored = shopReducer(postponed, { type: 'cart/restored', productId: 'gummy-bears' });

    expect(restored.items).toEqual([{ productId: 'gummy-bears', qty: 2 }]);
    expect(restored.postponed).toEqual([]);
  });

  test('добавление товара, лежащего в отложенных, увеличивает отложенную позицию', () => {
    const state = reduceAll([
      { type: 'cart/added', product: bears },
      { type: 'cart/postponed', productId: 'gummy-bears' },
      { type: 'cart/added', product: bears },
    ]);

    expect(state.items).toEqual([]);
    expect(state.postponed).toEqual([{ productId: 'gummy-bears', qty: 2 }]);
  });

  test('количество вне диапазона от 1 до остатка игнорируется', () => {
    const state = reduceAll([{ type: 'cart/added', product: bears }]);

    expect(shopReducer(state, { type: 'cart/qtyChanged', product: bears, qty: 0 })).toBe(state);
    expect(shopReducer(state, { type: 'cart/qtyChanged', product: bears, qty: 999 })).toBe(state);
    expect(shopReducer(state, { type: 'cart/qtyChanged', product: bears, qty: 4 }).items).toEqual([
      { productId: 'gummy-bears', qty: 4 },
    ]);
  });

  test('удаление убирает позицию и из корзины, и из отложенных', () => {
    const state = reduceAll([
      { type: 'cart/added', product: bears },
      { type: 'cart/added', product: macarons },
      { type: 'cart/postponed', productId: 'macarons' },
      { type: 'cart/removed', productId: 'macarons' },
    ]);

    expect(state.items).toEqual([{ productId: 'gummy-bears', qty: 1 }]);
    expect(state.postponed).toEqual([]);
  });

  test('закрытие окна после принятого заказа очищает корзину и промокод, но хранит доставку', () => {
    const afterOrder = reduceAll([
      { type: 'cart/added', product: bears },
      { type: 'promo/applied', promo: PROMO },
      { type: 'delivery/changed', method: 'courier' },
      { type: 'checkout/opened' },
      { type: 'checkout/submitStarted' },
      { type: 'checkout/succeeded', order: ORDER },
    ]);

    expect(afterOrder.checkout).toEqual({
      isOpen: true,
      isSubmitting: false,
      error: null,
      order: ORDER,
    });

    const afterClose = shopReducer(afterOrder, { type: 'checkout/closed' });

    expect(afterClose.items).toEqual([]);
    expect(afterClose.promo).toBeNull();
    expect(afterClose.delivery).toBe('courier');
    expect(afterClose.checkout.isOpen).toBe(false);
  });

  test('отмена оформления сохраняет корзину', () => {
    const afterCancel = reduceAll([
      { type: 'cart/added', product: bears },
      { type: 'checkout/opened' },
      { type: 'checkout/closed' },
    ]);

    expect(afterCancel.items).toEqual([{ productId: 'gummy-bears', qty: 1 }]);
  });

  test('ошибка отправки снимает флаг отправки и сохраняет сообщение', () => {
    const state = reduceAll([
      { type: 'checkout/opened' },
      { type: 'checkout/submitStarted' },
      { type: 'checkout/submitFailed', message: 'Сервер недоступен' },
    ]);

    expect(state.checkout).toMatchObject({ isSubmitting: false, error: 'Сервер недоступен' });
  });

  test('селекторы считают количество по товарам и общее число позиций', () => {
    const state = reduceAll([
      { type: 'cart/added', product: bears },
      { type: 'cart/added', product: bears },
      { type: 'cart/added', product: macarons },
      { type: 'cart/postponed', productId: 'macarons' },
    ]);

    expect(countInCart(state.items, state.postponed).get('gummy-bears')).toBe(2);
    expect(countInCart(state.items, state.postponed).get('macarons')).toBe(1);
    expect(countItems(state.items)).toBe(2);
  });

  test('состояние не мутируется: исходный объект остается прежним', () => {
    const before = reduceAll([{ type: 'cart/added', product: bears }]);
    const after = shopReducer(before, { type: 'cart/added', product: macarons });

    expect(before.items).toEqual([{ productId: 'gummy-bears', qty: 1 }]);
    expect(after.items).toHaveLength(2);
  });
});
