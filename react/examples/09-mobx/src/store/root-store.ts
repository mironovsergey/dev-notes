import { CartStore } from './cart-store';
import { CatalogStore } from './catalog-store';
import { CheckoutStore } from './checkout-store';
import { PromoStore } from './promo-store';

/**
 * Корневой стор: сторы создаются экземплярами и связываются через
 * конструкторы.
 *
 * Модуль-синглтон дал бы одно состояние на все тесты и на все запросы при
 * серверном рендере, поэтому стор создается заново - в `main.tsx` один раз,
 * в каждом тесте свой.
 */
export class RootStore {
  readonly catalog: CatalogStore;
  readonly cart: CartStore;
  readonly promo: PromoStore;
  readonly checkout: CheckoutStore;

  constructor() {
    this.catalog = new CatalogStore();
    this.cart = new CartStore(this.catalog);
    this.promo = new PromoStore(this.cart);
    this.checkout = new CheckoutStore(this.cart);
  }
}
