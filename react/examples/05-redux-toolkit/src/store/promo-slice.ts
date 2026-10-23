import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { ApiError, errorMessage, validatePromo, type Promo } from '../domain';
import { cartSlice } from './cart-slice';

type PromoState = Promo | null;

/** Функция вместо значения: иначе тип среза вывелся бы как `null`. */
const initialState = (): PromoState => null;

/** Ошибку формы показывает сама форма, поэтому thunk возвращает ее через `rejectWithValue`. */
export const applyPromo = createAsyncThunk<Promo, string, { rejectValue: string }>(
  'promo/apply',
  async (code, { rejectWithValue }) => {
    try {
      return await validatePromo(code);
    } catch (error: unknown) {
      return rejectWithValue(
        error instanceof ApiError
          ? error.message
          : errorMessage(error, 'Не удалось проверить промокод'),
      );
    }
  },
);

export const promoSlice = createSlice({
  name: 'promo',
  initialState,
  reducers: {
    cleared: () => null,
  },
  extraReducers: (builder) => {
    builder
      .addCase(applyPromo.fulfilled, (_state, action) => action.payload)

      // Реакция на действие чужого среза: очистка корзины снимает и промокод.
      .addCase(cartSlice.actions.cleared, () => null);
  },
  selectors: {
    selectPromo: (state) => state,
  },
});

export const promoActions = promoSlice.actions;
export const { selectPromo } = promoSlice.selectors;
