import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from 'vitest';
import { autorun, isObservable, reaction, runInAction } from 'mobx';
import { http, HttpResponse } from 'msw';
import { PRODUCTS, type Customer, type Product } from '../domain';
import { server } from '../mocks/node';
import { RootStore } from './root-store';

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

describe('наблюдаемое состояние', () => {
  test('поля стора наблюдаемы, изменения идут обычным присваиванием', () => {
    const store = new RootStore();

    expect(isObservable(store.cart)).toBe(true);

    store.cart.add(bears);
    store.cart.add(bears);

    expect(store.cart.items).toEqual([{ productId: 'gummy-bears', qty: 2 }]);
  });

  test('добавление сверх остатка ничего не меняет', () => {
    const store = new RootStore();

    store.cart.add(macarons);
    store.cart.add(macarons);
    store.cart.add(macarons);

    expect(macarons.stock).toBe(2);
    expect(store.cart.items).toEqual([{ productId: 'macarons', qty: 2 }]);
  });

  test('вычисляемое пересчитывается только при изменении источников', async () => {
    const store = new RootStore();

    await store.catalog.load();

    const totals = vi.fn();

    // Без подписчика `computed` не кеширует результат, поэтому пересчеты
    // считаются под `reaction`.
    const dispose = reaction(() => store.cart.totals.total, totals);

    store.cart.add(bears);
    store.cart.add(bears);

    expect(totals).toHaveBeenCalledTimes(2);

    // Изменение, не влияющее на сумму, пересчет не вызывает.
    store.checkout.open();

    expect(totals).toHaveBeenCalledTimes(2);

    dispose();
  });

  test('autorun запускается сразу и на каждое изменение прочитанного', () => {
    const store = new RootStore();
    const counts: number[] = [];
    const dispose = autorun(() => counts.push(store.cart.itemCount));

    store.cart.add(bears);
    store.cart.add(bears);
    store.cart.remove('gummy-bears');

    expect(counts).toEqual([0, 1, 2, 0]);

    dispose();
    store.cart.add(bears);

    expect(counts).toHaveLength(4);
  });

  test('отложенная позиция возвращается с прежним количеством', () => {
    const store = new RootStore();

    store.cart.add(bears);
    store.cart.add(bears);
    store.cart.postpone('gummy-bears');

    expect(store.cart.items).toEqual([]);
    expect(store.cart.postponed).toEqual([{ productId: 'gummy-bears', qty: 2 }]);

    store.cart.restore('gummy-bears');

    expect(store.cart.items).toEqual([{ productId: 'gummy-bears', qty: 2 }]);
  });

  test('runInAction собирает изменения после await в одно действие', async () => {
    const store = new RootStore();
    const statuses: string[] = [];
    const dispose = autorun(() => statuses.push(store.catalog.status));

    await store.catalog.load();

    expect(statuses).toEqual(['loading', 'ready']);
    expect(store.catalog.products).toHaveLength(PRODUCTS.length);

    dispose();
  });

  test('ошибка запроса попадает в стор сообщением', async () => {
    server.use(
      http.get('/api/products', () =>
        HttpResponse.json({ message: 'Сервер недоступен' }, { status: 503 }),
      ),
    );

    const store = new RootStore();

    await store.catalog.load();

    expect(store.catalog.status).toBe('error');
    expect(store.catalog.error).toBe('Сервер недоступен');
  });

  test('промокод уходит в корзину, неизвестный код дает ошибку', async () => {
    const store = new RootStore();

    const applying = store.promo.apply('sale10');

    expect(store.promo.isChecking).toBe(true);

    await applying;

    expect(store.cart.promo?.code).toBe('SALE10');

    await store.promo.apply('НЕТ-ТАКОГО');

    expect(store.promo.error).toBe('Такого промокода нет');
  });

  test('flow оформляет заказ без runInAction и очищает корзину при закрытии', async () => {
    const store = new RootStore();

    await store.catalog.load();
    store.cart.add(bears);
    store.checkout.open();
    store.checkout.close();

    expect(store.cart.items).toHaveLength(1);

    store.checkout.open();
    await store.promo.apply('sale10');
    await store.checkout.submit(CUSTOMER);

    expect(store.checkout.order?.id).toMatch(/^L-\d+$/);
    expect(store.cart.items).toHaveLength(1);

    runInAction(() => {
      store.cart.setDelivery('post');
    });
    store.checkout.close();

    expect(store.cart.items).toEqual([]);
    expect(store.cart.promo).toBeNull();
    expect(store.cart.delivery).toBe('post');
  });

  test('экземпляры сторов независимы', () => {
    const first = new RootStore();
    const second = new RootStore();

    first.cart.add(bears);

    expect(first.cart.itemCount).toBe(1);
    expect(second.cart.itemCount).toBe(0);
  });
});
