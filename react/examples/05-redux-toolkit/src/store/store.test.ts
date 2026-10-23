import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest';
import { http, HttpResponse } from 'msw';
import { PRODUCTS, type Customer, type Product } from '../domain';
import { server } from '../mocks/node';
import { cartActions } from './cart-slice';
import { loadCatalog } from './catalog-slice';
import { checkoutActions, submitOrder } from './checkout-slice';
import { deliveryActions } from './delivery-slice';
import { applyPromo } from './promo-slice';
import { selectInCartByProductId, selectTotals } from './selectors';
import { createAppStore } from './store';
import { closeCheckout } from './thunks';

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
const CUSTOMER: Customer = { name: 'Анна', phone: '+7 900 000-00-00', address: 'Москва' };

describe('срезы и хранилище', () => {
  test('createSlice собирает типы действий из имени среза и ключа обработчика', () => {
    expect(cartActions.added.type).toBe('cart/added');
    expect(cartActions.qtyChanged.type).toBe('cart/qtyChanged');
    expect(loadCatalog.pending.type).toBe('catalog/load/pending');
    expect(loadCatalog.fulfilled.type).toBe('catalog/load/fulfilled');
  });

  test('prepare складывает два аргумента в один payload', () => {
    expect(cartActions.qtyChanged(bears, 3).payload).toEqual({ product: bears, qty: 3 });
  });

  test('Immer превращает мутацию черновика в новое замороженное состояние', () => {
    const store = createAppStore();

    store.dispatch(cartActions.added(bears));

    const afterFirst = store.getState().cart;

    store.dispatch(cartActions.added(bears));

    expect(afterFirst.items).toEqual([{ productId: 'gummy-bears', qty: 1 }]);
    expect(store.getState().cart.items).toEqual([{ productId: 'gummy-bears', qty: 2 }]);
    expect(Object.isFrozen(afterFirst.items)).toBe(true);
  });

  test('добавление сверх остатка не меняет срез корзины', () => {
    const store = createAppStore();

    store.dispatch(cartActions.added(macarons));
    store.dispatch(cartActions.added(macarons));

    const atStockLimit = store.getState().cart;

    store.dispatch(cartActions.added(macarons));

    expect(macarons.stock).toBe(2);
    expect(store.getState().cart).toBe(atStockLimit);
  });

  test('отложенная позиция возвращается с прежним количеством', () => {
    const store = createAppStore();

    store.dispatch(cartActions.added(bears));
    store.dispatch(cartActions.added(bears));
    store.dispatch(cartActions.postponed('gummy-bears'));

    expect(store.getState().cart.items).toEqual([]);
    expect(store.getState().cart.postponed).toEqual([{ productId: 'gummy-bears', qty: 2 }]);

    store.dispatch(cartActions.restored('gummy-bears'));

    expect(store.getState().cart.items).toEqual([{ productId: 'gummy-bears', qty: 2 }]);
  });

  test('createAsyncThunk проходит pending и fulfilled', async () => {
    const store = createAppStore();

    expect(store.getState().catalog.status).toBe('loading');

    await store.dispatch(loadCatalog());

    expect(store.getState().catalog.status).toBe('ready');
    expect(store.getState().catalog.products).toHaveLength(PRODUCTS.length);
  });

  test('rejectWithValue кладет в состояние сообщение, а не объект ошибки', async () => {
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

  test('отмена запроса не считается ошибкой интерфейса', async () => {
    const store = createAppStore();
    const request = store.dispatch(loadCatalog());

    request.abort();

    const action = await request;

    // `match` - type guard из RTK: сужает действие до отклоненного варианта,
    // у которого только и есть поле `meta.aborted`.
    expect(loadCatalog.rejected.match(action)).toBe(true);

    if (loadCatalog.rejected.match(action)) {
      expect(action.meta.aborted).toBe(true);
    }

    expect(store.getState().catalog.status).toBe('loading');
    expect(store.getState().catalog.error).toBeNull();
  });

  test('unwrap отдает payload удачного действия и бросает значение из rejectWithValue', async () => {
    const store = createAppStore();

    const promo = await store.dispatch(applyPromo('sale10')).unwrap();

    expect(promo.code).toBe('SALE10');
    expect(store.getState().promo?.code).toBe('SALE10');

    await expect(store.dispatch(applyPromo('НЕТ-ТАКОГО')).unwrap()).rejects.toThrow(
      'Такого промокода нет',
    );
    expect(store.getState().promo?.code).toBe('SALE10');
  });

  test('condition не дает отправить заказ дважды', async () => {
    const store = createAppStore();

    await store.dispatch(loadCatalog());
    store.dispatch(cartActions.added(bears));
    store.dispatch(checkoutActions.opened());

    const first = store.dispatch(submitOrder(CUSTOMER));
    const second = store.dispatch(submitOrder(CUSTOMER));

    const secondAction = await second;

    expect(secondAction.type).toBe('checkout/submit/rejected');

    if (submitOrder.rejected.match(secondAction)) {
      expect(secondAction.meta.condition).toBe(true);
    }

    await first;

    expect(store.getState().checkout.order?.id).toMatch(/^L-\d+$/);
    expect(store.getState().checkout.isSubmitting).toBe(false);
  });

  test('closeCheckout очищает корзину после заказа, а промокод снимает чужой срез', async () => {
    const store = createAppStore();

    store.dispatch(cartActions.added(bears));
    store.dispatch(checkoutActions.opened());
    store.dispatch(closeCheckout());

    expect(store.getState().cart.items).toHaveLength(1);

    store.dispatch(checkoutActions.opened());
    await store.dispatch(applyPromo('sale10'));
    await store.dispatch(submitOrder(CUSTOMER));
    store.dispatch(deliveryActions.changed('courier'));
    store.dispatch(closeCheckout());

    expect(store.getState().cart.items).toEqual([]);
    expect(store.getState().promo).toBeNull();
    expect(store.getState().delivery).toBe('courier');
  });

  test('мемоизированный селектор не пересчитывается при изменении чужого среза', async () => {
    const store = createAppStore();

    await store.dispatch(loadCatalog());
    store.dispatch(cartActions.added(bears));

    const totals = selectTotals(store.getState());
    const inCart = selectInCartByProductId(store.getState());

    store.dispatch(checkoutActions.opened());

    expect(selectTotals(store.getState())).toBe(totals);
    expect(selectInCartByProductId(store.getState())).toBe(inCart);

    store.dispatch(cartActions.added(bears));

    expect(selectTotals(store.getState())).not.toBe(totals);
  });
});
