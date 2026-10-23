import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { errorMessage, fetchProducts, type LoadStatus, type Product } from '../domain';

interface CatalogState {
  products: Product[];
  status: LoadStatus;
  error: string | null;
}

const initialState: CatalogState = { products: [], status: 'loading', error: null };

/**
 * `createAsyncThunk` сам отправляет `pending`, `fulfilled` и `rejected`.
 *
 * Отменять запрос вручную не нужно: `thunkApi.signal` уже связан с промисом,
 * который возвращает `dispatch`, и вызов `.abort()` на нем прерывает запрос.
 * `rejectWithValue` кладет в `payload` готовое сообщение для интерфейса
 * вместо объекта ошибки.
 */
export const loadCatalog = createAsyncThunk<Product[], void, { rejectValue: string }>(
  'catalog/load',
  async (_arg, { signal, rejectWithValue }) => {
    try {
      const products = await fetchProducts(signal);

      return [...products];
    } catch (error: unknown) {
      return rejectWithValue(errorMessage(error, 'Не удалось загрузить каталог'));
    }
  },
);

export const catalogSlice = createSlice({
  name: 'catalog',
  initialState,
  reducers: {},

  /** `extraReducers` слушает действия, созданные вне среза. */
  extraReducers: (builder) => {
    builder
      .addCase(loadCatalog.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(loadCatalog.fulfilled, (state, action) => {
        state.status = 'ready';
        state.products = action.payload;
      })
      .addCase(loadCatalog.rejected, (state, action) => {
        // Отмена запроса - не ошибка интерфейса: состояние остается 'loading'.
        if (action.meta.aborted) {
          return;
        }

        state.status = 'error';
        state.products = [];
        state.error = action.payload ?? action.error.message ?? 'Не удалось загрузить каталог';
      });
  },

  selectors: {
    selectProducts: (state) => state.products,
    selectCatalogStatus: (state) => state.status,
    selectCatalogError: (state) => state.error,
  },
});

export const { selectProducts, selectCatalogStatus, selectCatalogError } = catalogSlice.selectors;
