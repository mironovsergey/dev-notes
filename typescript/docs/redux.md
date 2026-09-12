# 17 Типизация Redux

[← К содержанию](../README.md)

Redux - хранилище состояния, которое меняется только через **действия**
(объекты с полем `type`) и **редьюсеры** (чистые функции `(state, action) => state`).
Это устройство создано для типизации: действия - размеченное объединение
([4.3](object-types.md#43-объединения-доступ-к-общим-членам-литеральные-объединения-размеченные-объединения)),
редьюсер - `switch` с проверкой полноты
([7.5](narrowing.md#75-размеченные-объединения-и-проверка-полноты-через-never)),
состояние - объектный тип, который выводится из редьюсеров. Redux Toolkit
(RTK) убирает ручную запись всего этого и выводит типы сам. Примеры
проверены на Redux 5.0, RTK 2.12, react-redux 9.3 и React 19; хранилище
запущено, компоненты отрисованы через `react-dom/server`.

---

## 17.1 Действия как размеченные объединения, редьюсеры с проверкой полноты

Без RTK действие описывается функцией-создателем (action creator), а тип
действия выводится из нее. `as const` обязателен: без него `type` расширяется
до `string`, и объединение перестает быть размеченным
([8.4](type-operators.md#84-as-const-литеральные-типы-readonly-на-всех-уровнях-словари-констант)).

```ts
import { legacy_createStore as createStore } from 'redux';

interface Todo {
  id: string;
  text: string;
  done: boolean;
}

type Filter = 'all' | 'active' | 'completed';

const addTodo = (id: string, text: string) => ({ type: 'todos/add', payload: { id, text } }) as const;
const toggleTodo = (id: string) => ({ type: 'todos/toggle', payload: id }) as const;
const setFilter = (filter: Filter) => ({ type: 'todos/setFilter', payload: filter }) as const;

type TodoAction = ReturnType<typeof addTodo | typeof toggleTodo | typeof setFilter>;
// | { readonly type: 'todos/add'; readonly payload: { readonly id: string; readonly text: string } }
// | { readonly type: 'todos/toggle'; readonly payload: string }
// | { readonly type: 'todos/setFilter'; readonly payload: Filter }

interface TodosState {
  items: Todo[];
  filter: Filter;
}

const initialState: TodosState = { items: [], filter: 'all' };

function todosReducer(state: TodosState = initialState, action: TodoAction): TodosState {
  switch (action.type) {
    case 'todos/add':
      return { ...state, items: [...state.items, { ...action.payload, done: false }] };
    case 'todos/toggle':
      return { ...state, items: state.items.map((todo) => (todo.id === action.payload ? { ...todo, done: !todo.done } : todo)) };
    case 'todos/setFilter':
      return { ...state, filter: action.payload };
    default:
      return state;
  }
}

const store = createStore(todosReducer); // getState(): TodosState, dispatch принимает TodoAction

store.dispatch(addTodo('1', 'write notes'));
store.dispatch(toggleTodo('1'));
store.dispatch(setFilter('completed'));
// store.dispatch({ type: 'todos/remove', payload: '1' });
// Ошибка TS2322: Type '"todos/remove"' is not assignable to type '"todos/add" | "todos/toggle" | "todos/setFilter"'.
```

```
{"items":[{"id":"1","text":"write notes","done":true}],"filter":"completed"}
```

`ReturnType<typeof addTodo | typeof toggleTodo | ...>` собирает объединение
из создателей: тип действия объявлен один раз - в функции, которая его
создает. Редьюсер получает точный тип `action.payload` в каждой ветке.

Ветка `default: return state` в Redux обязательна - хранилище шлет
редьюсеру и служебные действия, - и это отключает проверку полноты через
`never`: неразобранный член объединения молча уйдет в `default`. Компромисс
классического Redux, который RTK устраняет: у среза нет общего `switch`.

Цена этого стиля видна в объеме: три функции-создателя, объединение, тип
состояния, редьюсер с копированием на каждом уровне. RTK сокращает все до
одного вызова.

---

## 17.2 Redux Toolkit: `createSlice`, `PayloadAction`, `configureStore`

**Срез** (`createSlice`) - имя, начальное состояние и объект редьюсеров;
из него выводятся создатели действий, их типы и тип состояния.

```ts
import { configureStore, createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit';

interface Todo {
  id: string;
  text: string;
  done: boolean;
}
type Filter = 'all' | 'active' | 'completed';

interface TodosState {
  items: Todo[];
  filter: Filter;
}

const initialTodos: TodosState = { items: [], filter: 'all' }; // аннотация, а не as: тип состояния - контракт

const todosSlice = createSlice({
  name: 'todos',
  initialState: initialTodos,
  reducers: {
    added: {
      reducer(state, action: PayloadAction<Todo>) {
        state.items.push(action.payload); // immer: мутация черновика, результат неизменяем
      },
      prepare(text: string) {
        return { payload: { id: nanoid(), text, done: false } }; // вызывающий код передает только text
      },
    },
    toggled(state, action: PayloadAction<string>) {
      const todo = state.items.find((item) => item.id === action.payload);
      if (todo !== undefined) {
        todo.done = !todo.done;
      }
    },
    filterChanged(state, action: PayloadAction<Filter>) {
      state.filter = action.payload;
    },
    cleared() {
      return initialTodos; // возврат нового состояния тоже допустим
    },
  },
});

export const { added, toggled, filterChanged, cleared } = todosSlice.actions;
// added: (text: string) => { payload: Todo; type: 'todos/added' }
// toggled: (payload: string) => { payload: string; type: 'todos/toggled' }

// store.dispatch(toggled(1));
// Ошибка TS2345: Argument of type 'number' is not assignable to parameter of type 'string'.
```

Тип каждого редьюсера задается аннотацией `action: PayloadAction<T>`;
из нее выводится и параметр создателя действия, и литеральный тип `type`
вида `'todos/toggled'`. `prepare` разделяет удобный интерфейс создателя
(`added('text')`) и форму действия (`payload: Todo`).

Мутации внутри редьюсеров - синтаксис, а не семантика: RTK оборачивает
редьюсер в immer, `state` - черновик, а результат - новый неизменяемый
объект. Тип `state` при этом обычный `TodosState`; для `readonly`-полей
immer снимает `readonly` в черновике.

Начальное состояние аннотируется (`const initialTodos: TodosState`), а не
утверждается через `as TodosState`: утверждение пропустило бы литерал с
недостающим полем ([8.6](type-operators.md#86-утверждения-типов-as--двойное-утверждение-через-unknown-границы-допустимого)).
Исключение - состояние-объединение, где литерал одного члена нужно
расширить до объединения; там `as UserState` в [17.5](#175-createasyncthunk-и-extrareducers) -
осознанное расширение, а не сужение.

`configureStore` собирает срезы и включает middleware для thunk-ов и
проверок неизменяемости:

```ts
export const store = configureStore({
  reducer: { todos: todosSlice.reducer },
});
```

---

## 17.3 `RootState` и `AppDispatch`: вывод из store, типизированные хуки

Тип корневого состояния и тип `dispatch` не объявляются - они выводятся из
хранилища:

```ts
export type RootState = ReturnType<typeof store.getState>; // { todos: TodosState }
export type AppDispatch = typeof store.dispatch; // умеет действия и thunk-и
```

`useSelector` и `useDispatch` из react-redux по умолчанию ничего не знают о
проекте: `state` в селекторе - `unknown`, а `dispatch` принимает только
простые действия. Метод `withTypes` (react-redux 9.1+) создает версии
хуков, привязанные к типам проекта:

```ts
import { useDispatch, useSelector } from 'react-redux';

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
```

```tsx
import { Provider } from 'react-redux';

function TodoList() {
  const items = useAppSelector((state) => state.todos.items); // state: RootState, items: Todo[]
  const dispatch = useAppDispatch();
  return (
    <ul onClick={() => dispatch(filterChanged('active'))}>
      {items.map((todo) => <li key={todo.id}>{todo.text}</li>)}
    </ul>
  );
}

const app = <Provider store={store}><TodoList /></Provider>;

// useAppSelector((state) => state.counters.value);
// Ошибка TS2551: Property 'counters' does not exist on type '{ todos: TodosState }'. Did you mean 'todos'?
// useSelector((state) => state.todos);
// Ошибка TS18046: 'state' is of type 'unknown'.
// useDispatch()(async () => {});
// Ошибка TS2345: Argument of type '() => Promise<void>' is not assignable to parameter of type 'UnknownAction'.
```

Три ошибки в комментариях - три причины использовать именно
типизированные хуки: опечатка в имени среза, `unknown` вместо состояния и
отказ нетипизированного `dispatch` принимать thunk.

Файл `store.ts` импортирует срезы, а `RootState` выводится из `store`;
если срез импортирует `RootState` обратно, возникает цикл модулей
([13.2](modules.md#132-формы-импорта-и-экспорта-именованный-по-умолчанию-пространство-имен-реэкспорт-динамический-import)).
Правило: `RootState`, `AppDispatch` и хуки живут рядом со `store`;
срезы знают только собственный тип состояния; селекторы, которым нужен
корень, определяются в отдельном модуле или через `createSelector.withTypes`.

---

## 17.4 Селекторы: типизация, `createSelector`

**Селектор** - функция `(state: RootState) => T`. Простой селектор
типизируется аннотацией параметра; вычисляемый - через `createSelector`,
который мемоизирует результат по входным селекторам:

```ts
import { createSelector } from '@reduxjs/toolkit';

export const selectTodos = (state: RootState) => state.todos.items;

export const selectDoneCount = createSelector([selectTodos], (items) => items.filter((todo) => todo.done).length);
// items: Todo[] - выведено из selectTodos; результат: number

const createAppSelector = createSelector.withTypes<RootState>();
export const selectSummary = createAppSelector(
  [selectTodos, (state) => state.todos.filter], // state: RootState без аннотации
  (items, filter) => `${items.length} items, filter ${filter}`,
);
```

`createSelector.withTypes<RootState>()` (reselect 5) избавляет входные
селекторы от аннотации `state: RootState` - то же, что `withTypes` у
хуков.

### Мемоизация - не оптимизация, а корректность

Селектор, возвращающий новый массив или объект при каждом вызове, ломает
`useSelector`: результат сравнивается по ссылке, и компонент
перерисовывается на каждое изменение хранилища. react-redux сообщает об
этом в режиме разработки:

```
Selector wrapper returned a different result when called with the same parameters. This can lead to unnecessary rerenders.
Selectors that return a new reference (such as an object or an array) should be memoized
```

Это сообщение получила первая версия примера ниже - селектор с `filter`
внутри среза. `createSelector` пересчитывает результат только при
изменении входов и возвращает ту же ссылку в остальных случаях:

```ts
const todosSliceWithSelectors = createSlice({
  name: 'todosView',
  initialState: initialTodos,
  reducers: {},
  selectors: {
    selectVisible: createSelector(
      [(state: TodosState) => state.items, (state: TodosState) => state.filter],
      (items, filter) => items.filter((todo) => (filter === 'all' ? true : filter === 'completed' ? todo.done : !todo.done)),
    ),
  },
});

const { selectVisible } = todosSliceWithSelectors.selectors; // (state: RootState) => Todo[]
```

Поле `selectors` среза (RTK 2.0) принимает селекторы от состояния среза и
отдает их уже привязанными к корневому состоянию - срез сам знает свое
имя в хранилище.

---

## 17.5 `createAsyncThunk` и `extraReducers`

**Thunk** - функция, которую `dispatch` выполняет вместо действия; она
может быть асинхронной и сама отправлять действия. `createAsyncThunk`
оборачивает промис в три действия - `pending`, `fulfilled`, `rejected` - и
типизирует их по трем параметрам: тип результата, тип аргумента и
дополнительная конфигурация.

```ts
import { createAsyncThunk } from '@reduxjs/toolkit';

interface User {
  id: string;
  name: string;
}

type UserState = { status: 'idle' } | { status: 'loading' } | { status: 'success'; user: User } | { status: 'error'; message: string };

const fakeApi = async (id: string): Promise<User> => {
  if (id === 'missing') {
    throw new Error('user not found');
  }
  return { id, name: `User ${id}` };
};

/**
 * Загружает пользователя.
 *
 * Параметры типа: результат, аргумент, конфигурация с типом состояния для
 * getState и типом значения rejectWithValue.
 */
export const fetchUser = createAsyncThunk<User, string, { state: RootState; rejectValue: string }>(
  'user/fetch',
  async (id, { rejectWithValue, getState }) => {
    const todos = getState().todos.items.length; // getState(): RootState
    try {
      const user = await fakeApi(id);
      return { ...user, name: `${user.name} (${todos} todos)` };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'unknown'); // payload: string
    }
  },
);

const userSlice = createSlice({
  name: 'user',
  initialState: { status: 'idle' } as UserState, // расширение литерала до объединения
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchUser.pending, () => ({ status: 'loading' }))
      .addCase(fetchUser.fulfilled, (_state, action) => ({ status: 'success', user: action.payload })) // payload: User
      .addCase(fetchUser.rejected, (_state, action) => ({
        status: 'error',
        message: action.payload ?? action.error.message ?? 'unknown', // payload: string | undefined
      }));
  },
});
```

```
после fetchUser('42'):      {"status":"success","user":{"id":"42","name":"User 42 (2 todos)"}}
после fetchUser('missing'): {"status":"error","message":"user not found"}
unwrap():                   исключение с 'user not found'
```

Срез регистрируется в хранилище рядом с остальными:
`configureStore({ reducer: { todos: todosSlice.reducer, user: userSlice.reducer } })`,
и `RootState` получает поле `user: UserState`.

Состояние среза - размеченное объединение, как `AsyncState` из
[7.6](narrowing.md#76-паттерны-тип-результата-состояние-асинхронной-операции-валидация-unknown-на-границе):
`user` есть только в `success`, `message` - только в `error`. Редьюсеры в
`extraReducers` возвращают новое состояние целиком, потому что immer не
позволяет менять `status` черновика на другой член объединения с иным
набором полей.

`action.payload` в `rejected` - `string | undefined`: `string` из
`rejectWithValue`, `undefined` - если thunk бросил исключение мимо
`rejectWithValue`; тогда сообщение лежит в `action.error`. Результат
`dispatch(fetchUser(id))` - промис с итоговым действием; `.unwrap()`
превращает его в обычный промис, который отклоняется при `rejected`, -
для кода, которому нужен результат, а не действие.

Вне thunk-ов RTK предлагает RTK Query - генерацию хуков для запросов из
описания эндпоинтов; типизация там устроена по тем же принципам, что и
API-клиент из [11.5](template-literal-types.md#115-составные-примеры-типизированный-event-emitter-api-клиент-конструктор-форм).

---

## Типичные ошибки

1. **Создатель действия без `as const`.** `type` расширяется до `string`,
   объединение перестает быть размеченным, редьюсер не сужает `payload`.
2. **`as TodosState` у начального состояния.** Утверждение пропускает
   недостающие поля; для объектного состояния - аннотация, `as` - только
   для расширения литерала до объединения.
3. **Нетипизированные `useSelector` и `useDispatch`.** `state: unknown`,
   `dispatch` без thunk-ов; нужны версии из `withTypes`.
4. **Импорт `RootState` в срез.** Цикл модулей между `store.ts` и срезом;
   срез работает со своим состоянием.
5. **Селектор с `filter`/`map` без мемоизации.** Новая ссылка на каждый
   вызов, лишние перерисовки и предупреждение react-redux; `createSelector`.
6. **Смена члена объединения мутацией черновика.** Immer не даст
   переключить `status` с набором полей другого варианта; такие редьюсеры
   возвращают новое состояние.
7. **Ожидание `string` в `action.payload` у `rejected`.** Тип -
   `string | undefined`: исключение мимо `rejectWithValue` оставляет payload
   пустым, а сообщение - в `action.error`.
8. **Проверка полноты в классическом редьюсере.** Обязательный
   `default: return state` ее отключает; полнота обеспечивается либо
   срезами RTK, либо линтером.

---

[← Типизация React](react.md) · [К содержанию](../README.md) ·
[Далее: сборка и производительность →](build-and-performance.md)
