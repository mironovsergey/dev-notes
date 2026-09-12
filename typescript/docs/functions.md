# 5 Функции

[← К содержанию](../README.md)

Функция в TypeScript - значение, и у нее есть тип: сигнатура из параметров и
результата. Тема разбирает, как этот тип записывается, что в нем можно
опустить, как компилятор сравнивает две сигнатуры и почему правила сравнения
для функций отличаются от правил для объектов - в одном месте они строже, а в
другом намеренно слабее.

---

## 5.1 Тип функции: сигнатура, псевдоним типа, сигнатуры вызова и конструктора в интерфейсе

**Тип функции** - тип значения, которое можно вызвать; задается списком
параметров с типами и типом результата: `(left: number, right: number) => number`.

```ts
type BinaryOperation = (left: number, right: number) => number;

const add: BinaryOperation = (a, b) => a + b; // a и b выведены из BinaryOperation
const subtract: BinaryOperation = (x, y) => x - y;

/**
 * Применяет операцию к двум числам.
 *
 * Параметр-функция типизирован псевдонимом: любая функция подходящей
 * сигнатуры, включая встроенную Math.max, принимается.
 */
function apply(operation: BinaryOperation, a: number, b: number): number {
  return operation(a, b);
}

apply(add, 1, 2);
apply(Math.max, 1, 2);
```

Имена параметров в типе функции - документация: `add` объявляет `a` и `b`,
а тип требует `left` и `right`, и это не конфликт. Сравниваются позиции и
типы. Псевдоним нужен, как только сигнатура повторяется: в параметрах,
свойствах, аргументах обобщений.

Стрелочная функция, присвоенная переменной с типом, получает типы параметров
из этого типа - это контекстная типизация из
[1.3](type-system.md#13-аннотации-и-вывод-типов-расширение-литералов).
Объявление `function` такой подсказки не имеет, и его параметры
аннотируются всегда.

### Сигнатура вызова в интерфейсе

Функция в JavaScript - объект, и у нее могут быть свойства. Тип «вызываемый
объект со свойствами» записывается интерфейсом с **сигнатурой вызова**:

```ts
interface Validator {
  (value: string): boolean; // сигнатура вызова
  description: string;
}

const notEmpty: Validator = Object.assign((value: string) => value.length > 0, {
  description: 'non-empty string',
});

notEmpty('x');
notEmpty.description;
```

Несколько сигнатур вызова в одном интерфейсе образуют перегрузку
([5.4](#54-перегрузки-сигнатуры-и-реализация-когда-объединение-или-обобщение-лучше)).

### Сигнатура конструктора

**Сигнатура конструктора** `new (...) => T` описывает значение, которое
вызывается с `new`: класс или функцию-конструктор. Это тип, которого требует
параметр «передайте мне класс»:

```ts
interface PersonConstructor {
  new (name: string): { name: string };
}

class Person {
  constructor(public name: string) {}
}

const factory: PersonConstructor = Person; // класс как значение
const created = new factory('Ann');
```

Различие между типом экземпляра и типом конструктора разобрано в
[6.6](classes.md#66-тип-экземпляра-и-тип-конструктора-ограничение-на-конструктор-миксины).

### Что не использовать

Встроенный тип `Function` - «любая вызываемая вещь» без сигнатуры: вызов
компилируется с любыми аргументами и возвращает `any`. Для «любой функции»
в ограничениях используется `(...args: any[]) => any`
([1.4](type-system.md#14-any-и-unknown)), для конкретной - ее сигнатура.

Тип функции в объединении заключается в скобки: `(() => void) | null`. Без
скобок `() => void | null` читается как функция, возвращающая `void | null`.

---

## 5.2 Параметры: необязательные, значения по умолчанию, rest, деструктуризация

### Необязательные параметры и значения по умолчанию

`greeting?: string` делает параметр необязательным; внутри функции его тип -
`string | undefined`. Значение по умолчанию `times = 2` делает параметр
необязательным для вызывающего, но внутри функции тип остается `number` -
`undefined` заменяется до входа в тело. Тип при этом выводится из значения по
умолчанию.

```ts
function greet(name: string, greeting?: string): string {
  return `${greeting ?? 'Hello'}, ${name}`; // greeting: string | undefined
}
greet('Ann');
greet('Ann', 'Hi');

function repeat(text: string, times = 2): string {
  return text.repeat(times); // times: number
}
repeat('ab');
repeat('ab', 3);
```

Необязательный параметр не может стоять перед обязательным - иначе вызов
`greet('Hello')` неоднозначен:

```
Ошибка TS1016: A required parameter cannot follow an optional parameter.
```

Значение по умолчанию перед обязательным параметром допустимо, но
необязательным его не делает: чтобы получить значение по умолчанию, нужно
явно передать `undefined`.

```ts
function pad(width = 4, text: string): string {
  return text.padStart(width);
}
pad(undefined, 'x'); // единственный способ воспользоваться умолчанием
```

Число аргументов проверяется в обе стороны: лишний аргумент - такая же
ошибка, как недостающий (TS2554 `Expected 2 arguments, but got 3`). Это
отличие от JavaScript, где лишние аргументы молча игнорируются.

### Rest-параметры

`...values: number[]` собирает остаток аргументов в массив. Тип rest-параметра
может быть и кортежем - тогда он описывает фиксированный набор аргументов с
именами, а имена элементов
([3.2](arrays-tuples-enums.md#32-кортежи-фиксированная-длина-необязательные-и-rest-элементы-именованные-элементы))
становятся именами параметров в подсказках:

```ts
function sum(...values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
sum();
sum(1, 2, 3);

function log(...args: [level: 'info' | 'error', message: string]): void {
  console.log(...args);
}
log('info', 'started');
```

В обратную сторону работает spread-аргумент: `connect(...endpoint)` допустим,
только если тип `endpoint` - кортеж. Массив не подходит - его длина
неизвестна, и компилятор не может проверить число аргументов:

```ts
function connect(host: string, port: number): string {
  return `${host}:${port}`;
}

const endpoint: [string, number] = ['localhost', 80];
connect(...endpoint); // допустимо

// const loose = ['localhost', 80]; // (string | number)[]
// connect(...loose);
// Ошибка TS2556: A spread argument must either have a tuple type or be passed to a rest parameter.
```

Это второй по частоте способ столкнуться с тем, что литерал массива - не
кортеж ([3.2](arrays-tuples-enums.md#32-кортежи-фиксированная-длина-необязательные-и-rest-элементы-именованные-элементы)).

### Деструктуризация

Тип деструктурируемого параметра записывается после всего образца, а не у
отдельных полей. Значения по умолчанию задаются внутри образца, а значение
по умолчанию для всего объекта - после типа:

```ts
interface Options {
  host: string;
  port?: number;
  secure?: boolean;
}

function describe({ host, port = 80, secure = false }: Options): string {
  return `${secure ? 'https' : 'http'}://${host}:${port}`;
}
describe({ host: 'example.com' });

function configure({ verbose = false }: { verbose?: boolean } = {}): boolean {
  return verbose;
}
configure(); // весь объект необязателен
configure({ verbose: true });
```

Объект-параметр с деструктуризацией - обычная замена длинному списку
позиционных параметров: аргументы получают имена в месте вызова, а
необязательные можно опускать в любом порядке.

---

## 5.3 Возвращаемый тип: вывод и явная аннотация, `void` в callback-ах, `Promise<T>` у `async`-функций

### Вывод

Возвращаемый тип выводится как объединение типов всех `return`. Литералы при
этом расширяются - но не всегда:

```ts
function status() {
  return 'ok'; // string: одиночный литерал расширен
}

function statusConst() {
  return 'ok' as const; // 'ok'
}

function order(descending: boolean) {
  return descending ? 'desc' : 'asc'; // 'asc' | 'desc': объединение литералов сохранено
}
```

Одиночный литерал расширяется до примитива, объединение разных литералов -
нет. Поэтому функция, возвращающая один из нескольких строковых вариантов,
получает точный тип без аннотации, а функция с одним `return 'ok'` -
`string`. При записи результата в `let` объединение расширяется снова.

Аннотация возвращаемого типа обязательна для экспортируемых функций: она
фиксирует контракт (изменение тела не изменит тип незаметно), ускоряет
проверку
([18.4](build-and-performance.md#184-ускорение-проверки-типов-skiplibcheck-границы-include-явные-типы-экспортов-interface-против-пересечений))
и превращает ошибку в теле в ошибку на месте `return`, а не на месте
вызова где-то в другом файле.

### `void` и `undefined`

`void` как возвращаемый тип означает «результат не используется»; функция с
таким типом может вернуть `undefined`, а через тип callback-а - что угодно
([1.5](type-system.md#15-void-и-never)). Результат вызова имеет тип `void`, и
делать с ним нечего:

```ts
const callback: () => void = () => 42;
const ignored = callback(); // ignored: void

// const doubled = callback() * 2;
// Ошибка TS2362: The left-hand side of an arithmetic operation must be of type 'any', 'number', 'bigint' or an enum type.
```

Тип `undefined` в позиции результата - обещание вернуть именно `undefined`.
Начиная с 5.1 такой функции не нужен явный `return`:

```ts
function noValue(): undefined {}
const explicit: undefined = noValue();
```

Разница с `void`: `undefined` - обычный тип, его значение можно присваивать и
сравнивать, а `void` сигнализирует, что результат не предназначен для
использования.

### `async` и `Promise<T>`

`async`-функция всегда возвращает `Promise`. Аннотация ее результата обязана
быть `Promise<T>`, а `return value` внутри соответствует `T`:

```ts
async function load(): Promise<number> {
  return 42;
}

// async function loadWrong(): number {
// Ошибка TS1064: The return type of an async function or method must be the global Promise<T> type. Did you mean to write 'Promise<number>'?

async function loadInferred() {
  return 42; // Promise<number>
}

async function flattened() {
  return Promise.resolve(1); // Promise<number>, а не Promise<Promise<number>>
}

async function consume(): Promise<string> {
  const value = await load(); // number
  return String(value);
}
```

`await` снимает один уровень `Promise`; для получения того же на уровне типов
есть `Awaited<T>`, который снимает все уровни
([9.5](generics.md#95-встроенные-utility-types)).

Компилятор не проверяет, что промис кому-то нужен: вызов `save()` без `await`
внутри `async`-функции компилируется, а отклонение такого промиса никем не
обрабатывается. Это задача линтера - правило `no-floating-promises`
([19.4](testing-and-code-quality.md#194-eslint-и-typescript-eslint-type-aware-правила-конфигурации-ключевые-правила)).

---

## 5.4 Перегрузки: сигнатуры и реализация, когда объединение или обобщение лучше

**Перегрузка** - несколько сигнатур у одной функции: компилятор подбирает
первую, которой соответствуют аргументы, и берет из нее тип результата.

```ts
function parse(input: string): number;
function parse(input: number): string;
function parse(input: string | number): string | number {
  return typeof input === 'string' ? Number(input) : String(input);
}

const asNumber = parse('42'); // number
const asString = parse(42); // string
```

Перегрузка состоит из сигнатур-объявлений без тела и одной **сигнатуры
реализации** с телом. Снаружи видны только объявления: вызвать `parse` с
аргументом `string | number` нельзя, хотя реализация его принимает.
Реализация обязана быть совместима с каждым объявлением, иначе TS2394
`This overload signature is not compatible with its implementation signature`.

### Зачем перегрузки

Перегрузка нужна, когда тип результата **зависит** от типа аргумента. Без
нее `parse` возвращает `string | number` при любом вызове, и вызывающий код
вынужден сужать результат, хотя точно знает, что передал:

```ts
function parseUnion(input: string | number): string | number {
  return typeof input === 'string' ? Number(input) : String(input);
}
const unionResult = parseUnion('42'); // string | number, хотя это заведомо number
```

Второй случай - разные наборы параметров: `makeDate(timestamp)` и
`makeDate(year, month, day)`. Объединение здесь не поможет, а перегрузка
описывает оба варианта и отвергает промежуточный:

```ts
function makeDate(timestamp: number): Date;
function makeDate(year: number, month: number, day: number): Date;
function makeDate(yearOrTimestamp: number, month?: number, day?: number): Date {
  if (month !== undefined && day !== undefined) {
    return new Date(yearOrTimestamp, month - 1, day);
  }
  return new Date(yearOrTimestamp);
}

makeDate(0);
makeDate(2026, 9, 11);
// makeDate(2026, 9);
// Ошибка TS2575: No overload expects 2 arguments, but overloads do exist that expect either 1 or 3 arguments.
```

Так устроен `document.createElement`: первая сигнатура - обобщенная, по
таблице `HTMLElementTagNameMap` она превращает `'div'` в `HTMLDivElement`;
вторая, с `string`, дает `HTMLElement` для тега, неизвестного на этапе
компиляции.

```ts
const div = document.createElement('div'); // HTMLDivElement
const tag: string = 'section';
const generic = document.createElement(tag); // HTMLElement
```

### Цена перегрузок

| Проблема | Проявление |
| --- | --- |
| Объединение в аргументе | `parse(either)` при `either: string | number` - TS2769 `No overload matches this call` |
| Сообщения об ошибках | компилятор перечисляет все сигнатуры, и причина теряется |
| Реализация не проверяется по каждой ветке | тело обязано подойти под все объявления, но ошибка «строку вернули там, где обещали число» не ловится |
| Стрелочные функции | перегрузку нельзя объявить синтаксисом стрелки |

Последнее решается интерфейсом с несколькими сигнатурами вызова
([5.1](#51-тип-функции-сигнатура-псевдоним-типа-сигнатуры-вызова-и-конструктора-в-интерфейсе))
или пересечением функциональных типов
([4.4](object-types.md#44-пересечения-слияние-свойств-конфликт-свойств-и-never-branded-types)):

```ts
interface Formatter {
  (value: Date): string;
  (value: number): string;
  (value: string): string;
}
const format: Formatter = (value: Date | number | string): string => String(value);
```

### Когда объединение или обобщение лучше

| Ситуация | Инструмент |
| --- | --- |
| Разные типы аргумента, один тип результата | объединение в параметре: `(value: Date \| number \| string): string` |
| Результат зависит от типа аргумента | перегрузка, либо обобщение с условным типом |
| Разные наборы параметров | перегрузка |
| Результат того же типа, что аргумент | обобщение: `<T>(value: T): T` ([9.2](generics.md#92-обобщенные-функции-параметры-типа-вывод-аргументов-типа-значения-по-умолчанию)) |

Обобщение с условным типом результата описывает зависимость одной
сигнатурой, а реализацию по-прежнему приходится оформлять как перегрузку:
внутри тела компилятор не умеет доказать, что `Number(input)` соответствует
`T extends string ? number : string`
([10.3](mapped-and-conditional-types.md#103-условные-типы-синтаксис-отложенное-вычисление-сужение-в-ветках)).

```ts
function pick<T extends string | number>(input: T): T extends string ? number : string;
function pick(input: string | number): string | number {
  return typeof input === 'string' ? Number(input) : String(input);
}
const picked = pick('1'); // number
```

Правило: объединение, пока результат от аргумента не зависит; перегрузка,
когда зависит; обобщение, когда зависимость выражается через сам тип
аргумента.

---

## 5.5 Типизация `this`

В JavaScript `this` определяется способом вызова, а не местом объявления, и
компилятор об этом способе знает не всегда. **Параметр `this`** - фиктивный
первый параметр функции, задающий тип `this` для проверки; в JavaScript он не
попадает.

```ts
interface Person {
  name: string;
}

function introduce(this: Person, greeting: string): string {
  return `${greeting}, I am ${this.name}`;
}

const ann: Person = { name: 'Ann' };
introduce.call(ann, 'Hello'); // допустимо: this = ann
introduce.bind(ann)('Hi');

// introduce('Hello');
// Ошибка TS2684: The 'this' context of type 'void' is not assignable to method's 'this' of type 'Person'.
```

Без параметра `this` в функции-выражении `this` имеет тип `any`, и под
`noImplicitThis` ([2.5](tsconfig.md#25-strict-и-его-составляющие)) обращение к
нему - ошибка. В методах классов и объектных литералов `this` типизирован
автоматически: тип класса или тип литерала.

### Оторванный метод

Метод класса, переданный как callback, теряет `this` - это свойство
JavaScript, и компилятор его по умолчанию не отслеживает:

```ts
class Counter {
  count = 0;

  increment(): void {
    this.count += 1;
  }

  incrementArrow = (): void => {
    this.count += 1; // this захвачен лексически
  };
}

const counter = new Counter();

const detached = counter.increment;
// detached(); - компилируется, в рантайме:
// TypeError: Cannot read properties of undefined (reading 'count')

const detachedArrow = counter.incrementArrow;
detachedArrow(); // работает: this привязан при создании экземпляра
setTimeout(counter.incrementArrow, 0);
```

Два способа защититься:

| Способ | Что дает | Цена |
| --- | --- | --- |
| Поле со стрелочной функцией | `this` привязан навсегда, метод можно передавать | функция создается для каждого экземпляра, не участвует в наследовании через `prototype` |
| Параметр `this: Counter` в методе | прямой вызов оторванного метода - ошибка TS2684 | передача в callback вроде `setTimeout` не проверяется |

Вторая цена существенна: `setTimeout(counter.incrementSafe, 0)` компилируется
даже с параметром `this`, потому что тип callback-а `setTimeout` не
накладывает требований на `this`. Полную защиту дает только стрелочное поле
либо явный `bind` в конструкторе.

### Utility types для `this`

`ThisParameterType<T>` извлекает тип параметра `this`, `OmitThisParameter<T>`
удаляет его из сигнатуры - это тип результата `bind`:

```ts
type IntroduceThis = ThisParameterType<typeof introduce>; // Person
type Unbound = OmitThisParameter<typeof introduce>; // (greeting: string) => string
```

Полиморфный тип `this` как возвращаемый тип метода - для цепочек вызовов,
сохраняющих тип наследника, - разобран в
[6.4](classes.md#64-наследование-extends-super-override-абстрактные-классы).

---

## 5.6 Совместимость функций: число параметров, вариантность, `strictFunctionTypes`

Когда функцию типа `S` можно присвоить туда, где ожидается тип `T`? Ответ
складывается из трех правил - для числа параметров, для типов параметров и
для типа результата.

### Число параметров

Функция с **меньшим** числом параметров присваивается типу с большим:

```ts
type Handler = (value: string, index: number) => void;

const oneParam: Handler = (value) => console.log(value); // допустимо
const noParams: Handler = () => console.log('called'); // допустимо

// const twoParams: (value: string) => void = (value: string, index: number) => {};
// Ошибка TS2322: Target signature provides too few arguments. Expected 2 or more, but got 1.
```

Правило кажется несимметричным с проверкой арности при вызове
([5.2](#52-параметры-необязательные-значения-по-умолчанию-rest-деструктуризация)),
но оно единственно возможное: `forEach` вызывает callback с тремя
аргументами, а `list.forEach((value) => ...)` игнорирует два из них - это
нормально. Функция, которая требует **больше** аргументов, чем ей передадут,
получила бы `undefined` в недостающих, поэтому обратное присваивание
запрещено.

По той же логике функция с необязательным параметром присваивается типу с
обязательным (лишнее значение ей не помешает), а с обязательным - типу с
необязательным нет: вызывающий вправе параметр не передать.

### Тип результата: ковариантность

Результат сравнивается **в ту же сторону**, что и обычные значения: функция,
возвращающая `Dog`, подходит там, где ждут функцию, возвращающую `Animal`, -
всякий `Dog` есть `Animal`.

```ts
interface Animal {
  name: string;
}
interface Dog extends Animal {
  breed: string;
}

let produceAnimal: () => Animal = () => ({ name: 'x' });
const produceDog = (): Dog => ({ name: 'Rex', breed: 'lab' });
produceAnimal = produceDog; // допустимо: Dog ⊆ Animal

// produceDog = produceAnimal;
// Ошибка TS2322: Type '() => Animal' is not assignable to type '() => Dog'.
//   Property 'breed' is missing in type 'Animal' but required in type 'Dog'.
```

### Типы параметров: контравариантность

Параметры сравниваются **в обратную сторону**. Функция, принимающая `Animal`,
подходит там, где ждут функцию, принимающую `Dog`: что бы ей ни передали, это
будет `Animal`. Функция, принимающая `Dog`, там, где ждут `Animal`, не
подходит: ей передадут кота, а она обратится к `breed`.

```ts
let consumeDog: (dog: Dog) => void = () => {};
const consumeAnimal = (animal: Animal): void => console.log(animal.name);
consumeDog = consumeAnimal; // допустимо

// let consumeAnimal2: (animal: Animal) => void = (dog: Dog) => console.log(dog.breed);
// Ошибка TS2322: Type '(dog: Dog) => void' is not assignable to type '(animal: Animal) => void'.
//   Types of parameters 'dog' and 'animal' are incompatible.
```

Правило включается опцией `strictFunctionTypes` из семейства `strict`; в
[2.5](tsconfig.md#25-strict-и-его-составляющие) показано, как без нее
присваивание компилируется и заканчивается `TypeError`.

### Бивариантность методов

Из контравариантности есть исключение: параметры **методов**, объявленных
синтаксисом метода, сравниваются в обе стороны - бивариантно. Сделано это
ради встроенных типов: `Array<Dog>` должен быть присваиваем в `Array<Animal>`,
а у массива есть метод `push(item: T)` с `T` в позиции параметра, и при строгой
контравариантности массивы стали бы несовместимыми.

```ts
interface Registry {
  onAnimal(animal: Animal): void; // синтаксис метода: параметр бивариантен
}
const registry: Registry = {
  onAnimal(dog: Dog) {
    console.log(dog.breed); // компилируется, хотя onAnimal могут вызвать с котом
  },
};

// interface StrictRegistry {
//   onAnimal: (animal: Animal) => void; // свойство-функция: параметр контравариантен
// }
// Ошибка TS2322 при том же присваивании.
```

Отсюда правило записи: callback-и в интерфейсах объявляются как свойства с
функциональным типом, а не как методы, - иначе проверка параметров для них
отключена.

### Сводка

| Позиция | Направление | Правило |
| --- | --- | --- |
| Число параметров | | меньше - допустимо, больше - нет |
| Необязательность параметра | | необязательный вместо обязательного - допустимо, обратное - нет |
| Тип параметра, свойство-функция | контравариантно | принимающая супертип подходит вместо принимающей подтип |
| Тип параметра, метод | бивариантно | подходит в обе стороны |
| Тип результата | ковариантно | возвращающая подтип подходит вместо возвращающей супертип |
| Результат `void` в целевом типе | | любой результат допустим |

Правило контравариантности объясняет, почему «любая функция» записывается
как `(...args: any[]) => any`, а не через `unknown[]`
([1.4](type-system.md#14-any-и-unknown)): параметр `unknown` требовал бы,
чтобы каждая функция принимала что угодно.

---

## Типичные ошибки

1. **`Function` в аннотации.** Вызов такого значения возвращает `any` с
   любыми аргументами. Для «любой функции» - `(...args: any[]) => any`, для
   конкретной - ее сигнатура.
2. **Значение по умолчанию перед обязательным параметром.** Параметр не
   становится необязательным; чтобы воспользоваться умолчанием, приходится
   передавать `undefined` явно. Параметры с умолчаниями ставятся последними.
3. **Spread массива в позиционные параметры.** `connect(...list)` требует
   кортежа; массив неизвестной длины отвергается (TS2556).
4. **Одиночный литерал в `return` считается точным типом.** `return 'ok'`
   дает `string`; точный тип - `as const` или аннотация. Объединение
   литералов из нескольких `return`, напротив, сохраняется.
5. **`async` с аннотацией без `Promise`.** Результат `async`-функции всегда
   `Promise<T>` (TS1064).
6. **Промис без `await` и без обработки.** Компилятор это не проверяет;
   нужно правило `no-floating-promises`.
7. **Перегрузка там, где хватает объединения.** Если результат не зависит от
   типа аргумента, перегрузка только ухудшает сообщения об ошибках и
   отвергает аргументы-объединения.
8. **Метод класса как callback.** `this` теряется; компилятор молчит без
   параметра `this`, а с ним ловит только прямой вызов. Для передаваемых
   методов - стрелочные поля или `bind`.
9. **Callback как метод интерфейса.** Синтаксис метода включает
   бивариантность параметров и пропускает обработчик более узкого типа.
   Callback-и объявляются свойствами с функциональным типом.

---

[← Объектные типы, объединения и пересечения](object-types.md) · [К содержанию](../README.md) ·
[Далее: классы →](classes.md)
