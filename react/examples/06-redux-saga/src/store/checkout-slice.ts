import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Customer, Order } from '../domain';

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

export const checkoutSlice = createSlice({
  name: 'checkout',
  initialState,
  reducers: {
    opened: () => ({ ...initialState, isOpen: true }),
    closed: () => initialState,

    /** Действие-намерение: состав заказа сага соберет сама через `select`. */
    submitRequested: (state, _action: PayloadAction<Customer>) => {
      state.isSubmitting = true;
      state.error = null;
    },
    submitSucceeded: (state, action: PayloadAction<Order>) => {
      state.isSubmitting = false;
      state.order = action.payload;
    },
    submitFailed: (state, action: PayloadAction<string>) => {
      state.isSubmitting = false;
      state.error = action.payload;
    },
  },
  selectors: {
    selectCheckout: (state) => state,
    selectIsCheckoutOpen: (state) => state.isOpen,
    selectOrder: (state) => state.order,
  },
});

export const checkoutActions = checkoutSlice.actions;
export const { selectCheckout, selectIsCheckoutOpen, selectOrder } = checkoutSlice.selectors;
