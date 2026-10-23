import { errorMessage, fetchProducts, type Product } from '../../domain';
import { call, cancelled, put, takeLatest } from 'redux-saga/effects';
import { catalogActions } from '../catalog-slice';

/**
 * Worker: загружает каталог.
 *
 * `call` вызывает функцию и ждет результат; `put` отправляет действие в
 * хранилище. В `finally` эффект `cancelled()` отвечает, отменили ли сагу, -
 * и только тогда прерывается сам HTTP-запрос: `takeLatest` отменяет сагу,
 * но не знает про сеть.
 */
export function* loadCatalogWorker() {
  const controller = new AbortController();

  try {
    const products: readonly Product[] = yield call(fetchProducts, controller.signal);

    yield put(catalogActions.loaded(products));
  } catch (error: unknown) {
    yield put(catalogActions.failed(errorMessage(error, 'Не удалось загрузить каталог')));
  } finally {
    const wasCancelled: boolean = yield cancelled();

    if (wasCancelled) {
      controller.abort();
    }
  }
}

/**
 * Watcher: связь «действие → эффект» описана в одном месте.
 *
 * `takeLatest` отменяет предыдущий незавершенный запуск, поэтому повторное
 * нажатие «Повторить» не приведет к гонке: в состояние попадет результат
 * последнего запроса, а не того, который вернулся позже.
 */
export function* catalogWatcher() {
  yield takeLatest(catalogActions.requested.type, loadCatalogWorker);
}
