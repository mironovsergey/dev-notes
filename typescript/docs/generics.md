# 9 Обобщенные типы

[← К содержанию](../README.md)

**Обобщение** (generic) - функция, класс или тип с **параметром типа**:
местом, куда тип подставляется при каждом использовании. Обобщенная
функция - это функция над типами: она принимает тип вместе со значением и
возвращает тип вместе с результатом. Без обобщений связь между входом и
выходом либо теряется (`any`), либо переписывается вручную для каждого типа
(перегрузки). Тема заканчивается utility types - обобщениями из стандартной
библиотеки, которые встречаются в любом проекте.

---

## 9.1 Зачем нужны обобщения: потеря типа при `any`, дублирование при перегрузках

Функция, возвращающая свой аргумент, не может быть типизирована одним
конкретным типом. Два способа без обобщений - оба плохи:

```ts
function identityAny(value: any): any {
  return value;
}
const lost = identityAny('hello'); // any: тип потерян, дальше все any

function firstString(list: string[]): string | undefined;
function firstString(list: number[]): number | undefined;
function firstString(list: (string | number)[]): string | number | undefined {
  return list[0];
}
// перегрузка на каждый тип элементов; для Date[] нужна еще одна
```

`any` пропускает любой аргумент, но результат больше не связан с ним:
компилятор не знает, что `lost` - строка, и не проверит `lost.toFixed()`.
Перегрузки сохраняют связь, но только для перечисленных типов, и каждый
новый тип - новая сигнатура с тем же телом.

Обобщение выражает связь один раз, для всех типов сразу:

```ts
/**
 * Возвращает аргумент.
 *
 * Параметр типа T связывает вход и выход: тип результата - тип аргумента,
 * каким бы он ни был.
 */
function identity<T>(value: T): T {
  return value;
}

const kept = identity('hello'); // 'hello'

function first<T>(list: readonly T[]): T | undefined {
  return list[0];
}
first([new Date()]); // Date | undefined - без отдельной сигнатуры
```

`T` здесь - не конкретный тип, а обещание: «какой тип придет, такой и
вернется». Компилятор проверяет тело функции для **любого** `T` и
подставляет конкретный при каждом вызове. В рантайме параметра типа не
существует ([1.7](type-system.md#17-стирание-типов-что-остается-в-javascript)) -
это чисто проверочная конструкция.

---

## 9.2 Обобщенные функции: параметры типа, вывод аргументов типа, значения по умолчанию

**Параметр типа** объявляется в угловых скобках перед списком параметров;
**аргумент типа** - конкретный тип, подставленный при вызове. Аргументы
типа обычно не пишутся: компилятор **выводит** их из аргументов вызова:
`identity<string | number>('x')` задает аргумент типа явно,
`identity('x')` выводит его из аргумента - `'x'`.

### Что выводится

Вывод идет от аргументов к параметрам: компилятор собирает кандидаты для
каждого параметра типа и выбирает общий. Если кандидаты несовместимы -
ошибка в месте вызова, а не молчаливое расширение:

```ts
function pair<T>(left: T, right: T): [T, T] {
  return [left, right];
}

// pair(1, 'a');
// Ошибка TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.

const widened = pair<string | number>(1, 'a'); // допустимо: аргумент типа задан явно
```

Литерал-аргумент дает литеральный кандидат, и дальше действуют правила
расширения ([1.3](type-system.md#13-аннотации-и-вывод-типов-расширение-литералов)):

| Вызов | Результат | Почему |
| --- | --- | --- |
| `const a = identity('hello')` | `'hello'` | результат - сам `T`, `const` сохраняет литерал |
| `let b = identity('hello')` | `string` | `let` расширяет |
| `wrap('hello')` при `wrap<T>(v: T): { value: T }` | `{ value: string }` | `T` во вложенной изменяемой позиции |
| `identityString('hello')` при `T extends string` | `'hello'` | ограничение примитивом сохраняет литерал всегда |

Вывод работает и из ожидаемого типа результата - **контекстный** вывод:

```ts
function empty<T>(): T[] {
  return [];
}
const strings: string[] = empty(); // T = string из аннотации переменной
const unknowns = empty(); // unknown[]: подсказок нет
```

Параметры выводятся по порядку появления, и это позволяет типизировать
callback-и через предыдущие аргументы:

```ts
/**
 * Преобразует массив функцией.
 *
 * T выводится из list, затем U - из результата transform; параметр item
 * внутри callback-а уже имеет тип T без аннотации.
 */
function map<T, U>(list: readonly T[], transform: (item: T, index: number) => U): U[] {
  return list.map(transform);
}

const lengths = map(['a', 'bb'], (item) => item.length); // number[]
```

Аргументы типа задаются либо все, либо ни одного: `map<string>(...)` при
двух параметрах - ошибка TS2558 `Expected 2 type arguments, but got 1`.
Частичный вывод компилятор не поддерживает.

### Значения по умолчанию

`<T = string>` задает тип, который используется, когда аргумент не выведен
и не указан. Умолчание может ссылаться на предыдущие параметры:
`<A, B = A>`.

```ts
function createArray<T = string>(length: number, fill: T): T[] {
  return Array.from({ length }, () => fill);
}
createArray(2, 0); // number[]: выведено, умолчание не задействовано
```

### `NoInfer`

Иногда один из аргументов не должен участвовать в выводе. Машина состояний
принимает список состояний и начальное; если оба - кандидаты для `T`,
опечатка в начальном состоянии молча расширяет объединение:

```ts
function createMachineLoose<T extends string>(states: T[], initial: T): T {
  return initial;
}
createMachineLoose(['idle', 'running'], 'unknown'); // T = 'idle' | 'running' | 'unknown'

function createMachine<T extends string>(states: T[], initial: NoInfer<T>): T {
  return initial;
}
// createMachine(['idle', 'running'], 'unknown');
// Ошибка TS2345: Argument of type '"unknown"' is not assignable to parameter of type '"idle" | "running"'.
```

`NoInfer<T>` (TypeScript 5.4) исключает позицию из вывода: `T` определяется
только по `states`, а `initial` проверяется против результата.

### Правила записи

- Параметр типа, который встречается в сигнатуре один раз, не связывает
  ничего: `<T>(value: T): void` ничем не лучше `(value: unknown): void`.
  Обобщение оправдано, когда `T` появляется дважды - во входе и выходе или в
  двух входах.
- В файлах `.tsx` запись `<T>(value: T) => value` читается как JSX-тег.
  Форма с запятой `<T,>` или с ограничением `<T extends object>` снимает
  неоднозначность.
- Модификатор `const` у параметра типа сохраняет литералы без `as const` у
  вызывающего ([8.4](type-operators.md#84-as-const-литеральные-типы-readonly-на-всех-уровнях-словари-констант)).

---

## 9.3 Обобщенные интерфейсы, псевдонимы и классы

Параметр типа у интерфейса, псевдонима или класса подставляется при
использовании: `Box<number>` - конкретный тип, `Box` без аргумента - ошибка,
если нет умолчания.

```ts
interface Box<T> {
  value: T;
}
type Pair<A, B = A> = [A, B];
type Comparator<T> = (left: T, right: T) => number;

const box: Box<number> = { value: 1 };
const pair: Pair<string> = ['a', 'b']; // B = A = string
const byLength: Comparator<string> = (left, right) => left.length - right.length;

// const untyped: Box = { value: 1 };
// Ошибка TS2314: Generic type 'Box<T>' requires 1 type argument(s).
```

### Обобщенные классы

Параметр типа класса фиксируется при создании экземпляра и действует для
всех его членов; методы могут вводить собственные параметры:

```ts
class Stack<T> {
  private items: T[] = [];

  push(item: T): this {
    this.items.push(item);
    return this;
  }

  pop(): T | undefined {
    return this.items.pop();
  }

  /**
   * Возвращает новый стек с преобразованными элементами.
   *
   * U - параметр метода, независимый от T класса: стек чисел можно
   * превратить в стек строк.
   */
  map<U>(transform: (item: T) => U): Stack<U> {
    const result = new Stack<U>();
    for (const item of this.items) {
      result.push(transform(item));
    }
    return result;
  }
}

const numbers = new Stack<number>().push(1).push(2);
const labels = numbers.map((n) => `#${n}`); // Stack<string>
```

Статические члены параметра типа не видят: он относится к экземпляру
([6.3](classes.md#63-статические-члены-и-typeof-class)). Репозиторий -
типичный обобщенный класс с ограничением; он разобран в
[9.4](#94-ограничения-extends-keyof-пересечение-ограничений).

### Вариантность

Совместимость `Box<Dog>` и `Box<Animal>` компилятор определяет структурно,
подставив аргументы: она зависит от того, где в теле типа стоит `T`. В
позиции результата - ковариантно, в позиции параметра - контравариантно
([5.6](functions.md#56-совместимость-функций-число-параметров-вариантность-strictfunctiontypes)):

```ts
interface Animal {
  name: string;
}
interface Dog extends Animal {
  breed: string;
}

interface Producer<T> {
  get(): T; // T в результате
}
interface Consumer<T> {
  set: (value: T) => void; // T в параметре
}

declare const dogProducer: Producer<Dog>;
const animalProducer: Producer<Animal> = dogProducer; // допустимо: Producer<Dog> ⊆ Producer<Animal>

declare const animalConsumer: Consumer<Animal>;
const dogConsumer: Consumer<Dog> = animalConsumer; // допустимо: Consumer<Animal> ⊆ Consumer<Dog>

// const reversed: Producer<Dog> = animalProducer;
// Ошибка TS2322: Type 'Producer<Animal>' is not assignable to type 'Producer<Dog>'.
```

Тип, где `T` и читается, и записывается, инвариантен: `Box<Dog>` с
изменяемым `value` не должен быть присваиваем в `Box<Animal>`, иначе через
вторую ссылку в него запишут кота. Компилятор это правило для свойств
смягчает (свойства сравниваются ковариантно), и аккуратность здесь - на
авторе типа.

---

## 9.4 Ограничения: `extends`, `keyof`, пересечение ограничений

**Ограничение** `T extends C` - требование, чтобы аргумент типа был
присваиваем `C`. Внутри функции о `T` известно ровно то, что известно о `C`;
снаружи `T` остается точным типом аргумента.

```ts
/**
 * Возвращает более длинное из двух значений.
 *
 * Ограничение дает доступ к length внутри; тип результата T сохраняет
 * точный тип аргументов снаружи.
 */
function longest<T extends { length: number }>(left: T, right: T): T {
  return left.length >= right.length ? left : right;
}

const word = longest('hello', 'hi'); // 'hello' | 'hi'
const list = longest([1, 2, 3], [4]); // number[]

// longest(10, 20);
// Ошибка TS2345: Argument of type 'number' is not assignable to parameter of type '{ length: number; }'.
```

Разница между `T extends { length: number }` и параметром типа
`{ length: number }` - в результате: без обобщения `longest('hello', 'hi')`
вернуло бы `{ length: number }`, и строка перестала бы быть строкой.

### Ограничение - не тип

Самая поучительная ошибка обобщений: вернуть из функции значение, которое
удовлетворяет ограничению, вместо значения типа `T`:

```ts
// function longest<T extends { length: number }>(left: T, right: T): T {
//   if (left.length === 0) {
//     return { length: 0 };
//   }
// Ошибка TS2322: Type '{ length: number; }' is not assignable to type 'T'.
//   '{ length: number; }' is assignable to the constraint of type 'T', but 'T' could be instantiated with a different subtype of constraint '{ length: number; }'.
```

Компилятор прав: если `T` - `string`, вызывающий код ждет строку, а
`{ length: 0 }` - не строка. `T` - это конкретный тип, выбранный вызывающим,
и функция обязана вернуть значение именно этого типа.

### `keyof` и связанные параметры

Ограничение может ссылаться на другой параметр типа. `K extends keyof T`
связывает имя свойства с объектом, а `T[K]` дает тип этого свойства
([8.1](type-operators.md#81-keyof-ключи-объектного-типа-поведение-с-индексными-сигнатурами-и-массивами)):

```ts
function getProperty<T, K extends keyof T>(target: T, key: K): T[K] {
  return target[key];
}
```

### Пересечение ограничений

Несколько требований записываются пересечением
([4.4](object-types.md#44-пересечения-слияние-свойств-конфликт-свойств-и-never-branded-types)):

```ts
interface Entity {
  id: string;
}
interface Timestamped {
  updatedAt: Date;
}

function touch<T extends Entity & Timestamped>(entity: T): T {
  return { ...entity, updatedAt: new Date() };
}
touch({ id: 'u1', updatedAt: new Date(), name: 'Ann' }); // лишние свойства сохраняются в T
```

Обобщенный класс с ограничением - репозиторий, который знает про `id`, но
не про остальные поля сущности:

```ts
interface User extends Entity {
  name: string;
}

class Repository<T extends Entity> {
  private readonly rows = new Map<string, T>();

  save(entity: T): void {
    this.rows.set(entity.id, entity); // id гарантирован ограничением
  }

  find(id: string): T | undefined {
    return this.rows.get(id);
  }

  update(id: string, patch: Partial<Omit<T, 'id'>>): T | undefined {
    const current = this.rows.get(id);
    if (current === undefined) {
      return undefined;
    }
    const updated = { ...current, ...patch };
    this.rows.set(id, updated);
    return updated;
  }
}

const users = new Repository<User>();
users.save({ id: 'u1', name: 'Ann' });
users.find('u1'); // User | undefined

// new Repository<{ name: string }>();
// Ошибка TS2741: Property 'id' is missing in type '{ name: string; }' but required in type 'Entity'.
```

### `object` против `Record<string, unknown>`

Для ограничения «любой объект» есть два кандидата, и они не равнозначны:
`Record<string, unknown>` требует индексной сигнатуры, которой у интерфейсов
нет ([4.5](object-types.md#45-type-против-interface-расширение-слияние-деклараций-выбор)).
Значение с типом-интерфейсом в такую функцию не пройдет:

```ts
function keys<T extends object>(target: T): (keyof T)[] {
  return Object.keys(target) as (keyof T)[];
}

interface Point {
  x: number;
  y: number;
}
const point: Point = { x: 1, y: 2 };
keys(point); // допустимо

// function keysOfRecord<T extends Record<string, unknown>>(target: T): (keyof T)[] { ... }
// keysOfRecord(point);
// Ошибка TS2345: Argument of type 'Point' is not assignable to parameter of type 'Record<string, unknown>'.
//   Index signature for type 'string' is missing in type 'Point'.
```

Для «любого объекта» - `object`; `Record<string, unknown>` - для словарей
с произвольными ключами. Утверждение `as (keyof T)[]` в `keys` неизбежно:
`Object.keys` объявлен как `string[]`, потому что в рантайме у объекта
могут быть ключи, которых нет в типе.

---

## 9.5 Встроенные utility types

Стандартная библиотека содержит набор обобщенных типов для преобразования
других типов. Все они - короткие определения на отображаемых и условных
типах; их устройство разобрано в
[10.7](mapped-and-conditional-types.md#107-как-устроены-встроенные-utility-types),
здесь - что каждый делает.

```ts
interface User {
  id: string;
  name: string;
  email?: string;
  readonly createdAt: Date;
}
```

### Преобразование свойств

| Тип | Результат для `User` | Применение |
| --- | --- | --- |
| `Partial<User>` | все свойства необязательные | объект обновления, настройки с умолчаниями |
| `Required<User>` | все обязательные: `email: string` | конфигурация после слияния с умолчаниями |
| `Readonly<User>` | все `readonly` | неизменяемые данные, `Object.freeze` |
| `Pick<User, 'id' \| 'name'>` | `{ id: string; name: string }` | подмножество для списка, DTO |
| `Omit<User, 'createdAt' \| 'email'>` | `{ id: string; name: string }` | данные для создания без служебных полей |
| `Record<'a' \| 'b', number>` | `{ a: number; b: number }` | словарь с фиксированными ключами ([4.1](object-types.md#41-свойства-объекта-необязательные-readonly-индексные-сигнатуры-record)) |

Модификаторы сохраняются: `Partial<User>` оставляет `createdAt` как
`readonly`, `Readonly<User>` оставляет `email` необязательным.

### Операции над объединениями

| Тип | Пример | Результат |
| --- | --- | --- |
| `Exclude<T, U>` | `Exclude<Status, 'idle' \| 'loading'>` | `'success' \| 'error'` - члены `T`, не входящие в `U` |
| `Extract<T, U>` | `Extract<Status, 'idle' \| 'missing'>` | `'idle'` - члены `T`, входящие в `U` |
| `NonNullable<T>` | `NonNullable<string \| null \| undefined>` | `string` |

### Извлечение из функций, классов, промисов

| Тип | Пример | Результат |
| --- | --- | --- |
| `ReturnType<T>` | `ReturnType<typeof createUser>` | тип результата |
| `Parameters<T>` | `Parameters<typeof createUser>` | кортеж параметров `[name: string, age: number]` |
| `ConstructorParameters<T>` | `ConstructorParameters<typeof Point>` | `[x: number, y: number]` |
| `InstanceType<T>` | `InstanceType<typeof Point>` | `Point` ([6.6](classes.md#66-тип-экземпляра-и-тип-конструктора-ограничение-на-конструктор-миксины)) |
| `Awaited<T>` | `Awaited<Promise<Promise<number>>>` | `number` - снимает все уровни, как `await` |
| `ThisParameterType<T>`, `OmitThisParameter<T>` | | параметр `this` ([5.5](functions.md#55-типизация-this)) |
| `NoInfer<T>` | | исключение из вывода ([9.2](#92-обобщенные-функции-параметры-типа-вывод-аргументов-типа-значения-по-умолчанию)) |

`Awaited` распределяется по объединению: `Awaited<string | Promise<number>>`
дает `string | number`.

### Две ловушки `Omit`

`Pick` требует существующих ключей, `Omit` - нет: `Omit<User, 'nonexistent'>`
компилируется и возвращает `User` без изменений. Опечатка в имени
удаляемого свойства не будет замечена.

```ts
// type Picked = Pick<User, 'nonexistent'>;
// Ошибка TS2344: Type '"nonexistent"' does not satisfy the constraint 'keyof User'.

type Loose = Omit<User, 'nonexistent'>; // компилируется, равен User
```

Вторая ловушка - `Omit` от объединения. `keyof (A | B)` - только общие ключи
([8.1](type-operators.md#81-keyof-ключи-объектного-типа-поведение-с-индексными-сигнатурами-и-массивами)),
поэтому `Omit<Admin | Member, 'id'>` теряет все, что различает членов:

```ts
interface Admin {
  id: string;
  role: 'admin';
  permissions: string[];
}
interface Member {
  id: string;
  role: 'member';
  email: string;
}
type Account = Admin | Member;

type WithoutId = Omit<Account, 'id'>; // { role: 'admin' | 'member' }: permissions и email исчезли

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
type WithoutIdDistributive = DistributiveOmit<Account, 'id'>; // Omit<Admin, 'id'> | Omit<Member, 'id'>
```

`DistributiveOmit` применяет `Omit` к каждому члену по отдельности - за счет
распределения условного типа по объединению
([10.4](mapped-and-conditional-types.md#104-распределение-по-объединениям-и-его-отключение)).

---

## 9.6 Собственные utility types

Когда встроенного типа не хватает, он пишется теми же средствами:
отображаемым типом с модификаторами и, при необходимости, рекурсией. Ниже -
типы, которые встречаются в кодовых базах чаще других; техника их
построения разобрана в [10](mapped-and-conditional-types.md#10-отображаемые-и-условные-типы).

### `DeepPartial`

`Partial` действует на один уровень: `Partial<Config>['server']` - по-прежнему
полный объект. Рекурсивный вариант делает необязательным каждый уровень:

```ts
type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

interface Config {
  server: { host: string; port: number; tls: { enabled: boolean; cert: string } };
  debug: boolean;
}

const override: DeepPartial<Config> = { server: { tls: { enabled: true } } }; // допустимо
// { server: { port: '80' } } - ошибка TS2322: типы листьев проверяются
```

Применение - переопределение конфигурации и тестовые фабрики, где задается
только часть вложенной структуры.

### `Mutable` и `Nullable`

```ts
interface User {
  id: string;
  name: string;
  email?: string;
  readonly createdAt: Date;
}

type Mutable<T> = {
  -readonly [K in keyof T]: T[K]; // снимает readonly
};

type Nullable<T> = {
  [K in keyof T]: T[K] | null; // разрешает null в каждом свойстве
};

type Editable = Mutable<Readonly<User>>; // { id: string; name: string; email?: string; createdAt: Date }
type Draft = Nullable<Pick<User, 'id' | 'email'>>; // { id: string | null; email?: string | null }
```

`Mutable` нужен, когда `readonly`-тип из библиотеки нужно заполнить
пошагово; `Nullable` - для строк из базы данных, где `NULL` - штатное
значение.

### `ValueOf`

Объединение типов всех значений объекта - обратная сторона `keyof`
([8.3](type-operators.md#83-индексный-доступ-tk-и-tnumber)):

```ts
type ValueOf<T> = T[keyof T];

const STATUS = { OK: 200, NOT_FOUND: 404 } as const;
type StatusCode = ValueOf<typeof STATUS>; // 200 | 404
```

### `RequireAtLeastOne`

Объект, в котором все свойства необязательны, но хотя бы одно должно быть
задано, - параметры поиска, где нужен хотя бы один критерий:

```ts
type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Omit<T, Keys> &
  { [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>> }[Keys];

interface SearchOptions {
  id?: string;
  email?: string;
  name?: string;
}
type SearchQuery = RequireAtLeastOne<SearchOptions>;

const byId: SearchQuery = { id: '1' };
const byBoth: SearchQuery = { email: 'a@b', name: 'Ann' };
// const none: SearchQuery = {};
// Ошибка TS2322: Type '{}' is not assignable to type 'RequireAtLeastOne<SearchOptions, keyof SearchOptions>'.
```

Устройство: для каждого ключа `K` строится вариант «`K` обязателен, остальные
необязательны», а индексный доступ `[Keys]` собирает варианты в объединение.
Значение подходит, если подходит хотя бы под один вариант.

### `Prettify`

Пересечения и вложенные utility types показываются в подсказках редактора
как есть - `Pick<User, 'id'> & { extra: number }`. Тождественное
отображение разворачивает их в плоский объектный тип:

```ts
type Prettify<T> = { [K in keyof T]: T[K] } & {};

type Ugly = Pick<User, 'id'> & { extra: number };
type Pretty = Prettify<Ugly>; // { id: string; extra: number }
```

Тип не меняет ничего, кроме отображения, - и этим полезен на границах
публичных API, где читаемость подсказки важна.

---

## Типичные ошибки

1. **Параметр типа в одном месте сигнатуры.** `<T>(value: T): void` ничего
   не связывает и равен `(value: unknown): void`. Обобщение нужно, когда
   `T` встречается дважды.
2. **Возврат значения ограничения вместо `T`.** `{ length: 0 }` подходит под
   ограничение, но не под конкретный `T`, выбранный вызывающим кодом.
3. **Ожидание частичного вывода.** Аргументы типа задаются все или ни
   одного; для «вывести один, задать другой» нужны перегрузка или каррирование.
4. **Литерал вместо `T` в объединении кандидатов.** Параметр `initial: T`
   рядом со `states: T[]` расширяет `T` опечаткой; `NoInfer<T>` исключает его
   из вывода.
5. **`Record<string, unknown>` как «любой объект».** Интерфейсы не имеют
   индексной сигнатуры и не проходят; для любого объекта - `object`.
6. **`Omit` с опечаткой в ключе.** Компилируется без изменений типа; `Pick`
   такую опечатку ловит.
7. **`Omit` от размеченного объединения.** Сводит к общим ключам и теряет
   различающие свойства; нужен распределенный вариант.
8. **`Partial` там, где нужен `DeepPartial`.** Вложенные объекты остаются
   обязательными целиком.
9. **`<T>(...)` в `.tsx`.** Читается как JSX; форма `<T,>`.

---

[← Операторы над типами](type-operators.md) · [К содержанию](../README.md) ·
[Далее: отображаемые и условные типы →](mapped-and-conditional-types.md)
