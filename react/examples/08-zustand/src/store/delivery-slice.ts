import type { StateCreator } from 'zustand';
import type { DeliverySlice, ShopStore } from './types';

export const createDeliverySlice: StateCreator<
  ShopStore,
  [['zustand/immer', never]],
  [],
  DeliverySlice
> = (set) => ({
  delivery: 'pickup',

  changeDelivery: (method) => {
    set((state) => {
      state.delivery = method;
    });
  },
});
