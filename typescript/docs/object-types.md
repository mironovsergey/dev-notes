# 4 Объектные типы, объединения и пересечения

[← К содержанию](../README.md)

Объектный тип описывает форму значения: какие свойства есть, каких типов и
можно ли их менять. Объединение и пересечение - две операции, из которых
собираются составные типы; в модели «тип - множество значений»
([1](type-system.md#1-система-типов)) это в точности
[объединение и пересечение множеств](../../mathematics/docs/sprint-1/sets.md#122-операции-и-законы-алгебры-множеств).
Тема заканчивается вопросом, который возникает в каждом проекте: `type` или
`interface`.

---

## 4.1 Свойства объекта: необязательные, `readonly`, индексные сигнатуры, `Record`

**Объектный тип** - тип, задающий множество значений по набору свойств:
значение принадлежит типу, если содержит все обязательные свойства с
совместимыми типами. Записывается литералом типа, интерфейсом или
псевдонимом:

```ts
const inline: { name: string; age: number } = { name: 'Ann', age: 30 };

interface Person {
  name: string;
  age?: number; // необязательное
  readonly id: string; // только для чтения
}

const person: Person = { name: 'Ann', id: 'u1' };
```

### Необязательные свойства

`age?: number` означает: свойства может не быть, а если есть - оно `number`.
При чтении тип свойства - `number | undefined`, и его нужно проверить
([1.6](type-system.md#16-null-и-undefined-при-strictnullchecks)).

Запись `age: number | undefined` - другой тип: свойство **обязано
присутствовать**, пусть и со значением `undefined`. Разница видна при
создании объекта:

```ts
interface WithUndefined {
  age: number | undefined;
}
const explicit: WithUndefined = { age: undefined }; // допустимо

// const omitted: WithUndefined = {};
// Ошибка TS2741: Property 'age' is missing in type '{}' but required in type 'WithUndefined'.
```

В обратную сторону, `{ age: undefined }` для типа `{ age?: number }`
допускается, если не включен `exactOptionalPropertyTypes`
([2.6](tsconfig.md#26-дополнительные-проверки-nouncheckedindexedaccess-exactoptionalpropertytypes-noimplicitoverride-и-другие)).

### `readonly`

`readonly` запрещает присваивание свойству после создания объекта. Проверка
**поверхностная**: она защищает ссылку, а не объект, на который та указывает.

```ts
// person.id = 'u2';
// Ошибка TS2540: Cannot assign to 'id' because it is a read-only property.

interface Cart {
  readonly items: string[];
}
const cart: Cart = { items: [] };
cart.items.push('book'); // допустимо: readonly относится к свойству items, а не к массиву
```

Глубокая неизменяемость записывается через `readonly string[]` для массивов
([3.1](arrays-tuples-enums.md#31-массивы-t-arrayt-readonly-массивы-вывод-типа-элементов))
и через `Readonly<T>` или рекурсивный `DeepReadonly<T>` для объектов
([9.6](generics.md#96-собственные-utility-types)).
Как и у массивов, `readonly` стирается: в рантайме объект изменяем.

### Индексные сигнатуры

**Индексная сигнатура** `[key: K]: V` описывает объект с заранее неизвестным
набором свойств: любой ключ типа `K` дает значение типа `V`. Тип ключа -
`string`, `number`, `symbol` или шаблонный литерал.

```ts
interface Counters {
  [name: string]: number;
}
const counters: Counters = { visits: 1 };
counters.errors = 0; // любой строковый ключ допустим
const missing = counters.anything; // number - хотя в рантайме undefined

interface Dataset {
  [attribute: `data-${string}`]: string; // только ключи с префиксом data-
  id: number;
}
const dataset: Dataset = { id: 1, 'data-role': 'button' };
```

Чтение по несуществующему ключу дает `V`, а не `V | undefined` - тот же
компромисс, что для массивов; его закрывает `noUncheckedIndexedAccess`.

Явные свойства обязаны соответствовать сигнатуре: если `[key: string]`
обещает `string | number`, свойство типа `boolean` под это обещание не
подходит, потому что к нему тоже можно обратиться по строковому ключу:

```ts
interface Sized {
  [key: string]: string | number;
  length: number; // допустимо: number входит в string | number
  // active: boolean;
  // Ошибка TS2411: Property 'active' of type 'boolean' is not assignable to 'string' index type 'string | number'.
}
```

### `Record`

`Record<K, V>` - встроенный [отображаемый тип](mapped-and-conditional-types.md#101-отображаемые-типы-p-in-keyof-t-гомоморфность-модификаторы-readonly-и-)
«объект с ключами `K` и значениями `V`». С ключом `string` он эквивалентен
индексной сигнатуре; с объединением литералов - объекту, в котором **каждый**
ключ обязателен:

```ts
type Scores = Record<string, number>; // то же, что { [key: string]: number }
const scores: Scores = { math: 5 };

type Flags = Record<'debug' | 'verbose', boolean>;
const flags: Flags = { debug: true, verbose: false };

// const partial: Flags = { debug: true };
// Ошибка TS2741: Property 'verbose' is missing in type '{ debug: true; }' but required in type 'Flags'.
```

Второй вариант - удобный способ потребовать значение для каждого члена
объединения: словарь подписей для всех статусов, обработчик для каждого типа
события. Если добавить член в объединение, все такие словари перестанут
компилироваться, пока в них не появится новый ключ.

### `{}`, `object` и `Object`

Три похожих типа означают разное:

| Тип | Множество значений | `42` | `null` | `{ a: 1 }` |
| --- | --- | --- | --- | --- |
| `{}` | все, кроме `null` и `undefined` | да | нет | да |
| `object` | все непримитивные значения | нет | нет | да |
| `Object` | интерфейс обертки, практически то же, что `{}` | да | нет | да |

`{}` - «что угодно, у чего можно читать свойства», и для параметра «любой
объект» он не годится: туда пройдут число и строка. Для «любого объекта»
есть `object`; для «любого значения» - `unknown`. Тип `Object` в аннотациях не
используется по той же причине, что и остальные обертки
([1.2](type-system.md#12-примитивные-и-литеральные-типы)).

---

## 4.2 Проверка избыточных свойств и свежесть объектного литерала

**Проверка избыточных свойств** (excess property check) - дополнительная
проверка, которую компилятор применяет к объектному литералу, записанному
непосредственно в месте, где ожидается известный тип: свойство, отсутствующее
в целевом типе, считается ошибкой.

По правилам структурной типизации
([1.1](type-system.md#11-структурная-типизация-и-совместимость-типов))
лишнее свойство совместимости не нарушает. Но литерал с лишним свойством
почти всегда означает опечатку в имени - и компилятор ее ловит:

```ts
interface Style {
  color?: string;
  width?: number;
}

// const typo: Style = { colour: 'red', width: 1 };
// Ошибка TS2561: Object literal may only specify known properties, but 'colour' does not exist in type 'Style'. Did you mean to write 'color'?
```

Без проверки объект `{ colour: 'red', width: 1 }` был бы корректным `Style`
с незаданным `color`, и ошибка обнаружилась бы только по отсутствию цвета
на экране.

### Свежесть

Проверка применяется только к **свежему** литералу - выражению, тип которого
еще не был присвоен ничему с явным типом. Свежесть теряется при первом же
присваивании переменной:

```ts
interface Point {
  x: number;
  y: number;
}

// const literal: Point = { x: 1, y: 2, z: 3 };
// Ошибка TS2353: Object literal may only specify known properties, and 'z' does not exist in type 'Point'.

const p3 = { x: 1, y: 2, z: 3 };
const viaVariable: Point = p3; // допустимо: p3 - не литерал, а переменная
```

| Позиция литерала | Проверка |
| --- | --- |
| Инициализатор переменной с аннотацией | да |
| Аргумент функции | да |
| `return` в функции с аннотированным результатом | да |
| Элемент массива с аннотированным типом | да |
| Литерал, присвоенный переменной без аннотации | нет: тип выводится из литерала |
| Свойства из spread `{ ...p3 }` | нет: проверяются только свойства, записанные явно |

Последняя строка означает, что `const p: Point = { ...p3 }` компилируется, а
`{ x: p3.x, y: p3.y, z: p3.z }` - нет.

### Объединения

Для целевого типа-объединения компилятор сначала выбирает член по
дискриминанту, а затем проверяет лишние свойства относительно него:

```ts
type Shape = { kind: 'circle'; radius: number } | { kind: 'square'; side: number };

// const mixed: Shape = { kind: 'circle', radius: 1, side: 2 };
// Ошибка TS2353: Object literal may only specify known properties, and 'side' does not exist in type '{ kind: "circle"; radius: number; }'.
```

### Слабые типы

Родственная проверка касается типов, у которых **все** свойства
необязательные, - «слабых». Формально им соответствует любой объект, включая
`{ host: 'localhost' }`. Компилятор требует хотя бы одно общее свойство,
причем уже не только для литералов:

```ts
interface Options {
  retries?: number;
  timeout?: number;
}

// const unrelated = { host: 'localhost' };
// const weak: Options = unrelated;
// Ошибка TS2559: Type '{ host: string; }' has no properties in common with type 'Options'.
```

### Когда лишние свойства нужны

Если объект действительно может нести дополнительные поля, это выражается в
типе индексной сигнатурой, а не обходом проверки:

```ts
interface Loose {
  x: number;
  [extra: string]: unknown;
}
const loose: Loose = { x: 1, y: 2, note: 'ok' };
```

Утверждение `as Point` проверку отключает, но вместе с ней отключает и
проверку опечаток ([8.6](type-operators.md#86-утверждения-типов-as--двойное-утверждение-через-unknown-границы-допустимого)).
`satisfies` ([8.5](type-operators.md#85-satisfies-проверка-без-расширения-типа))
проверку **сохраняет** - это одно из его назначений.

---

## 4.3 Объединения: доступ к общим членам, литеральные объединения, размеченные объединения

**Объединение** `A | B` - тип, множество значений которого есть объединение
множеств `A` и `B`: значение принадлежит `A | B`, если принадлежит хотя бы
одному из них.

Из определения следует правило доступа: у значения типа `A | B` доступны
только члены, которые есть **и в `A`, и в `B`**. Компилятор не знает, какой
из вариантов перед ним, и разрешает только то, что безопасно в обоих:

```ts
function describe(value: string | number): string {
  return value.toString(); // есть у обоих
}

// function shout(value: string | number): string {
//   return value.toUpperCase();
// Ошибка TS2339: Property 'toUpperCase' does not exist on type 'string | number'.
//   Property 'toUpperCase' does not exist on type 'number'.
```

Доступ к остальным членам открывает [сужение](narrowing.md#71-анализ-потока-управления-проверки-присваивания-истинность-равенство):
проверка `typeof value === 'string'` убирает `number` из объединения в
своей ветке.

Совместимость тоже следует из множеств. `A | B` присваивается в `T`, только
если и `A`, и `B` присваиваются в `T`; значение типа `A` присваивается в
`A | B` всегда. Объединение упрощается, когда один член - подмножество
другого:

```ts
type T1 = 'a' | string; // string: 'a' ⊆ string
type T2 = true | boolean; // boolean
type T3 = Circle | Shape; // Shape, если Circle входит в Shape
```

### Литеральные объединения

Объединение литеральных типов
([1.2](type-system.md#12-примитивные-и-литеральные-типы)) - основной способ
задать конечное множество значений: `'admin' | 'editor' | 'viewer'`,
`80 | 443`. Его сравнение с `enum` и объектом `as const` - в
[3.4](arrays-tuples-enums.md#34-enum-против-объединения-литералов-и-объекта-as-const).

### Размеченные объединения

**Размеченное объединение** (discriminated union) - объединение объектных
типов, у каждого из которых есть общее свойство с уникальным литеральным
типом - **дискриминант**. Проверка дискриминанта сужает объединение до одного
члена.

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

/**
 * Возвращает площадь фигуры.
 *
 * После проверки kind компилятор знает точный член объединения: в первой
 * ветке доступен radius, после нее - side.
 */
function area(shape: Shape): number {
  if (shape.kind === 'circle') {
    return Math.PI * shape.radius ** 2; // shape: Circle
  }
  return shape.side ** 2; // shape: Square
}
```

Ценность конструкции видна в сравнении с «мешком необязательных свойств» -
напрашивающимся способом описать те же данные одним типом:

```ts
interface ShapeBag {
  kind: 'circle' | 'square';
  radius?: number;
  side?: number;
}

function areaFromBag(shape: ShapeBag): number {
  if (shape.kind === 'circle') {
    const radius = shape.radius; // number | undefined: проверка kind ничего не дала
    return Math.PI * (radius ?? 0) ** 2;
  }
  return (shape.side ?? 0) ** 2;
}

const impossible: ShapeBag = { kind: 'circle', side: 4 }; // компилируется
```

Мешок допускает бессмысленные состояния - круг со стороной и без радиуса - и
не связывает `kind` с остальными полями: после проверки `kind` тип `radius`
не меняется, и в каждой ветке приходится обрабатывать `undefined`, которого
там не бывает. Размеченное объединение делает невозможные состояния
невыразимыми, а сужение - автоматическим.

Тот же прием описывает результат операции, которая может не удаться, - без
исключений и без `null`:

```ts
type Result<T> = { ok: true; value: T } | { ok: false; error: string };

/**
 * Разбирает номер порта из строки.
 *
 * Результат - размеченное объединение: value доступен только после проверки
 * ok, и забыть про ветку ошибки нельзя.
 */
function parsePort(text: string): Result<number> {
  const port = Number(text);
  if (Number.isInteger(port) && port > 0 && port < 65536) {
    return { ok: true, value: port };
  }
  return { ok: false, error: `Invalid port: ${text}` };
}

const parsed = parsePort('8080');
if (parsed.ok) {
  console.log(parsed.value); // number
} else {
  console.log(parsed.error); // string
}

// function unwrap(result: Result<number>): number {
//   return result.value;
// Ошибка TS2339: Property 'value' does not exist on type 'Result<number>'.
//   Property 'value' does not exist on type '{ ok: false; error: string; }'.
```

Дискриминантом может быть строковый литерал, число, `true`/`false` или
член `enum`. Полнота разбора всех членов проверяется через `never`
([7.5](narrowing.md#75-размеченные-объединения-и-проверка-полноты-через-never)),
а паттерны на основе `Result` разобраны в
[7.6](narrowing.md#76-паттерны-тип-результата-состояние-асинхронной-операции-валидация-unknown-на-границе).

---

## 4.4 Пересечения: слияние свойств, конфликт свойств и `never`, branded types

**Пересечение** `A & B` - тип, множество значений которого есть пересечение
множеств `A` и `B`: значение принадлежит `A & B`, если принадлежит обоим.

Для объектных типов это означает **слияние свойств**: чтобы быть и `A`, и
`B`, объект должен содержать все свойства обоих.

```ts
type Timestamped = { createdAt: Date; updatedAt: Date };
type Identifiable = { id: string };

type User = Timestamped & Identifiable & { name: string; email: string };

const user: User = {
  id: 'u1',
  name: 'Ann',
  email: 'ann@example.com',
  createdAt: new Date(),
  updatedAt: new Date(),
};

type Patch = Partial<User> & { id: string }; // все необязательно, кроме id
const patch: Patch = { id: 'u1', name: 'Bob' };
```

Направление интуиции здесь обратное объединению: объединение типов **сужает**
доступный набор членов (только общие), пересечение - **расширяет** (все
вместе), потому что множество значений у объединения больше, а у
пересечения меньше.

### Конфликт свойств

Если одно и то же свойство в `A` и `B` имеет несовместимые типы, его тип в
пересечении - пересечение типов, то есть `never`. Для дискриминантов
компилятор идет дальше и сводит к `never` весь объектный тип: значений с
`kind`, равным одновременно `'a'` и `'b'`, не существует.

```ts
type A = { kind: 'a'; value: string };
type B = { kind: 'b'; value: number };
type Conflict = A & B; // never

type ValueConflict = { value: string } & { value: number };
// ValueConflict['value']: never, объект создать нельзя

type P = string & number; // never
type S = string & {}; // string: {} не исключает ни одной строки
```

Пересечение с конфликтом не выдает ошибки в месте объявления - оно молча
становится пустым, и ошибка возникает при попытке создать значение:
`Type 'string' is not assignable to type 'never'`. Интерфейс с `extends` в той
же ситуации сообщает о конфликте сразу:

```ts
// interface IB extends IA {
//   kind: 'b';
// Ошибка TS2430: Interface 'IB' incorrectly extends interface 'IA'.
//   Types of property 'kind' are incompatible.
```

Это первое из различий между `type` и `interface`, к которым вернется
[4.5](#45-type-против-interface-расширение-слияние-деклараций-выбор).

### Branded types

Структурная типизация делает `UserId` и `OrderId`, объявленные как
`string`, взаимозаменяемыми
([1.1](type-system.md#11-структурная-типизация-и-совместимость-типов)).
**Branded type** - пересечение примитива с объектным типом-меткой, которого
нет ни у одного реального значения; метка различает типы для компилятора и
исчезает при стирании.

```ts
type UserId = string & { readonly __brand: 'UserId' };
type OrderId = string & { readonly __brand: 'OrderId' };

/**
 * Помечает строку как идентификатор пользователя.
 *
 * Единственное место, где допустимо утверждение типа: значение-строка не
 * имеет свойства __brand, и получить UserId иначе нельзя.
 */
function toUserId(raw: string): UserId {
  return raw as UserId;
}

function findUser(id: UserId): string {
  return `user ${id}`;
}

const userId = toUserId('u1');
findUser(userId);
const plain: string = userId; // UserId ⊆ string: обратно в строку без утверждений
console.log(userId.toUpperCase()); // методы строки на месте

// findUser('u1');
// Ошибка TS2345: Argument of type 'string' is not assignable to parameter of type 'UserId'.

// findUser(orderId);
// Ошибка TS2345: Argument of type 'OrderId' is not assignable to parameter of type 'UserId'.
//   Types of property '__brand' are incompatible.
```

`string & { __brand: 'UserId' }` - множество, в котором формально нет ни
одного значения: строки не имеют свойств `__brand`. Но компилятор не сводит
такое пересечение к `never` (в отличие от `string & number`), а работает с
ним как с подтипом `string`. Утверждение `as UserId` в конструирующей функции -
единственная точка входа, и обычно она совмещена с проверкой формата.

Вариант с `unique symbol` вместо строкового имени метки исключает случайное
совпадение имен между библиотеками и обобщается на любой примитив:

```ts
declare const brand: unique symbol;
type Brand<T, Name extends string> = T & { readonly [brand]: Name };

type Meters = Brand<number, 'Meters'>;
type Feet = Brand<number, 'Feet'>;

function meters(value: number): Meters {
  return value as Meters;
}

function add(a: Meters, b: Meters): Meters {
  return (a + b) as Meters; // арифметика возвращает number, метку нужно вернуть
}

const total = add(meters(1), meters(2));
const totalPlusOne: number = total + 1; // Meters ⊆ number
```

Цена подхода - утверждение типа после каждой операции, которая возвращает
примитив. Поэтому branded types применяют к идентификаторам и единицам
измерения, которые в основном передаются, а не вычисляются.

### Пересечение функций

Пересечение функциональных типов ведет себя как набор перегрузок: значение
типа `((v: string) => string) & ((v: number) => number)` можно вызвать с
любым из аргументов, и результат зависит от выбранной сигнатуры
([5.4](functions.md#54-перегрузки-сигнатуры-и-реализация-когда-объединение-или-обобщение-лучше)).

---

## 4.5 `type` против `interface`: расширение, слияние деклараций, выбор

**Псевдоним типа** (`type`) - имя для любого типа. **Интерфейс**
(`interface`) - объявление объектного типа с поддержкой расширения и слияния.
Для описания формы объекта они взаимозаменяемы почти всегда; различия - в
краях.

```ts
interface Animal {
  name: string;
}
interface Dog extends Animal {
  breed: string;
}

type AnimalAlias = { name: string };
type DogAlias = AnimalAlias & { breed: string };
```

### Что умеет только `type`

Псевдоним именует любой тип, интерфейс - только объектный:

```ts
type Id = string | number; // объединение
type Pair = [number, number]; // кортеж
type Nullable<T> = { [K in keyof T]: T[K] | null }; // отображаемый тип
```

Интерфейс не может расширить объединение - у того нет статически известного
набора членов:

```ts
type Circle = { kind: 'circle'; radius: number };
type Square = { kind: 'square'; side: number };
type ShapeUnion = Circle | Square;

// interface Labeled extends ShapeUnion {
// Ошибка TS2312: An interface can only extend an object type or intersection of object types with statically known members.
```

### Что умеет только `interface`

**Слияние деклараций**: два объявления интерфейса с одним именем дают один
интерфейс с объединенным набором членов. Для псевдонима это ошибка:

```ts
interface Settings {
  theme: string;
}
interface Settings {
  locale: string;
}
const settings: Settings = { theme: 'dark', locale: 'ru' };

// type Settings = { theme: string };
// type Settings = { locale: string };
// Ошибка TS2300: Duplicate identifier 'Settings'.
```

Слияние - механизм, на котором держится расширение чужих типов: добавление
поля `user` в `Request` из Express, свойства в `Window`
([14.5](declarations.md#145-расширение-модулей-и-слияние-деклараций-requestuser-в-express-defaulttheme)).
Для собственных типов в пределах проекта оно скорее источник путаницы: два
объявления в разных файлах незаметно становятся одним.

**Проверка при расширении**: `extends` сообщает о несовместимом переопределении
свойства (TS2430), тогда как `&` производит `never` без предупреждения
([4.4](#44-пересечения-слияние-свойств-конфликт-свойств-и-never-branded-types)).

### Неочевидное различие: индексная сигнатура

Объектный тип, объявленный через `type`, неявно совместим с индексной
сигнатурой; интерфейс - нет, потому что может быть расширен слиянием и его
набор свойств не считается закрытым:

```ts
type PointAlias = { x: number; y: number };
interface PointInterface {
  x: number;
  y: number;
}

const fromAlias: PointAlias = { x: 1, y: 2 };
const fromInterface: PointInterface = { x: 1, y: 2 };

const recordFromAlias: Record<string, unknown> = fromAlias; // допустимо

// const recordFromInterface: Record<string, unknown> = fromInterface;
// Ошибка TS2322: Type 'PointInterface' is not assignable to type 'Record<string, unknown>'.
//   Index signature for type 'string' is missing in type 'PointInterface'.
```

Это самая частая причина, по которой интерфейс «не подходит» туда, где
ожидается `Record<string, unknown>`: в функции сериализации, в параметры
логгера. Решения - ограничение `T extends object` вместо `Record`, либо
псевдоним для такого типа.

### Производительность проверки

Руководство по производительности TypeScript рекомендует расширение через
`interface` и `extends` вместо пересечений: интерфейс образует один плоский
объектный тип, а отношения между интерфейсами кэшируются, тогда как
пересечение сливает свойства рекурсивно и проверяется по каждому члену. На
маленьких проектах разница незаметна, на больших - измерима
([18.4](build-and-performance.md#184-ускорение-проверки-типов-skiplibcheck-границы-include-явные-типы-экспортов-interface-против-пересечений)).

### Сравнение и выбор

| | `interface` | `type` |
| --- | --- | --- |
| Объектные типы | да | да |
| Объединения, кортежи, примитивы, отображаемые и условные типы | нет | да |
| Расширение | `extends`, конфликт - ошибка | `&`, конфликт - `never` |
| Слияние деклараций | да | нет, дубликат - ошибка |
| `implements` в классе | да | да, для объектных типов ([6.5](classes.md#65-implements-класс-как-реализация-интерфейса-структурная-совместимость)) |
| Совместимость с `Record<string, unknown>` | нет | да |
| Проверка отношений | кэшируется | пересечения пересчитываются |

Рабочее правило: `interface` - для формы объектов, особенно публичных, которые
кто-то будет расширять или реализовывать; `type` - для всего, что не
объектный тип, и для типов, собранных из других операциями. Важнее выбора -
единообразие: правило `@typescript-eslint/consistent-type-definitions`
закрепляет его на уровне проекта
([19.4](testing-and-code-quality.md#194-eslint-и-typescript-eslint-type-aware-правила-конфигурации-ключевые-правила)).

---

## Типичные ошибки

1. **`age?: number` и `age: number | undefined` как одно и то же.** Первое
   разрешает опустить свойство, второе требует его присутствия. Для
   «может отсутствовать» - `?`.
2. **`readonly` как глубокая неизменяемость.** Защищена только ссылка;
   массив внутри `readonly`-свойства по-прежнему принимает `push`.
3. **Обход проверки избыточных свойств через `as`.** Утверждение отключает и
   проверку опечаток. Если лишние свойства законны, в типе нужна индексная
   сигнатура.
4. **Мешок необязательных свойств вместо размеченного объединения.**
   Допускает невозможные состояния и не сужается по проверке `kind`; каждая
   ветка вынуждена обрабатывать `undefined`, которого там нет.
5. **Пересечение с конфликтующим дискриминантом.** `A & B` с разными `kind`
   молча становится `never`; ошибка появляется далеко от причины. Для
   расширения объектных типов надежнее `interface extends`.
6. **Ожидание, что пересечение «сужает» набор членов.** У `A & B` есть все
   свойства обоих типов; сужает набор доступного объединение.
7. **Интерфейс в параметре `Record<string, unknown>`.** Интерфейс не имеет
   неявной индексной сигнатуры; нужен `object` в ограничении или псевдоним.
8. **`{}` как «любой объект».** Это «все, кроме `null` и `undefined`»,
   включая примитивы. Для объектов - `object`, для чего угодно - `unknown`.
9. **Дублирующее объявление интерфейса.** Слияние деклараций не сообщает о
   втором объявлении с тем же именем; для локальных типов это скрытая
   ошибка.

---

[← Массивы, кортежи и перечисления](arrays-tuples-enums.md) · [К содержанию](../README.md) ·
[Далее: функции →](functions.md)
