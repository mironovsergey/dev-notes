# Redux Toolkit

## 2.18 Зачем Redux Toolkit; `configureStore`

> 📌 **Redux Toolkit** - официальная библиотека-обертка над Redux, которая
> задает соглашения и генерирует шаблонный код: создает хранилище с
> настроенными middleware и DevTools, из одного описания среза порождает
> редьюсер, типы и генераторы экшенов, а неизменяемость обеспечивает через
> Immer.

RTK не заменяет понятия Redux - действия, редьюсеры, `dispatch`, селекторы
остаются теми же ([2.6](redux.md#26-что-такое-redux)). Он меняет способ их
записи.

| Задача | Чистый Redux | Redux Toolkit |
| --- | --- | --- |
| Хранилище | `createStore` + `applyMiddleware` + `compose` для DevTools | `configureStore({ reducer })` |
| Типы действий | Константы вручную | Генерируются из `name` и ключей `reducers` |
| Генераторы экшенов | Функции вручную | `slice.actions` |
| Редьюсер | `switch` + spread-копии | «Мутирующий» код внутри Immer |
| Асинхронный запрос | Три константы, thunk, три `case` | `createAsyncThunk` + `extraReducers` |
| Проверки в разработке | Нет | Мутации и несериализуемые значения |

### `configureStore`

```js
import { configureStore } from '@reduxjs/toolkit';

import counterReducer from './counter-slice';
import feedReducer from './feed-slice';

export const store = configureStore({
  // Объект редьюсеров заменяет combineReducers; можно передать и готовый корневой редьюсер
  reducer: { counter: counterReducer, feed: feedReducer },
  // Стандартный набор (thunk и проверки) дополняется, а не заменяется
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(logger),
  devTools: process.env.NODE_ENV !== 'production',
  preloadedState,
});
```

Что включено по умолчанию:

- **`redux-thunk`**: `dispatch(async (dispatch) => …)` работает без
  настройки.
- **Redux DevTools** - без `window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__`.
- **Проверки в разработке**: middleware неизменяемости (мутация состояния
  вне редьюсера - ошибка) и сериализуемости (`dispatch(set(new Date()))`
  пишет в консоль `A non-serializable value was detected in an action, in
  the path: payload`). В production они отключены.

`getDefaultMiddleware` принимает опции: `{ thunk: { extraArgument: { api } } }`
передает зависимости в thunk ([2.21](#221-createasyncthunk)), `{ thunk: false }`
отключает thunk (например, при переходе на saga -
[2.24](redux-saga.md#224-подключение-и-сравнение-с-thunk)).

---

## 2.19 `createSlice` и Immer

> 📌 **Слайс (slice)** - часть состояния хранилища под одним ключом вместе с
> редьюсером и действиями, которые ее изменяют.

> 📌 **`createSlice`** - функция RTK, которая по имени, начальному состоянию
> и объекту функций-обработчиков создает редьюсер слайса, типы действий
> вида `имя/обработчик` и генераторы экшенов для каждого обработчика.

```js
import { createSlice, nanoid } from '@reduxjs/toolkit';

const counterSlice = createSlice({
  name: 'counter',
  initialState: { value: 0, history: [] },
  reducers: {
    increment: (state) => {
      // Immer: «мутация» черновика превращается в новый неизменяемый объект
      state.value += 1;
      state.history.push('inc');
    },
    incrementByAmount: (state, action) => {
      state.value += action.payload;
    },
    // prepare задает форму payload до попадания в редьюсер
    addNote: {
      reducer: (state, action) => {
        state.history.push(action.payload.id);
      },
      prepare: (text) => ({ payload: { id: nanoid(), text } }),
    },
    // Возврат нового значения вместо мутации - тоже допустим
    reset: () => ({ value: 0, history: [] }),
  },
});

export const { increment, incrementByAmount, addNote, reset } = counterSlice.actions;
export default counterSlice.reducer;
```

`increment.type === 'counter/increment'`, `incrementByAmount(5)`
дает `{ type: 'counter/incrementByAmount', payload: 5 }`, `addNote('x')`
кладет в `payload` объект с `id` и `text`.

| Поле | Назначение |
| --- | --- |
| `name` | Префикс типов действий: `counter/increment` |
| `initialState` | Начальное состояние среза |
| `reducers` | Обработчики `(state, action) => void \| newState`; ключ - имя действия |
| `extraReducers` | Реакция на действия, созданные вне слайса: `createAsyncThunk`, другие слайсы ([2.21](#221-createasyncthunk)) |
| `selectors` | (RTK 2) Селекторы среза, автоматически привязанные к его ключу |

Генератор экшена принимает один аргумент, который целиком становится
`payload`. Если аргументов несколько или `payload` нужно вычислить
(идентификатор, время) - вариант с `prepare`: побочные вычисления живут в
нем, а редьюсер остается чистым ([2.8](redux.md#28-редьюсеры-и-combinereducers)).

### Immer

> 📌 **Immer** - библиотека, которая дает функции черновик (draft, Proxy над
> текущим состоянием), записывает сделанные с ним «мутации» и на их основе
> строит новый неизменяемый объект, не трогая исходный.

Поэтому `state.value += 1` внутри `createSlice` - не нарушение неизменяемости.
После `dispatch(increment())` старое состояние по-прежнему содержит
`value: 0`, новое - `value: 1`; это разные объекты, а старое заморожено:
`before.value = 9` бросает `TypeError`.

Два правила Immer:

1. **Либо мутировать черновик, либо вернуть новое значение - не оба.**
   Обработчик, который делает `state.n += 1` и возвращает `{ n: 100 }`,
   падает с ошибкой `An immer producer returned a new value *and* modified
   its draft`.
2. **Замена состояния целиком - только через `return`.** `state = { … }`
   переприсваивает локальную переменную и ничего не меняет; для примитивного
   состояния (`initialState: 0`) единственная форма - `return state + 1`.

Immer стоит времени на Proxy, но для размеров состояния типичного
приложения это незаметно; выигрыш - невозможность случайной мутации и
читаемый код вложенных обновлений (`state.users[id].address.city = …`
вместо трех уровней spread).

### Использование в компоненте

```jsx
import { useDispatch, useSelector } from 'react-redux';
import { increment, incrementByAmount } from './counter-slice';

function Counter() {
  const value = useSelector((state) => state.counter.value);
  const dispatch = useDispatch();

  return (
    <>
      <output>{value}</output>
      <button onClick={() => dispatch(increment())}>+1</button>
      <button onClick={() => dispatch(incrementByAmount(10))}>+10</button>
    </>
  );
}
```

❌ Две частые ошибки: `counterSlice()` - `createSlice` возвращает объект, а
не функцию, и вызов бросает `TypeError`; `dispatch(addTodo)` без вызова -
`dispatch` принимает результат вызова генератора: `dispatch(addTodo('текст'))`.

---

## 2.20 `createAction` и `createReducer`

Две функции, из которых собран `createSlice`. Нужны, когда действие не
принадлежит одному слайсу или редьюсер пишется отдельно.

> 📌 **`createAction(type, prepare?)`** - создает генератор экшенов с
> заданным типом; у результата есть свойство `type` и метод `match(action)`
> для проверки типа.

```js
import { createAction, nanoid } from '@reduxjs/toolkit';

const increment = createAction('counter/increment');
const addTodo = createAction('todos/add', (text) => ({ payload: { id: nanoid(), text } }));

increment();          // { type: 'counter/increment', payload: undefined }
increment.type;       // 'counter/increment'
String(increment);    // 'counter/increment' - генератор приводится к строке типа
increment.match(a);   // true, если a.type === 'counter/increment'
```

> 📌 **`createReducer(initialState, builderCallback)`** - создает редьюсер
> без `switch`: обработчики регистрируются через builder по генераторам
> экшенов или строкам типов; внутри действует Immer.

```js
import { createReducer } from '@reduxjs/toolkit';

const counterReducer = createReducer({ value: 0, todos: [] }, (builder) => {
  builder
    .addCase(increment, (state) => {
      state.value += 1;
    })
    .addCase(addTodo, (state, action) => {
      state.todos.push(action.payload);
    })
    // addMatcher - для группы действий по предикату, addDefaultCase - для остальных
    .addDefaultCase(() => {});
});
```

Тот же builder используется в `extraReducers` слайса.

---

## 2.21 `createAsyncThunk`

Ручной thunk из [2.15](middleware-and-thunk.md#215-redux-thunk) требовал
трех констант, трех `dispatch` и `try/catch`. RTK делает это по одному
описанию.

> 📌 **`createAsyncThunk(typePrefix, payloadCreator)`** - создает thunk,
> который при отправке автоматически диспатчит `typePrefix/pending`,
> вызывает асинхронную функцию `payloadCreator` и по ее результату
> диспатчит `typePrefix/fulfilled` с `payload` или `typePrefix/rejected`
> с ошибкой.

```js
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

export const fetchFeed = createAsyncThunk('feed/fetch', async (page, { extra, rejectWithValue }) => {
  try {
    return await extra.api.fetchFeed(page);
  } catch (e) {
    // rejectWithValue кладет в action.payload то, что нужно интерфейсу, а не объект Error
    return rejectWithValue(e.message);
  }
});

const feedSlice = createSlice({
  name: 'feed',
  initialState: { status: 'idle', items: [], error: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchFeed.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchFeed.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchFeed.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload ?? action.error.message;
      });
  },
});
```

```
   dispatch(fetchFeed(1))
          │
          ▼
   feed/fetch/pending ──► payloadCreator(1, thunkApi) ──┬─ resolve ──► feed/fetch/fulfilled { payload }
                                                         └─ reject  ──► feed/fetch/rejected  { error, payload? }
```

`dispatch(fetchFeed(1))` возвращает промис, который разрешается последним
действием, `feed/fetch/fulfilled` или `feed/fetch/rejected`, и не
отклоняется даже при ошибке запроса; `.unwrap()` превращает его в промис с
`payload` или исключением.

Второй аргумент `payloadCreator` - `thunkApi`: `dispatch`, `getState`,
`extra` (из `getDefaultMiddleware({ thunk: { extraArgument } })`),
`requestId`, `signal` (`AbortSignal` для отмены), `rejectWithValue`.
Опция `condition` отменяет запуск (например, если данные уже загружены).

Статус хранится **одним полем** `status: 'idle' | 'loading' | 'succeeded' |
'failed'`, а не парой булевых флагов `feedRequest`/`feedFailed`: два
булевых поля допускают невозможное состояние «загрузка и ошибка
одновременно», одно перечисление - нет.

### Что дальше

Для данных с сервера RTK предлагает **RTK Query** (`createApi`): кеш,
дедупликация запросов, инвалидация и хуки `useGetFeedQuery` без единого
редьюсера. Та же идея серверного состояния разобрана на примере TanStack
Query ([2.35](tanstack-query.md#235-серверное-состояние)); `createAsyncThunk`
остается для случаев, когда результат запроса должен лечь в собственный
слайс.

---

[← Middleware, Redux Thunk и DevTools](middleware-and-thunk.md) · [К содержанию спринта](README.md) ·
[Далее: Redux Saga →](redux-saga.md)
