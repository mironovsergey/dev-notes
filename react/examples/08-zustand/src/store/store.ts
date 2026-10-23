import { create } from 'zustand';
import { createJSONStorage, devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { createCartSlice } from './cart-slice';
import { createCatalogSlice } from './catalog-slice';
import { createCheckoutSlice } from './checkout-slice';
import { createDeliverySlice } from './delivery-slice';
import { createPromoSlice } from './promo-slice';
import type { ShopStore } from './types';

/**
 * Стор - обычный модуль: провайдера нет, компоненты импортируют хук.
 *
 * Порядок middleware имеет значение: `devtools` снаружи, чтобы расширение
 * видело все обновления, `persist` следом, `immer` ближе всего к срезам -
 * иначе обработчики получат не черновик, а обычный объект.
 */
export const useShopStore = create<ShopStore>()(
  devtools(
    persist(
      immer((...args) => ({
        ...createCatalogSlice(...args),
        ...createCartSlice(...args),
        ...createPromoSlice(...args),
        ...createDeliverySlice(...args),
        ...createCheckoutSlice(...args),
      })),
      {
        name: 'lavka-cart',
        storage: createJSONStorage(() => localStorage),

        // В хранилище уезжает только то, что имеет смысл восстанавливать:
        // статусы загрузки и открытое окно заказа туда попасть не должны.
        partialize: (state) => ({
          items: state.items,
          postponed: state.postponed,
          delivery: state.delivery,
        }),
        version: 1,
      },
    ),
    { name: 'lavka' },
  ),
);

/** Снимок начального состояния: тесты возвращают стор к нему между проверками. */
export const INITIAL_STORE_STATE = useShopStore.getInitialState();
