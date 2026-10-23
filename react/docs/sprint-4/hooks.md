# Типизация хуков

## 4.9 `useState`

> 📌 **`useState<S>(initial)`** - хук, тип состояния которого `S`
> выводится из начального значения; явный параметр нужен, когда начальное
> значение не описывает все будущие значения.

```tsx
const [count, setCount] = useState(0);                 // number - выведен из аргумента
const [user, setUser] = useState<User | null>(null);   // объединение задается явно: из null вывести User нельзя
const [tags, setTags] = useState<string[]>([]);        // [] сам по себе - never[]
const [status, setStatus] = useState<'idle' | 'loading'>('idle'); // без аннотации был бы string
```

| Начальное значение | Вывод без параметра | Проблема | Запись |
| --- | --- | --- | --- |
| `0`, `''`, `false` | `number`, `string`, `boolean` | Нет | Без параметра |
| `null` | `null` | Присвоить объект нельзя: `setUser({ name: 'Анна' })` дает `TS2353: … 'name' does not exist in type '(prevState: null) => null'` | `useState<User \| null>(null)` |
| `[]` | `never[]` | `setTags(['a'])` дает `TS2322: Type 'string' is not assignable to type 'never'` | `useState<string[]>([])` |
| `'idle'` | `string` | Любая строка проходит | `useState<'idle' \| 'loading'>('idle')` |
| Без аргумента | `undefined` | `S \| undefined` - каждое чтение требует проверки | `useState<number>()` только когда `undefined` - осмысленное состояние |

Setter типизирован как `Dispatch<SetStateAction<S>>`: принимает `S` или
функцию `(prev: S) => S`. Этот тип нужен, когда setter передается потомку:

```tsx
import type { Dispatch, SetStateAction } from 'react';

function NameInput({ value, setValue }: { value: string; setValue: Dispatch<SetStateAction<string>> }) {
  return <input value={value} onChange={(e) => setValue(e.target.value)} />;
}
```

✅ Чаще проще передать узкий callback `onChange: (value: string) => void` -
потомок не должен знать, что за ним стоит `useState`.

---

## 4.10 `useReducer`

> 📌 **Типизированный редьюсер** - функция `(state: S, action: A) => S`,
> где `A` - размеченное объединение действий: каждый вариант несет
> литеральный `type` и только свои поля, а `switch` по `type` сужает
> `action` до конкретного варианта.

```tsx
interface CounterState {
  count: number;
  history: number[];
}

// Размеченное объединение действий: у каждого свой набор полей
type CounterAction =
  | { type: 'increment' }
  | { type: 'add'; amount: number }
  | { type: 'reset'; to?: number };

function counterReducer(state: CounterState, action: CounterAction): CounterState {
  switch (action.type) {
    case 'increment':
      return { ...state, count: state.count + 1, history: [...state.history, state.count] };
    case 'add':
      return { ...state, count: state.count + action.amount }; // amount есть только в этой ветке
    case 'reset':
      return { count: action.to ?? 0, history: [] };
    default: {
      // Проверка полноты: если появится новый вариант действия, здесь будет ошибка компиляции
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}

function Counter() {
  const [state, dispatch] = useReducer(counterReducer, { count: 0, history: [] });
  return <button onClick={() => dispatch({ type: 'add', amount: 10 })}>{state.count}</button>;
}
```

`useReducer` выводит типы `state` и `dispatch` из сигнатуры редьюсера:
аннотации в компоненте не нужны. Что ловит компилятор:

| Ошибка | Сообщение |
| --- | --- |
| `action.amount` вне ветки `'add'` | `TS2339: Property 'amount' does not exist on type '{ type: "increment"; }'` |
| `dispatch({ type: 'multiply', by: 2 })` | `TS2322: Type '"multiply"' is not assignable to type '"increment" \| "add" \| "reset"'` |
| Новый вариант `{ type: 'multiply'; by: number }` без `case` | `TS2322: Type '{ type: "multiply"; by: number; }' is not assignable to type 'never'` |

> 📌 **Проверка полноты (exhaustiveness check)** - присваивание оставшегося
> значения переменной типа `never` в ветке `default`: если все варианты
> обработаны, тип `action` там сужен до `never` и присваивание допустимо;
> появление необработанного варианта делает его ошибкой компиляции.

Тип начального состояния проверяется по параметру `state` редьюсера; для
дорогого вычисления - третий аргумент `init`, его тип выводится так же.

---

## 4.11 `useRef`

> 📌 **`useRef<T>(initial)`** - хук, возвращающий `RefObject<T>`; для
> ссылки на DOM-узел параметр - тип элемента, аргумент - `null`, и тип
> `current` становится `T | null`.

```tsx
function SearchField() {
  const inputRef = useRef<HTMLInputElement>(null);       // RefObject<HTMLInputElement | null>
  const timerRef = useRef<number | undefined>(undefined); // изменяемое значение, не участвующее в рендере
  const renders = useRef(0);                              // RefObject<number>

  renders.current += 1;

  const focus = () => {
    inputRef.current?.focus(); // до монтирования current === null - optional chaining вместо !
  };

  useEffect(() => {
    timerRef.current = window.setTimeout(focus, 100);
    return () => window.clearTimeout(timerRef.current);
  }, []);

  return <input ref={inputRef} />;
}
```

| Назначение | Запись | Тип `current` |
| --- | --- | --- |
| DOM-узел | `useRef<HTMLInputElement>(null)` | `HTMLInputElement \| null` |
| Изменяемое значение | `useRef(0)`, `useRef<number \| undefined>(undefined)` | `number`, `number \| undefined` |
| Дескриптор `useImperativeHandle` | `useRef<VideoHandle>(null)` | `VideoHandle \| null` |

⚠️ В типах React 19 `useRef` **требует аргумент**:
`useRef<HTMLInputElement>()` дает `TS2554: Expected 1 arguments, but got 0`.
Для узла аргумент - `null`, для значения - его начальное значение.
🕰️ В типах 18 вызов без аргумента давал `MutableRefObject<T | undefined>`;
различие `RefObject`/`MutableRefObject` в 19 упразднено - остался один
`RefObject<T>` с изменяемым `current`.

`current` до монтирования - `null`, поэтому доступ - через `?.` или
проверку; ❌ `inputRef.current!.focus()` подавляет проверку, которая как раз
и нужна (обработчик может сработать после размонтирования). Тип элемента
берется по тегу: `HTMLInputElement`, `HTMLDivElement`, `HTMLFormElement`,
`SVGSVGElement`; для собственного компонента - тип его `ref`
([4.8](components.md#48-обобщенные-компоненты-и-ref)).

---

## 4.12 `useContext`

> 📌 **Типизированный контекст** - `createContext<T>(defaultValue)`,
> где `T` включает состояние «провайдера нет» (обычно `null`), а сужение до
> полезного типа выполняется один раз в собственном хуке, который бросает
> исключение при отсутствии провайдера.

```tsx
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

interface Auth {
  user: User | null;
  signIn: (name: string) => void;
  signOut: () => void;
}

// null в значении по умолчанию: контекст без провайдера - ошибка использования, а не «гость»
const AuthContext = createContext<Auth | null>(null);

function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const value = useMemo<Auth>(
    () => ({ user, signIn: (name) => setUser({ id: crypto.randomUUID(), name }), signOut: () => setUser(null) }),
    [user]
  );
  return <AuthContext value={value}>{children}</AuthContext>;
}

/** Сужение до Auth в одном месте: потребители получают тип без null и без assertion. */
function useAuth(): Auth {
  const auth = useContext(AuthContext);
  if (auth === null) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return auth;
}

function UserBadge() {
  const { user, signOut } = useAuth(); // user: User | null, signOut: () => void
  return user ? <button onClick={signOut}>{user.name}</button> : null;
}
```

Почему `null`, а не объект-заглушка `{ user: null, signIn: () => {} }`:
заглушка компилируется и молча ничего не делает, если провайдер забыт;
`null` с проверкой в `useAuth` превращает забытый провайдер в понятную
ошибку при первом рендере. Без собственного хука каждый потребитель
получал бы `Auth | null`: деструктуризация
`const { user } = useContext(AuthContext)` дает `TS2339: Property 'user'
does not exist on type 'Auth | null'`.

`createContext<T>` для примитивов выводит `T` из аргумента
(`createContext('dark')` - `Context<string>`); чтобы получить объединение
литералов, параметр задается явно: `createContext<'light' | 'dark'>('dark')`.
`useMemo<Auth>` в провайдере проверяет форму значения на месте
([2.3](../sprint-2/context-and-reducer.md#23-стоимость-контекста)).

---

## 4.13 `useMemo`, `useCallback` и пользовательские хуки

`useMemo` и `useCallback` выводят тип из функции: `useMemo(() => Math.pow(a,
b), [a, b])` - `number`, `useCallback((id: number) => …, [])` - `(id:
number) => …`. Явный параметр нужен там же, где у `useState`: результат -
объединение или пустой массив (`useMemo<Item[]>(() => [], [])`); для
`useCallback` параметром служит тип **всей функции**, а не результата.
`useEffect` не типизируется: колбэк возвращает `void` или функцию очистки, и
компилятор проверяет это сам (`async`-функция в качестве эффекта - ошибка
типов, не только предупреждение времени выполнения).

### Кортеж в результате хука

```tsx
/** Кортеж в результате: as const сохраняет порядок и типы элементов. */
function useToggle(initial = false) {
  const [on, setOn] = useState(initial);
  const toggle = useCallback(() => setOn((v) => !v), []);
  return [on, toggle] as const; // readonly [boolean, () => void], а не (boolean | (() => void))[]
}

const [open, toggle] = useToggle(); // open: boolean, toggle: () => void
```

Без `as const` массив выводится как `(boolean | (() => void))[]`, и при
деструктуризации оба элемента получают объединение. Альтернатива - вернуть
объект `{ on, toggle }`: имена вместо позиций, `as const` не нужен.

### Обобщенный хук и состояние асинхронной операции

```tsx
type Status<T> =
  | { state: 'idle' }
  | { state: 'loading' }
  | { state: 'success'; data: T }
  | { state: 'error'; error: string };

/** Обобщенный хук: T задается вызывающей стороной, тело о форме данных не знает. */
function useFetch<T>(url: string): Status<T> {
  const [status, setStatus] = useState<Status<T>>({ state: 'idle' });

  useEffect(() => {
    let ignore = false;
    setStatus({ state: 'loading' });
    fetch(url)
      .then((res) => res.json() as Promise<T>) // граница с внешним миром: единственное место, где тип назначается
      .then((data) => { if (!ignore) { setStatus({ state: 'success', data }); } })
      .catch((e: unknown) => { if (!ignore) { setStatus({ state: 'error', error: e instanceof Error ? e.message : String(e) }); } });
    return () => { ignore = true; };
  }, [url]);

  return status;
}

function Laureates() {
  const status = useFetch<User[]>('/api/laureates');

  if (status.state === 'loading') { return <p>Загрузка…</p>; }
  if (status.state === 'error') { return <p>{status.error}</p>; }       // error есть только здесь
  if (status.state === 'idle') { return null; }
  return <ul>{status.data.map((u) => <li key={u.id}>{u.name}</li>)}</ul>; // data есть только здесь
}
```

Размеченное объединение `Status<T>` вместо трех независимых полей
`data`/`loading`/`error` делает невозможными состояния «загрузка и данные
одновременно» и заставляет проверить `state` до обращения к `data`
([2.21](../sprint-2/redux-toolkit.md#221-createasyncthunk)).

`res.json()` возвращает `Promise<any>`; приведение `as Promise<T>` -
единственное место, где тип назначается без проверки, и оно отмечено
комментарием. Строгая альтернатива - валидатор (Zod и подобные), который
проверяет данные во время выполнения и выводит тип из схемы.
`catch((e: unknown) => …)` - ошибка не имеет типа, пока не сужена
`instanceof Error`.

---

## 4.14 Типизация хуков React Router

Параметры маршрута - строки из URL, и типы это отражают: каждый параметр
`string | undefined`, потому что хук не знает, в каком маршруте отрендерен
компонент и есть ли в нем такой сегмент.

```tsx
import { useParams, useSearchParams, useLoaderData, type LoaderFunctionArgs } from 'react-router';

function Country() {
  const { country } = useParams<'country' | 'personId'>(); // country: string | undefined
  const [searchParams] = useSearchParams();
  const page = Number(searchParams.get('page') ?? '1'); // get() возвращает string | null
  return <h1>{country ?? '-'} / {page}</h1>;
}
```

Присваивание `const id: string = personId` без проверки дает `TS2322: Type
'string | undefined' is not assignable to type 'string'`. Параметр типа
`useParams<'country' | 'personId'>` перечисляет ожидаемые имена -
опечатка в имени параметра становится ошибкой компиляции.

В data-режиме тип данных загрузчика выводится через `typeof`:

```tsx
interface Laureate { id: string; name: string }

async function laureateLoader({ params }: LoaderFunctionArgs) {
  const res = await fetch(`/api/laureates/${params.id}`);
  return (await res.json()) as Laureate;
}

function LaureatePage() {
  // Тип данных loader выводится через typeof
  const laureate = useLoaderData<typeof laureateLoader>(); // Laureate
  return <h1>{laureate.name}</h1>;
}
```

В framework-режиме React Router генерирует типы маршрутов автоматически
(`Route.ComponentProps`, `Route.LoaderArgs`), и параметры становятся
обязательными строками там, где сегмент обязателен.

---

[← Типизация компонентов и props](components.md) · [К содержанию спринта](README.md) ·
[Далее: типизация Redux →](redux.md)
