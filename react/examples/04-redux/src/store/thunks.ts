import { ApiError, createOrder, errorMessage, fetchProducts, validatePromo } from '../domain';
import type { Customer, Promo } from '../domain';
import {
  cartCleared,
  catalogFailed,
  catalogLoaded,
  catalogRequested,
  checkoutClosed,
  checkoutSubmitFailed,
  checkoutSubmitStarted,
  checkoutSucceeded,
  promoApplied,
} from './actions';
import type { AppThunk } from './types';

export type PromoResult = { ok: true; promo: Promo } | { ok: false; message: string };

/**
 * Thunk - функция вместо объекта действия.
 *
 * Middleware `redux-thunk` вызывает ее с `dispatch` и `getState`, поэтому
 * асинхронная работа и решения, зависящие от текущего состояния, живут здесь,
 * а не в компонентах и не в редьюсерах.
 */
export const loadCatalog =
  (signal?: AbortSignal): AppThunk<Promise<void>> =>
  async (dispatch) => {
    dispatch(catalogRequested());

    try {
      const products = await fetchProducts(signal);

      dispatch(catalogLoaded(products));
    } catch (error: unknown) {
      if (signal?.aborted === true) {
        return;
      }

      dispatch(catalogFailed(errorMessage(error, 'Не удалось загрузить каталог')));
    }
  };

export const applyPromo =
  (code: string): AppThunk<Promise<PromoResult>> =>
  async (dispatch) => {
    try {
      const appliedPromo = await validatePromo(code);

      dispatch(promoApplied(appliedPromo));

      return { ok: true, promo: appliedPromo };
    } catch (error: unknown) {
      const message =
        error instanceof ApiError
          ? error.message
          : errorMessage(error, 'Не удалось проверить промокод');

      return { ok: false, message };
    }
  };

export const submitOrder =
  (customer: Customer): AppThunk<Promise<void>> =>
  async (dispatch, getState) => {
    const { cart, promo, delivery } = getState();

    dispatch(checkoutSubmitStarted());

    try {
      const createdOrder = await createOrder({
        items: [...cart.items],
        promoCode: promo?.code ?? null,
        delivery,
        customer,
      });

      dispatch(checkoutSucceeded(createdOrder));
    } catch (error: unknown) {
      dispatch(checkoutSubmitFailed(errorMessage(error, 'Не удалось оформить заказ')));
    }
  };

/**
 * Закрытие окна: после принятого заказа корзина очищается, после отмены - нет.
 *
 * Решение принимается по состоянию, поэтому живет в thunk: редьюсер среза
 * `checkout` не видит корзину, а компоненту эта логика не принадлежит.
 */
export const closeCheckout = (): AppThunk => (dispatch, getState) => {
  const isOrderAccepted = getState().checkout.order !== null;

  dispatch(checkoutClosed());

  if (isOrderAccepted) {
    dispatch(cartCleared());
  }
};
