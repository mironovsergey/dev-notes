import type { Order, OrderRequest, Product, Promo } from './types';
import { isOrder, isProductList, isPromo } from './validators';

/** Выбрасывается для ответов не 2xx; по `status` интерфейс отличает 404 от 500. */
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** Текст пойманной ошибки для интерфейса; для не-Error значений возвращает запасной текст. */
export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function readMessage(body: unknown, fallback: string): string {
  if (
    typeof body === 'object' &&
    body !== null &&
    'message' in body &&
    typeof body.message === 'string'
  ) {
    return body.message;
  }

  return fallback;
}

/** Выполняет JSON-запрос и проверяет форму ответа функцией `guard` перед возвратом. */
async function request<T>(
  url: string,
  guard: (value: unknown) => value is T,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  const body: unknown = await response.json();

  if (!response.ok) {
    throw new ApiError(response.status, readMessage(body, `Ошибка ${response.status}`));
  }

  if (!guard(body)) {
    throw new ApiError(response.status, 'Сервер вернул данные неожиданной формы');
  }

  return body;
}

export function fetchProducts(signal?: AbortSignal): Promise<Product[]> {
  return request('/api/products', isProductList, { signal });
}

export function validatePromo(code: string, signal?: AbortSignal): Promise<Promo> {
  return request('/api/promo/validate', isPromo, {
    method: 'POST',
    body: JSON.stringify({ code }),
    signal,
  });
}

export function createOrder(order: OrderRequest): Promise<Order> {
  return request('/api/orders', isOrder, { method: 'POST', body: JSON.stringify(order) });
}
