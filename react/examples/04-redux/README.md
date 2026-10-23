# 04 · Redux

Та же «Лавка» на чистом Redux: `legacy_createStore`, `combineReducers`,
генераторы действий, thunk для асинхронной работы, собственное middleware и
подключение Redux DevTools. Toolkit здесь намеренно не используется - его
очередь в варианте 05, и разницу видно только после того, как увидишь, что
именно он сворачивает.

## Что здесь показано

| Прием | Где |
| --- | --- |
| Генераторы действий с `as const`; тип действия выводится через `ReturnType` | `store/actions.ts` |
| Сужение `UnknownAction` проверками во время выполнения - без приведения типов | `store/actions.ts` |
| Редьюсер на срез, состояние с `readonly`, `combineReducers` | `store/reducers/` |
| Одно действие меняет несколько срезов: `cart/cleared` слушают и корзина, и промокод | `store/reducers/promo.ts` |
| Хранилище: `legacy_createStore(reducer, undefined, applyMiddleware(...))` | `store/store.ts` |
| Подключение Redux DevTools через `__REDUX_DEVTOOLS_EXTENSION_COMPOSE__` | `store/store.ts` |
| Собственное middleware по схеме `storeApi => next => action` | `store/middleware/logger.ts` |
| Thunk: асинхронные операции и решения по `getState` | `store/thunks.ts` |
| Типы `RootState`, `AppDispatch`, `AppThunk` | `store/types.ts` |
| Типизированные хуки через `.withTypes<…>()` | `store/hooks.ts` |
| Мемоизированные селекторы `createSelector` | `store/selectors.ts` |
| `connect` и `mapStateToProps` - для сравнения с хуками | `components/header.tsx` |
| Форма остается локальной: в хранилище только результат | `components/promo-form.tsx` |

## Чем отличается от варианта 03

| Вариант 03 | Вариант 04 |
| --- | --- |
| контекст доставляет состояние, подписка на все значение | `useSelector` подписывает компонент на выбранный фрагмент |
| один редьюсер на все состояние | редьюсер на срез плюс `combineReducers` |
| действия собираются в компонентах | генераторы действий в одном модуле |
| асинхронность - функции, принимающие `dispatch` | thunk, который получает `dispatch` и `getState` от middleware |
| производные данные - хуки с `useMemo` | селекторы `createSelector`, работающие и вне React |
| историю изменений видно только в коде | Redux DevTools показывает каждое действие и состояние после него |

Цена перехода видна в `store/actions.ts`: в Redux 5 редьюсер получает
`UnknownAction`, поэтому каждое действие приходится сужать вручную. Именно
эту рутину убирает `createSlice` в варианте 05.
