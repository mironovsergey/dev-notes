import { createOrder, errorMessage } from '../domain';
import type { StateCreator } from 'zustand';
import type { CheckoutSlice, ShopStore } from './types';

/**
 * Срез оформления читает чужие данные через `get`.
 *
 * Срез видит стор целиком, поэтому состав заказа собирается здесь же -
 * ни селекторов, ни передачи данных из компонента не требуется.
 */
export const createCheckoutSlice: StateCreator<
  ShopStore,
  [['zustand/immer', never]],
  [],
  CheckoutSlice
> = (set, get) => ({
  isCheckoutOpen: false,
  isSubmitting: false,
  checkoutError: null,
  order: null,

  openCheckout: () => {
    set((state) => {
      state.isCheckoutOpen = true;
      state.checkoutError = null;
      state.order = null;
    });
  },

  closeCheckout: () => {
    const isOrderAccepted = get().order !== null;

    set((state) => {
      state.isCheckoutOpen = false;
      state.order = null;
    });

    if (isOrderAccepted) {
      get().clearCart();
    }
  },

  submitOrder: async (customer) => {
    const { items, promo, delivery } = get();

    set((state) => {
      state.isSubmitting = true;
      state.checkoutError = null;
    });

    try {
      const order = await createOrder({
        items: [...items],
        promoCode: promo?.code ?? null,
        delivery,
        customer,
      });

      set((state) => {
        state.isSubmitting = false;
        state.order = order;
      });
    } catch (error: unknown) {
      set((state) => {
        state.isSubmitting = false;
        state.checkoutError = errorMessage(error, 'Не удалось оформить заказ');
      });
    }
  },
});
