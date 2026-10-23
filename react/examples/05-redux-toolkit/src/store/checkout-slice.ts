import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { createOrder, errorMessage, type Customer, type Order } from '../domain';
import type { RootState } from './types';

interface CheckoutState {
  isOpen: boolean;
  isSubmitting: boolean;
  error: string | null;
  order: Order | null;
}

const initialState: CheckoutState = {
  isOpen: false,
  isSubmitting: false,
  error: null,
  order: null,
};

/**
 * Состав заказа thunk собирает сам из состояния, поэтому компоненту нужен
 * только покупатель. `condition` не дает отправить заказ дважды: повторный
 * вызов во время отправки просто не запустится.
 */
export const submitOrder = createAsyncThunk<
  Order,
  Customer,
  { state: RootState; rejectValue: string }
>(
  'checkout/submit',
  async (customer, { getState, rejectWithValue }) => {
    const { cart, promo, delivery } = getState();

    try {
      return await createOrder({
        items: [...cart.items],
        promoCode: promo?.code ?? null,
        delivery,
        customer,
      });
    } catch (error: unknown) {
      return rejectWithValue(errorMessage(error, 'Не удалось оформить заказ'));
    }
  },
  {
    condition: (_customer, { getState }) => !getState().checkout.isSubmitting,
  },
);

export const checkoutSlice = createSlice({
  name: 'checkout',
  initialState,
  reducers: {
    opened: () => ({ ...initialState, isOpen: true }),
    closed: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(submitOrder.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(submitOrder.fulfilled, (state, action) => {
        state.isSubmitting = false;
        state.order = action.payload;
      })
      .addCase(submitOrder.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.payload ?? action.error.message ?? 'Не удалось оформить заказ';
      });
  },
  selectors: {
    selectCheckout: (state) => state,
    selectIsCheckoutOpen: (state) => state.isOpen,
  },
});

export const checkoutActions = checkoutSlice.actions;
export const { selectCheckout, selectIsCheckoutOpen } = checkoutSlice.selectors;
