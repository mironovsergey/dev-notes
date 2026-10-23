import { isDeliveryMethod, isOrder, isProduct, isProductList, isPromo } from '../domain';
import type { DeliveryMethod, Order, Product, Promo } from '../domain';
import type { UnknownAction } from 'redux';

/**
 * Тип действия - константа с `as const`.
 *
 * Без `as const` тип поля `type` расширился бы до `string`, размеченное
 * объединение перестало бы размечаться, и сужение в редьюсере не работало бы.
 */
export const CATALOG_REQUESTED = 'catalog/requested' as const;
export const CATALOG_LOADED = 'catalog/loaded' as const;
export const CATALOG_FAILED = 'catalog/failed' as const;
export const CART_ADDED = 'cart/added' as const;
export const CART_QTY_CHANGED = 'cart/qtyChanged' as const;
export const CART_REMOVED = 'cart/removed' as const;
export const CART_POSTPONED = 'cart/postponed' as const;
export const CART_RESTORED = 'cart/restored' as const;
export const CART_CLEARED = 'cart/cleared' as const;
export const PROMO_APPLIED = 'promo/applied' as const;
export const PROMO_CLEARED = 'promo/cleared' as const;
export const DELIVERY_CHANGED = 'delivery/changed' as const;
export const CHECKOUT_OPENED = 'checkout/opened' as const;
export const CHECKOUT_CLOSED = 'checkout/closed' as const;
export const CHECKOUT_SUBMIT_STARTED = 'checkout/submitStarted' as const;
export const CHECKOUT_SUBMIT_FAILED = 'checkout/submitFailed' as const;
export const CHECKOUT_SUCCEEDED = 'checkout/succeeded' as const;

// Генераторы действий: компоненты не собирают объекты руками и не знают строк.
export const catalogRequested = () => ({ type: CATALOG_REQUESTED });
export const catalogLoaded = (products: readonly Product[]) => ({ type: CATALOG_LOADED, products });
export const catalogFailed = (message: string) => ({ type: CATALOG_FAILED, message });
export const cartAdded = (product: Product) => ({ type: CART_ADDED, product });
export const cartQtyChanged = (product: Product, qty: number) => ({
  type: CART_QTY_CHANGED,
  product,
  qty,
});
export const cartRemoved = (productId: string) => ({ type: CART_REMOVED, productId });
export const cartPostponed = (productId: string) => ({ type: CART_POSTPONED, productId });
export const cartRestored = (productId: string) => ({ type: CART_RESTORED, productId });
export const cartCleared = () => ({ type: CART_CLEARED });
export const promoApplied = (promo: Promo) => ({ type: PROMO_APPLIED, promo });
export const promoCleared = () => ({ type: PROMO_CLEARED });
export const deliveryChanged = (method: DeliveryMethod) => ({ type: DELIVERY_CHANGED, method });
export const checkoutOpened = () => ({ type: CHECKOUT_OPENED });
export const checkoutClosed = () => ({ type: CHECKOUT_CLOSED });
export const checkoutSubmitStarted = () => ({ type: CHECKOUT_SUBMIT_STARTED });
export const checkoutSubmitFailed = (message: string) => ({
  type: CHECKOUT_SUBMIT_FAILED,
  message,
});
export const checkoutSucceeded = (order: Order) => ({ type: CHECKOUT_SUCCEEDED, order });

/** Тип действия выводится из генератора: отдельный интерфейс на каждое действие не нужен. */
export type ShopAction =
  | ReturnType<typeof catalogRequested>
  | ReturnType<typeof catalogLoaded>
  | ReturnType<typeof catalogFailed>
  | ReturnType<typeof cartAdded>
  | ReturnType<typeof cartQtyChanged>
  | ReturnType<typeof cartRemoved>
  | ReturnType<typeof cartPostponed>
  | ReturnType<typeof cartRestored>
  | ReturnType<typeof cartCleared>
  | ReturnType<typeof promoApplied>
  | ReturnType<typeof promoCleared>
  | ReturnType<typeof deliveryChanged>
  | ReturnType<typeof checkoutOpened>
  | ReturnType<typeof checkoutClosed>
  | ReturnType<typeof checkoutSubmitStarted>
  | ReturnType<typeof checkoutSubmitFailed>
  | ReturnType<typeof checkoutSucceeded>;

/**
 * Приводит `UnknownAction` к действию приложения или возвращает `null`.
 *
 * Хранилище передает редьюсеру любое действие, включая служебные и чужие,
 * поэтому Redux 5 типизирует параметр как `UnknownAction`: поля кроме `type`
 * имеют тип `unknown`. Сужение здесь выполнено проверками во время выполнения -
 * без приведения типов. В Redux Toolkit ту же работу делает `createSlice`
 * вместе с `action.match()`.
 */
export function parseShopAction(action: UnknownAction): ShopAction | null {
  switch (action.type) {
    case CATALOG_REQUESTED:
      return catalogRequested();

    case CATALOG_LOADED:
      return isProductList(action.products) ? catalogLoaded(action.products) : null;

    case CATALOG_FAILED:
      return typeof action.message === 'string' ? catalogFailed(action.message) : null;

    case CART_ADDED:
      return isProduct(action.product) ? cartAdded(action.product) : null;

    case CART_QTY_CHANGED:
      return isProduct(action.product) && typeof action.qty === 'number'
        ? cartQtyChanged(action.product, action.qty)
        : null;

    case CART_REMOVED:
      return typeof action.productId === 'string' ? cartRemoved(action.productId) : null;

    case CART_POSTPONED:
      return typeof action.productId === 'string' ? cartPostponed(action.productId) : null;

    case CART_RESTORED:
      return typeof action.productId === 'string' ? cartRestored(action.productId) : null;

    case CART_CLEARED:
      return cartCleared();

    case PROMO_APPLIED:
      return isPromo(action.promo) ? promoApplied(action.promo) : null;

    case PROMO_CLEARED:
      return promoCleared();

    case DELIVERY_CHANGED:
      return isDeliveryMethod(action.method) ? deliveryChanged(action.method) : null;

    case CHECKOUT_OPENED:
      return checkoutOpened();

    case CHECKOUT_CLOSED:
      return checkoutClosed();

    case CHECKOUT_SUBMIT_STARTED:
      return checkoutSubmitStarted();

    case CHECKOUT_SUBMIT_FAILED:
      return typeof action.message === 'string' ? checkoutSubmitFailed(action.message) : null;

    case CHECKOUT_SUCCEEDED:
      return isOrder(action.order) ? checkoutSucceeded(action.order) : null;

    default:
      return null;
  }
}
