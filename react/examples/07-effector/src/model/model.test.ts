import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from 'vitest';
import { allSettled, fork } from 'effector';
import { http, HttpResponse } from 'msw';
import { PRODUCTS, type Customer, type Product, type Promo } from '../domain';
import { server } from '../mocks/node';
import {
  $cart,
  $catalogError,
  $catalogStatus,
  $inCartByProductId,
  $itemCount,
  $order,
  $products,
  $promo,
  $promoError,
  $totals,
  $delivery,
  catalogRequested,
  checkoutClosed,
  checkoutOpened,
  deliveryChanged,
  itemPostponed,
  itemRestored,
  orderSubmitted,
  productAdded,
  promoSubmitted,
  validatePromoFx,
} from './index';

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
const PROMO: Promo = { code: 'SALE10', kind: 'percent', value: 10, minSubtotal: 0 };
const CUSTOMER: Customer = { name: 'Анна', phone: '+7 900 000-00-00', address: 'Москва' };

describe('модель на юнитах', () => {
  test('событие наполняет стор, а производные сторы пересчитываются', async () => {
    const scope = fork();

    await allSettled(productAdded, { scope, params: bears });
    await allSettled(productAdded, { scope, params: bears });

    expect(scope.getState($cart).items).toEqual([{ productId: 'gummy-bears', qty: 2 }]);
    expect(scope.getState($inCartByProductId).get('gummy-bears')).toBe(2);
    expect(scope.getState($itemCount)).toBe(2);
  });

  test('sample с filter не пропускает добавление сверх остатка', async () => {
    const scope = fork();

    await allSettled(productAdded, { scope, params: macarons });
    await allSettled(productAdded, { scope, params: macarons });

    const atStockLimit = scope.getState($cart);

    await allSettled(productAdded, { scope, params: macarons });

    expect(macarons.stock).toBe(2);
    expect(scope.getState($cart)).toBe(atStockLimit);
  });

  test('отложенная позиция возвращается с прежним количеством', async () => {
    const scope = fork();

    await allSettled(productAdded, { scope, params: bears });
    await allSettled(productAdded, { scope, params: bears });
    await allSettled(itemPostponed, { scope, params: 'gummy-bears' });

    expect(scope.getState($cart).items).toEqual([]);
    expect(scope.getState($cart).postponed).toEqual([{ productId: 'gummy-bears', qty: 2 }]);

    await allSettled(itemRestored, { scope, params: 'gummy-bears' });

    expect(scope.getState($cart).items).toEqual([{ productId: 'gummy-bears', qty: 2 }]);
  });

  test('эффект наполняет каталог, а статус собирается из pending', async () => {
    const scope = fork();

    expect(scope.getState($catalogStatus)).toBe('loading');

    await allSettled(catalogRequested, { scope });

    expect(scope.getState($catalogStatus)).toBe('ready');
    expect(scope.getState($products)).toHaveLength(PRODUCTS.length);
  });

  test('failData кладет в стор сообщение, а статус становится ошибкой', async () => {
    server.use(
      http.get('/api/products', () =>
        HttpResponse.json({ message: 'Сервер недоступен' }, { status: 503 }),
      ),
    );

    const scope = fork();

    await allSettled(catalogRequested, { scope });

    expect(scope.getState($catalogError)).toBe('Сервер недоступен');
    expect(scope.getState($catalogStatus)).toBe('error');
  });

  test('filter в графе не пускает пустой промокод до эффекта', async () => {
    const validate = vi.fn(() => Promise.resolve<Promo>({ ...PROMO }));
    const scope = fork({ handlers: [[validatePromoFx, validate]] });

    await allSettled(promoSubmitted, { scope, params: '   ' });

    expect(validate).not.toHaveBeenCalled();

    await allSettled(promoSubmitted, { scope, params: '  sale10  ' });

    // Пробелы по краям срезает `fn` до вызова эффекта.
    expect(validate).toHaveBeenCalledWith('sale10');
  });

  test('ошибка промокода приходит из failData', async () => {
    const scope = fork();

    await allSettled(promoSubmitted, { scope, params: 'НЕТ-ТАКОГО' });

    expect(scope.getState($promo)).toBeNull();
    expect(scope.getState($promoError)).toBe('Такого промокода нет');
  });

  test('attach собирает состав заказа из сторов: компонент передает только покупателя', async () => {
    const scope = fork();

    await allSettled(catalogRequested, { scope });
    await allSettled(productAdded, { scope, params: bears });
    await allSettled(promoSubmitted, { scope, params: 'sale10' });
    await allSettled(deliveryChanged, { scope, params: 'courier' });
    await allSettled(checkoutOpened, { scope });
    await allSettled(orderSubmitted, { scope, params: CUSTOMER });

    const order = scope.getState($order);

    expect(order?.id).toMatch(/^L-\d+$/);

    // 690 − 10 % = 621, курьер 300: до бесплатной доставки не дотянули.
    expect(order?.total).toBe(scope.getState($totals).total);
    expect(scope.getState($cart).items).toHaveLength(1);
  });

  test('корзина очищается при закрытии окна и только после принятого заказа', async () => {
    const scope = fork();

    await allSettled(catalogRequested, { scope });
    await allSettled(productAdded, { scope, params: bears });
    await allSettled(checkoutOpened, { scope });
    await allSettled(checkoutClosed, { scope });

    expect(scope.getState($cart).items).toHaveLength(1);

    await allSettled(checkoutOpened, { scope });
    await allSettled(promoSubmitted, { scope, params: 'sale10' });
    await allSettled(orderSubmitted, { scope, params: CUSTOMER });
    await allSettled(deliveryChanged, { scope, params: 'post' });
    await allSettled(checkoutClosed, { scope });

    expect(scope.getState($cart).items).toEqual([]);
    expect(scope.getState($promo)).toBeNull();
    expect(scope.getState($delivery)).toBe('post');
  });

  test('области видимости изолированы друг от друга', async () => {
    const first = fork();
    const second = fork();

    await allSettled(productAdded, { scope: first, params: bears });

    expect(first.getState($itemCount)).toBe(1);
    expect(second.getState($itemCount)).toBe(0);
  });
});
