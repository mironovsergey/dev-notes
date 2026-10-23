import { withoutItem, withQty, type CartItem, type Product } from '../../domain';
import type { UnknownAction } from 'redux';
import { parseShopAction } from '../actions';

export interface CartState {
  readonly items: readonly CartItem[];
  readonly postponed: readonly CartItem[];
}

const INITIAL_STATE: CartState = { items: [], postponed: [] };

function quantityOf(items: readonly CartItem[], productId: string): number {
  return items.find((item) => item.productId === productId)?.qty ?? 0;
}

function addToCart(state: CartState, product: Product): CartState {
  const activeQty = quantityOf(state.items, product.id);
  const postponedQty = quantityOf(state.postponed, product.id);

  if (activeQty + postponedQty >= product.stock) {
    return state;
  }

  if (postponedQty > 0) {
    return { ...state, postponed: withQty(state.postponed, product.id, postponedQty + 1) };
  }

  return {
    ...state,
    items:
      activeQty === 0
        ? [...state.items, { productId: product.id, qty: 1 }]
        : withQty(state.items, product.id, activeQty + 1),
  };
}

export function cartReducer(state: CartState = INITIAL_STATE, action: UnknownAction): CartState {
  const shopAction = parseShopAction(action);

  if (shopAction === null) {
    return state;
  }

  switch (shopAction.type) {
    case 'cart/added':
      return addToCart(state, shopAction.product);

    case 'cart/qtyChanged': {
      const { product, qty } = shopAction;

      if (qty < 1 || qty > product.stock) {
        return state;
      }

      return {
        items: withQty(state.items, product.id, qty),
        postponed: withQty(state.postponed, product.id, qty),
      };
    }

    case 'cart/removed':
      return {
        items: withoutItem(state.items, shopAction.productId),
        postponed: withoutItem(state.postponed, shopAction.productId),
      };

    case 'cart/postponed': {
      const item = state.items.find((candidate) => candidate.productId === shopAction.productId);

      if (item === undefined) {
        return state;
      }

      return {
        items: withoutItem(state.items, shopAction.productId),
        postponed: [...state.postponed, item],
      };
    }

    case 'cart/restored': {
      const item = state.postponed.find(
        (candidate) => candidate.productId === shopAction.productId,
      );

      if (item === undefined) {
        return state;
      }

      return {
        items: [...state.items, item],
        postponed: withoutItem(state.postponed, shopAction.productId),
      };
    }

    case 'cart/cleared':
      return INITIAL_STATE;

    default:
      return state;
  }
}
