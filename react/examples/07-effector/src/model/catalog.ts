import { combine, createEffect, createEvent, createStore, sample } from 'effector';
import { errorMessage, fetchProducts, type LoadStatus, type Product } from '../domain';

/** Эффект - обертка над асинхронной функцией; события о ходе выполнения он дает сам. */
export const loadCatalogFx = createEffect<void, readonly Product[]>(async () => fetchProducts());

export const catalogRequested = createEvent();

export const $products = createStore<readonly Product[]>([]).on(
  loadCatalogFx.doneData,
  (_products, products) => products,
);

export const $catalogError = createStore<string | null>(null)
  .on(loadCatalogFx.failData, (_error, error) =>
    errorMessage(error, 'Не удалось загрузить каталог'),
  )
  .reset(loadCatalogFx);

/**
 * Статус собирается из `pending` эффекта и стора ошибки.
 *
 * Отдельный стор «идет загрузка» заводить не нужно: `pending` уже есть у
 * каждого эффекта. Здесь `combine` лишь сводит два источника к одному
 * значению для интерфейса.
 */
export const $catalogStatus = combine(
  loadCatalogFx.pending,
  $catalogError,
  $products,
  (isPending, error, products): LoadStatus => {
    if (error !== null) {
      return 'error';
    }

    return isPending || products.length === 0 ? 'loading' : 'ready';
  },
);

/** Связь «событие → эффект» описана в модели, а не в обработчике клика. */
sample({ clock: catalogRequested, target: loadCatalogFx });
