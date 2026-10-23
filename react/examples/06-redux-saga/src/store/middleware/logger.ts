import type { Middleware } from 'redux';

/**
 * Учебное middleware: печатает действие и состояние после него.
 *
 * Сигнатура `storeApi => next => action` - функция, возвращающая функцию,
 * возвращающую функцию. `next` передает действие дальше по цепочке; если его
 * не вызвать, до редьюсера действие не дойдет.
 */
export const logger: Middleware = (storeApi) => (next) => (action) => {
  if (!import.meta.env.DEV) {
    return next(action);
  }

  const type =
    typeof action === 'object' && action !== null && 'type' in action ? action.type : action;

  console.groupCollapsed(`action ${String(type)}`);
  console.log('до:', storeApi.getState());

  const result = next(action);

  console.log('после:', storeApi.getState());
  console.groupEnd();

  return result;
};
