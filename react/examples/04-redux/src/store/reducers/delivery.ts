import type { DeliveryMethod } from '../../domain';
import type { UnknownAction } from 'redux';
import { parseShopAction } from '../actions';

export type DeliveryState = DeliveryMethod;

export function deliveryReducer(
  state: DeliveryState = 'pickup',
  action: UnknownAction,
): DeliveryState {
  const shopAction = parseShopAction(action);

  if (shopAction === null) {
    return state;
  }

  return shopAction.type === 'delivery/changed' ? shopAction.method : state;
}
