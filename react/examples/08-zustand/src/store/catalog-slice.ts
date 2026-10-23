import { errorMessage, fetchProducts } from '../domain';
import type { StateCreator } from 'zustand';
import type { CatalogSlice, ShopStore } from './types';

/**
 * Асинхронное действие - обычная `async`-функция внутри стора.
 *
 * Ни middleware, ни отдельного слоя эффектов для этого не нужно: функция
 * сама расставляет статусы через `set`.
 */
export const createCatalogSlice: StateCreator<
  ShopStore,
  [['zustand/immer', never]],
  [],
  CatalogSlice
> = (set) => ({
  products: [],
  catalogStatus: 'loading',
  catalogError: null,

  loadCatalog: async () => {
    set((state) => {
      state.catalogStatus = 'loading';
      state.catalogError = null;
    });

    try {
      const products = await fetchProducts();

      set((state) => {
        state.products = [...products];
        state.catalogStatus = 'ready';
      });
    } catch (error: unknown) {
      set((state) => {
        state.products = [];
        state.catalogStatus = 'error';
        state.catalogError = errorMessage(error, 'Не удалось загрузить каталог');
      });
    }
  },
});
