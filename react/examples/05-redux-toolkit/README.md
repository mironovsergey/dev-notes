# 05 · Redux Toolkit

Та же «Лавка», что и в варианте 04, но хранилище собрано средствами Redux
Toolkit: `configureStore`, `createSlice` с Immer, `createAsyncThunk`.
Типы действий остались прежними (`cart/added`, `promo/applied`), поэтому
варианты можно сравнивать строка в строку.

## Что здесь показано

| Прием | Где |
| --- | --- |
| `createSlice`: редьюсер, типы действий и генераторы экшенов из одного описания | `store/cart-slice.ts` |
| Immer: «мутация» черновика вместо ручных спредов; состояние заморожено | `store/cart-slice.ts` |
| `PayloadAction<T>` задает тип `payload` и аргумент генератора | все срезы |
| `prepare` для действия с двумя аргументами (`товар` и `количество`) | `store/cart-slice.ts` |
| Замена состояния целиком - только через `return` | `store/cart-slice.ts`, `store/delivery-slice.ts` |
| `createAsyncThunk` с `pending` / `fulfilled` / `rejected` в `extraReducers` | `store/catalog-slice.ts` |
| `rejectWithValue`: в `payload` идет сообщение для интерфейса, а не объект `Error` | `store/promo-slice.ts` |
| `unwrap` в компоненте: результат или исключение вместо разбора объекта действия | `components/promo-form.tsx` |
| `thunkApi.signal` и `.abort()` у промиса от `dispatch` вместо своего `AbortController` | `components/catalog.tsx` |
| `condition`: повторная отправка заказа не запускается | `store/checkout-slice.ts` |
| Реакция на действие чужого среза в `extraReducers` | `store/promo-slice.ts` |
| `selectors` прямо в срезе, RTK сам подставляет нужный ключ состояния | все срезы |
| `configureStore`: thunk, DevTools и проверки разработки без обвязки; свое middleware через `concat` | `store/store.ts` |
| Обычный thunk там, где нет запроса, - `createAsyncThunk` не обязателен | `store/thunks.ts` |

## Чем отличается от варианта 04

| Вариант 04 | Вариант 05 |
| --- | --- |
| константы, генераторы действий и `parseShopAction` на 121 строку | ничего этого нет: типы и генераторы делает `createSlice` |
| сужение `UnknownAction` проверками во время выполнения | обработчик среза сразу получает свой `PayloadAction<T>` |
| новое состояние собирается спредами | Immer: правка черновика дает неизменяемое состояние |
| три действия и `try/catch` на каждый запрос | одно описание `createAsyncThunk` |
| `legacy_createStore` + `applyMiddleware` + `composeEnhancers` для DevTools | `configureStore` |
| `AppDispatch` собирается через `ThunkDispatch` | `AppDispatch` берется из `store.dispatch` |
| `reselect` отдельной зависимостью | `createSelector` реэкспортирован из RTK |

Код хранилища сократился с 440 до 333 строк (без комментариев и пустых
строк), а число файлов - с 13 до 11, и это при том, что в варианте 05
добавились `condition`, `unwrap` и селекторы срезов.

Одна тонкость типизации, которая не видна в документации: если начальное
состояние среза - примитив или `null`, литерал сужает тип среза
(`'pickup'` вместо `DeliveryMethod`), и аннотация переменной этого не
меняет. Приведение типа запрещено правилами проекта, поэтому начальное
значение задано функцией: `initialState: (): DeliveryMethod => 'pickup'`.

RTK Query - часть того же пакета и решает другую задачу: кеширование
серверных данных. Отдельного варианта на него нет, потому что тот же
подход разбирается на TanStack Query в варианте 10.
