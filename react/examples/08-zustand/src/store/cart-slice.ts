import { withoutItem, withQty, type CartItem } from '../domain';
import type { StateCreator } from 'zustand';
import type { CartSlice, ShopStore } from './types';

function quantityOf(items: readonly CartItem[], productId: string): number {
  return items.find((item) => item.productId === productId)?.qty ?? 0;
}

/**
 * Срез корзины: данные и действия над ними лежат рядом.
 *
 * Параметры `StateCreator<ShopStore, [immer-мутаторы], [], CartSlice>`
 * описывают весь стор, подключенные middleware и ту часть, которую
 * возвращает срез. Благодаря `immer` обработчики правят черновик.
 */
export const createCartSlice: StateCreator<ShopStore, [['zustand/immer', never]], [], CartSlice> = (
  set,
) => ({
  items: [],
  postponed: [],

  addProduct: (product) => {
    set((state) => {
      const activeQty = quantityOf(state.items, product.id);
      const postponedQty = quantityOf(state.postponed, product.id);

      if (activeQty + postponedQty >= product.stock) {
        return;
      }

      if (postponedQty > 0) {
        const postponedItem = state.postponed.find((item) => item.productId === product.id);

        if (postponedItem !== undefined) {
          postponedItem.qty += 1;
        }

        return;
      }

      const activeItem = state.items.find((item) => item.productId === product.id);

      if (activeItem === undefined) {
        state.items.push({ productId: product.id, qty: 1 });
      } else {
        activeItem.qty += 1;
      }
    });
  },

  changeQty: (product, qty) => {
    if (qty < 1 || qty > product.stock) {
      return;
    }

    set((state) => {
      state.items = withQty(state.items, product.id, qty);
      state.postponed = withQty(state.postponed, product.id, qty);
    });
  },

  removeItem: (productId) => {
    set((state) => {
      state.items = withoutItem(state.items, productId);
      state.postponed = withoutItem(state.postponed, productId);
    });
  },

  postponeItem: (productId) => {
    set((state) => {
      const index = state.items.findIndex((item) => item.productId === productId);
      const [item] = state.items.splice(index === -1 ? state.items.length : index, 1);

      if (item !== undefined) {
        state.postponed.push(item);
      }
    });
  },

  restoreItem: (productId) => {
    set((state) => {
      const index = state.postponed.findIndex((item) => item.productId === productId);
      const [item] = state.postponed.splice(index === -1 ? state.postponed.length : index, 1);

      if (item !== undefined) {
        state.items.push(item);
      }
    });
  },

  clearCart: () => {
    set((state) => {
      state.items = [];
      state.postponed = [];
      state.promo = null;
      state.promoError = null;
    });
  },
});
