import { applyMiddleware, compose, legacy_createStore as createStore } from 'redux';
import { thunk } from 'redux-thunk';
import { logger } from './middleware/logger';
import { rootReducer } from './reducers';

declare global {
  interface Window {
    /** Расширитель, который кладет в `window` расширение Redux DevTools. */
    __REDUX_DEVTOOLS_EXTENSION_COMPOSE__?: typeof compose;
  }
}

/**
 * Если расширение установлено, его `compose` оборачивает расширители и
 * включает историю действий; иначе используется обычный `compose`. Проверка
 * `typeof window === 'object'` нужна для тестов и серверного рендера.
 */
const composeEnhancers =
  typeof window === 'object' && window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ !== undefined
    ? window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__
    : compose;

/** Хранилище создается один раз на приложение; тесты собирают свое через `createAppStore`. */
export function createAppStore() {
  return createStore(rootReducer, undefined, composeEnhancers(applyMiddleware(thunk, logger)));
}

export const store = createAppStore();
