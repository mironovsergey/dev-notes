import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { LoadStatus, Product } from '../domain';

interface CatalogState {
  products: Product[];
  status: LoadStatus;
  error: string | null;
}

const initialState: CatalogState = { products: [], status: 'loading', error: null };

/**
 * Срез описывает только состояние: три действия вместо жизненного цикла
 * `createAsyncThunk`.
 *
 * Запроса здесь нет - на `requested` реагирует сага, а компонент отправляет
 * обычное действие и о саге не знает.
 */
export const catalogSlice = createSlice({
  name: 'catalog',
  initialState,
  reducers: {
    requested: (state) => {
      state.status = 'loading';
      state.error = null;
    },
    loaded: (state, action: PayloadAction<readonly Product[]>) => {
      state.status = 'ready';
      state.products = [...action.payload];
    },
    failed: (state, action: PayloadAction<string>) => {
      state.status = 'error';
      state.products = [];
      state.error = action.payload;
    },
  },
  selectors: {
    selectProducts: (state) => state.products,
    selectCatalogStatus: (state) => state.status,
    selectCatalogError: (state) => state.error,
  },
});

export const catalogActions = catalogSlice.actions;
export const { selectProducts, selectCatalogStatus, selectCatalogError } = catalogSlice.selectors;
