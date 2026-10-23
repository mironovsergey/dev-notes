import { combineReducers } from 'redux';
import { cartReducer } from './cart';
import { catalogReducer } from './catalog';
import { checkoutReducer } from './checkout';
import { deliveryReducer } from './delivery';
import { promoReducer } from './promo';

/**
 * `combineReducers` собирает корневой редьюсер: ключ объекта становится
 * ключом состояния, и каждый редьюсер отвечает только за свой срез.
 */
export const rootReducer = combineReducers({
  catalog: catalogReducer,
  cart: cartReducer,
  promo: promoReducer,
  delivery: deliveryReducer,
  checkout: checkoutReducer,
});
