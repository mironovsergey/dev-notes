# 11 Шаблонные литеральные типы и паттерны на типах

[← К содержанию](../README.md)

Строковые литеральные типы ([1.2](type-system.md#12-примитивные-и-литеральные-типы))
описывают одну строку. **Шаблонные литеральные типы** описывают строки по
образцу: с фиксированным префиксом, с числом внутри, собранные из частей.
Вместе с `infer` они позволяют строки **разбирать** - извлекать из
`'/users/:id'` имя параметра, а из `'GET /users'` - метод и путь. Первые
четыре раздела темы - механика; пятый собирает из всего пройденного три
законченных примера, каждый из которых проверен компиляцией и запуском.

---

## 11.1 Синтаксис и комбинирование объединений

**Шаблонный литеральный тип** - тип, записанный как шаблонная строка, в
подстановках которой стоят типы: `` `Hello, ${string}!` ``. Ему принадлежат
все строки, соответствующие образцу.

```ts
type Greeting = `Hello, ${string}!`;
const valid: Greeting = 'Hello, World!';

// const invalid: Greeting = 'Hi, World!';
// Ошибка TS2322: Type '"Hi, World!"' is not assignable to type '`Hello, ${string}!`'.
```

В подстановке допустимы `string`, `number`, `bigint`, `boolean`, `null`,
`undefined`, литеральные типы и их объединения. `${number}` соответствует
строковой записи любого числа:

```ts
type CssUnit = 'px' | 'rem' | '%';
type CssLength = `${number}${CssUnit}`;

const width: CssLength = '100px';
const height: CssLength = '1.5rem';

// const noUnit: CssLength = '100';
// Ошибка TS2322: Type '"100"' is not assignable to type '`${number}px` | `${number}rem` | `${number}%`'.

type NumericString = `${number}`;
const n1: NumericString = '42';
const n2: NumericString = '-4.5';
const n3: NumericString = '1e3';
```

### Комбинирование объединений

Объединение в подстановке раскрывается в декартово произведение: каждый
член первого объединения сочетается с каждым членом второго.

```ts
type Brightness = 'light' | 'dark';
type Color = 'red' | 'green' | 'blue';
type Theme = `${Brightness}-${Color}`;
// 'light-red' | 'light-green' | 'light-blue' | 'dark-red' | 'dark-green' | 'dark-blue'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
type Path = '/users' | '/posts';
type Endpoint = `${Lowercase<HttpMethod>} ${Path}`; // 8 членов: 'get /users' | ... | 'delete /posts'

enum Status {
  Active = 'ACTIVE',
  Inactive = 'INACTIVE',
}
type StatusValue = `${Status}`; // 'ACTIVE' | 'INACTIVE'
```

Произведение растет быстро. Компилятор отказывается строить объединение
из порядка ста тысяч членов: пять подстановок по десять вариантов (10⁵) -
ошибка TS2590 `Expression produces a union type that is too complex to
represent`, четыре (10⁴) - еще нет. Это ограничение встречается в
типах, комбинирующих несколько словарей, и лечится заменой перечисления
на образец: `` `${string}-${Color}` `` вместо произведения всех имен.

### Совместимость

Тип-образец с `${string}` - подмножество `string`, но не наоборот:
литерал, подходящий под образец, присваивается; переменная типа `string` -
нет, ее содержимое неизвестно.

```ts
type Route = `/${string}`;
const route: Route = '/users';
const asString: string = route; // допустимо: Route ⊆ string

// const plain: string = 'users';
// const fromString: Route = plain;
// Ошибка TS2322: Type 'string' is not assignable to type '`/${string}`'.
```

Образец в параметре функции проверяет форму аргумента, а обобщение с
образцом в ограничении сохраняет литерал:

```ts
function setVariable(name: `--${string}`, value: string): void {
  console.log(name, value);
}
setVariable('--accent', '#f00');
// setVariable('accent', '#f00');
// Ошибка TS2345: Argument of type '"accent"' is not assignable to parameter of type '`--${string}`'.

function defineRoute<T extends `/${string}`>(path: T): T {
  return path;
}
const home = defineRoute('/home'); // '/home'
```

---

## 11.2 Встроенные строковые типы: `Uppercase`, `Lowercase`, `Capitalize`, `Uncapitalize`

Четыре типа преобразуют регистр строкового литерала. Они встроены в
компилятор (записаны в `lib.es5.d.ts` через `intrinsic`), потому что
операцию над символами нельзя выразить средствами системы типов.

| Тип | `'hello world'` → | Применение |
| --- | --- | --- |
| `Uppercase<S>` | `'HELLO WORLD'` | константы, HTTP-методы |
| `Lowercase<S>` | `'hello world'` | нормализация ключей |
| `Capitalize<S>` | `'Hello world'` | имена методов `getName`, событий `onClick` |
| `Uncapitalize<S>` | `'hello world'` | обратная операция при разборе |

Все четыре распределяются по объединению и оставляют `string` широким:

```ts
type Keys = Uppercase<'a' | 'b'>; // 'A' | 'B'
type Wide = Uppercase<string>; // Uppercase<string> - образец «строка в верхнем регистре», не string
```

Главное применение - построение имен в отображаемых типах
([11.4](#114-шаблонные-литералы-в-отображаемых-типах-геттеры-обработчики-событий)).

---

## 11.3 Разбор строк через `infer`: параметры маршрутов, ключи с точками

`infer` внутри шаблонного литерального образца
([10.5](mapped-and-conditional-types.md#105-infer-извлечение-типов-из-функций-промисов-массивов-и-кортежей))
извлекает части строки. Компилятор сопоставляет литерал с образцом слева
направо; несколько `infer` подряд делят строку в первой подходящей
позиции.

```ts
type ParseEndpoint<T> = T extends `${infer Method} ${infer Path}` ? { method: Method; path: Path } : never;
type Parsed = ParseEndpoint<'GET /users'>; // { method: 'GET'; path: '/users' }

type FirstChar<S extends string> = S extends `${infer C}${string}` ? C : never;
type H = FirstChar<'hello'>; // 'h': ведущий infer перед другим образцом берет один символ
```

Рекурсия разбирает строку целиком - в кортеж по разделителю или с
удалением пробелов:

```ts
type Split<S extends string, D extends string> = S extends `${infer Head}${D}${infer Tail}` ? [Head, ...Split<Tail, D>] : [S];
type Parts = Split<'a.b.c', '.'>; // ['a', 'b', 'c']

type Trim<S extends string> = S extends ` ${infer Rest}` ? Trim<Rest> : S extends `${infer Rest} ` ? Trim<Rest> : S;
type Clean = Trim<'  hi  '>; // 'hi'
```

### Параметры маршрута

Из образца пути извлекаются имена параметров; каждый становится ключом
объекта:

```ts
type RouteParams<T extends string> = T extends `${string}:${infer Param}/${infer Rest}`
  ? { [K in Param]: string } & RouteParams<Rest>
  : T extends `${string}:${infer Param}`
    ? { [K in Param]: string }
    : {};

type UserParams = RouteParams<'/users/:id'>; // { id: string }
type CommentParams = RouteParams<'/posts/:postId/comments/:commentId'>; // { postId: string } & { commentId: string }
type NoParams = RouteParams<'/health'>; // {}

/**
 * Подставляет параметры в образец пути.
 *
 * Тип params вычисляется из pattern: для '/users/:id' обязателен ключ id,
 * лишний или отсутствующий ключ - ошибка компиляции.
 */
function buildUrl<T extends string>(pattern: T, params: RouteParams<T>): string {
  let url: string = pattern;
  for (const [key, value] of Object.entries(params)) {
    url = url.replace(`:${key}`, String(value));
  }
  return url;
}

buildUrl('/users/:id', { id: '42' });
buildUrl('/health', {});
// buildUrl('/users/:id', { userId: '42' });
// Ошибка TS2353: Object literal may only specify known properties, and 'userId' does not exist in type '{ id: string; }'.
// buildUrl('/users/:id', {});
// Ошибка TS2741: Property 'id' is missing in type '{}' but required in type '{ id: string; }'.
```

Первая ветка обрабатывает параметр, за которым идет остаток пути; вторая -
последний параметр; третья - путь без параметров. Порядок веток важен:
образец с `/` после параметра проверяется первым, иначе `Param` захватил бы
`'postId/comments/:commentId'` целиком.

### Ключи с точками

Путь вида `'server.host'` разбирается на сегменты, и по каждому сегменту
выполняется индексный доступ - так типизируются функции `get(obj, path)`:

```ts
interface Config {
  server: { host: string; ports: number[] };
  debug: boolean;
}

type Get<T, P extends string> = P extends `${infer Head}.${infer Rest}`
  ? Head extends keyof T
    ? Get<T[Head], Rest>
    : never
  : P extends keyof T
    ? T[P]
    : never;

type Host = Get<Config, 'server.host'>; // string
type Ports = Get<Config, 'server.ports'>; // number[]
type Missing = Get<Config, 'server.missing'>; // never

type DeepPick<T, K extends string> = K extends keyof T
  ? Pick<T, K>
  : K extends `${infer P}.${infer R}`
    ? P extends keyof T
      ? { [Key in P]: DeepPick<T[P], R> }
      : never
    : never;

type OnlyHost = DeepPick<Config, 'server.host'>; // { server: { host: string } }
```

Множество всех допустимых путей объекта строит тип `Paths<T>` из
[10.6](mapped-and-conditional-types.md#106-рекурсивные-типы-и-предел-глубины);
`Get<T, Paths<T>>` в сигнатуре дает и подсказку путей, и точный тип
результата.

---

## 11.4 Шаблонные литералы в отображаемых типах: геттеры, обработчики событий

Переименование ключей через `as`
([10.2](mapped-and-conditional-types.md#102-переименование-и-фильтрация-ключей-через-as))
с шаблонным литералом - способ породить из одного типа семейство имен по
соглашению: `name` → `getName`, `onNameChange`, `setName`.

```ts
interface Person {
  name: string;
  age: number;
}

type Getters<T> = { [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K] };
type ChangeHandlers<T> = { [K in keyof T as `on${Capitalize<string & K>}Change`]: (value: T[K]) => void };

type PersonGetters = Getters<Person>; // { getName: () => string; getAge: () => number }
type PersonHandlers = ChangeHandlers<Person>; // { onNameChange: (value: string) => void; onAgeChange: (value: number) => void }

type WithSetters<T> = T & { [K in keyof T as `set${Capitalize<string & K>}`]: (value: T[K]) => void };
// keyof WithSetters<Person> = 'name' | 'age' | 'setName' | 'setAge'
```

`string & K` обязателен: `keyof T` содержит и `number | symbol`, а в
шаблонный литерал подставляются только строки
([8.1](type-operators.md#81-keyof-ключи-объектного-типа-поведение-с-индексными-сигнатурами-и-массивами)).

### Префиксы в обе стороны

Добавить префикс - шаблон в `as`; снять - `infer` в условии внутри `as`:

```ts
type Prefixed<T, P extends string> = { [K in keyof T as `${P}${string & K}`]: T[K] };
type Unprefixed<T, P extends string> = { [K in keyof T as K extends `${P}${infer Rest}` ? Rest : never]: T[K] };

type Env = { VITE_API_URL: string; VITE_DEBUG: boolean; NODE_ENV: string };
type ClientEnv = Unprefixed<Env, 'VITE_'>; // { API_URL: string; DEBUG: boolean } - NODE_ENV отброшен
type UserColumns = Prefixed<{ id: number }, 'user_'>; // { user_id: number }
```

`Unprefixed` совмещает переименование с фильтрацией: ключ без префикса
уходит в `never` и исчезает.

### Имена событий

Произведение двух объединений в имени ключа порождает все комбинации; с
`?` каждая становится необязательной:

```ts
type ElementType = 'button' | 'input';
type EventType = 'click' | 'focus';

type EventHandlers = { [K in `on${Capitalize<ElementType>}${Capitalize<EventType>}`]?: (event: Event) => void };
// { onButtonClick?: ...; onButtonFocus?: ...; onInputClick?: ...; onInputFocus?: ... }

interface Dataset {
  [attribute: `data-${string}`]: string; // индексная сигнатура по образцу
}
const dataset: Dataset = { 'data-role': 'button', 'data-id': '1' };
```

Индексная сигнатура с шаблонным ключом принимает любое имя по образцу -
это вариант для случаев, когда набор ключей не перечислить.

---

## 11.5 Составные примеры: типизированный event emitter, API-клиент, конструктор форм

Три примера собирают конструкции тем 8-11 в рабочий код. У каждого есть
свойство, ради которого он написан: ошибка в имени события, в параметрах
запроса или в типе значения поля обнаруживается компилятором в месте
вызова, а не в рантайме.

### Типизированный event emitter

Словарь «имя события - тип полезной нагрузки» задает и допустимые имена, и
тип аргумента обработчика для каждого:

```ts
type EventMap = {
  'user.login': { userId: string; at: Date };
  'user.logout': { userId: string };
  message: { from: string; text: string };
};

type Listener<T> = (payload: T) => void;

/**
 * Эмиттер событий, типизированный словарем M.
 *
 * Хранилище - отображаемый тип по ключам M: для каждого события свое
 * множество слушателей с точным типом, поэтому ни в on, ни в emit не нужны
 * утверждения типов.
 */
class TypedEmitter<M extends Record<string, unknown>> {
  private readonly listeners: { [K in keyof M]?: Set<Listener<M[K]>> } = {};

  on<K extends keyof M>(event: K, listener: Listener<M[K]>): () => void {
    const set = this.listeners[event] ?? new Set<Listener<M[K]>>();
    set.add(listener);
    this.listeners[event] = set;
    return () => set.delete(listener);
  }

  emit<K extends keyof M>(event: K, payload: M[K]): void {
    for (const listener of this.listeners[event] ?? []) {
      listener(payload);
    }
  }
}

const emitter = new TypedEmitter<EventMap>();

const off = emitter.on('user.login', (payload) => {
  console.log('login:', payload.userId, payload.at.toISOString()); // payload: { userId: string; at: Date }
});
emitter.on('message', ({ from, text }) => console.log(`${from}: ${text}`));

emitter.emit('user.login', { userId: 'u1', at: new Date('2026-01-01') });
emitter.emit('message', { from: 'Ann', text: 'hi' });
off();

// emitter.emit('user.login', { userId: 'u1' });
// Ошибка TS2741: Property 'at' is missing in type '{ userId: string; }' but required in type '{ userId: string; at: Date; }'.
// emitter.emit('user.stop', { userId: 'u1' });
// Ошибка TS2345: Argument of type '"user.stop"' is not assignable to parameter of type 'keyof EventMap'.
// emitter.on('message', (payload) => payload.userId);
// Ошибка TS2339: Property 'userId' does not exist on type '{ from: string; text: string; }'.
```

```
login: u1 2026-01-01T00:00:00.000Z
Ann: hi
```

Первая версия этого класса хранила слушателей в `Map<keyof M, Set<...>>` и
требовала два утверждения типа: `Map` не связывает тип ключа с типом
значения. Отображаемый тип в качестве хранилища связывает - и утверждения
исчезают. Это общий прием: если внутри обобщенного кода появляется `as`,
стоит проверить, не потерял ли тип хранилища связь, которую сигнатуры
методов сохраняют.

### Type-safe API-клиент

Ключ вида `'GET /users/:id'` несет метод, путь и параметры. Клиент
извлекает их шаблонными типами и вычисляет, какие опции обязательны:

```ts
interface User {
  id: string;
  name: string;
}

type Endpoints = {
  'GET /users': { response: User[]; query?: { page: number } };
  'GET /users/:id': { response: User };
  'POST /users': { response: User; body: { name: string } };
  'DELETE /users/:id': { response: void };
};

type RouteParams<T extends string> = T extends `${string}:${infer Param}/${infer Rest}`
  ? { [K in Param]: string } & RouteParams<Rest>
  : T extends `${string}:${infer Param}`
    ? { [K in Param]: string }
    : {};

type PathOf<E extends string> = E extends `${string} ${infer Path}` ? Path : never;

type RequestOptions<E extends keyof Endpoints> = ({} extends RouteParams<PathOf<E>> ? {} : { params: RouteParams<PathOf<E>> }) &
  ('body' extends keyof Endpoints[E] ? { body: Endpoints[E]['body'] } : {}) &
  ('query' extends keyof Endpoints[E] ? { query?: Endpoints[E]['query'] } : {});

// RequestOptions<'GET /users/:id'> = { params: { id: string } }
// RequestOptions<'POST /users'> = { body: { name: string } }
// RequestOptions<'GET /users'> = { query?: { page: number } }

type Send = (method: string, url: string, body?: unknown) => Promise<unknown>;

interface LooseOptions {
  params?: Record<string, string>;
  body?: unknown;
  query?: Record<string, number>;
}

/**
 * Выполняет запрос к эндпоинту, известному на этапе компиляции.
 *
 * Обобщенная сигнатура вычисляет набор опций и тип ответа из описания
 * эндпоинта; реализация работает с широким типом LooseOptions: внутри
 * функции условные типы не вычисляются, и перегрузка разделяет две задачи.
 */
async function request<E extends keyof Endpoints>(endpoint: E, options: RequestOptions<E>, send: Send): Promise<Endpoints[E]['response']>;
async function request(endpoint: string, options: LooseOptions, send: Send): Promise<unknown> {
  const [method, pattern] = endpoint.split(' ');
  let url: string = pattern;
  for (const [key, value] of Object.entries(options.params ?? {})) {
    url = url.replace(`:${key}`, encodeURIComponent(value));
  }
  const query = new URLSearchParams(Object.entries(options.query ?? {}).map(([key, value]) => [key, String(value)]));
  return send(method, query.size > 0 ? `${url}?${query}` : url, options.body);
}

const send: Send = async (method, url, body) => {
  console.log(method, url, body === undefined ? '' : JSON.stringify(body));
  return url.startsWith('/users?') ? [] : { id: '1', name: 'Ann' };
};

const users = await request('GET /users', { query: { page: 2 } }, send); // User[]
const user = await request('GET /users/:id', { params: { id: '42' } }, send); // User
const created = await request('POST /users', { body: { name: 'Bob' } }, send); // User
await request('DELETE /users/:id', { params: { id: '42' } }, send); // void

// request('GET /users/:id', {}, send);
// Ошибка TS2741: Property 'params' is missing in type '{}' but required in type '{ params: { id: string; }; }'.
// request('POST /users', { body: { title: 'x' } }, send);
// Ошибка TS2353: Object literal may only specify known properties, and 'title' does not exist in type '{ name: string; }'.
// request('PATCH /users', {}, send);
// Ошибка TS2345: Argument of type '"PATCH /users"' is not assignable to parameter of type 'keyof Endpoints'.
```

```
GET /users?page=2
GET /users/42
POST /users {"name":"Bob"}
DELETE /users/42
```

Три условия в `RequestOptions` проверяют наличие: `{} extends RouteParams<...>`
истинно только для пути без параметров, `'body' extends keyof ...` - для
эндпоинта с телом. Пересечение трех результатов - ровно те опции, которые
нужны этому эндпоинту. Перегрузка вместо единой обобщенной реализации -
следствие отложенного вычисления условных типов
([10.3](mapped-and-conditional-types.md#103-условные-типы-синтаксис-отложенное-вычисление-сужение-в-ветках)).

### Конструктор форм

Схема полей задает начальные значения и валидаторы; из нее выводятся тип
значений и набор обработчиков `on<Поле>Change`:

```ts
interface FieldSchema<T> {
  label: string;
  initial: T;
  validate?: (value: T) => string | undefined;
}

type FormSchema<V> = { [K in keyof V]: FieldSchema<V[K]> };
type FormErrors<V> = { [K in keyof V]?: string };
type FormHandlers<V> = {
  [K in keyof V as `on${Capitalize<string & K>}Change`]: (value: V[K]) => void;
};

/**
 * Хранит значения формы и раздает типизированные обработчики.
 *
 * V - объект значений; он выводится из схемы через отображаемый тип
 * FormSchema<V>. Поле remember: boolean в схеме дает values.remember: boolean
 * и handlers.onRememberChange(value: boolean).
 */
class Form<V extends Record<string, unknown>> {
  readonly values: V;
  readonly errors: FormErrors<V> = {};
  readonly handlers: FormHandlers<V>;
  private readonly schema: FormSchema<V>;

  constructor(schema: FormSchema<V>) {
    this.schema = schema;
    // Сборка объектов с вычисляемыми ключами не выражается в типах:
    // три утверждения ниже - граница, за которой компилятор бессилен.
    const values: Partial<V> = {};
    const handlers: Record<string, (value: unknown) => void> = {};
    for (const key of Object.keys(schema) as (keyof V & string)[]) {
      values[key] = schema[key].initial;
      handlers[`on${key.charAt(0).toUpperCase()}${key.slice(1)}Change`] = (value) => this.set(key, value as V[typeof key]);
    }
    this.values = values as V;
    this.handlers = handlers as FormHandlers<V>;
  }

  set<K extends keyof V>(key: K, value: V[K]): void {
    this.values[key] = value;
    const error = this.schema[key].validate?.(value);
    if (error === undefined) {
      delete this.errors[key];
    } else {
      this.errors[key] = error;
    }
  }

  isValid(): boolean {
    return Object.keys(this.errors).length === 0;
  }
}

function field<T>(label: string, initial: T, validate?: (value: T) => string | undefined): FieldSchema<T> {
  return { label, initial, validate };
}

const login = new Form({
  email: field('Email', '', (value) => (value.includes('@') ? undefined : 'Некорректный адрес')),
  password: field('Пароль', '', (value) => (value.length >= 8 ? undefined : 'Минимум 8 символов')),
  remember: field('Запомнить', false),
});
// login.values: { email: string; password: string; remember: boolean }
// login.handlers: { onEmailChange: (value: string) => void; onPasswordChange: ...; onRememberChange: (value: boolean) => void }

login.handlers.onEmailChange('ann@example.com');
login.handlers.onPasswordChange('short');
login.handlers.onRememberChange(true);
console.log(login.values, login.errors, login.isValid());

// login.handlers.onEmailChange(42);
// Ошибка TS2345: Argument of type 'number' is not assignable to parameter of type 'string'.
// login.handlers.onNameChange('x');
// Ошибка TS2339: Property 'onNameChange' does not exist on type 'FormHandlers<{ email: string; password: string; remember: boolean; }>'.
// login.set('remember', 'yes');
// Ошибка TS2345: Argument of type 'string' is not assignable to parameter of type 'boolean'.
```

```
{ email: 'ann@example.com', password: 'short', remember: true } { password: 'Минимум 8 символов' } false
```

Первая версия примера объявляла схему как `Record<string, FieldSchema<unknown>>`
и не компилировалась: `FieldSchema<string>` не присваивается
`FieldSchema<unknown>`, потому что `validate` принимает `T` - параметр
контравариантен ([5.6](functions.md#56-совместимость-функций-число-параметров-вариантность-strictfunctiontypes)).
Обобщение по типу значений `V` с выводом через отображаемый тип
`FormSchema<V>` решает это без `any`: компилятор восстанавливает `V` из
литерала схемы, сопоставляя каждое поле с `FieldSchema<V[K]>`.

---

## Типичные ошибки

1. **`string` в параметр с образцом.** `` `/${string}` `` принимает только
   литералы и значения того же типа; переменная `string` требует проверки
   или сужения.
2. **Декартово произведение больших объединений.** Пять словарей по десять
   членов - уже TS2590. Там, где перечисление не нужно, ставится образец.
3. **`keyof T` в шаблоне без `string &`.** Ключи-числа и символы в шаблон
   не подставляются.
4. **Порядок веток при разборе.** Образец «параметр, затем остаток» должен
   стоять до образца «последний параметр», иначе `infer` захватит хвост
   строки.
5. **Массив как объект при построении путей.** `Paths` и `Get` без ветки
   для массивов уходят в члены `Array`.
6. **`Map` как хранилище в обобщенном классе.** `Map<K, V>` не связывает
   конкретный ключ с типом значения; отображаемый тип `{ [K in keyof M]?: ... }`
   связывает и убирает утверждения.
7. **Единая реализация функции с условным типом результата.** Внутри
   функции условный тип не вычисляется; нужна перегрузка с широкой
   реализацией.
8. **Обобщенный интерфейс с `unknown` в ограничении для callback-ов.**
   `FieldSchema<unknown>` не принимает `FieldSchema<string>` из-за
   контравариантности параметра; обобщать нужно по типу значений, а не
   ослаблять ограничение до `any`.

---

[← Отображаемые и условные типы](mapped-and-conditional-types.md) · [К содержанию](../README.md) ·
[Далее: декораторы →](decorators.md)
