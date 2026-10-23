import type { Order } from '../../domain';
import type { UnknownAction } from 'redux';
import { parseShopAction } from '../actions';

export interface CheckoutState {
  readonly isOpen: boolean;
  readonly isSubmitting: boolean;
  readonly error: string | null;
  readonly order: Order | null;
}

const INITIAL_STATE: CheckoutState = {
  isOpen: false,
  isSubmitting: false,
  error: null,
  order: null,
};

export function checkoutReducer(
  state: CheckoutState = INITIAL_STATE,
  action: UnknownAction,
): CheckoutState {
  const shopAction = parseShopAction(action);

  if (shopAction === null) {
    return state;
  }

  switch (shopAction.type) {
    case 'checkout/opened':
      return { ...INITIAL_STATE, isOpen: true };

    case 'checkout/closed':
      return INITIAL_STATE;

    case 'checkout/submitStarted':
      return { ...state, isSubmitting: true, error: null };

    case 'checkout/submitFailed':
      return { ...state, isSubmitting: false, error: shopAction.message };

    case 'checkout/succeeded':
      return { ...state, isSubmitting: false, order: shopAction.order };

    default:
      return state;
  }
}
