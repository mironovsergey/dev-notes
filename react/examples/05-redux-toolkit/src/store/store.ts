import { configureStore } from '@reduxjs/toolkit';
import { cartSlice } from './cart-slice';
import { catalogSlice } from './catalog-slice';
import { checkoutSlice } from './checkout-slice';
import { deliverySlice } from './delivery-slice';
import { logger } from './middleware/logger';
import { promoSlice } from './promo-slice';

/**
 * `configureStore` заменяет `createStore` вместе с обвязкой: подключает
 * thunk, Redux DevTools и проверки разработки - на неизменяемость состояния
 * и сериализуемость действий. Свое middleware добавляется к набору по
 * умолчанию через `concat`, а не вместо него.
 */
export function createAppStore() {
  return configureStore({
    reducer: {
      [catalogSlice.reducerPath]: catalogSlice.reducer,
      [cartSlice.reducerPath]: cartSlice.reducer,
      [promoSlice.reducerPath]: promoSlice.reducer,
      [deliverySlice.reducerPath]: deliverySlice.reducer,
      [checkoutSlice.reducerPath]: checkoutSlice.reducer,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(logger),
  });
}

export const store = createAppStore();
