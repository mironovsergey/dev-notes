import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { DeliveryMethod } from '../domain';

/**
 * Состояние среза - примитив, поэтому единственная форма изменения - `return`.
 *
 * Начальное значение задано функцией: из строки `'pickup'` тип среза вывелся
 * бы как литерал, и остальные способы доставки перестали бы подходить, а
 * аннотация переменной этого не меняет. Функция `(): DeliveryMethod` задает
 * тип напрямую - без приведения.
 */
export const deliverySlice = createSlice({
  name: 'delivery',
  initialState: (): DeliveryMethod => 'pickup',
  reducers: {
    changed: (_state, action: PayloadAction<DeliveryMethod>) => action.payload,
  },
  selectors: {
    selectDelivery: (state) => state,
  },
});

export const deliveryActions = deliverySlice.actions;
export const { selectDelivery } = deliverySlice.selectors;
