import { all, call } from 'redux-saga/effects';
import { catalogWatcher } from './catalog-saga';
import { checkoutWatcher } from './checkout-saga';
import { promoWatcher } from './promo-saga';

export interface SagaOptions {
  /** Предел ожидания ответа на заказ; в тестах задается коротким. */
  orderTimeoutMs: number;
}

export const DEFAULT_SAGA_OPTIONS: SagaOptions = { orderTimeoutMs: 15_000 };

/**
 * Корневая сага запускает всех наблюдателей параллельно.
 *
 * В `all` уходят вызванные генераторы, а не ссылки на функции: без вызова
 * ничего не запустится.
 */
export function* rootSaga(options: SagaOptions = DEFAULT_SAGA_OPTIONS) {
  yield all([
    call(catalogWatcher),
    call(promoWatcher),
    call(checkoutWatcher, options.orderTimeoutMs),
  ]);
}
