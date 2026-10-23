import { configureStore } from '@reduxjs/toolkit';
import createSagaMiddleware from 'redux-saga';
import { cartSlice } from './cart-slice';
import { catalogSlice } from './catalog-slice';
import { checkoutSlice } from './checkout-slice';
import { deliverySlice } from './delivery-slice';
import { logger } from './middleware/logger';
import { promoSlice } from './promo-slice';
import { DEFAULT_SAGA_OPTIONS, rootSaga, type SagaOptions } from './sagas';

/**
 * Хранилище с middleware саг.
 *
 * `thunk: false` - асинхронность целиком на сагах, второй механизм побочных
 * эффектов не нужен. Вызов `run` обязателен: без него наблюдатели не
 * стартуют и действия уходят в пустоту.
 */
export function createAppStore(options: SagaOptions = DEFAULT_SAGA_OPTIONS) {
  const sagaMiddleware = createSagaMiddleware();

  const store = configureStore({
    reducer: {
      [catalogSlice.reducerPath]: catalogSlice.reducer,
      [cartSlice.reducerPath]: cartSlice.reducer,
      [promoSlice.reducerPath]: promoSlice.reducer,
      [deliverySlice.reducerPath]: deliverySlice.reducer,
      [checkoutSlice.reducerPath]: checkoutSlice.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({ thunk: false }).concat(sagaMiddleware, logger),
  });

  sagaMiddleware.run(rootSaga, options);

  return store;
}

export const store = createAppStore();
