import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest';
import { http, HttpResponse } from 'msw';
import { PRODUCTS, type Product } from '../domain';
import { server } from '../mocks/node';
import {
  cartAdded,
  cartPostponed,
  cartRestored,
  checkoutOpened,
  deliveryChanged,
  CART_ADDED,
} from './actions';
import { selectInCartByProductId, selectTotals } from './selectors';
import { createAppStore } from './store';
import { applyPromo, closeCheckout, loadCatalog, submitOrder } from './thunks';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function productFixture(id: string): Product {
  const foundProduct = PRODUCTS.find((candidate) => candidate.id === id);

  if (foundProduct === undefined) {
    throw new Error(`В фикстурах нет товара ${id}`);
  }

  return foundProduct;
}

const bears = productFixture('gummy-bears');
const macarons = productFixture('macarons');

describe('хранилище без React', () => {
  test('действия меняют срезы, состояние остается неизменяемым', () => {
    const store = createAppStore();
    const before = store.getState();

    store.dispatch(cartAdded(bears));
    store.dispatch(cartAdded(bears));

    expect(store.getState().cart.items).toEqual([{ productId: 'gummy-bears', qty: 2 }]);
    expect(before.cart.items).toEqual([]);
  });

  test('добавление сверх остатка не меняет срез корзины', () => {
    const store = createAppStore();

    store.dispatch(cartAdded(macarons));
    store.dispatch(cartAdded(macarons));

    const atStockLimit = store.getState().cart;

    store.dispatch(cartAdded(macarons));

    expect(macarons.stock).toBe(2);
    expect(store.getState().cart).toBe(atStockLimit);
  });

  test('отложенная позиция возвращается с прежним количеством', () => {
    const store = createAppStore();

    store.dispatch(cartAdded(bears));
    store.dispatch(cartAdded(bears));
    store.dispatch(cartPostponed('gummy-bears'));

    expect(store.getState().cart.items).toEqual([]);
    expect(store.getState().cart.postponed).toEqual([{ productId: 'gummy-bears', qty: 2 }]);

    store.dispatch(cartRestored('gummy-bears'));

    expect(store.getState().cart.items).toEqual([{ productId: 'gummy-bears', qty: 2 }]);
  });

  test('действие с полем неожиданной формы отбрасывается сужением', () => {
    const store = createAppStore();

    store.dispatch({ type: CART_ADDED, product: 'это не товар' });

    expect(store.getState().cart.items).toEqual([]);
  });

  test('thunk loadCatalog наполняет каталог', async () => {
    const store = createAppStore();

    expect(store.getState().catalog.status).toBe('loading');

    await store.dispatch(loadCatalog());

    expect(store.getState().catalog.status).toBe('ready');
    expect(store.getState().catalog.products).toHaveLength(PRODUCTS.length);
  });

  test('thunk loadCatalog сохраняет сообщение об ошибке', async () => {
    server.use(
      http.get('/api/products', () =>
        HttpResponse.json({ message: 'Сервер недоступен' }, { status: 503 }),
      ),
    );

    const store = createAppStore();

    await store.dispatch(loadCatalog());

    expect(store.getState().catalog).toMatchObject({
      status: 'error',
      error: 'Сервер недоступен',
    });
  });

  test('thunk applyPromo кладет промокод в хранилище, а неизвестный код - нет', async () => {
    const store = createAppStore();

    const applied = await store.dispatch(applyPromo('sale10'));

    expect(applied).toEqual({ ok: true, promo: store.getState().promo });
    expect(store.getState().promo?.code).toBe('SALE10');

    const rejected = await store.dispatch(applyPromo('НЕТ-ТАКОГО'));

    expect(rejected).toEqual({ ok: false, message: 'Такого промокода нет' });
    expect(store.getState().promo?.code).toBe('SALE10');
  });

  test('thunk submitOrder проходит через состояния отправки и сохраняет заказ', async () => {
    const store = createAppStore();

    await store.dispatch(loadCatalog());
    store.dispatch(cartAdded(bears));
    store.dispatch(checkoutOpened());

    const submitting = store.dispatch(
      submitOrder({ name: 'Анна', phone: '+7 900 000-00-00', address: 'Москва' }),
    );

    expect(store.getState().checkout.isSubmitting).toBe(true);

    await submitting;

    expect(store.getState().checkout.isSubmitting).toBe(false);
    expect(store.getState().checkout.order?.id).toMatch(/^L-\d+$/);
  });

  test('closeCheckout очищает корзину после принятого заказа и сохраняет ее после отмены', async () => {
    const store = createAppStore();

    store.dispatch(cartAdded(bears));
    store.dispatch(checkoutOpened());
    store.dispatch(closeCheckout());

    expect(store.getState().cart.items).toHaveLength(1);

    store.dispatch(checkoutOpened());
    await store.dispatch(
      submitOrder({ name: 'Анна', phone: '+7 900 000-00-00', address: 'Москва' }),
    );
    store.dispatch(deliveryChanged('courier'));
    store.dispatch(closeCheckout());

    expect(store.getState().cart.items).toEqual([]);
    expect(store.getState().promo).toBeNull();
    expect(store.getState().delivery).toBe('courier');
  });

  test('мемоизированный селектор не пересчитывается при изменении чужого среза', async () => {
    const store = createAppStore();

    await store.dispatch(loadCatalog());
    store.dispatch(cartAdded(bears));

    const totals = selectTotals(store.getState());
    const inCart = selectInCartByProductId(store.getState());

    store.dispatch(checkoutOpened());

    expect(selectTotals(store.getState())).toBe(totals);
    expect(selectInCartByProductId(store.getState())).toBe(inCart);

    store.dispatch(cartAdded(bears));

    expect(selectTotals(store.getState())).not.toBe(totals);
  });
});
