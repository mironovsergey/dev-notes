# 7 Сужение типов

[← К содержанию](../README.md)

Объединение дает доступ только к общим членам
([4.3](object-types.md#43-объединения-доступ-к-общим-членам-литеральные-объединения-размеченные-объединения)),
а `unknown` - ни к каким ([1.4](type-system.md#14-any-и-unknown)). Чтобы
работать со значением, его тип нужно **сузить** - доказать компилятору, что в
этом месте кода перед ним конкретный вариант. Доказательством служит
обычный код проверки: `if`, `switch`, `typeof`, `instanceof`, вызов функции
с предикатом. Компилятор читает этот код и уточняет тип в каждой ветке.
Тема разбирает, какие проверки он понимает, как написать свою и как убедиться,
что разобраны все варианты.

---

## 7.1 Анализ потока управления: проверки, присваивания, истинность, равенство

**Сужение** (narrowing) - уточнение типа выражения в некоторой точке
программы на основании проверок и присваиваний, через которые прошло
выполнение. **Анализ потока управления** (control flow analysis) - механизм
компилятора, который отслеживает эти точки.

```ts
function describe(value: string | number | null): string {
  if (value === null) {
    return 'nothing'; // value: null
  }
  // value: string | number - ветка с null завершилась return
  if (typeof value === 'string') {
    return value.toUpperCase(); // value: string
  }
  return value.toFixed(2); // value: number
}
```

Тип сужается не только в ветках условия. Ранний `return` или `throw` в
ветке исключает вариант из всего кода после нее - поэтому проверки с ранним
выходом читаются лучше вложенных `if`.

### Присваивание

Присваивание сужает тип переменной до типа присвоенного значения. Объявленный
тип остается ограничением на то, что можно присвоить, а текущий тип - тем,
что присвоено последним:

```ts
let slot: string | number = 'text'; // объявлен string | number, сейчас string
slot.toUpperCase();
slot = 42; // сейчас number
slot.toFixed(1);
```

### Истинность

Проверка `if (value)` отсекает `null`, `undefined`, `0`, `''`, `false` и
`NaN`. Для `string | null | undefined` это ровно то, что нужно; для чисел и
строк, где `0` и `''` - допустимые значения, - ловушка, которую тип не
показывает:

```ts
function printName(name: string | null | undefined): void {
  if (name) {
    console.log(name.toUpperCase()); // name: string
  }
}

function format(value: number | undefined): string {
  if (value) {
    return value.toFixed(2); // value: number, но 0 сюда не попадет
  }
  return 'none';
}
```

```
format(3) → '3.00' | format(0) → 'none' | format(undefined) → 'none'
```

Компилятор здесь прав: в ветке `if (value)` значение действительно `number`.
Ошибка не в типах, а в логике - `0` обработан как отсутствие значения.
Для «есть ли значение» проверка записывается явно: `value !== undefined`.

### Равенство

`=== null` и `=== undefined` сужают по одному варианту; нестрогое `!= null`
отсекает оба разом и это единственное уместное применение `!=`:

```ts
function trim(text: string | null | undefined): string {
  if (text != null) {
    return text.trim(); // text: string
  }
  return '';
}
```

Сравнение двух переменных сужает обе до общего типа: если `a: string | number`
равно `b: string | boolean`, то оба - `string`.

### Границы анализа

| Что сужается | Пример |
| --- | --- |
| Переменная и параметр | `if (value === null)` |
| Свойство по пути доступа | `if (config.server?.host)` сужает `config.server.host` |
| Псевдоним условия в `const` | `const isText = typeof value === 'string'; if (isText)` |
| Деструктурированный дискриминант | `const { kind } = shape; if (kind === 'circle')` сужает `shape` |

```ts
function aliased(value: unknown): number {
  const isText = typeof value === 'string';
  if (isText) {
    return value.length; // сужение через псевдоним условия
  }
  return 0;
}
```

Сужение переменной `let` действует внутри замыкания, только если после
создания замыкания переменной ничего не присваивается. Компилятор
проверяет это по тексту функции:

```ts
function closureAfterLastAssignment(input: string | null): number {
  let value: string | null = input;
  if (value !== null) {
    return [1, 2].reduce((total) => total + value.length, 0); // value: string - присваиваний ниже нет
  }
  return 0;
}

// let value: string | null = input;
// if (value !== null) {
//   const lengths = [1, 2].map(() => value.length);
//   value = null; // присваивание после замыкания: сужение внутри него снято
// Ошибка TS18047: 'value' is possibly 'null'.
```

Замыкание может выполниться позже, когда переменная уже изменена, - поэтому
правило именно такое. Для `const` вопрос не возникает.

Чего анализ не делает: он не сбрасывает сужение свойства после вызова
функции, которая могла это свойство изменить. `if (user.name) { update(user); user.name.length }`
компилируется, хотя `update` могла обнулить `name`. Это осознанный
компромисс: иначе каждое сужение свойства пропадало бы после любого вызова.

---

## 7.2 Встроенные проверки: `typeof`, `instanceof`, `in`

### `typeof`

Сужает по тегу значения в рантайме - одному из восьми. Тег `'object'`
включает `null` ([1.2](type-system.md#12-примитивные-и-литеральные-типы)),
и компилятор это учитывает:

```ts
function handleValue(value: string | null): number {
  if (typeof value === 'object') {
    return 0; // value: null - единственный член объединения с тегом 'object'
  }
  return value.length; // value: string
}
```

Тег `'function'` сужает до вызываемых членов объединения. Если в объединении
есть `object`, он остается: объект может оказаться функцией, и результат -
`Function | (() => void)`.

### `instanceof`

Сужает до типа экземпляра класса по цепочке прототипов. Работает с
собственными классами и встроенными - `Date`, `Map`, `Error` и его
наследниками:

```ts
class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Возвращает описание ошибки по ее типу.
 *
 * Порядок проверок важен: HttpError - тоже Error, и обратный порядок
 * никогда не дошел бы до первой ветки.
 */
function report(error: unknown): string {
  if (error instanceof HttpError) {
    return `HTTP ${error.status}: ${error.message}`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
```

Ограничения `instanceof` - следствие его природы: он проверяет
происхождение, а не форму. Объект `{ x: 1, y: 2 }`, структурно совместимый с
классом `Point`, проверку не пройдет
([6.5](classes.md#65-implements-класс-как-реализация-интерфейса-структурная-совместимость));
объект из другого realm (iframe, `vm`) - тоже, у него другой `Error`. Для
массивов `value instanceof Array` и `Array.isArray(value)` дают `any[]`, и
тип элементов приходится проверять отдельно
([7.3](#73-пользовательские-предикаты-типов-value-is-t)).

### `in`

Сужает объединение по наличию свойства: остаются члены, у которых оно
объявлено, - обязательным или необязательным.

```ts
interface Admin {
  role: 'admin';
  permissions: string[];
}
interface Member {
  role: 'member';
  email: string;
}

function describeAccount(account: Admin | Member): string {
  if ('permissions' in account) {
    return `admin: ${account.permissions.length}`; // account: Admin
  }
  return `member: ${account.email}`; // account: Member
}
```

Для значения типа `object` без известных свойств `in` добавляет свойство с
типом `unknown` - так проверяется структура данных извне шаг за шагом:

```ts
function readName(value: object): string {
  if ('name' in value) {
    // value: object & Record<'name', unknown>
    if (typeof value.name === 'string') {
      return value.name;
    }
  }
  return '';
}
```

| Проверка | Что различает | Не различает |
| --- | --- | --- |
| `typeof` | примитивы, функции | объекты между собой, `null` от объекта |
| `instanceof` | классы по происхождению | структурно совместимые объекты, объекты из другого realm |
| `in` | объектные типы по наличию свойства | тип значения свойства |
| `=== литерал` | члены размеченного объединения | |

---

## 7.3 Пользовательские предикаты типов: `value is T`

**Предикат типа** - функция с возвращаемым типом `параметр is T`: она
возвращает `boolean`, а компилятор трактует `true` как доказательство того,
что аргумент имеет тип `T`, и сужает его в вызывающем коде.

```ts
function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}
```

Предикат нужен там, где проверка не выражается одной встроенной операцией
или повторяется. Второй случай важнее: без предиката `filter` не знает, что
callback отсеял `null`:

```ts
const raw = [1, null, 2, undefined, 3];

const defined = raw.filter(isDefined); // number[]
const inferred = raw.filter((value) => value !== null && value !== undefined); // number[]: предикат выведен (TS 5.5)
const withBoolean = raw.filter(Boolean); // (number | null | undefined)[]: Boolean - не предикат
```

Начиная с 5.5 компилятор выводит предикат для стрелочной функции, тело
которой - проверка параметра, поэтому явный `isDefined` нужен только ради
переиспользования. `filter(Boolean)` предикатом не считается: сигнатура
`Boolean` возвращает просто `boolean`.

### Проверка структуры

Для данных извне предикат - это ручная проверка каждого поля, собранная в
одном месте. Обобщенный предикат для массива принимает предикат элемента:

```ts
interface User {
  id: string;
  name: string;
}

function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'string' &&
    'name' in value &&
    typeof value.name === 'string'
  );
}

function isArrayOf<T>(value: unknown, isItem: (item: unknown) => item is T): value is T[] {
  return Array.isArray(value) && value.every(isItem);
}

const payload: unknown = JSON.parse('[{"id":"1","name":"Ann"}]');
if (isArrayOf(payload, isUser)) {
  const names = payload.map((user) => user.name); // string[]
}
```

### Обе ветки

Предикат сужает и в ветке `false`: оттуда исключается `T`. Для размеченного
объединения это дает остаток без проверенного члена:

```ts
interface Circle {
  kind: 'circle';
  radius: number;
}
interface Square {
  kind: 'square';
  side: number;
}
type Shape = Circle | Square;

function isCircle(shape: Shape): shape is Circle {
  return shape.kind === 'circle';
}

function area(shape: Shape): number {
  if (isCircle(shape)) {
    return Math.PI * shape.radius ** 2;
  }
  return shape.side ** 2; // shape: Square
}
```

### Цена: предикату верят на слово

Компилятор не проверяет, что тело предиката действительно доказывает `T`.
Предикат, возвращающий `true` без проверки, компилируется и подрывает все
сужения, которые на нем построены:

```ts
function isPositive(value: unknown): value is number {
  return true; // компилируется
}

const lie: unknown = 'text';
if (isPositive(lie)) {
  console.log(lie.toFixed(1)); // компилируется, TypeError в рантайме
}
```

Предикат - место, где ответственность переходит от компилятора к автору.
Его тело должно проверять **все**, что обещает тип, и проверяться тестами.

---

## 7.4 Функции-утверждения: `asserts condition`, `asserts value is T`

**Функция-утверждение** (assertion function) - функция с возвращаемым типом
`asserts condition` или `asserts параметр is T`: если она вернула управление,
компилятор считает условие истинным (или аргумент имеющим тип `T`) во всем
коде после вызова. Не вернуть управление она может только исключением.

```ts
function assert(condition: unknown, message = 'Assertion failed'): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function assertIsString(value: unknown, name = 'value'): asserts value is string {
  if (typeof value !== 'string') {
    throw new TypeError(`${name} must be a string`);
  }
}

function connect(url: string | null): string {
  assert(url !== null, 'url is required');
  return url.toUpperCase(); // url: string
}

/**
 * Возвращает переменную окружения или бросает исключение.
 *
 * После assertIsString тип value сужен до string до конца функции: это
 * замена проверке с ранним return там, где отсутствие значения - ошибка.
 */
function readEnv(name: string): string {
  const value = process.env[name];
  assertIsString(value, name);
  return value;
}
```

Разница с предикатом - в форме управления. Предикат возвращает ответ и
оставляет решение вызывающему коду; утверждение решает само: неверное
значение - исключение. Отсюда области применения:

| | Предикат `value is T` | Утверждение `asserts value is T` |
| --- | --- | --- |
| Результат | `boolean` | ничего либо исключение |
| Сужение | в ветке `if` | во всем коде после вызова |
| Когда | значение может быть любым из вариантов, и это нормально | другой вариант - ошибка программы или входных данных |
| Пример | `filter(isDefined)`, разбор объединения | инварианты, конфигурация, предусловия |

### Требование явной аннотации

Функция-утверждение должна быть объявлена так, чтобы ее тип был виден без
вывода: объявление `function` или переменная с явным типом. Стрелочная
функция в `const` без аннотации переменной не подходит - компилятор
отказывается выводить тип вызываемого, потому что должен знать об утверждении
до анализа потока:

```ts
// const assertIsString = (value: unknown): asserts value is string => { ... };
// assertIsString(input);
// Ошибка TS2775: Assertions require every name in the call target to be declared with an explicit type annotation.

const assertDefined: <T>(value: T | null | undefined) => asserts value is T = (value) => {
  if (value == null) {
    throw new Error('value is not defined');
  }
};
```

То же правило действует для функций с типом `never`
([1.5](type-system.md#15-void-и-never)) - по той же причине.

---

## 7.5 Размеченные объединения и проверка полноты через `never`

Размеченное объединение
([4.3](object-types.md#43-объединения-доступ-к-общим-членам-литеральные-объединения-размеченные-объединения))
сужается проверкой дискриминанта; `switch` по нему - каноническая форма
разбора. Вопрос, который остается, - как узнать, что разобраны **все**
члены, и как узнать об этом снова, когда в объединение добавят новый.

**Проверка полноты** (exhaustiveness check) - конструкция, которая
компилируется, только если после всех веток тип остатка - `never`
([1.5](type-system.md#15-void-и-never)).

```ts
interface Circle {
  kind: 'circle';
  radius: number;
}
interface Square {
  kind: 'square';
  side: number;
}
interface Triangle {
  kind: 'triangle';
  base: number;
  height: number;
}
type Shape = Circle | Square | Triangle;

/**
 * Фиксирует, что ветка недостижима.
 *
 * Параметр типа never принимает только остаток полностью разобранного
 * объединения; сообщение в исключении - на случай данных извне, для
 * которых типы ничего не гарантируют.
 */
function assertNever(value: never, message = `Unexpected value: ${JSON.stringify(value)}`): never {
  throw new Error(message);
}

function area(shape: Shape): number {
  switch (shape.kind) {
    case 'circle':
      return Math.PI * shape.radius ** 2;
    case 'square':
      return shape.side ** 2;
    case 'triangle':
      return (shape.base * shape.height) / 2;
    default:
      return assertNever(shape); // shape: never
  }
}
```

Три равносильных формы проверки и то, как каждая сообщает о добавленном
члене `Hexagon`:

| Форма | Ошибка при неразобранном члене |
| --- | --- |
| `default: return assertNever(shape)` | TS2345 `Argument of type 'Hexagon' is not assignable to parameter of type 'never'` |
| `default: shape satisfies never` ([8.5](type-operators.md#85-satisfies-проверка-без-расширения-типа)) | TS1360 `Type 'Hexagon' does not satisfy the expected type 'never'` |
| Функция с аннотированным результатом и `switch` без `default`, где каждая ветка делает `return` | TS2366 `Function lacks ending return statement and return type does not include 'undefined'` |

```ts
function perimeter(shape: Shape): number {
  switch (shape.kind) {
    case 'circle':
      return 2 * Math.PI * shape.radius;
    case 'square':
      return 4 * shape.side;
    case 'triangle':
      return shape.base * 3;
    default:
      shape satisfies never;
      return 0;
  }
}

function label(shape: Shape): string {
  switch (shape.kind) {
    case 'circle':
      return 'круг';
    case 'square':
      return 'квадрат';
    case 'triangle':
      return 'треугольник';
  }
  // default не нужен: компилятор видит, что все ветки возвращают значение
}
```

Третья форма - самая короткая, но работает только для функций, которые
возвращают значение из каждой ветки. `assertNever` дополнительно защищает в
рантайме: если объект с неизвестным `kind` придет из сети, функция бросит
понятную ошибку, а не вернет `undefined`.

Правило `switch-exhaustiveness-check` из typescript-eslint
([19.4](testing-and-code-quality.md#194-eslint-и-typescript-eslint-type-aware-правила-конфигурации-ключевые-правила))
требует полноты для каждого `switch` по объединению без всяких `default`.

### Другие формы

- `switch (true)` с условиями в `case` (TS 5.3) сужает по каждому условию
  как цепочка `if`:

  ```ts
  function describeNumber(value: number): string {
    switch (true) {
      case value < 0:
        return 'negative';
      case value === 0:
        return 'zero';
      default:
        return 'positive';
    }
  }
  ```

- Дискриминантом может быть и `boolean`: `{ ok: true; data } | { ok: false; error }`
  сужается проверкой `if (response.ok)`.
- Проваливание между ветками `case` с телом ловит опция
  `noFallthroughCasesInSwitch`
  ([2.6](tsconfig.md#26-дополнительные-проверки-nouncheckedindexedaccess-exactoptionalpropertytypes-noimplicitoverride-и-другие)).

---

## 7.6 Паттерны: тип результата, состояние асинхронной операции, валидация `unknown` на границе

### Тип результата

`Result<T, E>` описывает исход операции без исключений: успех с значением
либо ошибка с причиной. Вызывающий код обязан проверить `ok` - иначе ни
`value`, ни `error` недоступны. Две вспомогательные функции избавляют от
повторения литералов:

```ts
type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E };

const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

/**
 * Разбирает JSON, возвращая ошибку как значение.
 *
 * Тип ошибки сужен до SyntaxError: JSON.parse ничего другого не бросает,
 * а вызывающий код получает точный тип вместо unknown из catch.
 */
function parseJson(text: string): Result<unknown, SyntaxError> {
  try {
    return ok(JSON.parse(text));
  } catch (error) {
    return err(error instanceof SyntaxError ? error : new SyntaxError(String(error)));
  }
}

const parsed = parseJson('{"a":1}');
if (parsed.ok) {
  parsed.value; // unknown
} else {
  parsed.error; // SyntaxError
}
```

`Result<T, never>` у `ok` и `Result<never, E>` у `err` присваиваются в
`Result<T, E>` при любых `T` и `E`, потому что `never` - подмножество
любого типа. В сравнении с исключениями: тип ошибки - часть сигнатуры, ее
нельзя не заметить, но каждый вызов требует проверки. Уместно для ошибок,
которые ожидаются и обрабатываются (валидация, разбор, сеть); неуместно для
ошибок программиста, где исключение и остановка - правильный ответ
([15.4](node-express.md#154-обработка-ошибок-классы-ошибок-unknown-в-catch-error-middleware)).

### Состояние асинхронной операции

Четыре состояния загрузки - четыре члена объединения. Данные существуют
только в `success`, ошибка - только в `error`, и в `loading` невозможно
случайно отрисовать устаревшие данные:

```ts
type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };

function render(state: AsyncState<string[]>): string {
  switch (state.status) {
    case 'idle':
      return 'Нажмите, чтобы загрузить';
    case 'loading':
      return 'Загрузка...';
    case 'success':
      return state.data.join(', ');
    case 'error':
      return `Ошибка: ${state.error.message}`;
  }
}
```

Альтернатива - объект `{ loading: boolean; data?: T; error?: Error }` -
допускает `loading: true` вместе с `error` и требует проверять `data` на
`undefined` в ветке успеха: тот же «мешок необязательных свойств» из
[4.3](object-types.md#43-объединения-доступ-к-общим-членам-литеральные-объединения-размеченные-объединения).
Применение в хуках React - в
[16.5](react.md#165-пользовательские-хуки-возврат-кортежа-обобщенные-хуки-состояние-асинхронной-операции).

### Валидация на границе

Все, что приходит извне, имеет тип `unknown`, и где-то его нужно превратить в
тип приложения. Это место - **граница**: обработчик запроса, чтение файла,
ответ стороннего API. Три инструмента для нее:

| Инструмент | Форма | Когда |
| --- | --- | --- |
| Предикат `isUser` | ручная проверка полей | одна-две структуры, без зависимостей |
| Утверждение `assertUser` | ручная проверка, исключение с указанием поля | входные данные обязаны быть верными |
| Схема | описание структуры, из которого выводится и тип, и проверка | много структур, нужны сообщения об ошибках |

Ручная проверка дублирует тип: интерфейс `User` и предикат `isUser`
описывают одно и то же дважды, и при изменении одного второе легко забыть.
Схема устраняет дублирование - тип выводится из нее:

```ts
import { z } from 'zod';

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  age: z.number().int().nonnegative().optional(),
});

type User = z.infer<typeof UserSchema>; // { id: string; name: string; age?: number | undefined }

function readUser(payload: unknown): Result<User, z.ZodError> {
  const result = UserSchema.safeParse(payload);
  return result.success ? ok(result.data) : err(result.error);
}
```

```
readUser({"id":"1","name":"Ann"}) → ok: true
readUser({"id":1})                → ok: false, id: Invalid input: expected string, received number; name: Invalid input: expected string, received undefined
```

Схема - тот же предикат, но записанный один раз и порождающий тип, проверку
и сообщение об ошибке. Подробно о границе HTTP-приложения - в
[15.6](node-express.md#156-валидация-на-границе-тело-запроса-как-unknown-схемы-и-вывод-типа-из-схемы).

---

## Типичные ошибки

1. **`if (value)` для чисел и строк.** `0` и `''` уходят в ветку «нет
   значения», а тип этого не показывает. Для проверки наличия -
   `value !== undefined` или `!= null`.
2. **`typeof value === 'object'` как проверка на объект.** `null` проходит
   ее; нужна вторая проверка `value !== null`.
3. **Сужение внутри callback-а для `let`.** Если переменной присваивают
   после создания замыкания, сужение в нем снято. Промежуточный `const`
   решает вопрос всегда.
4. **`instanceof` для структурно совместимого объекта.** Проверяется
   происхождение; литерал и объект из другого realm не проходят. Для формы -
   предикат по свойствам.
5. **Предикат, который проверяет не все.** Компилятор верит сигнатуре
   `value is T`; неполная проверка в теле - дыра, которую типы не покажут.
6. **`filter(Boolean)` ради отсечения `null`.** Тип элементов не сужается;
   нужен предикат или стрелочная функция с проверкой.
7. **Функция-утверждение в `const` без аннотации.** TS2775; объявлять
   через `function` или с явным типом переменной.
8. **`switch` без проверки полноты.** Новый член объединения молча
   проходит в `default` или мимо всех веток; одна из трех форм проверки
   обязательна.
9. **Ожидание, что `assertNever` защитит от данных извне.** На типах он
   ловит только неразобранные члены; для неизвестного `kind` из сети он
   бросает исключение в рантайме - и это правильно, но это уже не проверка
   типов, а валидация.

---

[← Классы](classes.md) · [К содержанию](../README.md) ·
[Далее: операторы над типами →](type-operators.md)
