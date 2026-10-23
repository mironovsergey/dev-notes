import { ApiError, errorMessage, validatePromo } from '../domain';
import type { StateCreator } from 'zustand';
import type { PromoSlice, ShopStore } from './types';

export const createPromoSlice: StateCreator<
  ShopStore,
  [['zustand/immer', never]],
  [],
  PromoSlice
> = (set) => ({
  promo: null,
  isPromoChecking: false,
  promoError: null,

  applyPromo: async (code) => {
    const trimmedCode = code.trim();

    if (trimmedCode === '') {
      return;
    }

    set((state) => {
      state.isPromoChecking = true;
      state.promoError = null;
    });

    try {
      const promo = await validatePromo(trimmedCode);

      set((state) => {
        state.promo = promo;
        state.isPromoChecking = false;
      });
    } catch (error: unknown) {
      set((state) => {
        state.isPromoChecking = false;
        state.promoError =
          error instanceof ApiError
            ? error.message
            : errorMessage(error, 'Не удалось проверить промокод');
      });
    }
  },

  clearPromo: () => {
    set((state) => {
      state.promo = null;
      state.promoError = null;
    });
  },
});
