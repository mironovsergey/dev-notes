# 16 Типизация React

[← К содержанию](../README.md)

React не требует от компонентов ничего, кроме функции, возвращающей разметку,
и типизация здесь - в основном типизация props, событий и состояния
средствами, разобранными раньше: объектные типы, размеченные объединения,
обобщения, сужение. Специфика - в типах, которые поставляет `@types/react`,
и в нескольких правилах вывода, которые стоит знать заранее. Примеры
проверены на React 19.3 с `@types/react` 19.3; компоненты отрисованы через
`react-dom/server`, и вывод в тексте - из прогонов. Конфигурация - из
[2.8](tsconfig.md#28-конфигурации-для-типовых-проектов-nodejs-nestjs-react-библиотека):
`jsx: react-jsx`, `lib` с `dom`.

---

## 16.1 Компонент как функция: `React.FC` против обычной функции, `ReactNode` и `JSX.Element`

**Функциональный компонент** - функция, принимающая один аргумент (props) и
возвращающая то, что React умеет отрисовать. Тип props - обычный объектный
тип; тип результата выводится.

```tsx
import type { FC, ReactNode, ReactElement } from 'react';

interface GreetingProps {
  name: string;
}

function Greeting({ name }: GreetingProps) {
  return <p>Hello, {name}</p>; // React.JSX.Element
}

const GreetingFC: FC<GreetingProps> = ({ name }) => <p>Hello, {name}</p>;
```

Две записи равносильны: с версии 18 типов `FC` не добавляет неявного
`children`, а `defaultProps` для функциональных компонентов упразднен.
Разница осталась в двух местах:

| | Функция | `FC<P>` |
| --- | --- | --- |
| `children` | только если объявлен в props | то же |
| Обобщенный компонент | `function List<T>(props: ListProps<T>)` | невозможно: `FC` фиксирует `P` |
| Тип результата | выводится | `ReactNode \| Promise<ReactNode>` |
| Отображение в подсказках | `(props: GreetingProps) => Element` | `FC<GreetingProps>` |

Для компонентов без обобщений выбор - вопрос соглашения проекта; обобщенные
компоненты ([16.6](#166-обобщенные-компоненты-и-forwardref)) пишутся только
функциями.

### Что может вернуть компонент

Допустимый тип результата - `ReactNode`: элемент, строка, число, массив,
`null`, `undefined`, `boolean`. Компонент, возвращающий что-то другое, JSX
отвергает:

```tsx
function Plain(): string {
  return 'just text'; // допустимо
}

function Nothing(): null {
  return null;
}

function Maybe({ show }: { show: boolean }): ReactNode {
  return show ? <b>shown</b> : undefined;
}

// function Bad(): { text: string } {
//   return { text: 'object' };
// }
// <Bad />
// Ошибка TS2786: 'Bad' cannot be used as a JSX component.
//   Its type '() => { text: string; }' is not a valid JSX element type.
//     Type '() => { text: string; }' is not assignable to type '(props: any) => Promise<ReactNode> | ReactNode'.
```

### `ReactNode`, `ReactElement`, `JSX.Element`

| Тип | Что описывает | Где используется |
| --- | --- | --- |
| `ReactNode` | все, что можно отрисовать: элемент, текст, число, массив, `null`, `undefined` | `children`, результат компонента, любые «слоты» в props |
| `ReactElement` | результат JSX-выражения: объект с `type` и `props` | значение, которое точно элемент; параметр `cloneElement` |
| `React.JSX.Element` | `ReactElement<any, any>` - то же, конкретизированное для JSX | выведенный тип результата компонента |

```tsx
const element: ReactElement = <Greeting name="Ann" />;
const node: ReactNode = 'plain string';
const list: ReactNode = [1, 'two', <i key="3">three</i>];
```

В props и результатах компонентов используется `ReactNode` - он шире и
принимает все, что React отрисует. `ReactElement` нужен, когда значение
должно быть именно элементом. Глобального пространства имен `JSX` в типах
React 19 больше нет: запись `JSX.Element` дает TS2503 `Cannot find namespace
'JSX'`, а `React.JSX.Element` работает.

---

## 16.2 Props: `children`, необязательные свойства и значения по умолчанию, `ComponentProps`, размеченные объединения props

Props - объектный тип ([4.1](object-types.md#41-свойства-объекта-необязательные-readonly-индексные-сигнатуры-record)),
и на него действуют все правила: необязательные свойства, проверка
избыточных, размеченные объединения.

```tsx
import type { ComponentProps, PropsWithChildren, ReactNode } from 'react';

interface CardProps {
  title: string;
  children: ReactNode; // обязательный слот
  footer?: ReactNode; // необязательный слот
  padding?: number;
}

function Card({ title, children, footer, padding = 16 }: CardProps) {
  return (
    <article style={{ padding }}>
      <h2>{title}</h2>
      {children}
      {footer !== undefined && <footer>{footer}</footer>}
    </article>
  );
}

function Panel({ children }: PropsWithChildren<{ collapsed?: boolean }>) {
  return <div>{children}</div>;
}

// <Card title="x" />
// Ошибка TS2741: Property 'children' is missing in type '{ title: string; }' but required in type 'CardProps'.
```

Значения по умолчанию - деструктуризация с умолчанием
([5.2](functions.md#52-параметры-необязательные-значения-по-умолчанию-rest-деструктуризация)):
внутри компонента `padding` имеет тип `number`, снаружи остается
необязательным. `PropsWithChildren<P>` добавляет `children?: ReactNode` -
для компонентов, где дети допустимы, но не обязательны.

### Props нативных элементов

Компонент-обертка над `<button>` должен принимать все, что принимает кнопка.
`ComponentProps<'button'>` - тип props встроенного элемента; расширение
через `interface extends` с `Omit` для свойств, которые компонент задает
сам:

```tsx
interface ButtonProps extends Omit<ComponentProps<'button'>, 'type'> {
  variant?: 'primary' | 'ghost';
}

function Button({ variant = 'primary', className, ...rest }: ButtonProps) {
  return <button type="button" className={[variant, className].filter(Boolean).join(' ')} {...rest} />;
}

// <Button variant="danger" />
// Ошибка TS2322: Type '"danger"' is not assignable to type '"ghost" | "primary" | undefined'.
// <Button type="submit" />
// Ошибка TS2322: Property 'type' does not exist on type 'IntrinsicAttributes & ButtonProps'.
```

`ComponentProps` работает и с компонентами: `ComponentProps<typeof Card>`
дает `CardProps` без импорта типа - для оберток над чужими компонентами.

### Размеченные объединения props

Компонент, который бывает ссылкой или кнопкой, описывается объединением
([4.3](object-types.md#43-объединения-доступ-к-общим-членам-литеральные-объединения-размеченные-объединения)):
у каждого варианта свои обязательные props, а чужие запрещены через `never`:

```tsx
type ActionProps =
  | { kind: 'link'; href: string; onClick?: never }
  | { kind: 'button'; onClick: () => void; href?: never };

function Action(props: ActionProps) {
  if (props.kind === 'link') {
    return <a href={props.href}>go</a>; // props: { kind: 'link'; href: string }
  }
  return <button type="button" onClick={props.onClick}>act</button>;
}

// <Action kind="link" href="/x" onClick={() => {}} />
// Ошибка TS2322: Types of property 'onClick' are incompatible.
//   Type '() => void' is not assignable to type 'undefined'.
```

Без `never` объединение допускало бы ссылку с `onClick`: лишнее свойство
из другого варианта не отвергается структурной проверкой. `?: never` -
стандартный способ сказать «этого свойства здесь быть не должно».

---

## 16.3 События и обработчики: `MouseEvent`, `ChangeEvent`, `FormEvent`

React оборачивает события DOM в синтетические; их типы - обобщения с
параметром-элементом: `MouseEvent<HTMLButtonElement>`,
`ChangeEvent<HTMLInputElement>`, `FormEvent<HTMLFormElement>`. Параметр
определяет тип `event.currentTarget`.

```tsx
import { useState, type ChangeEvent, type FormEvent, type MouseEvent } from 'react';

function Form() {
  const [name, setName] = useState('');
  const [count, setCount] = useState(0);

  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setName(event.target.value); // target: EventTarget & HTMLInputElement
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const data = new FormData(event.currentTarget); // currentTarget: HTMLFormElement
    console.log(Object.fromEntries(data));
  };

  const handleClick = (event: MouseEvent<HTMLButtonElement>): void => {
    console.log(event.currentTarget.name, event.shiftKey); // currentTarget: EventTarget & HTMLButtonElement
    setCount((current) => current + 1);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="name" value={name} onChange={handleChange} />
      <input type="checkbox" onChange={(event) => console.log(event.target.checked)} />
      <button type="button" name="inc" onClick={handleClick} disabled={count > 3}>
        +1 ({count})
      </button>
    </form>
  );
}
```

| Событие | Тип | Типичный доступ |
| --- | --- | --- |
| Ввод в поле | `ChangeEvent<HTMLInputElement>` | `event.target.value`, `event.target.checked` |
| Отправка формы | `FormEvent<HTMLFormElement>` | `event.preventDefault()`, `new FormData(event.currentTarget)` |
| Клик | `MouseEvent<HTMLButtonElement>` | `event.currentTarget`, `event.shiftKey` |
| Клавиша | `KeyboardEvent<HTMLInputElement>` | `event.key` |
| Фокус | `FocusEvent<HTMLInputElement>` | `event.relatedTarget` |

Обработчик, записанный прямо в JSX, аннотировать не нужно - тип параметра
выводится контекстно ([1.3](type-system.md#13-аннотации-и-вывод-типов-расширение-литералов)).
Вынесенный в переменную - нужно, и здесь два правила:

- `event.target` - `EventTarget` без уточнения для большинства событий: это
  элемент, на котором событие произошло, и он может быть вложенным.
  `event.currentTarget` - элемент с обработчиком, и его тип задан
  параметром. Для `ChangeEvent` `target` уточнен до элемента, потому что
  для полей ввода это одно и то же.
- Обработчик одного типа события нельзя передать в атрибут другого:
  `onChange={handleClick}` - ошибка TS2322 с перечислением недостающих
  свойств `MouseEvent`.

```tsx
// const onClick = (event: MouseEvent<HTMLButtonElement>): void => {
//   console.log(event.target.name);
// Ошибка TS2339: Property 'name' does not exist on type 'EventTarget'.
```

---

## 16.4 Хуки: `useState`, `useReducer`, `useContext`, `useRef`

### `useState`

Тип состояния выводится из начального значения; аргумент типа нужен, когда
начальное значение не описывает тип целиком:

```tsx
import { useEffect, useState } from 'react';

interface User {
  id: string;
  name: string;
}

function StateDemo() {
  const [count, setCount] = useState(0); // number
  const [user, setUser] = useState<User | null>(null); // без аргумента типа - null
  const [tags, setTags] = useState<string[]>([]); // без аргумента типа - never[]
  const [year] = useState(() => new Date().getFullYear()); // ленивая инициализация: number

  useEffect(() => {
    setCount((current) => current + 1); // функциональное обновление: current: number
    setUser({ id: '1', name: 'Ann' });
    setTags((current) => [...current, 'new']);
    return () => console.log('cleanup'); // тип cleanup проверяется
  }, []);

  return <p>{count} {user?.name ?? 'anonymous'} {tags.length} {year}</p>;
}

// const [tags, setTags] = useState([]);
// setTags(['x']);
// Ошибка TS2322: Type 'string' is not assignable to type 'never'.
// const [user, setUser] = useState(null);
// setUser({ id: '1' });
// Ошибка TS2353: Object literal may only specify known properties, and 'id' does not exist in type '(prevState: null) => null'.
```

Пустой массив выводится как `never[]` ([3.1](arrays-tuples-enums.md#31-массивы-t-arrayt-readonly-массивы-вывод-типа-элементов)),
`null` - как `null`: состояние, которое начинается пустым, объявляется с
аргументом типа.

### `useReducer`

Действия - размеченное объединение, редьюсер - `switch` с проверкой
полноты ([7.5](narrowing.md#75-размеченные-объединения-и-проверка-полноты-через-never)).
Тип `dispatch` выводится из редьюсера, и действие с неизвестным `type`
отвергается:

```tsx
import { useReducer } from 'react';

interface CartItem {
  id: string;
  quantity: number;
}

type CartAction =
  | { type: 'add'; item: CartItem }
  | { type: 'remove'; id: string }
  | { type: 'clear' };

function cartReducer(state: CartItem[], action: CartAction): CartItem[] {
  switch (action.type) {
    case 'add':
      return [...state.filter((item) => item.id !== action.item.id), action.item];
    case 'remove':
      return state.filter((item) => item.id !== action.id);
    case 'clear':
      return [];
    default:
      return action satisfies never; // never присваивается в CartItem[]
  }
}

function Cart() {
  const [items, dispatch] = useReducer(cartReducer, []);
  return (
    <button type="button" onClick={() => dispatch({ type: 'add', item: { id: 'a', quantity: 1 } })}>
      {items.length}
    </button>
  );
}

// dispatch({ type: 'remove', id: 'x' }) при объединении без 'remove':
// Ошибка TS2322: Type '"remove"' is not assignable to type '"add" | "clear"'.
```

`return action satisfies never` в `default` - проверка полноты и
одновременно допустимый `return`: `never` присваивается любому типу.
Подробно о действиях и редьюсерах - в [17.1](redux.md#171-действия-как-размеченные-объединения-редьюсеры-с-проверкой-полноты).

### `useContext`

Контекст создается со значением по умолчанию, и честное умолчание для
контекста, который обязан быть предоставлен, - `undefined`. Проверка
выносится в хук, а компоненты получают тип без `undefined`:

```tsx
import { createContext, useContext, useState, type ReactNode } from 'react';

interface Theme {
  mode: 'light' | 'dark';
  toggle: () => void;
}

const ThemeContext = createContext<Theme | undefined>(undefined);

/**
 * Возвращает тему из контекста или бросает исключение вне провайдера.
 *
 * Проверка в хуке заменяет проверку на undefined в каждом потребителе.
 */
function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (theme === undefined) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return theme;
}

function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Theme['mode']>('light');
  return <ThemeContext value={{ mode, toggle: () => setMode((m) => (m === 'light' ? 'dark' : 'light')) }}>{children}</ThemeContext>;
}

function ThemedLabel() {
  const { mode } = useTheme(); // Theme, без проверки
  return <span>{mode}</span>;
}

// const theme = useContext(ThemeContext);
// theme.mode;
// Ошибка TS18048: 'theme' is possibly 'undefined'.
```

В React 19 сам контекст используется как провайдер: `<ThemeContext value>`
вместо `<ThemeContext.Provider value>`.

### `useRef`

Два назначения - ссылка на DOM-элемент и изменяемое значение, живущее
между рендерами. В React 19 `useRef` требует аргумент всегда, а
результат - `RefObject<T>`:

```tsx
import { useEffect, useRef } from 'react';

function RefDemo() {
  const inputRef = useRef<HTMLInputElement>(null); // RefObject<HTMLInputElement | null>
  const renders = useRef(0); // RefObject<number>, current изменяем
  renders.current += 1;

  useEffect(() => {
    inputRef.current?.focus(); // current: HTMLInputElement | null
  }, []);

  return <input ref={inputRef} data-renders={renders.current} />;
}

// const ref = useRef<HTMLInputElement>();
// Ошибка TS2554: Expected 1 arguments, but got 0.
```

`current` у ссылки на элемент - `null` до монтирования и после
размонтирования, и это отражено в типе.

---

## 16.5 Пользовательские хуки: возврат кортежа, обобщенные хуки, состояние асинхронной операции

**Пользовательский хук** - функция с префиксом `use`, вызывающая другие
хуки. С точки зрения типов это обычная функция: параметры, результат,
обобщения - все по правилам [5](functions.md#5-функции) и [9](generics.md#9-обобщенные-типы).

### Кортеж в результате

Хук в стиле `useState` возвращает пару «значение - функция». Литерал
массива выводится как массив ([3.2](arrays-tuples-enums.md#32-кортежи-фиксированная-длина-необязательные-и-rest-элементы-именованные-элементы)),
и без `as const` оба элемента получают тип `boolean | (() => void)`:

```tsx
import { useCallback, useState } from 'react';

function useToggle(initial = false) {
  const [on, setOn] = useState(initial);
  const toggle = useCallback(() => setOn((current) => !current), []);
  return [on, toggle] as const; // readonly [boolean, () => void]
}

// function useToggleArray(initial = false) {
//   ...
//   return [on, toggle]; // (boolean | (() => void))[]
// }
// const [on, toggle] = useToggleArray();
// toggle();
// Ошибка TS2349: This expression is not callable.
//   Not all constituents of type 'boolean | (() => void)' are callable.
```

Объект в результате (`{ on, toggle }`) от этой проблемы свободен и лучше
читается при трех и более значениях; кортеж уместен для пары, которую
вызывающий код хочет переименовать.

### Обобщенные хуки

```tsx
/**
 * Хранит значение в localStorage и синхронизирует его с состоянием.
 *
 * T выводится из initial; функция обновления принимает значение или
 * функцию от предыдущего значения, как setState.
 */
function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    const stored = localStorage.getItem(key);
    return stored === null ? initial : (JSON.parse(stored) as T);
  });
  const update = useCallback(
    (next: T | ((previous: T) => T)) => {
      setValue((previous) => {
        const resolved = typeof next === 'function' ? (next as (previous: T) => T)(previous) : next;
        localStorage.setItem(key, JSON.stringify(resolved));
        return resolved;
      });
    },
    [key],
  );
  return [value, update] as const;
}

const [count, setCount] = useLocalStorage('count', 0); // count: number
```

Два утверждения типа в хуке - границы: `JSON.parse` возвращает `any`, и
хук верит, что в хранилище лежит `T` (честнее - схема,
[7.6](narrowing.md#76-паттерны-тип-результата-состояние-асинхронной-операции-валидация-unknown-на-границе));
проверка `typeof next === 'function'` не сужает `T | ((previous: T) => T)`
до функции, потому что сам `T` может быть функцией.

### Состояние асинхронной операции

Тип `AsyncState<T>` из [7.6](narrowing.md#76-паттерны-тип-результата-состояние-асинхронной-операции-валидация-unknown-на-границе)
в хуке: четыре состояния, данные только в `success`, ошибка только в
`error`, и компонент разбирает их `switch`-ом:

```tsx
type AsyncState<T> = { status: 'idle' } | { status: 'loading' } | { status: 'success'; data: T } | { status: 'error'; error: Error };

function useAsync<T>(load: () => Promise<T>) {
  const [state, setState] = useState<AsyncState<T>>({ status: 'idle' });
  const run = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      setState({ status: 'success', data: await load() });
    } catch (error) {
      setState({ status: 'error', error: error instanceof Error ? error : new Error(String(error)) });
    }
  }, [load]);
  return { state, run };
}

interface Profile {
  name: string;
}

function ProfileView() {
  const { state, run } = useAsync<Profile>(() => Promise.resolve({ name: 'Ann' }));
  switch (state.status) {
    case 'idle':
      return <button type="button" onClick={() => void run()}>load</button>;
    case 'loading':
      return <p>loading</p>;
    case 'success':
      return <p>{state.data.name}</p>; // data: Profile
    case 'error':
      return <p>{state.error.message}</p>;
  }
}
```

`void run()` - явное указание, что промис не ожидается: обработчик
`onClick` должен возвращать `void`, а правило `no-floating-promises`
([19.4](testing-and-code-quality.md#194-eslint-и-typescript-eslint-type-aware-правила-конфигурации-ключевые-правила))
без `void` сообщило бы о забытом промисе.

---

## 16.6 Обобщенные компоненты и `forwardRef`

### Обобщенные компоненты

Компонент списка не должен знать тип элементов: он получает массив и
функции для ключа и отрисовки, а связь между ними выражает параметр типа:

```tsx
import type { ReactNode } from 'react';

interface ListProps<T> {
  items: readonly T[];
  keyOf: (item: T) => string;
  render: (item: T) => ReactNode;
  empty?: ReactNode;
}

function List<T>({ items, keyOf, render, empty = 'nothing' }: ListProps<T>) {
  if (items.length === 0) {
    return <p>{empty}</p>;
  }
  return <ul>{items.map((item) => <li key={keyOf(item)}>{render(item)}</li>)}</ul>;
}

const users = [{ id: 'u1', name: 'Ann' }, { id: 'u2', name: 'Bob' }];
const list = (
  <>
    <List items={users} keyOf={(user) => user.id} render={(user) => <b>{user.name}</b>} />
    <List items={[] as number[]} keyOf={String} render={(n) => n * 2} empty={<i>no numbers</i>} />
  </>
);

// <List items={[1, 2]} render={(item) => item.toUpperCase()} ... />
// Ошибка TS2339: Property 'toUpperCase' does not exist on type 'number'.
```

```
<ul><li><b>Ann</b></li><li><b>Bob</b></li></ul><p><i>no numbers</i></p>
```

`T` выводится из `items`, и параметры `keyOf` и `render` получают тип
элемента без аннотаций ([9.2](generics.md#92-обобщенные-функции-параметры-типа-вывод-аргументов-типа-значения-по-умолчанию)).
Это причина, по которой обобщенные компоненты пишутся функциями, а не
`FC` ([16.1](#161-компонент-как-функция-reactfc-против-обычной-функции-reactnode-и-jsxelement)).

### `ref` как prop

В React 19 `ref` - обычный prop функционального компонента: объявляется в
props с типом `Ref<Element>` и передается дальше:

```tsx
import { useRef, type ComponentProps, type Ref } from 'react';

interface TextInputProps extends ComponentProps<'input'> {
  label: string;
  ref?: Ref<HTMLInputElement>;
}

function TextInput({ label, ref, ...rest }: TextInputProps) {
  return (
    <label>
      {label}
      <input ref={ref} {...rest} />
    </label>
  );
}

function Page() {
  const inputRef = useRef<HTMLInputElement>(null);
  return <TextInput label="Name" ref={inputRef} placeholder="Ann" />;
}
```

### `forwardRef` и императивный дескриптор

До React 19 `ref` в props не попадал, и компонент оборачивался в
`forwardRef`; в 19 он объявлен устаревшим, но продолжает работать - в
существующем коде он останется надолго. Второй сценарий, где он встречается, -
`useImperativeHandle`: компонент отдает наружу не DOM-элемент, а объект с
методами:

```tsx
import { forwardRef, useImperativeHandle, useRef, useState, type ComponentRef } from 'react';

interface CounterHandle {
  reset: () => void;
}

const LegacyCounter = forwardRef<CounterHandle, { start: number }>(function LegacyCounter({ start }, ref) {
  const [value, setValue] = useState(start);
  useImperativeHandle(ref, () => ({ reset: () => setValue(start) }), [start]);
  return <output>{value}</output>;
});

function Controls() {
  const counterRef = useRef<ComponentRef<typeof LegacyCounter>>(null); // RefObject<CounterHandle | null>
  return (
    <>
      <LegacyCounter ref={counterRef} start={5} />
      <button type="button" onClick={() => counterRef.current?.reset()}>reset</button>
    </>
  );
}
```

`forwardRef<Handle, Props>` принимает сначала тип дескриптора, потом props -
в порядке, обратном параметрам функции. `ComponentRef<typeof Component>`
достает тип дескриптора из компонента, чтобы не импортировать
`CounterHandle` отдельно. В новом коде на React 19 тот же результат дает
`ref?: Ref<CounterHandle>` в props и `useImperativeHandle` внутри обычной
функции.

---

## Типичные ошибки

1. **`JSX.Element` в типах React 19.** Глобального `JSX` нет (TS2503);
   тип результата - `React.JSX.Element` или, шире, `ReactNode`.
2. **`children` через `FC`.** Неявного `children` нет с версии 18;
   слот объявляется в props явно или через `PropsWithChildren`.
3. **`useState([])` и `useState(null)`.** Выводятся `never[]` и `null`;
   состояние с пустым началом объявляется с аргументом типа.
4. **`useRef<T>()` без аргумента.** В React 19 - ошибка TS2554; ссылка на
   элемент создается как `useRef<T>(null)`.
5. **`event.target` вместо `event.currentTarget`.** `target` - `EventTarget`
   без свойств элемента; типизирован `currentTarget`.
6. **Кортеж из хука без `as const`.** Оба элемента получают объединение
   типов, и функцию нельзя вызвать.
7. **Объединение props без `never`.** Свойство из другого варианта
   проходит структурную проверку; `?: never` закрывает его.
8. **`useContext` без защиты от умолчания.** Умолчание `undefined` течет во
   все компоненты; проверка выносится в хук.
9. **Обобщенный компонент через `FC`.** `FC<P>` фиксирует `P`; обобщение -
   только функцией.

---

[← Типизация Node.js и Express](node-express.md) · [К содержанию](../README.md) ·
[Далее: типизация Redux →](redux.md)
