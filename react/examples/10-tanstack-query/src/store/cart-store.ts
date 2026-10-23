import { create } from 'zustand';
import { withoutItem, withQty } from '../domain';
import type { CartItem, DeliveryMethod, Product, Promo } from '../domain';

interface CartStore {
  items: CartItem[];
  postponed: CartItem[];
  promo: Promo | null;
  delivery: DeliveryMethod;
  isCheckoutOpen: boolean;
  addProduct: (product: Product) => void;
  changeQty: (product: Product, qty: number) => void;
  removeItem: (productId: string) => void;
  postponeItem: (productId: string) => void;
  restoreItem: (productId: string) => void;
  setPromo: (promo: Promo | null) => void;
  changeDelivery: (method: DeliveryMethod) => void;
  openCheckout: () => void;
  closeCheckout: () => void;
  clearCart: () => void;
}

function quantityOf(items: readonly CartItem[], productId: string): number {
  return items.find((item) => item.productId === productId)?.qty ?? 0;
}

/**
 * Клиентское состояние - в обычном сторе.
 *
 * Содержимое корзины, выбранная доставка и открытое окно заказа сервером не
 * владеются: их создает само приложение. Серверные данные - каталог, ответ
 * на промокод, созданный заказ - живут в кеше TanStack Query, и дублировать
 * их здесь нельзя: две копии неминуемо разойдутся.
 */
export const useCartStore = create<CartStore>()((set, get) => ({
  items: [],
  postponed: [],
  promo: null,
  delivery: 'pickup',
  isCheckoutOpen: false,

  addProduct: (product) => {
    const { items, postponed } = get();

    if (quantityOf(items, product.id) + quantityOf(postponed, product.id) >= product.stock) {
      return;
    }

    if (quantityOf(postponed, product.id) > 0) {
      set({ postponed: withQty(postponed, product.id, quantityOf(postponed, product.id) + 1) });

      return;
    }

    set({
      items:
        quantityOf(items, product.id) === 0
          ? [...items, { productId: product.id, qty: 1 }]
          : withQty(items, product.id, quantityOf(items, product.id) + 1),
    });
  },

  changeQty: (product, qty) => {
    if (qty < 1 || qty > product.stock) {
      return;
    }

    set((state) => ({
      items: withQty(state.items, product.id, qty),
      postponed: withQty(state.postponed, product.id, qty),
    }));
  },

  removeItem: (productId) => {
    set((state) => ({
      items: withoutItem(state.items, productId),
      postponed: withoutItem(state.postponed, productId),
    }));
  },

  postponeItem: (productId) => {
    set((state) => {
      const item = state.items.find((candidate) => candidate.productId === productId);

      return item === undefined
        ? state
        : { items: withoutItem(state.items, productId), postponed: [...state.postponed, item] };
    });
  },

  restoreItem: (productId) => {
    set((state) => {
      const item = state.postponed.find((candidate) => candidate.productId === productId);

      return item === undefined
        ? state
        : { items: [...state.items, item], postponed: withoutItem(state.postponed, productId) };
    });
  },

  setPromo: (promo) => {
    set({ promo });
  },

  changeDelivery: (method) => {
    set({ delivery: method });
  },

  openCheckout: () => {
    set({ isCheckoutOpen: true });
  },

  closeCheckout: () => {
    set({ isCheckoutOpen: false });
  },

  clearCart: () => {
    set({ items: [], postponed: [], promo: null });
  },
}));

export const INITIAL_CART_STATE = useCartStore.getInitialState();
