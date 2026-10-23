import type { Promo } from '../../domain';
import type { UnknownAction } from 'redux';
import { parseShopAction } from '../actions';

export type PromoState = Promo | null;

/**
 * Отдельный редьюсер на каждую независимую часть состояния.
 *
 * `cart/cleared` слушают и корзина, и промокод: одно действие может менять
 * несколько срезов - это нормальный для Redux способ связать их, не вызывая
 * действия по цепочке.
 */
export function promoReducer(state: PromoState = null, action: UnknownAction): PromoState {
  const shopAction = parseShopAction(action);

  if (shopAction === null) {
    return state;
  }

  switch (shopAction.type) {
    case 'promo/applied':
      return shopAction.promo;

    case 'promo/cleared':
    case 'cart/cleared':
      return null;

    default:
      return state;
  }
}
