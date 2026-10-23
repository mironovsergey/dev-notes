import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { PRODUCTS, type Customer, type Product } from '../domain';
import { server } from '../mocks/node';
import { INITIAL_STORE_STATE, useShopStore } from './store';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();

  // Стор глобальный: между тестами состояние возвращается к исходному,
  // `true` заменяет его целиком - вместе с действиями.
  useShopStore.setState(INITIAL_STORE_STATE, true);
  localStorage.clear();
});
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

describe('стор без React', () => {
  test('действия вызываются прямо из стора, состояние читается через getState', () => {
    const { addProduct } = useShopStore.getState();

    addProduct(bears);
    addProduct(bears);

    expect(useShopStore.getState().items).toEqual([{ productId: 'gummy-bears', qty: 2 }]);
  });

  test('действия стабильны между обновлениями состояния', () => {
    const { addProduct } = useShopStore.getState();

    addProduct(bears);

    expect(useShopStore.getState().addProduct).toBe(addProduct);
  });

  test('Immer не создает новое состояние, когда обработчик ничего не изменил', () => {
    const { addProduct } = useShopStore.getState();

    addProduct(macarons);
    addProduct(macarons);

    const atStockLimit = useShopStore.getState().items;

    addProduct(macarons);

    expect(macarons.stock).toBe(2);
    expect(useShopStore.getState().items).toBe(atStockLimit);
  });

  test('отложенная позиция возвращается с прежним количеством', () => {
    const { addProduct, postponeItem, restoreItem } = useShopStore.getState();

    addProduct(bears);
    addProduct(bears);
    postponeItem('gummy-bears');

    expect(useShopStore.getState().items).toEqual([]);
    expect(useShopStore.getState().postponed).toEqual([{ productId: 'gummy-bears', qty: 2 }]);

    restoreItem('gummy-bears');

    expect(useShopStore.getState().items).toEqual([{ productId: 'gummy-bears', qty: 2 }]);
  });

  test('subscribe уведомляет об изменениях вне React', () => {
    const listener = vi.fn();
    const unsubscribe = useShopStore.subscribe(listener);

    useShopStore.getState().addProduct(bears);

    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    useShopStore.getState().addProduct(bears);

    expect(listener).toHaveBeenCalledTimes(1);
  });

  test('persist сохраняет только то, что перечислено в partialize', () => {
    useShopStore.getState().addProduct(bears);
    useShopStore.getState().changeDelivery('courier');

    const stored: unknown = JSON.parse(localStorage.getItem('lavka-cart') ?? 'null');

    expect(stored).toEqual({
      state: {
        items: [{ productId: 'gummy-bears', qty: 1 }],
        postponed: [],
        delivery: 'courier',
      },
      version: 1,
    });
  });

  test('асинхронное действие наполняет каталог и выставляет статус', async () => {
    expect(useShopStore.getState().catalogStatus).toBe('loading');

    await useShopStore.getState().loadCatalog();

    expect(useShopStore.getState().catalogStatus).toBe('ready');
    expect(useShopStore.getState().products).toHaveLength(PRODUCTS.length);
  });

  test('ошибка запроса попадает в стор сообщением', async () => {
    server.use(
      http.get('/api/products', () =>
        HttpResponse.json({ message: 'Сервер недоступен' }, { status: 503 }),
      ),
    );

    await useShopStore.getState().loadCatalog();

    expect(useShopStore.getState().catalogStatus).toBe('error');
    expect(useShopStore.getState().catalogError).toBe('Сервер недоступен');
  });

  test('промокод проходит через флаг проверки, неизвестный код дает ошибку', async () => {
    const applying = useShopStore.getState().applyPromo('sale10');

    expect(useShopStore.getState().isPromoChecking).toBe(true);

    await applying;

    expect(useShopStore.getState().promo?.code).toBe('SALE10');

    await useShopStore.getState().applyPromo('НЕТ-ТАКОГО');

    expect(useShopStore.getState().promoError).toBe('Такого промокода нет');
  });

  test('срез оформления читает чужие данные через get и очищает корзину после заказа', async () => {
    await useShopStore.getState().loadCatalog();

    const { addProduct, changeDelivery, openCheckout, closeCheckout, submitOrder } =
      useShopStore.getState();

    addProduct(bears);
    openCheckout();
    closeCheckout();

    expect(useShopStore.getState().items).toHaveLength(1);

    openCheckout();
    await useShopStore.getState().applyPromo('sale10');
    await submitOrder(CUSTOMER);

    expect(useShopStore.getState().order?.id).toMatch(/^L-\d+$/);
    expect(useShopStore.getState().items).toHaveLength(1);

    changeDelivery('post');
    closeCheckout();

    expect(useShopStore.getState().items).toEqual([]);
    expect(useShopStore.getState().promo).toBeNull();
    expect(useShopStore.getState().delivery).toBe('post');
  });
});
