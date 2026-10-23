import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Promo } from '../domain';
import { cartSlice } from './cart-slice';

interface PromoState {
  applied: Promo | null;
  isChecking: boolean;
  error: string | null;
}

const initialState: PromoState = { applied: null, isChecking: false, error: null };

/**
 * Состояние проверки промокода переехало из компонента в хранилище.
 *
 * С thunk форма дожидалась промиса и хранила признак проверки у себя. Сага
 * промис наружу не отдает, поэтому ход запроса виден только через
 * состояние - и это нормальный для саг способ связи с интерфейсом.
 */
export const promoSlice = createSlice({
  name: 'promo',
  initialState,
  reducers: {
    requested: (state, _action: PayloadAction<string>) => {
      state.isChecking = true;
      state.error = null;
    },
    applied: (state, action: PayloadAction<Promo>) => {
      state.isChecking = false;
      state.error = null;
      state.applied = action.payload;
    },
    failed: (state, action: PayloadAction<string>) => {
      state.isChecking = false;
      state.error = action.payload;
    },
    cleared: () => initialState,
  },
  extraReducers: (builder) => {
    // Очистка корзины снимает и промокод: реакция на действие чужого среза.
    builder.addCase(cartSlice.actions.cleared, () => initialState);
  },
  selectors: {
    selectPromo: (state) => state.applied,
    selectPromoChecking: (state) => state.isChecking,
    selectPromoError: (state) => state.error,
  },
});

export const promoActions = promoSlice.actions;
export const { selectPromo, selectPromoChecking, selectPromoError } = promoSlice.selectors;
