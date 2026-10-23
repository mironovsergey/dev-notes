import { makeAutoObservable, runInAction } from 'mobx';
import { errorMessage, fetchProducts, type LoadStatus, type Product } from '../domain';

/**
 * Состояние изменяемое: поля меняются присваиванием, MobX сам рассылает
 * уведомления тем, кто их прочитал.
 *
 * `makeAutoObservable` выводит аннотации сам: поля - наблюдаемые, геттеры -
 * вычисляемые, методы - действия. `autoBind` привязывает методы к
 * экземпляру, поэтому их можно передавать как колбэки.
 */
export class CatalogStore {
  products: Product[] = [];
  status: LoadStatus = 'loading';
  error: string | null = null;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  async load(): Promise<void> {
    this.status = 'loading';
    this.error = null;

    try {
      const products = await fetchProducts();

      // Все, что идет после await, выполняется уже вне действия,
      // поэтому изменения собираются в `runInAction`.
      runInAction(() => {
        this.products = [...products];
        this.status = 'ready';
      });
    } catch (error: unknown) {
      runInAction(() => {
        this.products = [];
        this.status = 'error';
        this.error = errorMessage(error, 'Не удалось загрузить каталог');
      });
    }
  }

  productById(productId: string): Product | undefined {
    return this.products.find((product) => product.id === productId);
  }
}
