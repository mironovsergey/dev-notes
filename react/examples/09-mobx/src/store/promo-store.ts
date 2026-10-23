import { makeAutoObservable, runInAction } from 'mobx';
import { ApiError, errorMessage, validatePromo } from '../domain';
import type { CartStore } from './cart-store';

/** Результат проверки уходит в корзину - там промокод участвует в расчете. */
export class PromoStore {
  isChecking = false;
  error: string | null = null;

  constructor(private readonly cart: CartStore) {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  async apply(code: string): Promise<void> {
    const trimmedCode = code.trim();

    if (trimmedCode === '') {
      return;
    }

    this.isChecking = true;
    this.error = null;

    try {
      const promo = await validatePromo(trimmedCode);

      runInAction(() => {
        this.isChecking = false;
        this.cart.setPromo(promo);
      });
    } catch (error: unknown) {
      runInAction(() => {
        this.isChecking = false;
        this.error =
          error instanceof ApiError
            ? error.message
            : errorMessage(error, 'Не удалось проверить промокод');
      });
    }
  }

  clear(): void {
    this.error = null;
    this.cart.setPromo(null);
  }
}
