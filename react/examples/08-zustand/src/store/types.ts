import type {
  CartItem,
  Customer,
  DeliveryMethod,
  LoadStatus,
  Order,
  Product,
  Promo,
} from '../domain';

export interface CatalogSlice {
  products: Product[];
  catalogStatus: LoadStatus;
  catalogError: string | null;
  loadCatalog: () => Promise<void>;
}

export interface CartSlice {
  items: CartItem[];
  postponed: CartItem[];
  addProduct: (product: Product) => void;
  changeQty: (product: Product, qty: number) => void;
  removeItem: (productId: string) => void;
  postponeItem: (productId: string) => void;
  restoreItem: (productId: string) => void;
  clearCart: () => void;
}

export interface PromoSlice {
  promo: Promo | null;
  isPromoChecking: boolean;
  promoError: string | null;
  applyPromo: (code: string) => Promise<void>;
  clearPromo: () => void;
}

export interface DeliverySlice {
  delivery: DeliveryMethod;
  changeDelivery: (method: DeliveryMethod) => void;
}

export interface CheckoutSlice {
  isCheckoutOpen: boolean;
  isSubmitting: boolean;
  checkoutError: string | null;
  order: Order | null;
  openCheckout: () => void;
  closeCheckout: () => void;
  submitOrder: (customer: Customer) => Promise<void>;
}

/** Срезы объединяются в один стор, и каждый видит его целиком. */
export type ShopStore = CatalogSlice & CartSlice & PromoSlice & DeliverySlice & CheckoutSlice;
