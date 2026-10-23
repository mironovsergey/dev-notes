import type { CartLine, DeliveryMethod, Product, Promo } from '../domain';

export interface CartState {
  /**
   * Позиция хранит сам товар, а не ссылку на каталог.
   *
   * В других вариантах товары лежали в общем сторе, и корзина держала
   * только идентификаторы. Здесь серверных данных в состоянии нет - они
   * живут в промисе и кеше React, - поэтому корзина снимает копию товара в
   * момент добавления. Так она не зависит от того, загружен ли каталог.
   */
  items: readonly CartLine[];
  postponed: readonly CartLine[];
  promo: Promo | null;
  delivery: DeliveryMethod;
}

export type CartAction =
  | { type: 'product/added'; product: Product }
  | { type: 'qty/changed'; product: Product; qty: number }
  | { type: 'item/removed'; productId: string }
  | { type: 'item/postponed'; productId: string }
  | { type: 'item/restored'; productId: string }
  | { type: 'promo/applied'; promo: Promo }
  | { type: 'promo/cleared' }
  | { type: 'delivery/changed'; method: DeliveryMethod }
  | { type: 'cart/cleared' };

export const INITIAL_CART_STATE: CartState = {
  items: [],
  postponed: [],
  promo: null,
  delivery: 'pickup',
};

function quantityOf(lines: readonly CartLine[], productId: string): number {
  return lines.find((line) => line.product.id === productId)?.qty ?? 0;
}

function withQty(lines: readonly CartLine[], productId: string, qty: number): readonly CartLine[] {
  return lines.map((line) => (line.product.id === productId ? { ...line, qty } : line));
}

function without(lines: readonly CartLine[], productId: string): readonly CartLine[] {
  return lines.filter((line) => line.product.id !== productId);
}

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'product/added': {
      const { product } = action;
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
            ? [...state.items, { product, qty: 1 }]
            : withQty(state.items, product.id, activeQty + 1),
      };
    }

    case 'qty/changed': {
      const { product, qty } = action;

      if (qty < 1 || qty > product.stock) {
        return state;
      }

      return {
        ...state,
        items: withQty(state.items, product.id, qty),
        postponed: withQty(state.postponed, product.id, qty),
      };
    }

    case 'item/removed':
      return {
        ...state,
        items: without(state.items, action.productId),
        postponed: without(state.postponed, action.productId),
      };

    case 'item/postponed': {
      const line = state.items.find((candidate) => candidate.product.id === action.productId);

      if (line === undefined) {
        return state;
      }

      return {
        ...state,
        items: without(state.items, action.productId),
        postponed: [...state.postponed, line],
      };
    }

    case 'item/restored': {
      const line = state.postponed.find((candidate) => candidate.product.id === action.productId);

      if (line === undefined) {
        return state;
      }

      return {
        ...state,
        items: [...state.items, line],
        postponed: without(state.postponed, action.productId),
      };
    }

    case 'promo/applied':
      return { ...state, promo: action.promo };

    case 'promo/cleared':
      return { ...state, promo: null };

    case 'delivery/changed':
      return { ...state, delivery: action.method };

    case 'cart/cleared':
      return { ...INITIAL_CART_STATE, delivery: state.delivery };
  }
}
