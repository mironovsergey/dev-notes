# 6 Классы

[← К содержанию](../README.md)

Класс в TypeScript - это класс JavaScript плюс проверка: компилятор следит за
инициализацией полей, доступом к членам, совместимостью переопределений и
соответствием интерфейсам. Часть этих проверок существует только на этапе
компиляции (`private`, `implements`), часть опирается на возможности самого
JavaScript (`#private`, `static {}`). Тема разбирает, где проходит эта
граница, и заканчивается тем, что делает классы полезными в обобщенном коде:
разделением на тип экземпляра и тип конструктора.

---

## 6.1 Поля и конструктор: инициализация, `strictPropertyInitialization`, параметры-свойства

**Поле класса** - свойство экземпляра, объявленное в теле класса с типом и,
возможно, инициализатором. Тип выводится из инициализатора так же, как у
переменных: `count = 0` дает `number`.

```ts
class Session {
  count = 0; // number, инициализировано
  readonly startedAt = new Date(); // Date, изменить нельзя
  user?: string; // string | undefined, может отсутствовать
  token!: string; // обещание: будет присвоено вне конструктора
  id: string; // присваивается в конструкторе

  constructor(id: string) {
    this.id = id;
  }
}
```

### `strictPropertyInitialization`

Опция из семейства `strict`
([2.5](tsconfig.md#25-strict-и-его-составляющие)) требует, чтобы каждое
поле без `?` получило значение до конца конструктора. Без этого тип поля
`string` был бы ложью: до первого присваивания там `undefined`.

Присваивание засчитывается только в самом конструкторе. Вызов метода,
который присваивает поле, компилятор не прослеживает:

```ts
// class Session {
//   token: string;
//   constructor() {
//     this.reset(); // присваивает token, но компилятор этого не видит
//   }
//   reset(): void {
//     this.token = '';
//   }
// }
// Ошибка TS2564: Property 'token' has no initializer and is not definitely assigned in the constructor.
```

| Способ удовлетворить проверку | Когда |
| --- | --- |
| Инициализатор `count = 0` | значение известно при объявлении |
| Присваивание в конструкторе | значение зависит от аргументов |
| `user?: string` | поле действительно может отсутствовать |
| `token!: string` | поле заполняет кто-то другой: контейнер внедрения зависимостей, `init()`-метод, ORM |

Оператор `!` - **определенное присваивание** (definite assignment): он
отключает проверку для одного поля. Это честнее, чем выключить
`strictPropertyInitialization` для проекта, как делает NestJS, но и он -
обещание без проверки: если поле так и не присвоят, ошибка проявится в
рантайме.

### Параметры-свойства

**Параметр-свойство** - параметр конструктора с модификатором доступа или
`readonly`, который компилятор превращает в одноименное поле с присваиванием:

```ts
class Point {
  constructor(
    public readonly x: number,
    public readonly y: number,
    private label = 'point',
  ) {}

  describe(): string {
    return `${this.label}(${this.x}, ${this.y})`;
  }
}
```

```js
class Point {
    x;
    y;
    label;
    constructor(x, y, label = 'point') {
        this.x = x;
        this.y = y;
        this.label = label;
    }
}
```

Это одна из нестираемых конструкций
([1.7](type-system.md#17-стирание-типов-что-остается-в-javascript)):
компилятор генерирует объявления полей и присваивания, а инструменты,
которые только стирают типы, такую запись отвергают. Опция
`erasableSyntaxOnly` запрещает ее заранее.

### Порядок инициализации

Инициализаторы полей выполняются **до** тела конструктора (после `super()` в
наследнике). Для параметров-свойств это означает, что поле, чей инициализатор
читает параметр-свойство, читает еще не присвоенное значение:

```ts
// class Order {
//   readonly doubled = this.quantity * 2;
//   constructor(public quantity: number) {}
// }
// Ошибка TS2729: Property 'quantity' is used before its initialization.
```

Ошибка появилась не сразу. При `target` ниже ES2022 компилятор переписывал
поля в присваивания внутри конструктора, и параметры-свойства успевали
присвоиться раньше:

```js
// target: es2021 - doubled: 6
class Order {
    constructor(quantity) {
        this.quantity = quantity;
        this.doubled = this.quantity * 2;
    }
}

// target: es2022 - doubled: NaN
class Order {
    quantity;
    doubled = this.quantity * 2;
    constructor(quantity) {
        this.quantity = quantity;
    }
}
```

С ES2022 поля класса - часть стандарта с собственной семантикой
(`[[Define]]`), и компилятор оставляет их как есть. Опция
`useDefineForClassFields`, которая включается автоматически при `target`
не ниже ES2022, переключает и порядок, и способ создания поля. Тот же код
дает `6` при `es2021` и `NaN` при `es2022`; проверка TS2729 существует, чтобы
разница обнаружилась при компиляции. Исправление - вычислять поле в теле
конструктора.

Вторая ловушка той же семантики - повторное объявление поля в наследнике:

```ts
class Base {
  name = 'base';
}

// class Derived extends Base {
//   name: string; // при [[Define]] это новое поле со значением undefined
// }
// Ошибка TS2612: Property 'name' will overwrite the base property in 'Base'. If this is intentional, add an initializer. Otherwise, add a 'declare' modifier or remove the redundant declaration.

class Derived extends Base {
  declare name: string; // только уточнение типа, поля в JavaScript нет
}
```

---

## 6.2 Модификаторы доступа: `public`, `protected`, `private`, `readonly`; `private` против `#private`

**Модификатор доступа** - ограничение на то, откуда к члену можно обратиться:
`public` - отовсюду (по умолчанию), `protected` - из класса и наследников,
`private` - только из класса. `readonly` ограничивает не доступ, а запись.

```ts
class Account {
  public readonly id: string;
  protected balance = 0;
  private history: number[] = [];
  #pin = '0000';

  constructor(id: string) {
    this.id = id;
  }

  deposit(amount: number): void {
    this.balance += amount;
    this.history.push(amount);
  }

  verify(pin: string): boolean {
    return pin === this.#pin;
  }
}

class Savings extends Account {
  addInterest(rate: number): void {
    this.balance *= 1 + rate; // protected: доступен в наследнике
  }
}

// const account = new Account('a1');
// account.balance;
// Ошибка TS2445: Property 'balance' is protected and only accessible within class 'Account' and its subclasses.
// account.history;
// Ошибка TS2341: Property 'history' is private and only accessible within class 'Account'.
// account.#pin;
// Ошибка TS18013: Property '#pin' is not accessible outside class 'Account' because it has a private identifier.
```

### `private` против `#private`

Два способа сделать член закрытым отличаются тем, кто его защищает.

`private` - модификатор TypeScript. После стирания типов это обычное
свойство: оно видно в `Object.keys`, в отладчике, в `JSON.stringify`, и
доступно любому коду, обошедшему проверку типов:

```ts
const account = new Account('a1');
const leaked = (account as unknown as { history: number[] }).history; // компилируется
```

```
private history: [] | keys: [ 'history' ]
```

`#private` - синтаксис JavaScript (ES2022). Поле с `#` недоступно снаружи
класса на уровне языка: обращение `account.#pin` вне класса - синтаксическая
ошибка движка, `account['#pin']` возвращает `undefined`, в `Object.keys` поля
нет.

```
SyntaxError: Private field '#pin' must be declared in an enclosing class
```

| | `private` | `#private` |
| --- | --- | --- |
| Кто проверяет | компилятор | движок JavaScript |
| После стирания | обычное свойство | недоступно |
| Обход через `as any` | да | нет |
| Обращение | `this.history` | `this.#pin`, имя с `#` - часть идентификатора |
| `target` ниже ES2022 | без изменений | переписывается через `WeakMap`, медленнее |
| Совместимость типов | номинальная: одно объявление ([1.1](type-system.md#11-структурная-типизация-и-совместимость-типов)) | номинальная |
| Проверка принадлежности | нет | `#pin in value` |

Последняя строка - способ узнать, что объект создан именно этим классом,
надежнее `instanceof`: проверка `#pin in value` истинна только для
экземпляров `Account` и служит [предикатом типа](narrowing.md#73-пользовательские-предикаты-типов-value-is-t):

```ts
class Account2 {
  #pin = '0000';

  static isAccount(value: unknown): value is Account2 {
    return typeof value === 'object' && value !== null && #pin in value;
  }
}
```

Выбор: `#private` там, где закрытость нужна в рантайме, - библиотечный код,
защита инвариантов от чужого кода; `private` - для внутреннего кода
приложения, где достаточно проверки компилятором, а поле должно оставаться
видимым в отладчике и сериализации.

### Аксессоры

`get` и `set` объявляют вычисляемое свойство. Тип параметра `set` выводится
из типа `get`; аксессор только с `get` - `readonly`-свойство:

```ts
class Temperature {
  private celsius = 0;

  get fahrenheit(): number {
    return this.celsius * 1.8 + 32;
  }

  set fahrenheit(value: number) {
    this.celsius = (value - 32) / 1.8;
  }

  get kelvin(): number {
    return this.celsius + 273.15;
  }
}

const temperature = new Temperature();
temperature.fahrenheit = 212;

// temperature.kelvin = 300;
// Ошибка TS2540: Cannot assign to 'kelvin' because it is a read-only property.
```

---

## 6.3 Статические члены и `typeof Class`

**Статический член** - свойство или метод самого класса (функции-конструктора),
а не его экземпляров. Объявление класса создает два типа: **тип экземпляра**
с именем класса и **тип конструктора** `typeof Class`, к которому и
относятся статические члены.

```ts
class Counter {
  static instances = 0;
  static readonly LIMIT = 100;

  static {
    // Статический блок: инициализация, которой мало одного выражения.
    Counter.instances = 0;
  }

  count = 0;

  constructor() {
    Counter.instances += 1;
  }

  static create(): Counter {
    return new Counter();
  }
}

const counter = Counter.create(); // Counter - тип экземпляра
type CounterClass = typeof Counter; // тип конструктора

// counter.instances;
// Ошибка TS2576: Property 'instances' does not exist on type 'Counter'. Did you mean to access the static member 'Counter.instances' instead?
// Counter.count;
// Ошибка TS2339: Property 'count' does not exist on type 'typeof Counter'.
```

Статические члены не могут ссылаться на параметры типа класса: параметр
относится к экземпляру, а статическое свойство одно на все экземпляры с
любыми аргументами типа.

```ts
// class Box<T> {
//   static empty: T;
// }
// Ошибка TS2302: Static members cannot reference class type parameters.
```

Статические члены наследуются: `Savings.create()` существует, если `create`
объявлен в `Account`, - в JavaScript конструктор наследника имеет
конструктор родителя в цепочке прототипов. Разбор `typeof Class` как
операции над типами - в
[8.2](type-operators.md#82-typeof-в-контексте-типов-тип-значения-функции-класса),
применение в обобщенных фабриках - в
[6.6](#66-тип-экземпляра-и-тип-конструктора-ограничение-на-конструктор-миксины).

---

## 6.4 Наследование: `extends`, `super`, `override`, абстрактные классы

```ts
class Shape {
  constructor(public readonly name: string) {}

  area(): number {
    return 0;
  }

  describe(): string {
    return `${this.name}: ${this.area()}`;
  }
}

class Circle extends Shape {
  constructor(public readonly radius: number) {
    super('circle');
  }

  override area(): number {
    return Math.PI * this.radius ** 2;
  }
}

const shape: Shape = new Circle(1); // Circle ⊆ Shape
shape.describe(); // вызывает area() из Circle
```

Правила, которые проверяет компилятор:

| Правило | Ошибка |
| --- | --- |
| Конструктор наследника вызывает `super()` | TS2377 `Constructors for derived classes must contain a 'super' call` |
| `super()` вызывается до обращения к `this` | TS17009 `'super' must be called before accessing 'this'` |
| Переопределение совместимо с базовым членом | TS2416 `Property 'area' in type 'Circle' is not assignable to the same property in base type 'Shape'` |
| Переопределение помечено `override` при `noImplicitOverride` | TS4114 ([2.6](tsconfig.md#26-дополнительные-проверки-nouncheckedindexedaccess-exactoptionalpropertytypes-noimplicitoverride-и-другие)) |

Первые два - требования JavaScript, компилятор лишь сообщает о них раньше.
Третье - структурное: наследник должен оставаться присваиваемым базовому
типу, поэтому `area(): string` в `Circle` при `area(): number` в `Shape`
отвергается. Четвертое защищает от переименования в базовом классе: без
`override` метод наследника молча стал бы самостоятельным методом, который
базовый код не вызывает.

### Абстрактные классы

**Абстрактный класс** - класс, который нельзя инстанцировать; он задает
общую реализацию и объявляет **абстрактные члены**, которые обязан
реализовать наследник.

```ts
abstract class Report {
  /**
   * Собирает отчет из заголовка и тела.
   *
   * Шаблонный метод: последовательность фиксирована здесь, тело
   * поставляет наследник.
   */
  generate(): string {
    return `${this.header()}\n${this.body()}`;
  }

  protected header(): string {
    return '== report ==';
  }

  protected abstract body(): string;
}

class SalesReport extends Report {
  protected body(): string {
    return 'sales: 42';
  }
}

const report: Report = new SalesReport();
report.generate();

// new Report();
// Ошибка TS2511: Cannot create an instance of an abstract class.
// class EmptyReport extends Report {}
// Ошибка TS2515: Non-abstract class 'EmptyReport' does not implement inherited abstract member body from class 'Report'.
```

Абстрактный класс отличается от интерфейса тем, что несет реализацию и
состояние; от обычного класса - тем, что описывает незавершенную сущность и
запрещает ее создавать. Выбор между ними - вопрос проектирования: интерфейс
описывает контракт без обязательств по наследованию, абстрактный класс
разделяет код между наследниками.

### Полиморфный `this`

Тип `this` в позиции результата означает «тип того экземпляра, у которого
вызван метод», а не тип класса, где метод объявлен. На этом строятся цепочки
вызовов, не теряющие тип наследника:

```ts
class QueryBuilder {
  protected parts: string[] = [];

  where(condition: string): this {
    this.parts.push(`WHERE ${condition}`);
    return this;
  }
}

class PostgresQueryBuilder extends QueryBuilder {
  returning(columns: string): this {
    this.parts.push(`RETURNING ${columns}`);
    return this;
  }
}

const query = new PostgresQueryBuilder().where('id = 1').returning('*'); // PostgresQueryBuilder
```

С возвращаемым типом `QueryBuilder` вместо `this` вызов `.where(...)` терял
бы `returning`, и цепочку пришлось бы прерывать.

---

## 6.5 `implements`: класс как реализация интерфейса, структурная совместимость

**`implements`** - проверка того, что тип экземпляра класса совместим с
интерфейсом. Класс может реализовать несколько интерфейсов и объектный тип,
заданный псевдонимом.

```ts
interface Serializable {
  serialize(): string;
}
interface Named {
  readonly name: string;
}

class User implements Serializable, Named {
  constructor(public readonly name: string) {}

  serialize(): string {
    return JSON.stringify({ name: this.name });
  }
}

type PointLike = { x: number; y: number };
class Point implements PointLike {
  constructor(
    public x: number,
    public y: number,
  ) {}
}

// class Missing implements Serializable {}
// Ошибка TS2420: Class 'Missing' incorrectly implements interface 'Serializable'.
//   Property 'serialize' is missing in type 'Missing' but required in type 'Serializable'.
```

### Что `implements` не делает

`implements` только **проверяет** - он ничего не добавляет к типу класса.
Необязательный член интерфейса, не объявленный в классе, в классе не
появляется:

```ts
interface Logger {
  log(message: string): void;
  flush?(): void;
}

class ConsoleLogger implements Logger {
  log(message: string): void {
    console.log(message);
  }
}

const logger = new ConsoleLogger();
// logger.flush?.();
// Ошибка TS2339: Property 'flush' does not exist on type 'ConsoleLogger'.
```

Тип `logger` - `ConsoleLogger`, а не `Logger`, и `flush` в нем нет. Чтобы
работать с классом через контракт, переменную аннотируют интерфейсом:
`const logger: Logger = new ConsoleLogger()`.

Второе, чего `implements` не проверяет, - статическую сторону. Интерфейс
описывает экземпляр; требование «у класса есть статический метод
`fromJson`» выражается присваиванием самого класса в переменную с типом
интерфейса:

```ts
interface FromJson<T> {
  fromJson(json: string): T;
}

class User2 {
  constructor(public readonly name: string) {}

  static fromJson(json: string): User2 {
    return new User2(String(JSON.parse(json).name));
  }
}

const userStatics: FromJson<User2> = User2; // проверка статической стороны

// class NoFactory {}
// const missingStatics: FromJson<NoFactory> = NoFactory;
// Ошибка TS2741: Property 'fromJson' is missing in type 'typeof NoFactory' but required in type 'FromJson<NoFactory>'.
```

### Структурная совместимость

Класс как тип - структурный, как и все остальное
([1.1](type-system.md#11-структурная-типизация-и-совместимость-типов)):
объектный литерал с теми же публичными членами присваивается переменной
типа класса, а `implements` для этого не нужен:

```ts
const structural: Point = { x: 1, y: 2 }; // допустимо: у Point только публичные поля
```

Совместимость перестает быть структурной, как только в классе появляется
`private` или `protected` член: литерал такого члена иметь не может, а
чужой класс с одноименным приватным членом не считается совместимым:

```ts
// class Labeled {
//   constructor(public x: number, private label: string) {}
// }
// const fake: Labeled = { x: 1, label: 'p' };
// Ошибка TS2322: Property 'label' is private in type 'Labeled' but not in type '{ x: number; label: string; }'.
```

Отсюда следствие для `instanceof`: проверка `value instanceof Point`
([7.2](narrowing.md#72-встроенные-проверки-typeof-instanceof-in)) сужает тип
до `Point`, но объект `{ x: 1, y: 2 }`, присвоенный переменной типа `Point`,
ее не пройдет - он создан не конструктором. Тип и происхождение - разные
вещи.

---

## 6.6 Тип экземпляра и тип конструктора, ограничение на конструктор, миксины

Объявление `class Point` создает значение `Point` (конструктор) и два типа:
`Point` - тип экземпляра, `typeof Point` - тип конструктора. Из второго
извлекаются оба через utility types
([9.5](generics.md#95-встроенные-utility-types)):

```ts
class Point {
  constructor(
    public x: number,
    public y: number,
  ) {}
}

type Instance = InstanceType<typeof Point>; // Point
type Params = ConstructorParameters<typeof Point>; // [x: number, y: number]
```

### Ограничение на конструктор

Обобщенная функция не может написать `new T()`: параметр типа стирается, и
в рантайме создавать нечего
([1.7](type-system.md#17-стирание-типов-что-остается-в-javascript)):

```ts
// function createBad<T>(): T {
//   return new T();
// Ошибка TS2693: 'T' only refers to a type, but is being used as a value here.
```

Конструктор передается как обычный аргумент с типом сигнатуры конструктора
([5.1](functions.md#51-тип-функции-сигнатура-псевдоним-типа-сигнатуры-вызова-и-конструктора-в-интерфейсе)).
Параметры типа выводятся из него - и тип экземпляра, и список аргументов:

```ts
/**
 * Создает экземпляр переданного класса.
 *
 * T выводится из типа экземпляра конструктора, A - из его параметров,
 * поэтому аргументы проверяются как при прямом вызове new.
 */
function build<T, A extends unknown[]>(Ctor: new (...args: A) => T, ...args: A): T {
  return new Ctor(...args);
}

const built = build(Point, 1, 2); // Point
```

Абстрактный класс сигнатуре `new () => T` не соответствует - его нельзя
вызвать с `new`. Для параметров, принимающих и абстрактные классы (реестры,
контейнеры), есть форма `abstract new () => T`:

```ts
abstract class Widget {
  abstract render(): string;
}
class Button extends Widget {
  render(): string {
    return '<button>';
  }
}

function registry(Ctor: abstract new () => Widget): string {
  return Ctor.name;
}
registry(Widget);
registry(Button);

// function instantiate(Ctor: new () => Widget): Widget {
//   return new Ctor();
// }
// instantiate(Widget);
// Ошибка TS2345: Argument of type 'typeof Widget' is not assignable to parameter of type 'new () => Widget'.
//   Cannot assign an abstract constructor type to a non-abstract constructor type.
```

### Миксины

**Миксин** - функция, принимающая класс и возвращающая его наследника с
дополнительными членами. Это способ композиции поведения без единой иерархии:
`Tagged(Timestamped(Article))` дает класс со всеми членами трех источников.

```ts
type Constructor<T = object> = new (...args: any[]) => T;

/**
 * Добавляет классу поле createdAt.
 *
 * Ограничение Constructor с any[] в параметрах обязательно: наследник
 * должен принимать любые аргументы базового конструктора.
 */
function Timestamped<TBase extends Constructor>(Base: TBase) {
  return class extends Base {
    readonly createdAt = new Date();
  };
}

/**
 * Добавляет метод tag(), требуя от базового класса поле name.
 */
function Tagged<TBase extends Constructor<{ name: string }>>(Base: TBase) {
  return class extends Base {
    tag(): string {
      return `#${this.name}`;
    }
  };
}

class Article {
  constructor(public name: string) {}
}

const TaggedArticle = Tagged(Timestamped(Article));
const article = new TaggedArticle('news');
article.tag(); // '#news'
article.createdAt; // Date
```

Ограничение `Constructor<{ name: string }>` требует от входного класса
поле `name` - так миксин объявляет свои зависимости. Здесь `any[]` в
сигнатуре конструктора неизбежен: миксин не знает, какие аргументы принимает
базовый класс, а `unknown[]` отверг бы любой конкретный конструктор
([5.6](functions.md#56-совместимость-функций-число-параметров-вариантность-strictfunctiontypes)).

Цена миксинов - потеря явной структуры: тип `TaggedArticle` - анонимный
класс, его нельзя объявить абстрактным и сложно документировать. Для двух-трех
примесей это приемлемо, для больших иерархий предпочтительнее композиция
объектов.

---

## Типичные ошибки

1. **Инициализация в методе, вызванном из конструктора.** Компилятор
   засчитывает только присваивания в самом конструкторе; поле остается
   «не инициализированным» (TS2564).
2. **Инициализатор поля читает параметр-свойство.** При `target` ES2022 поля
   инициализируются до тела конструктора, и значение - `undefined`
   (TS2729). Вычисление переносится в конструктор.
3. **Повторное объявление поля в наследнике без инициализатора.** При
   `[[Define]]`-семантике это новое поле со значением `undefined` (TS2612).
   Для уточнения типа - `declare`.
4. **`private` как защита в рантайме.** Модификатор стирается; поле видно и
   доступно. Защита в рантайме - `#private`.
5. **Ожидание, что `implements` добавит члены.** Необязательный метод
   интерфейса, не объявленный в классе, в классе отсутствует; переменная с
   типом класса его не имеет.
6. **Статический член в интерфейсе для `implements`.** `implements` проверяет
   только экземпляр; статическая сторона проверяется присваиванием класса в
   переменную с типом интерфейса.
7. **`new T()` в обобщенной функции.** Параметр типа - не значение;
   конструктор передается аргументом с типом `new (...) => T`.
8. **Возвращаемый тип класса вместо `this` в цепочке.** Метод базового
   класса, возвращающий `QueryBuilder`, обрывает цепочку для наследника.
9. **Абстрактный класс в параметр `new () => T`.** Отвергается; для
   реестров классов используется `abstract new () => T`.

---

[← Функции](functions.md) · [К содержанию](../README.md) ·
[Далее: сужение типов →](narrowing.md)
