import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { CartItem, Product } from '../domain';

interface CartState {
  items: CartItem[];
  postponed: CartItem[];
}

const initialState: CartState = { items: [], postponed: [] };

function quantityOf(items: readonly CartItem[], productId: string): number {
  return items.find((item) => item.productId === productId)?.qty ?? 0;
}

/**
 * Срез корзины.
 *
 * Обработчики выглядят как мутации, но это черновик Immer: RTK записывает
 * изменения и строит из них новое неизменяемое состояние. Сравните с
 * вариантом 04, где то же самое собиралось спредами вручную.
 */
export const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    added: (state, action: PayloadAction<Product>) => {
      const product = action.payload;
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
    },

    /**
     * `prepare` нужен, когда аргументов больше одного: генератор принимает
     * товар и количество, а в `payload` кладет объект.
     */
    qtyChanged: {
      reducer: (state, action: PayloadAction<{ product: Product; qty: number }>) => {
        const { product, qty } = action.payload;

        if (qty < 1 || qty > product.stock) {
          return;
        }

        for (const list of [state.items, state.postponed]) {
          const item = list.find((candidate) => candidate.productId === product.id);

          if (item !== undefined) {
            item.qty = qty;
          }
        }
      },
      prepare: (product: Product, qty: number) => ({ payload: { product, qty } }),
    },

    removed: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((item) => item.productId !== action.payload);
      state.postponed = state.postponed.filter((item) => item.productId !== action.payload);
    },

    postponed: (state, action: PayloadAction<string>) => {
      const index = state.items.findIndex((item) => item.productId === action.payload);

      if (index === -1) {
        return;
      }

      const [item] = state.items.splice(index, 1);

      if (item !== undefined) {
        state.postponed.push(item);
      }
    },

    restored: (state, action: PayloadAction<string>) => {
      const index = state.postponed.findIndex((item) => item.productId === action.payload);

      if (index === -1) {
        return;
      }

      const [item] = state.postponed.splice(index, 1);

      if (item !== undefined) {
        state.items.push(item);
      }
    },

    /** Замена состояния целиком - только через `return`, присваивание `state` ничего не изменит. */
    cleared: () => initialState,
  },

  /** Селекторы среза: RTK сам подставляет `state.cart`, потому что срез подключен под этим ключом. */
  selectors: {
    selectItems: (state) => state.items,
    selectPostponed: (state) => state.postponed,
  },
});

export const cartActions = cartSlice.actions;
export const { selectItems, selectPostponed } = cartSlice.selectors;
