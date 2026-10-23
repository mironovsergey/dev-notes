# Типизация Redux

## 4.15 Действия

> 📌 **Типизированное действие** - объект с литеральным типом поля `type`
> и типизированным `payload`; объединение всех таких объектов - размеченное
> объединение, по которому компилятор сужает действие до варианта.

Ключевой момент - **литеральный тип** у `type`. Константа без `as const`
хотя и имеет литеральный тип, в свойстве объекта расширяется до `string`, и
разметка объединения теряется:

```ts
const BAD = 'todos/bad';                  // 'todos/bad', но в объекте станет string
const badCreator = () => ({ type: BAD }); // { type: string }
const literal: 'todos/bad' = badCreator().type;
// TS2322: Type 'string' is not assignable to type '"todos/bad"'.

export const TOGGLE_TODO = 'todos/toggle' as const; // 'todos/toggle' и в объекте
export const toggleTodo = (id: number) => ({ type: TOGGLE_TODO, payload: id });
```

Генератор экшенов с `as const` в константе возвращает объект с литеральным
`type`, и тип действия выводится из генератора через `ReturnType` -
описывать интерфейс на каждое действие не нужно:

```ts
import { createAction } from '@reduxjs/toolkit';

export interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

// createAction: типизированный генератор с полем type и type guard match()
export const addTodo = createAction('todos/add', (text: string) => ({ payload: { id: Date.now(), text } }));
export const loadSuccess = createAction<Todo[]>('todos/loadSuccess');

// Объединение действий выводится из генераторов; дублировать интерфейсы не нужно
export type TodosAction =
  | ReturnType<typeof toggleTodo>
  | ReturnType<typeof addTodo>
  | ReturnType<typeof loadSuccess>;
```

| Способ | Что дает |
| --- | --- |
| Константа `as const` + функция | Литеральный `type`, `payload` любой формы; объединение через `ReturnType` |
| `createAction<P>('type')` | То же плюс свойство `.type` и type guard `.match(action)` для сужения `UnknownAction` |
| `createAction('type', prepare)` | Аргументы генератора и форма `payload` различаются |
| 🕰️ Интерфейс на каждое действие (`IAddTodoAction { readonly type: typeof ADD_TODO; … }`) | Работает, но дублирует то, что уже выражено в генераторе; при изменении `payload` правятся два места |

Объединение `TodosAction` нужно для `useReducer`-подобного редьюсера с
`switch` ([4.10](hooks.md#410-usereducer)) и для документации; редьюсер
Redux принимает не его - см. ниже.

---

## 4.16 Редьюсер и хранилище

### Редьюсер принимает `UnknownAction`

Редьюсер среза получает **все** действия приложения, включая чужие и
служебные ([2.8](../sprint-2/redux.md#28-редьюсеры-и-combinereducers)).
Redux 5 и Redux Toolkit 2 отражают это в типах: параметр `action`
редьюсера должен принимать `UnknownAction`, а конкретный вариант
устанавливается **сужением** внутри.

```ts
import type { UnknownAction } from 'redux';

export interface TodosState {
  readonly list: readonly Todo[];
  readonly status: 'idle' | 'loading' | 'succeeded' | 'failed';
}

const initialState: TodosState = { list: [], status: 'idle' };

export function todosReducer(state: TodosState = initialState, action: UnknownAction): TodosState {
  if (addTodo.match(action)) {
    // после match() action.payload: { id: number; text: string }
    return { ...state, list: [...state.list, { ...action.payload, completed: false }] };
  }
  if (loadSuccess.match(action)) {
    return { ...state, list: action.payload, status: 'succeeded' };
  }
  if (action.type === TOGGLE_TODO && typeof action.payload === 'number') {
    const id = action.payload;
    return { ...state, list: state.list.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)) };
  }
  return state;
}
```

⚠️ Редьюсер с узким параметром `action: TodosAction` компилируется сам по
себе, но не принимается хранилищем: `configureStore({ reducer: { todos:
narrowReducer } })` дает

```
TS2322: Type '(state: TodosState | undefined, action: TodosAction) => TodosState' is not assignable
  to type 'Reducer<TodosState, UnknownAction, TodosState>'.
    Property 'payload' is missing in type 'UnknownAction' but required in type '…'.
```

Причина - контравариантность параметров: хранилище будет вызывать редьюсер
с любым действием, а редьюсер обещает работать только со своими. У
`legacy_createStore` тот же узкий редьюсер ломает вывод типа
`preloadedState` (`Partial<{ todos: never }>`), и вызов с расширителем
вторым аргументом не компилируется. Сужение через `.match()` снимает обе
проблемы; в Redux Toolkit его делает `createSlice`
([4.18](#418-redux-toolkit)).

`readonly` в типе состояния (`readonly list: readonly Todo[]`) превращает
мутацию `state.list.push(…)` в ошибку компиляции - страховка правила
неизменяемости ([2.8](../sprint-2/redux.md#28-редьюсеры-и-combinereducers)).

### `RootState` и `AppDispatch`

> 📌 **`RootState`** - тип всего состояния хранилища, выведенный из
> `store.getState`; **`AppDispatch`** - тип `store.dispatch`, включающий
> действия и, при подключенном middleware, thunk.

```ts
import { legacy_createStore as createStore, combineReducers, applyMiddleware } from 'redux';
import { thunk, type ThunkAction, type ThunkDispatch } from 'redux-thunk';

const rootReducer = combineReducers({ todos: todosReducer });

// 🕰️ createStore; в новом коде - configureStore
export const store = createStore(rootReducer, applyMiddleware(thunk));

// Типы выводятся из хранилища: новый редьюсер сразу попадает в RootState
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = ThunkDispatch<RootState, undefined, UnknownAction>;
```

✅ `RootState` выводится, а не описывается вручную: ручной тип `{ todos:
TodosState }` расходится с хранилищем при первом же новом редьюсере.
`typeof store.dispatch` для чистого `createStore` знает о thunk, но с
состоянием `any`: `applyMiddleware(thunk)` не связан с типом хранилища.
Поэтому `AppDispatch` строится явно через `ThunkDispatch<State, Extra,
Action>`; `configureStore` выводит его сам ([4.18](#418-redux-toolkit)).

### Thunk

> 📌 **`ThunkAction<Return, State, Extra, Action>`** - тип функции-thunk:
> результат, тип состояния для `getState`, тип `extraArgument` и
> допустимые действия для `dispatch`.

```ts
// Тип thunk приложения: <результат, состояние, extraArgument, допустимые действия>
export type AppThunk<Return = void> = ThunkAction<Return, RootState, undefined, UnknownAction>;

export const loadTodos = (): AppThunk<Promise<void>> => async (dispatch, getState) => {
  if (getState().todos.status === 'loading') {
    return;
  }
  const res = await fetch('/api/todos');
  const data = (await res.json()) as Todo[]; // граница с внешним миром: тип назначается здесь
  dispatch(loadSuccess(data));
};
```

Внутри thunk `dispatch` и `getState` типизированы через `AppThunk`, и
аннотировать параметры не нужно; `getState().todos.status` - объединение
литералов из `TodosState`. Параметр `Return` описывает результат вызова
`dispatch(loadTodos())` - здесь промис, который компонент может дождаться.

🕰️ Обертка `ActionCreator<ThunkAction<…>>` и аннотация `(dispatch:
AppDispatch)` внутри thunk избыточны: `ThunkAction` уже задает тип
`dispatch`, а `ActionCreator` лишь скрывает сигнатуру генератора.

---

## 4.17 Типизированные хуки `react-redux`

Хуки `useSelector` и `useDispatch` из `react-redux` ничего не знают о
хранилище приложения: `useSelector((state) => state.todos)` без типа дает
`TS18046: 'state' is of type 'unknown'`. Типизировать каждый вызов
параметром (`useSelector<RootState, Todo[]>(…)`) утомительно и легко
забыть.

> 📌 **Типизированные хуки** - версии `useSelector`, `useDispatch` и
> `useStore`, созданные один раз через `.withTypes<…>()` с типами
> приложения и импортируемые вместо оригиналов.

```ts
import { useDispatch, useSelector, useStore } from 'react-redux';

// Типизированные хуки создаются один раз и импортируются вместо оригиналов
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
export const useAppStore = useStore.withTypes<typeof store>();
```

```tsx
import { useAppDispatch, useAppSelector } from '../services/hooks';

function TodoList() {
  const dispatch = useAppDispatch();
  const list = useAppSelector((state) => state.todos.list); // readonly Todo[] - выведено
  const count = useAppSelector(selectCompletedCount);

  dispatch(addTodo('Кофе'));
  void dispatch(loadTodos()); // thunk принимается благодаря ThunkDispatch; результат - Promise<void>
  // …
}
```

Что ловит компилятор:

| Ошибка | Сообщение |
| --- | --- |
| Опечатка в ключе состояния: `state.todo` | `TS2551: Property 'todo' does not exist on type '{ todos: … }'. Did you mean 'todos'?` |
| Thunk через обычный `Dispatch` | `TS2345: Argument of type '(d: Dispatch) => …' is not assignable to parameter of type 'UnknownAction'` |
| `useSelector` без типов | `TS18046: 'state' is of type 'unknown'` |

Селекторы, вынесенные из компонентов, аннотируются `RootState` явно -
`(state: RootState) => …` - и тогда работают и в `useAppSelector`, и в thunk
через `getState()`, и в тестах.

🕰️ `TypedUseSelectorHook<RootState>` и обертка
`() => useDispatch<AppDispatch>()` - запись до `react-redux` 9.1; `withTypes`
короче и типизирует все три хука одинаково.

---

## 4.18 Redux Toolkit

Redux Toolkit выводит большую часть типов сам: из `initialState` - тип
среза, из обработчиков - генераторы экшенов, из `configureStore` -
`RootState` и `AppDispatch` вместе с thunk. Явные аннотации остаются в
трех местах: `initialState`, `PayloadAction<T>` и параметры
`createAsyncThunk`.

### `createSlice` и `PayloadAction`

> 📌 **`PayloadAction<P>`** - тип действия с `payload` типа `P`; аннотация
> второго параметра обработчика в `createSlice` задает и тип `payload`, и
> тип аргумента сгенерированного генератора экшенов.

```ts
import { configureStore, createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface TodosState {
  list: Todo[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

// Аннотация initialState задает тип среза; без нее status был бы string
const initialState: TodosState = { list: [], status: 'idle', error: null };

const todosSlice = createSlice({
  name: 'todos',
  initialState,
  reducers: {
    // PayloadAction<T> задает тип payload; генератор addTodo получит аргумент типа string
    addTodo: (state, action: PayloadAction<string>) => {
      state.list.push({ id: Date.now(), text: action.payload, completed: false });
    },
    toggleTodo: (state, action: PayloadAction<number>) => {
      const todo = state.list.find((t) => t.id === action.payload);
      if (todo) {
        todo.completed = !todo.completed;
      }
    },
    // prepare: аргументы генератора и payload различаются
    addTodoWithId: {
      reducer: (state, action: PayloadAction<Todo>) => {
        state.list.push(action.payload);
      },
      prepare: (text: string, id: number) => ({ payload: { id, text, completed: false } }),
    },
    clear: () => initialState,
  },
  selectors: {
    selectList: (state) => state.list,
    selectStatus: (state) => state.status,
  },
});

export const { addTodo, toggleTodo, addTodoWithId, clear } = todosSlice.actions;
export const { selectList, selectStatus } = todosSlice.selectors;
```

`dispatch(addTodo(42))` дает `TS2345: Argument of type 'number' is not
assignable to parameter of type 'string'`; `addTodoWithId('Чай', 2)`
принимает два аргумента из `prepare`. Без аннотации `initialState` поле
`status: 'idle'` выводится как `string`: присвоение `'typo'` проходит, а
`slice.getInitialState()` уже не совместим с `TodosState`.

Внутри обработчиков `state` - черновик Immer с тем же типом `TodosState`;
`readonly` в типе среза здесь не нужен, мутация черновика допустима по
замыслу ([2.19](../sprint-2/redux-toolkit.md#219-createslice-и-immer)).

### `configureStore`, `RootState`, `AppDispatch`

```ts
interface Api {
  fetchTodos: (page: number) => Promise<Todo[]>;
}

export function makeStore(api: Api) {
  return configureStore({
    reducer: { todos: todosSlice.reducer },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware({ thunk: { extraArgument: api } }),
  });
}

// Типы выводятся из фабрики хранилища
export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
```

`AppDispatch` здесь - `ThunkDispatch<RootState, Api, UnknownAction> &
Dispatch<UnknownAction>`: `configureStore` знает о thunk и об
`extraArgument`, ничего строить вручную не нужно. Фабрика `makeStore`
вместо синглтона позволяет создавать хранилище для каждого теста и для
серверного рендера; при синглтоне типы выводятся так же:
`typeof store.getState`.

### `createAsyncThunk`

> 📌 **`createAsyncThunk<Returned, ThunkArg, ThunkApiConfig>`** - три
> параметра типа: результат `payloadCreator`, аргумент thunk и объект
> конфигурации с типами `state`, `extra`, `rejectValue`.

```ts
import { createAsyncThunk } from '@reduxjs/toolkit';

// <возвращаемое значение, аргумент, конфигурация thunkApi>
export const fetchTodos = createAsyncThunk<Todo[], number, { extra: Api; rejectValue: string; state: RootState }>(
  'todos/fetch',
  async (page, { extra, rejectWithValue, getState }) => {
    if (getState().todos.status === 'loading') {
      return rejectWithValue('Запрос уже выполняется');
    }
    try {
      return await extra.fetchTodos(page);
    } catch (e: unknown) {
      return rejectWithValue(e instanceof Error ? e.message : 'Неизвестная ошибка');
    }
  }
);
```

| Параметр | Что типизирует | Без него |
| --- | --- | --- |
| `Returned` (`Todo[]`) | `action.payload` в `fulfilled` | Выводится из результата функции |
| `ThunkArg` (`number`) | Аргумент `dispatch(fetchTodos(1))`; `fetchTodos()` без аргумента - `TS2554: Expected 1-2 arguments, but got 0` | `void` - вызов без аргумента |
| `rejectValue` | `action.payload` в `rejected`; без него: `Type 'unknown' is not assignable to type 'string'` | `unknown` |
| `extra` | `thunkApi.extra` | `unknown` |
| `state` | `thunkApi.getState()` | `unknown` |

В `extraReducers` типы приходят из thunk без аннотаций:

```ts
extraReducers: (builder) => {
  builder
    .addCase(fetchTodos.pending, (state) => {
      state.status = 'loading';
      state.error = null;
    })
    .addCase(fetchTodos.fulfilled, (state, action) => {
      state.status = 'succeeded';
      state.list = action.payload; // Todo[] - из первого параметра createAsyncThunk
    })
    .addCase(fetchTodos.rejected, (state, action) => {
      state.status = 'failed';
      state.error = action.payload ?? action.error.message ?? 'Ошибка'; // payload: string | undefined - из rejectValue
    });
},
```

`dispatch(fetchTodos(1))` возвращает промис с методом `unwrap()`, который
дает `Promise<Todo[]>` и отклоняется при `rejected`, - способ дождаться
результата в компоненте с полным типом.

### Селекторы

```ts
import { createSelector } from '@reduxjs/toolkit';

// Мемоизированный селектор: входные селекторы типизированы RootState, результат выведен
export const selectCompleted = createSelector([selectList], (list) => list.filter((t) => t.completed));
```

Селекторы из `slice.selectors` уже привязаны к ключу среза и принимают
`RootState`; `createSelector` выводит тип результата из последней функции.

### Сводка: что аннотировать в Redux Toolkit

| Место | Аннотация | Почему |
| --- | --- | --- |
| `initialState` | Тип среза | Иначе литералы расширяются до `string`, `null` - до `null` |
| Второй параметр обработчика | `PayloadAction<T>` | Единственный источник типа `payload` и аргумента генератора |
| `createAsyncThunk` | `<Returned, Arg, { rejectValue, extra, state }>` | `rejectValue` и `extra` иначе `unknown` |
| `RootState`, `AppDispatch` | `ReturnType<…>` / `AppStore['dispatch']` | Выводятся, не описываются |
| Хуки | `.withTypes<…>()` один раз | Все компоненты получают типы автоматически |
| Все остальное | Нет | Выводится |

---

[← Типизация хуков](hooks.md) · [К содержанию спринта](README.md)
