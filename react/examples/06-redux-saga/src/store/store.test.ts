import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest';
import { delay as mswDelay, http, HttpResponse } from 'msw';
import { PRODUCTS, type Customer, type Product } from '../domain';
import { server } from '../mocks/node';
import { cartActions } from './cart-slice';
import { catalogActions } from './catalog-slice';
import { checkoutActions } from './checkout-slice';
import { deliveryActions } from './delivery-slice';
import { promoActions } from './promo-slice';
import { createAppStore } from './store';

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
const CUSTOMER: Customer = { name: 'Анна', phone: '+7 900 000-00-00', address: 'Москва' };

/** Ждет, пока условие станет истинным: саги завершаются вне контроля теста. */
async function waitFor(condition: () => boolean, timeoutMs = 2000): Promise<void> {
  const startedAt = Date.now();

  while (!condition()) {
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error('Условие не выполнилось за отведенное время');
    }

    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

describe('саги', () => {
  test('watcher ловит действие и наполняет каталог', async () => {
    const store = createAppStore();

    store.dispatch(catalogActions.requested());

    expect(store.getState().catalog.status).toBe('loading');

    await waitFor(() => store.getState().catalog.status === 'ready');

    expect(store.getState().catalog.products).toHaveLength(PRODUCTS.length);
  });

  test('takeLatest оставляет результат последнего запроса, а не вернувшегося позже', async () => {
    let call = 0;

    server.use(
      http.get('/api/products', async () => {
        call += 1;

        if (call === 1) {
          await mswDelay(120);

          return HttpResponse.json([{ ...bears, id: 'первый-ответ', title: 'Первый ответ' }]);
        }

        return HttpResponse.json([{ ...bears, id: 'второй-ответ', title: 'Второй ответ' }]);
      }),
    );

    const store = createAppStore();

    store.dispatch(catalogActions.requested());
    store.dispatch(catalogActions.requested());

    await waitFor(() => store.getState().catalog.status === 'ready');
    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(call).toBe(2);
    expect(store.getState().catalog.products.map((product) => product.id)).toEqual([
      'второй-ответ',
    ]);
  });

  test('ошибка запроса попадает в состояние отдельным действием', async () => {
    server.use(
      http.get('/api/products', () =>
        HttpResponse.json({ message: 'Сервер недоступен' }, { status: 503 }),
      ),
    );

    const store = createAppStore();

    store.dispatch(catalogActions.requested());

    await waitFor(() => store.getState().catalog.status === 'error');

    expect(store.getState().catalog.error).toBe('Сервер недоступен');
  });

  test('ход проверки промокода виден через состояние, а не через промис', async () => {
    const store = createAppStore();

    store.dispatch(promoActions.requested('sale10'));

    expect(store.getState().promo.isChecking).toBe(true);

    await waitFor(() => !store.getState().promo.isChecking);

    expect(store.getState().promo.applied?.code).toBe('SALE10');

    store.dispatch(promoActions.requested('НЕТ-ТАКОГО'));

    await waitFor(() => store.getState().promo.error !== null);

    expect(store.getState().promo.error).toBe('Такого промокода нет');
  });

  test('сага собирает состав заказа из состояния через select', async () => {
    const store = createAppStore();

    store.dispatch(catalogActions.requested());
    await waitFor(() => store.getState().catalog.status === 'ready');

    store.dispatch(cartActions.added(bears));
    store.dispatch(deliveryActions.changed('courier'));
    store.dispatch(checkoutActions.opened());
    store.dispatch(checkoutActions.submitRequested(CUSTOMER));

    expect(store.getState().checkout.isSubmitting).toBe(true);

    await waitFor(() => store.getState().checkout.order !== null);

    expect(store.getState().checkout.order?.id).toMatch(/^L-\d+$/);
    expect(store.getState().checkout.isSubmitting).toBe(false);
  });

  test('race с таймером не дает окну зависнуть на медленном ответе', async () => {
    server.use(
      http.post('/api/orders', async () => {
        await mswDelay(300);

        return HttpResponse.json({ id: 'L-9999', total: 0, createdAt: '' }, { status: 201 });
      }),
    );

    const store = createAppStore({ orderTimeoutMs: 30 });

    store.dispatch(cartActions.added(bears));
    store.dispatch(checkoutActions.opened());
    store.dispatch(checkoutActions.submitRequested(CUSTOMER));

    await waitFor(() => store.getState().checkout.error !== null);

    expect(store.getState().checkout.error).toBe('Сервер не ответил вовремя, попробуйте еще раз');
    expect(store.getState().checkout.isSubmitting).toBe(false);
    expect(store.getState().checkout.order).toBeNull();
  });

  test('после принятого заказа сага ждет закрытия окна и очищает корзину', async () => {
    const store = createAppStore();

    store.dispatch(cartActions.added(bears));
    store.dispatch(checkoutActions.opened());

    // Отмена до заказа корзину сохраняет: ждать нечего, сага не запускалась.
    store.dispatch(checkoutActions.closed());
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(store.getState().cart.items).toHaveLength(1);

    store.dispatch(checkoutActions.opened());
    store.dispatch(promoActions.requested('sale10'));
    await waitFor(() => store.getState().promo.applied !== null);

    store.dispatch(checkoutActions.submitRequested(CUSTOMER));
    await waitFor(() => store.getState().checkout.order !== null);

    expect(store.getState().cart.items).toHaveLength(1);

    store.dispatch(deliveryActions.changed('post'));
    store.dispatch(checkoutActions.closed());

    await waitFor(() => store.getState().cart.items.length === 0);

    expect(store.getState().promo.applied).toBeNull();
    expect(store.getState().delivery).toBe('post');
  });
});
