import { cartSlice } from './cart-slice';
import { checkoutSlice } from './checkout-slice';
import type { AppThunk } from './types';

/**
 * Обычный thunk рядом с `createAsyncThunk`.
 *
 * Здесь нет запроса - есть решение по состоянию: после принятого заказа
 * корзина очищается, после отмены остается. `createAsyncThunk` для такого
 * избыточен, а обычные thunk в RTK никуда не делись.
 */
export const closeCheckout = (): AppThunk => (dispatch, getState) => {
  const isOrderAccepted = getState().checkout.order !== null;

  dispatch(checkoutSlice.actions.closed());

  if (isOrderAccepted) {
    dispatch(cartSlice.actions.cleared());
  }
};
