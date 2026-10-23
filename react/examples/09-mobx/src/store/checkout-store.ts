import { flow, makeAutoObservable } from 'mobx';
import { createOrder, errorMessage, type Customer, type Order } from '../domain';
import type { CartStore } from './cart-store';

/**
 * Отправка заказа написана через `flow`.
 *
 * Генератор продолжает действие после каждого `yield`, поэтому
 * `runInAction` здесь не нужен - в отличие от `async`-методов соседних
 * сторов, где он стоит после каждого `await`.
 */
export class CheckoutStore {
  isOpen = false;
  isSubmitting = false;
  error: string | null = null;
  order: Order | null = null;

  constructor(private readonly cart: CartStore) {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  open(): void {
    this.isOpen = true;
    this.error = null;
    this.order = null;
  }

  close(): void {
    const isOrderAccepted = this.order !== null;

    this.isOpen = false;
    this.order = null;

    if (isOrderAccepted) {
      this.cart.clear();
    }
  }

  submit = flow(function* (this: CheckoutStore, customer: Customer) {
    this.isSubmitting = true;
    this.error = null;

    try {
      const order: Order = yield createOrder({
        items: [...this.cart.items],
        promoCode: this.cart.promo?.code ?? null,
        delivery: this.cart.delivery,
        customer,
      });

      this.isSubmitting = false;
      this.order = order;
    } catch (error: unknown) {
      this.isSubmitting = false;
      this.error = errorMessage(error, 'Не удалось оформить заказ');
    }
  });
}
