import { makeAutoObservable } from 'mobx';
import { calculateTotals, countItems, toCartLines } from '../domain';
import type { CartItem, CartLine, DeliveryMethod, Product, Promo, Totals } from '../domain';
import type { CatalogStore } from './catalog-store';

/**
 * Корзина ссылается на каталог через конструктор.
 *
 * Производные данные - геттеры: MobX кеширует их и пересчитывает, только
 * когда изменилось то, что они читают. Ни селекторов, ни мемоизации.
 */
export class CartStore {
  items: CartItem[] = [];
  postponed: CartItem[] = [];
  promo: Promo | null = null;
  delivery: DeliveryMethod = 'pickup';

  constructor(private readonly catalog: CatalogStore) {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  get lines(): readonly CartLine[] {
    return toCartLines(this.items, this.catalog.products);
  }

  get postponedLines(): readonly CartLine[] {
    return toCartLines(this.postponed, this.catalog.products);
  }

  get totals(): Totals {
    return calculateTotals(this.lines, this.promo, this.delivery);
  }

  get itemCount(): number {
    return countItems(this.items);
  }

  get isEmpty(): boolean {
    return this.items.length === 0;
  }

  /** Метод вместо вычисляемого: у геттера не бывает аргументов. */
  quantityOf(productId: string): number {
    const active = this.items.find((item) => item.productId === productId)?.qty ?? 0;
    const waiting = this.postponed.find((item) => item.productId === productId)?.qty ?? 0;

    return active + waiting;
  }

  add(product: Product): void {
    if (this.quantityOf(product.id) >= product.stock) {
      return;
    }

    const postponedItem = this.postponed.find((item) => item.productId === product.id);

    if (postponedItem !== undefined) {
      postponedItem.qty += 1;

      return;
    }

    const activeItem = this.items.find((item) => item.productId === product.id);

    if (activeItem === undefined) {
      this.items.push({ productId: product.id, qty: 1 });
    } else {
      activeItem.qty += 1;
    }
  }

  changeQty(product: Product, qty: number): void {
    if (qty < 1 || qty > product.stock) {
      return;
    }

    for (const list of [this.items, this.postponed]) {
      const item = list.find((candidate) => candidate.productId === product.id);

      if (item !== undefined) {
        item.qty = qty;
      }
    }
  }

  remove(productId: string): void {
    this.items = this.items.filter((item) => item.productId !== productId);
    this.postponed = this.postponed.filter((item) => item.productId !== productId);
  }

  postpone(productId: string): void {
    const index = this.items.findIndex((item) => item.productId === productId);

    if (index === -1) {
      return;
    }

    const [item] = this.items.splice(index, 1);

    if (item !== undefined) {
      this.postponed.push(item);
    }
  }

  restore(productId: string): void {
    const index = this.postponed.findIndex((item) => item.productId === productId);

    if (index === -1) {
      return;
    }

    const [item] = this.postponed.splice(index, 1);

    if (item !== undefined) {
      this.items.push(item);
    }
  }

  setPromo(promo: Promo | null): void {
    this.promo = promo;
  }

  setDelivery(method: DeliveryMethod): void {
    this.delivery = method;
  }

  clear(): void {
    this.items = [];
    this.postponed = [];
    this.promo = null;
  }
}
