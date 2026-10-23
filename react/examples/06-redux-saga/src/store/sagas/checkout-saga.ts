import {
  createOrder,
  errorMessage,
  type CartItem,
  type Customer,
  type DeliveryMethod,
  type Order,
  type Promo,
} from '../../domain';
import type { PayloadAction } from '@reduxjs/toolkit';
import { all, call, delay, put, race, select, take, takeLatest } from 'redux-saga/effects';
import { cartSlice } from '../cart-slice';
import { checkoutActions } from '../checkout-slice';
import { selectItems } from '../cart-slice';
import { selectDelivery } from '../delivery-slice';
import { selectPromo } from '../promo-slice';

interface OrderRace {
  order?: Order;
  timeout?: true;
}

/**
 * Worker оформления заказа.
 *
 * Состав заказа читается из состояния эффектом `select` - компоненту не нужно
 * собирать его и передавать. `race` запускает запрос и таймер одновременно и
 * оставляет то, что завершилось первым: зависший запрос не оставит окно в
 * состоянии «Отправляем…» навсегда.
 */
export function* submitOrderWorker(timeoutMs: number, action: PayloadAction<Customer>) {
  const items: readonly CartItem[] = yield select(selectItems);
  const promo: Promo | null = yield select(selectPromo);
  const delivery: DeliveryMethod = yield select(selectDelivery);

  try {
    const { order, timeout }: OrderRace = yield race({
      order: call(createOrder, {
        items: [...items],
        promoCode: promo?.code ?? null,
        delivery,
        customer: action.payload,
      }),
      timeout: delay(timeoutMs, true),
    });

    if (timeout === true || order === undefined) {
      yield put(checkoutActions.submitFailed('Сервер не ответил вовремя, попробуйте еще раз'));

      return;
    }

    yield put(checkoutActions.submitSucceeded(order));
  } catch (error: unknown) {
    yield put(checkoutActions.submitFailed(errorMessage(error, 'Не удалось оформить заказ')));
  }
}

/**
 * Сценарий из нескольких шагов - то, чего не умеет thunk.
 *
 * После принятого заказа сага останавливается на `take` и ждет закрытия окна,
 * и только тогда очищает корзину. Проверять состояние в обработчике закрытия
 * бесполезно: редьюсер срабатывает раньше саги и уже сбрасывает заказ.
 */
export function* clearCartAfterOrderWorker() {
  yield take(checkoutActions.closed.type);
  yield put(cartSlice.actions.cleared());
}

export function* checkoutWatcher(timeoutMs: number) {
  yield all([
    takeLatest(checkoutActions.submitRequested.type, submitOrderWorker, timeoutMs),
    takeLatest(checkoutActions.submitSucceeded.type, clearCartAfterOrderWorker),
  ]);
}
