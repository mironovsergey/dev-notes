import { delay, http, HttpResponse } from 'msw';
import { PRODUCTS } from '../domain/fixtures/products';
import { EXPIRED_PROMO_CODES, PROMOS } from '../domain/fixtures/promos';
import { calculateTotals } from '../domain/pricing';
import type { CartLine, Order, OrderRequest } from '../domain/types';

let nextOrderNumber = 1001;

function readCode(body: unknown): string {
  if (
    typeof body === 'object' &&
    body !== null &&
    'code' in body &&
    typeof body.code === 'string'
  ) {
    return body.code.trim().toUpperCase();
  }

  return '';
}

function isOrderRequest(body: unknown): body is OrderRequest {
  return (
    typeof body === 'object' &&
    body !== null &&
    'items' in body &&
    Array.isArray(body.items) &&
    'delivery' in body &&
    typeof body.delivery === 'string'
  );
}

/** Задержка ответов mock-API; тесты передают 0 через `createHandlers`. */
export function createHandlers(latency = 300) {
  return [
    http.get('/api/products', async () => {
      await delay(latency);

      return HttpResponse.json(PRODUCTS);
    }),

    http.post('/api/promo/validate', async ({ request }) => {
      await delay(latency);
      const code = readCode(await request.json());

      if (EXPIRED_PROMO_CODES.includes(code)) {
        return HttpResponse.json({ message: 'Срок действия промокода истек' }, { status: 410 });
      }

      const promo = PROMOS.find((candidate) => candidate.code === code);

      if (promo === undefined) {
        return HttpResponse.json({ message: 'Такого промокода нет' }, { status: 404 });
      }

      return HttpResponse.json(promo);
    }),

    http.post('/api/orders', async ({ request }) => {
      await delay(latency);
      const order: unknown = await request.json();

      if (!isOrderRequest(order)) {
        return HttpResponse.json({ message: 'Некорректный заказ' }, { status: 400 });
      }

      const lines = order.items.flatMap<CartLine>((item) => {
        const product = PRODUCTS.find((candidate) => candidate.id === item.productId);

        return product === undefined ? [] : [{ product, qty: item.qty }];
      });

      if (lines.length === 0) {
        return HttpResponse.json({ message: 'Корзина пуста' }, { status: 400 });
      }

      const promo = PROMOS.find((candidate) => candidate.code === order.promoCode) ?? null;
      const totals = calculateTotals(lines, promo, order.delivery);

      nextOrderNumber += 1;

      const createdOrder: Order = {
        id: `L-${String(nextOrderNumber)}`,
        total: totals.total,
        createdAt: new Date().toISOString(),
      };

      return HttpResponse.json(createdOrder, { status: 201 });
    }),
  ];
}

export const handlers = createHandlers();
