/** Предметная модель примера «Лавка»; во всех вариантах она одинакова. */

/** Список категорий и выведенный из него union: одно место правды вместо двух. */
export const CATEGORIES = ['candy', 'chocolate', 'bakery', 'frozen'] as const;

export type Category = (typeof CATEGORIES)[number];

export interface Product {
  id: string;
  title: string;
  category: Category;

  /** Цена в рублях, целое число. */
  price: number;

  /** Остаток на складе; корзина не может его превысить. */
  stock: number;

  /** URL картинки товара в том виде, в каком его возвращает API. */
  image: string;
}

/** Состояние асинхронной загрузки данных; общее для всех экранов со списками. */
export type LoadStatus = 'loading' | 'ready' | 'error';

export interface CartItem {
  productId: string;
  qty: number;
}

/** Позиция корзины вместе с товаром: с этой формой работает расчет. */
export interface CartLine {
  product: Product;
  qty: number;
}

export type PromoKind = 'percent' | 'fixed' | 'freeDelivery';

export interface Promo {
  code: string;
  kind: PromoKind;

  /** Проценты для `percent`, рубли для `fixed`, не используется для `freeDelivery`. */
  value: number;

  /** Промокод действует, только когда подытог достигает этой суммы. */
  minSubtotal: number;
}

export type DeliveryMethod = 'pickup' | 'courier' | 'post';

export interface DeliveryOption {
  method: DeliveryMethod;
  title: string;
  cost: number;

  /** Доставка становится бесплатной, когда подытог после скидок достигает этой суммы. */
  freeFrom?: number;
}

export type DiscountKind = 'quantity' | 'promo';

export interface Discount {
  kind: DiscountKind;
  label: string;
  amount: number;
}

export interface Totals {
  subtotal: number;
  discounts: Discount[];
  deliveryCost: number;
  total: number;
}

export interface Customer {
  name: string;
  phone: string;
  address: string;
}

export interface OrderRequest {
  items: CartItem[];
  promoCode: string | null;
  delivery: DeliveryMethod;
  customer: Customer;
}

export interface Order {
  id: string;
  total: number;
  createdAt: string;
}

export const CATEGORY_TITLES: Record<Category, string> = {
  candy: 'Карамель и мармелад',
  chocolate: 'Шоколад',
  bakery: 'Выпечка',
  frozen: 'Мороженое',
};
