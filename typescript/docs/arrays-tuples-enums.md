# 3 Массивы, кортежи и перечисления

[← К содержанию](../README.md)

Три конструкции темы объединяет одно: каждая описывает **набор** значений -
однородный (массив), позиционный (кортеж) или конечный именованный
(перечисление). Массив и кортеж существуют в JavaScript как один и тот же
объект `Array`, и различие между ними целиком на стороне типов. Перечисление -
единственная из трех, у которой есть собственное представление в рантайме, и
именно это делает его спорным.

---

## 3.1 Массивы: `T[]`, `Array<T>`, `readonly`-массивы, вывод типа элементов

**Тип массива** `T[]` - тип объекта `Array`, все элементы которого имеют тип
`T`. Запись `Array<T>` - тот же тип, выраженный через обобщенный интерфейс
из `lib.d.ts`; обе формы взаимозаменяемы.

```ts
const numbers: number[] = [1, 2, 3];
const strings: Array<string> = ['a', 'b'];
const grid: number[][] = [
  [1, 2],
  [3, 4],
];
```

Разница только в чтении: `T[]` короче, `Array<T>` не требует скобок вокруг
объединения. Запись `string | number[]` означает «строка либо массив чисел»,
а не «массив строк и чисел» - для второго нужны скобки:

```ts
// const wrongUnion: string | number[] = ['a'];
// Ошибка TS2322: Type 'string[]' is not assignable to type 'string | number[]'.

const mixed: (string | number)[] = ['a', 1];
const same: Array<string | number> = mixed;
```

### Вывод типа элементов

Тип элементов выводится из литерала как объединение типов всех элементов с
[расширением](type-system.md#13-аннотации-и-вывод-типов-расширение-литералов)
литералов до примитивов. Если среди элементов есть общий супертип, компилятор
берет его:

| Литерал | Выведенный тип |
| --- | --- |
| `[1, 2, 3]` | `number[]` |
| `[1, 'a']` | `(string \| number)[]` |
| `[1, null]` | `(number \| null)[]` |
| `[new Dog(), new Cat()]` | `(Dog \| Cat)[]` |
| `[new Dog(), new Animal()]` | `Animal[]` - `Dog` поглощается супертипом |
| `[]` без последующих присваиваний | `never[]` |

Последняя строка объясняет ошибку «`never[]` не принимает `number`»: массив,
созданный пустым и возвращенный из функции без изменений, не содержит подсказок
о типе элементов. В теле функции пустой литерал получает эволюционирующий
тип ([1.3](type-system.md#13-аннотации-и-вывод-типов-расширение-литералов)),
но наружу он уходит как `never[]`. Пустой массив, который заполняется позже,
аннотируется: `const items: number[] = []`.

### Доступ к элементам

Тип `numbers[i]` - `number`, хотя за границей массива там `undefined`: это
компромисс `strictNullChecks`, разобранный в
[1.6](type-system.md#16-null-и-undefined-при-strictnullchecks). Методы,
которые могут не найти элемент, честнее:

```ts
const found = numbers.find((n) => n > 1); // number | undefined
const last = numbers.at(-1); // number | undefined
```

Опция `noUncheckedIndexedAccess`
([2.6](tsconfig.md#26-дополнительные-проверки-nouncheckedindexedaccess-exactoptionalpropertytypes-noimplicitoverride-и-другие))
добавляет `undefined` и к индексному доступу.

Обход `for...of` дает элементы типа `T`; обход `for...in` - **строковые**
индексы, как для любого объекта, и для массивов не используется:

```ts
for (const value of numbers) {
  // value: number
}
for (const key in numbers) {
  // key: string - '0', '1', '2'
}
```

### `readonly`-массивы

**`readonly T[]`** (то же, что `ReadonlyArray<T>`) - тип массива без
изменяющих методов и без записи по индексу: у него нет `push`, `pop`,
`splice`, `sort`, `reverse`, а индекс доступен только для чтения.

```ts
const frozen: readonly number[] = [1, 2, 3];

// frozen.push(4);
// Ошибка TS2339: Property 'push' does not exist on type 'readonly number[]'.

// frozen[0] = 10;
// Ошибка TS2542: Index signature in type 'readonly number[]' only permits reading.
```

Совместимость односторонняя: обычный массив присваивается в `readonly`, но не
наоборот - иначе через `readonly`-ссылку можно было бы получить изменяемую.

```ts
const mutable: number[] = [1, 2, 3];
const widened: readonly number[] = mutable; // допустимо

// const narrowed: number[] = frozen;
// Ошибка TS4104: The type 'readonly number[]' is 'readonly' and cannot be assigned to the mutable type 'number[]'.
```

Отсюда правило для параметров: функция, которая массив не изменяет, объявляет
параметр как `readonly T[]`. Такая функция принимает и обычные, и `readonly`
массивы, а компилятор не даст ей случайно вызвать `sort` на чужих данных.
Параметр `T[]` отвергает `readonly`-аргументы без всякой пользы.

```ts
/**
 * Возвращает сумму элементов.
 *
 * Параметр readonly: функция не изменяет массив и принимает любой массив
 * чисел, включая readonly и результат as const.
 */
function total(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0);
}

total(mutable);
total(frozen);
```

`readonly` - свойство типа, а не значения: после стирания типов массив
изменяем как любой другой. Неизменяемость в рантайме дает `Object.freeze`,
и компилятор это знает - его результат имеет тип `readonly T[]`:

```ts
const viaFreeze = Object.freeze([1, 2, 3]); // readonly number[]
```

```
readonly после стирания: [ 1, 2, 3 ]
Object.freeze: Cannot add property 2, object is not extensible
```

### `includes` и массив литералов

Массив с типом элементов-литералов принимает в `includes` только эти
литералы. Проверка «входит ли произвольная строка в список допустимых»
через `includes` не компилируется:

```ts
const roles = ['admin', 'user'] as const; // readonly ['admin', 'user']

// function hasRole(candidate: string): boolean {
//   return roles.includes(candidate);
// Ошибка TS2345: Argument of type 'string' is not assignable to parameter of type '"admin" | "user"'.
```

Сигнатура `includes(value: T)` требует `T`, а `string` шире. Это не
ошибка проектирования: `includes` проверяет наличие, а не принадлежность
типу. Для второго нужен [предикат типа](narrowing.md#73-пользовательские-предикаты-типов-value-is-t),
который заодно сужает аргумент; он приведен в
[3.4](#34-enum-против-объединения-литералов-и-объекта-as-const).

---

## 3.2 Кортежи: фиксированная длина, необязательные и rest-элементы, именованные элементы

**Кортеж** - тип массива с известным числом элементов, у каждого из которых
свой тип, определяемый позицией. `[number, number]` - массив ровно из двух
чисел; его свойство `length` имеет литеральный тип `2`.

```ts
const point: [number, number] = [10, 20];

// const wrong: [number, number] = [10, 20, 30];
// Ошибка TS2322: Type '[number, number, number]' is not assignable to type '[number, number]'.
//   Source has 3 element(s) but target allows only 2.

// const third = point[2];
// Ошибка TS2493: Tuple type '[number, number]' of length '2' has no element at index '2'.
```

Кортеж нужен там, где массив несет разнотипные значения на фиксированных
местах: пара «ключ - значение», координаты, несколько возвращаемых значений.
Без кортежа `['count', 42]` - это `(string | number)[]`, и после
деструктуризации оба элемента имеют тип `string | number`.

### Вывод: литерал - не кортеж

Главная особенность кортежей - компилятор **не выводит** их из литералов.
`[10, 20]` - это `number[]`: массив изменяем, и предположение о фиксированной
длине было бы неверным для большинства массивов.

```ts
const inferred = [10, 20]; // number[]

// const [x, y]: [number, number] = inferred;
// Ошибка TS2322: Type 'number[]' is not assignable to type '[number, number]'.
//   Target requires 2 element(s) but source may have fewer.
```

Кортеж появляется одним из трех способов:

| Способ | Пример | Результат |
| --- | --- | --- |
| Аннотация | `const pair: [string, number] = ['count', 42]` | `[string, number]` |
| `as const` | `const pair = ['count', 42] as const` | `readonly ['count', 42]` |
| Обобщенный параметр-кортеж | `tuple('count', 42)` | `[string, number]` |

```ts
/**
 * Возвращает аргументы как кортеж.
 *
 * Параметр T с ограничением unknown[] выводится по rest-аргументам как
 * кортеж, а не как массив: это единственный способ получить кортеж без
 * аннотации и без as const.
 */
function tuple<T extends unknown[]>(...items: T): T {
  return items;
}

const viaHelper = tuple('count', 42); // [string, number]
```

Тот же механизм работает для возвращаемого типа: функция с аннотацией
`: [number, number]` возвращает кортеж, и деструктуризация результата дает
`number` для каждой переменной:

```ts
/**
 * Разбирает строку вида "3,4" в пару координат.
 *
 * @returns Кортеж координат либо null, если строка не соответствует формату.
 */
function parseCoordinate(input: string): [number, number] | null {
  const match = /^(\d+),(\d+)$/.exec(input);
  if (match === null) {
    return null;
  }
  return [Number(match[1]), Number(match[2])];
}

const parsed = parseCoordinate('3,4');
if (parsed !== null) {
  const [x, y] = parsed; // x: number, y: number
}
```

Кортежи возвращают и встроенные API: `Promise.all([p1, p2])` дает
`[A, B]`, `Object.entries(obj)` - `[string, V][]`. Хук `useState` в React
возвращает `[T, (value: T) => void]` - именно кортеж, иначе `setState`
имел бы тип `T | ((value: T) => void)`
([16.5](react.md#165-пользовательские-хуки-возврат-кортежа-обобщенные-хуки-состояние-асинхронной-операции)).

### Необязательные, rest- и именованные элементы

```ts
type WithOptional = [string, number?]; // length: 1 | 2, элемент 1: number | undefined
const one: WithOptional = ['data'];
const two: WithOptional = ['data', 10];

type WithRest = [string, ...number[]]; // length: number
const rest: WithRest = ['count', 1, 2, 3];

type LeadingRest = [...string[], number]; // rest может стоять и в начале
const leading: LeadingRest = ['a', 'b', 3];

type Named = [x: number, y: number, z?: number];
const named: Named = [1, 2];
```

Имена элементов - только документация: они видны в подсказках редактора и в
именах параметров при развороте кортежа в список параметров
([5.2](functions.md#52-параметры-необязательные-значения-по-умолчанию-rest-деструктуризация)),
но не создают свойств `named.x`. Rest-элементы делают кортеж инструментом для
описания списков аргументов переменной длины; их комбинирование с `infer`
разобрано в [10.5](mapped-and-conditional-types.md#105-infer-извлечение-типов-из-функций-промисов-массивов-и-кортежей).

### `readonly`-кортежи

`as const` дает `readonly`-кортеж, и он, как `readonly`-массив, не
присваивается изменяемому типу:

```ts
const constant = [1, 2] as const; // readonly [1, 2]

function move(delta: [number, number]): void {
  console.log(delta);
}

// move(constant);
// Ошибка TS4104: The type 'readonly [1, 2]' is 'readonly' and cannot be assigned to the mutable type '[number, number]'.
```

Решение то же, что для массивов: параметр объявляется как
`readonly [number, number]` и принимает оба вида. Для кортежей это особенно
уместно, потому что изменяемый кортеж - брешь в системе типов:

```ts
const pair: [number, number] = [1, 2];
pair.push(3); // компилируется: кортеж - все еще Array
console.log(pair.length); // 3 в рантайме, тип по-прежнему 2
```

`push` доступен, потому что кортеж наследует методы массива, а тип `length`
после вызова не меняется. `readonly [number, number]` закрывает эту брешь.

| | Массив `T[]` | Кортеж `[A, B]` |
| --- | --- | --- |
| Длина | любая, `length: number` | фиксированная, `length: 2` |
| Тип элемента | один для всех позиций | свой для каждой позиции |
| Вывод из литерала | да | нет: нужны аннотация, `as const` или обобщение |
| Деструктуризация | все переменные типа `T` | каждая переменная своего типа |
| Рантайм | `Array` | тот же `Array` |

---

## 3.3 Перечисления: числовые, строковые, `const enum`, представление в JavaScript

**Перечисление** (`enum`) - объявление, которое одновременно создает тип с
конечным набором именованных членов и объект в рантайме, содержащий их
значения.

```ts
enum Status {
  Pending, // 0
  Active, // 1
  Completed, // 2
}

enum HttpStatus {
  Ok = 200,
  Created, // 201: продолжает счет от предыдущего
  BadRequest = 400,
  NotFound = 404,
}

enum LogLevel {
  Error = 'ERROR',
  Warn = 'WARN',
  Info = 'INFO',
}
```

Числовые члены нумеруются с нуля или продолжают счет от последнего явного
значения. Строковые требуют явного значения для каждого члена. Смешивать
числа и строки в одном перечислении компилятор позволяет, но это лишает
перечисление обоих преимуществ сразу и на практике не используется.

### Представление в JavaScript

Перечисление - одна из немногих конструкций, которые не стираются
([1.7](type-system.md#17-стирание-типов-что-остается-в-javascript)):

```js
var Status;
(function (Status) {
    Status[Status["Pending"] = 0] = "Pending";
    Status[Status["Active"] = 1] = "Active";
    Status[Status["Completed"] = 2] = "Completed";
})(Status || (Status = {}));

var LogLevel;
(function (LogLevel) {
    LogLevel["Error"] = "ERROR";
    LogLevel["Warn"] = "WARN";
    LogLevel["Info"] = "INFO";
})(LogLevel || (LogLevel = {}));
```

Числовое перечисление получает **обратное отображение**: запись
`Status[Status["Pending"] = 0] = "Pending"` создает и `Status.Pending === 0`,
и `Status[0] === 'Pending'`. Объект содержит шесть ключей вместо трех, и это
проявляется при переборе:

```
Status object  : {"0":"Pending","1":"Active","2":"Completed","Pending":0,"Active":1,"Completed":2}
Object.values  : ["Pending","Active","Completed",0,1,2]
Object.keys    : ["0","1","2","Pending","Active","Completed"]
LogLevel values: ["ERROR","WARN","INFO"]
```

`Object.values(Status)` для числового перечисления возвращает имена **и**
числа, и тип результата это отражает - `(string | Status)[]`. Список значений
приходится фильтровать: `Object.values(Status).filter((v) => typeof v === 'number')`.
У строковых перечислений обратного отображения нет, и `Object.values` дает
ровно значения с типом `LogLevel[]`.

### Перечисление как тип

Имя перечисления - и значение (объект), и тип (объединение его членов).
Каждый член - тоже тип, поэтому `switch` по всем членам компилятор считает
полным ([7.5](narrowing.md#75-размеченные-объединения-и-проверка-полноты-через-never)):

```ts
/**
 * Возвращает строковое имя статуса.
 *
 * Ветки default нет: Status = Pending | Active | Completed, все разобраны.
 */
function describe(status: Status): string {
  switch (status) {
    case Status.Pending:
      return 'pending';
    case Status.Active:
      return 'active';
    case Status.Completed:
      return 'completed';
  }
}

type StatusKeys = keyof typeof Status; // 'Pending' | 'Active' | 'Completed'
```

Совместимость с примитивами у двух видов перечислений разная, и в обоих
случаях неудобная:

```ts
// const outOfRange: Status = 5;
// Ошибка TS2322: Type '5' is not assignable to type 'Status'.

const fromNumber: number = 7;
const unchecked: Status = fromNumber; // компилируется: number присваивается в числовой enum

// const fromLiteral: LogLevel = 'ERROR';
// Ошибка TS2322: Type '"ERROR"' is not assignable to type 'LogLevel'.

const level: LogLevel = LogLevel.Error;
const levelValue: string = level; // допустимо: enum присваивается в string
```

Числовое перечисление отвергает литерал вне диапазона, но принимает любую
переменную типа `number` - историческая уступка коду с битовыми флагами, и
через нее в `Status` попадает `7`. Строковое перечисление, наоборот,
**номинально**: строка `'ERROR'` в `LogLevel` не присваивается, хотя это ровно
то значение, которое там лежит. Значение из JSON или из запроса нельзя
записать в переменную типа `LogLevel` без утверждения типа или проверки.

### `const enum`

**`const enum`** - перечисление без объекта в рантайме: компилятор
подставляет значения членов в места использования.

```ts
const enum Direction {
  Up = 'UP',
  Down = 'DOWN',
}
const move = Direction.Up;
```

```js
const move = "UP" /* Direction.Up */;
```

Подстановка требует видеть объявление при компиляции каждого файла, и
однофайловые транспиляторы этого не могут. Под `isolatedModules` и
`verbatimModuleSyntax` `const enum` компилируется как обычный `enum`
([2.4](tsconfig.md#24-совместимость-модулей-esmoduleinterop-allowsyntheticdefaultimports-isolatedmodules-verbatimmodulesyntax)),
а обращение к `const enum` из чужого `.d.ts` в этом режиме - ошибка.
Экономия от инлайна невелика, а зависимость от способа сборки реальна,
поэтому в новых проектах `const enum` не применяется.

### Стоимость

| | Числовой `enum` | Строковый `enum` |
| --- | --- | --- |
| Объект в рантайме | да, с обратным отображением | да |
| Стирается | нет | нет |
| Совместимость с примитивом | `number` присваивается без проверки | строка не присваивается, номинальный |
| `Object.values` | имена и числа | только значения |
| Значение в логах и JSON | число без смысла | читаемая строка |
| Режим stripping в Node, `erasableSyntaxOnly` | ошибка | ошибка |

Объект перечисления создается при загрузке модуля независимо от того,
используется ли он, а обращение `Status.Active` - это чтение свойства, а не
константа. Для числовых перечислений добавляется обратное отображение, которое
почти никогда не нужно и регулярно ловится в `Object.values`.

---

## 3.4 `enum` против объединения литералов и объекта `as const`

Конечный набор именованных значений выражается тремя способами. Все три дают
проверку допустимых значений и полноты `switch`; различаются они тем, что
остается в рантайме и как значение попадает в тип.

### Объединение литералов

```ts
type Role = 'admin' | 'editor' | 'viewer';

function canEdit(role: Role): boolean {
  return role === 'admin' || role === 'editor';
}

canEdit('admin');
```

Ничего в рантайме, никаких импортов ради значения, строка в коде и в JSON
одна и та же. Недостаток один: список значений существует только в типе, и
перебрать его - вывести в интерфейсе, проверить входные данные - нельзя.

### Объект `as const`

```ts
const Role = {
  Admin: 'admin',
  Editor: 'editor',
  Viewer: 'viewer',
} as const;

type Role = (typeof Role)[keyof typeof Role]; // 'admin' | 'editor' | 'viewer'

function canPublish(role: Role): boolean {
  return role === Role.Admin;
}

canPublish('admin'); // допустимо: тип - объединение литералов
canPublish(Role.Editor); // допустимо: значение имеет тип 'editor'

const allRoles = Object.values(Role); // Role[]
```

Одно имя `Role` объявлено дважды - как значение и как тип. Это допустимо:
значения и типы живут в разных пространствах имен, и `Role.Admin` в выражении
обращается к объекту, а `role: Role` в аннотации - к типу. Именно так ведет
себя `enum`, и именно этого не хватает объединению литералов.

`as const` делает свойства `readonly` и сохраняет литеральные типы
([8.4](type-operators.md#84-as-const-литеральные-типы-readonly-на-всех-уровнях-словари-констант));
`(typeof Role)[keyof typeof Role]` - индексный доступ по всем ключам, дающий
объединение значений ([8.3](type-operators.md#83-индексный-доступ-tk-и-tnumber)).
В JavaScript от конструкции остается обычный объект:

```js
const Role = {
    Admin: 'admin',
    Editor: 'editor',
    Viewer: 'viewer',
};
```

Тот же прием с массивом дает и список, и тип из него:

```ts
const ROLES = ['admin', 'editor', 'viewer'] as const;
type RoleFromArray = (typeof ROLES)[number]; // 'admin' | 'editor' | 'viewer'
```

Массив закрывает вопрос проверки входных данных, оставшийся от
[3.1](#31-массивы-t-arrayt-readonly-массивы-вывод-типа-элементов): предикат
типа над `includes` и сужает аргумент, и принимает произвольное значение.

```ts
/**
 * Проверяет, входит ли значение в список, и сужает его тип до типа элементов.
 *
 * Параметр unknown вместо T[number] позволяет передавать произвольные данные;
 * сужение выполняет предикат в возвращаемом типе.
 */
function includes<const T extends readonly unknown[]>(list: T, value: unknown): value is T[number] {
  return list.includes(value);
}

function assignRole(candidate: string): Role {
  if (includes(ROLES, candidate)) {
    return candidate; // candidate: 'admin' | 'editor' | 'viewer'
  }
  throw new Error(`Unknown role: ${candidate}`);
}
```

### Сравнение

| | `enum` | Объединение литералов | Объект `as const` |
| --- | --- | --- | --- |
| Рантайм | объект, не стирается | ничего | обычный объект |
| Обращение к члену | `Role.Admin` | `'admin'` | `Role.Admin` или `'admin'` |
| Литерал вместо члена | строковый - ошибка | да | да |
| Перебор значений | `Object.values`, у числовых - с мусором | нет | `Object.values`, тип `Role[]` |
| Данные извне | нужно утверждение или проверка | сужение через предикат | сужение через предикат |
| Полнота `switch` | да | да | да |
| Stripping в Node, `erasableSyntaxOnly` | ошибка | допустимо | допустимо |

Порядок выбора: объединение литералов, пока значения не нужны в рантайме;
объект `as const`, когда нужны перебор, отображаемые имена или доступ по
имени члена; `enum` - там, где он уже принят кодовой базой или фреймворком.
Объявление `enum` в новом коде дает единственное, чего нет у альтернатив, -
номинальность строкового перечисления, и та обычно оказывается препятствием,
а не защитой.

Существующий `enum` конвертируется в объединение его значений шаблонным
литеральным типом ([11.1](template-literal-types.md#111-синтаксис-и-комбинирование-объединений)),
что упрощает постепенный отказ от него на границах API:

```ts
enum RoleEnum {
  Admin = 'admin',
  Editor = 'editor',
}
type RoleEnumValues = `${RoleEnum}`; // 'admin' | 'editor'
```

---

## Типичные ошибки

1. **Ожидание кортежа от литерала.** `const pair = ['count', 42]` - это
   `(string | number)[]`, и после деструктуризации типы элементов смешаны.
   Кортеж задается аннотацией, `as const` или обобщенным параметром.
2. **`readonly`-кортеж в изменяемый параметр.** Результат `as const` не
   принимается параметром `[number, number]`. Параметры, которые не изменяют
   аргумент, объявляются `readonly`.
3. **`push` в кортеж.** Компилируется, длина в рантайме растет, тип `length`
   остается прежним. Защита - `readonly`-кортежи.
4. **`includes` на массиве литералов с аргументом `string`.** Сигнатура
   требует тип элемента; для проверки входных данных нужен предикат типа.
5. **`Object.values` числового перечисления.** Возвращает имена вместе с
   числами из-за обратного отображения. Строковые перечисления или объект
   `as const` этой проблемы не имеют.
6. **Строка в переменную строкового перечисления.** `'ERROR'` не
   присваивается в `LogLevel` - перечисление номинально. Данные извне
   требуют проверки, а не утверждения `as LogLevel`.
7. **`number` в числовое перечисление.** Присваивание переменной типа
   `number` проходит без проверки, и в `Status` попадает значение вне
   диапазона.
8. **`for...in` по массиву.** Дает строковые индексы, а не элементы; для
   элементов - `for...of`.
9. **`const enum` в проекте с однофайловым транспилятором.** Под
   `isolatedModules` он компилируется как обычный `enum`, а обращение к
   `const enum` из деклараций - ошибка; выигрыша от инлайна нет.

---

[← Настройка компилятора](tsconfig.md) · [К содержанию](../README.md) ·
[Далее: объектные типы, объединения и пересечения →](object-types.md)
