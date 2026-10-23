import { withoutItem, withQty } from '../domain';
import type { CartItem, DeliveryMethod, Order, Product, Promo } from '../domain';

/** Состояние оформления заказа: окно, отправка, ошибка и принятый заказ. */
export interface CheckoutState {
  isOpen: boolean;
  isSubmitting: boolean;
  error: string | null;
  order: Order | null;
}

/** Все состояние магазина, кроме каталога: каталог живет в своем контексте. */
export interface ShopState {
  items: readonly CartItem[];
  postponed: readonly CartItem[];
  promo: Promo | null;
  delivery: DeliveryMethod;
  checkout: CheckoutState;
}

/**
 * Размеченное объединение действий.
 *
 * TypeScript проверяет по полю `type`, какие еще поля есть у действия, и
 * требует разобрать в редьюсере все варианты - забытый case станет ошибкой
 * компиляции, а не ошибкой во время выполнения.
 */
export type ShopAction =
  | { type: 'cart/added'; product: Product }
  | { type: 'cart/qtyChanged'; product: Product; qty: number }
  | { type: 'cart/removed'; productId: string }
  | { type: 'cart/postponed'; productId: string }
  | { type: 'cart/restored'; productId: string }
  | { type: 'promo/applied'; promo: Promo }
  | { type: 'promo/cleared' }
  | { type: 'delivery/changed'; method: DeliveryMethod }
  | { type: 'checkout/opened' }
  | { type: 'checkout/closed' }
  | { type: 'checkout/submitStarted' }
  | { type: 'checkout/submitFailed'; message: string }
  | { type: 'checkout/succeeded'; order: Order };

const EMPTY_CHECKOUT: CheckoutState = {
  isOpen: false,
  isSubmitting: false,
  error: null,
  order: null,
};

export const INITIAL_SHOP_STATE: ShopState = {
  items: [],
  postponed: [],
  promo: null,
  delivery: 'pickup',
  checkout: EMPTY_CHECKOUT,
};

function quantityOf(items: readonly CartItem[], productId: string): number {
  return items.find((item) => item.productId === productId)?.qty ?? 0;
}

function addToCart(state: ShopState, product: Product): ShopState {
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

/**
 * Чистая функция: то же состояние и то же действие всегда дают тот же результат.
 *
 * Здесь нет запросов и таймеров - асинхронную работу выполняют функции из
 * `shop-actions.ts`, а редьюсер получает уже готовый результат отдельным
 * действием.
 */
export function shopReducer(state: ShopState, action: ShopAction): ShopState {
  switch (action.type) {
    case 'cart/added':
      return addToCart(state, action.product);

    case 'cart/qtyChanged':
      if (action.qty < 1 || action.qty > action.product.stock) {
        return state;
      }

      return {
        ...state,
        items: withQty(state.items, action.product.id, action.qty),
        postponed: withQty(state.postponed, action.product.id, action.qty),
      };

    case 'cart/removed':
      return {
        ...state,
        items: withoutItem(state.items, action.productId),
        postponed: withoutItem(state.postponed, action.productId),
      };

    case 'cart/postponed': {
      const item = state.items.find((candidate) => candidate.productId === action.productId);

      if (item === undefined) {
        return state;
      }

      return {
        ...state,
        items: withoutItem(state.items, action.productId),
        postponed: [...state.postponed, item],
      };
    }

    case 'cart/restored': {
      const item = state.postponed.find((candidate) => candidate.productId === action.productId);

      if (item === undefined) {
        return state;
      }

      return {
        ...state,
        items: [...state.items, item],
        postponed: withoutItem(state.postponed, action.productId),
      };
    }

    case 'promo/applied':
      return { ...state, promo: action.promo };

    case 'promo/cleared':
      return { ...state, promo: null };

    case 'delivery/changed':
      return { ...state, delivery: action.method };

    case 'checkout/opened':
      return { ...state, checkout: { ...EMPTY_CHECKOUT, isOpen: true } };

    case 'checkout/closed':
      // Корзина очищается только после принятого заказа, отмена ее сохраняет.
      return state.checkout.order === null
        ? { ...state, checkout: EMPTY_CHECKOUT }
        : { ...INITIAL_SHOP_STATE, delivery: state.delivery };

    case 'checkout/submitStarted':
      return { ...state, checkout: { ...state.checkout, isSubmitting: true, error: null } };

    case 'checkout/submitFailed':
      return {
        ...state,
        checkout: { ...state.checkout, isSubmitting: false, error: action.message },
      };

    case 'checkout/succeeded':
      return {
        ...state,
        checkout: { ...state.checkout, isSubmitting: false, order: action.order },
      };
  }
}

/**
 * productId → количество в корзине, включая отложенное.
 *
 * Принимает срезы, а не все состояние: тогда `useMemo` в хуке зависит только
 * от позиций, и смена доставки или открытие окна заказа кеш не сбрасывают.
 */
export function countInCart(
  items: readonly CartItem[],
  postponed: readonly CartItem[],
): ReadonlyMap<string, number> {
  const countByProductId = new Map<string, number>();

  for (const item of [...items, ...postponed]) {
    countByProductId.set(item.productId, (countByProductId.get(item.productId) ?? 0) + item.qty);
  }

  return countByProductId;
}
