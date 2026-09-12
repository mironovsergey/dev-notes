# 8 Операторы над типами

[← К содержанию](../README.md)

Типы в TypeScript - не только объявления. Из существующего типа или значения
можно получить новый: набор ключей, тип свойства, тип выражения, точный
литерал. Тема разбирает эти операторы по одному и заканчивается тремя
конструкциями, которые не выводят тип, а **утверждают** его: `as const`,
`satisfies` и `as` - от самой безопасной к самой опасной. Все они вместе -
основа для обобщений и отображаемых типов ([9](generics.md#9-обобщенные-типы),
[10](mapped-and-conditional-types.md#10-отображаемые-и-условные-типы)),
где из простых операторов собираются сложные.

---

## 8.1 `keyof`: ключи объектного типа, поведение с индексными сигнатурами и массивами

**`keyof T`** - объединение литеральных типов всех ключей объектного типа
`T`, включая необязательные и `readonly`.

```ts
interface User {
  id: number;
  name: string;
  email?: string;
  readonly createdAt: Date;
}

type UserKeys = keyof User; // 'id' | 'name' | 'email' | 'createdAt'
```

`keyof` превращает «имя свойства» из строки, которую компилятор не
проверяет, в тип, который проверяет. Функция, принимающая имя свойства,
объявляет параметр `K extends keyof T` - и опечатка в имени становится
ошибкой, а тип результата `T[K]` - точным:

```ts
/**
 * Возвращает свойство объекта по имени.
 *
 * Ограничение K extends keyof T отвергает несуществующие ключи, а тип
 * результата T[K] зависит от переданного ключа, а не от объединения всех
 * значений.
 */
function getProperty<T, K extends keyof T>(target: T, key: K): T[K] {
  return target[key];
}

const user: User = { id: 1, name: 'Ann', createdAt: new Date() };
const name = getProperty(user, 'name'); // string
const email = getProperty(user, 'email'); // string | undefined

// getProperty(user, 'age');
// Ошибка TS2345: Argument of type '"age"' is not assignable to parameter of type 'keyof User'.

function pluck<T, K extends keyof T>(items: T[], key: K): T[K][] {
  return items.map((item) => item[key]);
}
const ids = pluck([user], 'id'); // number[]
```

### Индексные сигнатуры, массивы, кортежи

Для типов без фиксированного набора ключей `keyof` возвращает тип ключа
сигнатуры - с одной особенностью:

| Тип | `keyof` | Почему |
| --- | --- | --- |
| `{ [key: string]: number }` | `string \| number` | числовой ключ в JavaScript приводится к строке, `obj[0]` и `obj['0']` - одно свойство |
| `{ [index: number]: string }` | `number` | |
| `{ 0: string; 1: string }` | `0 \| 1` | числовые литералы остаются числами |
| `string[]` | `number \| 'length' \| 'push' \| ...` | все члены `Array<string>` |
| `[string, number]` | `'0' \| '1' \| 'length' \| ...` | индексы кортежа - строковые литералы |
| `any` | `string \| number \| symbol` | то же, что `PropertyKey` |

Из-за `symbol` и `number` в общем случае ключ нельзя напрямую подставить
в шаблонный литерал, которому нужна строка. Для этого множество ключей
сужается: `Extract<keyof T, string>` или короче `string & keyof T`
([11.4](template-literal-types.md#114-шаблонные-литералы-в-отображаемых-типах-геттеры-обработчики-событий)).

### `keyof` от объединения и пересечения

Ключи объединения - только общие: у значения типа `A | B` гарантированно
есть лишь то, что есть у обоих. Ключи пересечения - все вместе:

```ts
type A = { id: number; name: string };
type B = { id: number; email: string };

type UnionKeys = keyof (A | B); // 'id'
type IntersectionKeys = keyof (A & B); // 'id' | 'name' | 'email'
```

Это та же логика, что для доступа к членам объединения
([4.3](object-types.md#43-объединения-доступ-к-общим-членам-литеральные-объединения-размеченные-объединения)):
`keyof (A | B) = keyof A & keyof B`, а `keyof (A & B) = keyof A | keyof B`.

---

## 8.2 `typeof` в контексте типов: тип значения, функции, класса

**`typeof x`** в позиции типа - тип значения `x`: переменной, свойства,
функции, класса. Это не оператор JavaScript `typeof`, возвращающий строку
([1.2](type-system.md#12-примитивные-и-литеральные-типы)); компилятор
различает их по позиции.

```ts
const config = {
  host: 'localhost',
  port: 3000,
  features: ['auth', 'cache'],
};
type Config = typeof config; // { host: string; port: number; features: string[] }

const configConst = {
  host: 'localhost',
  port: 3000,
  features: ['auth', 'cache'],
} as const;
type ConfigConst = typeof configConst;
// { readonly host: 'localhost'; readonly port: 3000; readonly features: readonly ['auth', 'cache'] }
```

`typeof` берет тип таким, каким его вывел компилятор. Для объектного
литерала это расширенные типы ([1.3](type-system.md#13-аннотации-и-вывод-типов-расширение-литералов)),
и получить из значения точные литералы можно только вместе с `as const`
([8.4](#84-as-const-литеральные-типы-readonly-на-всех-уровнях-словари-констант)).

### Функции, классы, перечисления

```ts
function createUser(name: string, age: number) {
  return { id: Math.random(), name, age };
}

type CreateUser = typeof createUser; // (name: string, age: number) => { id: number; name: string; age: number }
type User = ReturnType<typeof createUser>; // { id: number; name: string; age: number }
type CreateUserParams = Parameters<typeof createUser>; // [name: string, age: number]

class UserService {
  find(id: string): string {
    return id;
  }
}
type ServiceInstance = UserService; // тип экземпляра
type ServiceClass = typeof UserService; // тип конструктора

enum Status {
  Active = 'ACTIVE',
  Inactive = 'INACTIVE',
}
type StatusNames = keyof typeof Status; // 'Active' | 'Inactive'
```

`ReturnType<typeof f>` - способ получить тип, который никто не объявлял:
результат фабрики, форма объекта из библиотеки без экспортированного типа.
Имя класса в позиции типа - тип экземпляра; тип самого класса - только через
`typeof` ([6.3](classes.md#63-статические-члены-и-typeof-class)). Имя
перечисления в позиции типа - объединение его членов, а `typeof Status` -
объект с ключами-именами, и `keyof typeof` дает имена
([3.3](arrays-tuples-enums.md#33-перечисления-числовые-строковые-const-enum-представление-в-javascript)).

### `keyof typeof`

Сочетание, которое встречается чаще каждого из операторов по отдельности:
множество ключей объекта-значения. Так из словаря функций получается тип его
имен, и вызов по имени становится проверяемым:

```ts
const validators = {
  email: (value: string) => value.includes('@'),
  phone: (value: string) => /^\d{10}$/.test(value),
};

type ValidatorName = keyof typeof validators; // 'email' | 'phone'

function validate(kind: ValidatorName, value: string): boolean {
  const validator = validators[kind];
  return validator(value);
}
```

### Ограничения

`typeof` применяется к идентификатору или цепочке свойств, но не к
произвольному выражению: `typeof createUser('Ann')` - синтаксическая ошибка,
тип результата вызова - `ReturnType<typeof createUser>`. Запись
`typeof config['host']` разбирается как `(typeof config)['host']` - индексный
доступ к типу, а не тип значения `config['host']`; результат тот же, но по
другой причине.

---

## 8.3 Индексный доступ `T[K]` и `T[number]`

**Индексный доступ** `T[K]` - тип свойства `K` в типе `T`. `K` - тип
ключа: литерал, объединение литералов, `keyof T` или `number` для массивов.

```ts
interface ApiResponse {
  status: number;
  data: {
    users: { id: string; name: string; tags?: string[] }[];
    total: number;
  };
}

type Data = ApiResponse['data'];
type Users = Data['users']; // массив
type User = Users[number]; // элемент массива: { id: string; name: string; tags?: string[] }
type UserId = User['id']; // string
type Tags = User['tags']; // string[] | undefined
type StatusOrTotal = ApiResponse['status' | 'data']; // number | Data
type AllValues = User[keyof User]; // string | string[] | undefined
```

Индексный доступ достает тип, объявленный внутри другого, - без выделения
его в отдельное имя. Для ответов API, объявленных одним большим типом, это
единственный способ ссылаться на вложенные части. `T[number]` - тип элемента
массива или объединение типов элементов кортежа; `T[0]` - тип конкретной
позиции кортежа.

```ts
type Pair = [string, number];
type First = Pair[0]; // string
type Element = Pair[number]; // string | number
```

Индекс - тип, а не значение. Переменная в позиции индекса не подходит,
нужен `typeof`:

```ts
const key = 'name';

// type ByValue = User[key];
// Ошибка TS2749: 'key' refers to a value, but is being used as a type here. Did you mean 'typeof key'?

type ByConst = User[typeof key]; // string

// type Missing = User['age'];
// Ошибка TS2339: Property 'age' does not exist on type 'User'.
```

Вместе с обобщениями индексный доступ дает точный тип результата в
зависимости от аргумента - `T[K]` в `getProperty` из
[8.1](#81-keyof-ключи-объектного-типа-поведение-с-индексными-сигнатурами-и-массивами).
В отображаемых типах `T[P]` - способ сослаться на исходный тип свойства при
его преобразовании ([10.1](mapped-and-conditional-types.md#101-отображаемые-типы-p-in-keyof-t-гомоморфность-модификаторы-readonly-и-)).

---

## 8.4 `as const`: литеральные типы, `readonly` на всех уровнях, словари констант

**`as const`** - утверждение, которое просит компилятор вывести для литерала
самый узкий тип: литеральные типы вместо примитивов, `readonly`-свойства,
`readonly`-кортежи вместо массивов - на всех уровнях вложенности.

```ts
const ROUTES = {
  home: '/',
  profile: '/profile/:id',
  settings: {
    general: '/settings/general',
    security: '/settings/security',
  },
} as const;

type Routes = typeof ROUTES;
// {
//   readonly home: '/';
//   readonly profile: '/profile/:id';
//   readonly settings: { readonly general: '/settings/general'; readonly security: '/settings/security' };
// }

// ROUTES.home = '/index';
// Ошибка TS2540: Cannot assign to 'home' because it is a read-only property.
```

Без `as const` объект получил бы `home: string`, и путь `'/'` был бы
неотличим от любой другой строки. `as const` - это не утверждение о
существующем типе, а указание, как выводить: оно не может ошибиться, потому
что литерал перед ним и есть самое точное описание значения. В JavaScript
от него ничего не остается.

### Словари констант

Главное применение - объекты и массивы, из которых выводятся объединения
литералов ([3.4](arrays-tuples-enums.md#34-enum-против-объединения-литералов-и-объекта-as-const)):

```ts
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NOT_FOUND: 404,
} as const;
type HttpStatus = (typeof HTTP_STATUS)[keyof typeof HTTP_STATUS]; // 200 | 201 | 404

const METHODS = ['GET', 'POST', 'PUT'] as const; // readonly ['GET', 'POST', 'PUT']
type Method = (typeof METHODS)[number]; // 'GET' | 'POST' | 'PUT'

const prefix = 'api';
const path = `/${prefix}/users` as const; // '/api/users'
```

Три оператора темы здесь работают вместе: `as const` сохраняет литералы,
`typeof` берет тип значения, `keyof` и `[number]` перечисляют его члены.

### Ограничения

`as const` применим только к литералам - строк, чисел, логических значений,
массивов, объектов - и к членам перечислений. Результат вызова функции или
переменная так не уточняются:

```ts
// const computed = build() as const;
// Ошибка TS1355: A 'const' assertion can only be applied to references to enum members, or string, number, boolean, array, or object literals.
```

Полученные кортежи - `readonly`, и в параметр с изменяемым типом кортежа они
не проходят ([3.2](arrays-tuples-enums.md#32-кортежи-фиксированная-длина-необязательные-и-rest-элементы-именованные-элементы)).

### `const`-параметры типа

Функция, принимающая словарь или список, обычно хочет вывести литералы без
того, чтобы каждый вызывающий писал `as const`. Модификатор `const` у
параметра типа (TypeScript 5.0) делает это на стороне функции:

```ts
function defineRoutes<const T extends Record<string, string>>(routes: T): T {
  return routes;
}

const defined = defineRoutes({ home: '/', about: '/about' });
// { readonly home: '/'; readonly about: '/about' } - без as const у вызывающего

function pair<const T extends readonly unknown[]>(...items: T): T {
  return items;
}
const tuple = pair('x', 1); // readonly ['x', 1]
```

Без `const` те же вызовы дали бы `{ home: string; about: string }` и
`(string | number)[]`. Это стандартный прием для функций-конфигураторов:
маршрутов, схем, наборов действий.

---

## 8.5 `satisfies`: проверка без расширения типа

**`satisfies T`** (TypeScript 4.9) - проверка того, что выражение
присваиваемо типу `T`, при которой тип самого выражения остается выведенным,
а не заменяется на `T`.

Оператор закрывает разрыв между двумя способами объявить константу.
Аннотация проверяет, но **расширяет**: тип переменной становится типом
аннотации, и все, что компилятор знал о конкретном значении, теряется. Вывод
сохраняет точность, но **не проверяет**:

```ts
type Color = string | [number, number, number];

const paletteAnnotated: Record<string, Color> = {
  red: [255, 0, 0],
  green: '#00ff00',
};
// paletteAnnotated.green.toUpperCase();
// Ошибка TS2339: Property 'toUpperCase' does not exist on type 'Color'.
// paletteAnnotated.missing - тоже Color: ключи потеряны

const paletteInferred = {
  red: [255, 0, 0], // number[] - никто не проверил, что это Color
  green: '#00ff00',
};

const palette = {
  red: [255, 0, 0],
  green: '#00ff00',
} satisfies Record<string, Color>;

palette.green.toUpperCase(); // green: string
palette.red.map((channel) => channel / 255); // red: [number, number, number]
// palette.missing - ошибка: ключи известны
```

Тип `palette.red` - кортеж, а не `number[]`: `satisfies` не только
проверяет, но и дает литералу **контекстный тип**, по которому `[255, 0, 0]`
выводится как `[number, number, number]`. То же происходит с параметрами
функций и дискриминантами внутри литерала.

Проверка `satisfies` - полная: несовместимое значение, недостающий ключ и
лишнее свойство свежего литерала ([4.2](object-types.md#42-проверка-избыточных-свойств-и-свежесть-объектного-литерала))
отвергаются:

```
// blue: [0, 0]
Ошибка TS2322: Type '[number, number]' is not assignable to type 'Color'.
// { colour: '#fff' } satisfies { color?: string }
Ошибка TS2561: Object literal may only specify known properties, but 'colour' does not exist in type '{ color?: string | undefined; }'. Did you mean to write 'color'?
// { click } satisfies Record<'click' | 'focus', () => void>
Ошибка TS2741: Property 'focus' is missing in type '{ click: () => void; }' but required in type 'Handlers'.
```

### `as const satisfies`

Сочетание дает точные литералы **и** проверку контракта - стандартная форма
для словарей:

```ts
const ROUTES = {
  home: '/',
  profile: '/profile/:id',
} as const satisfies Record<string, `/${string}`>;

type Route = (typeof ROUTES)[keyof typeof ROUTES]; // '/' | '/profile/:id'
```

Здесь `satisfies` отвергнет маршрут без ведущего `/`, а `as const` сохранит
каждый путь как литерал. Порядок - именно `as const satisfies`: сначала
уточнение вывода, потом проверка результата.

| | Аннотация `: T` | `satisfies T` | Без ничего |
| --- | --- | --- | --- |
| Проверка соответствия `T` | да | да | нет |
| Тип переменной | `T` | выведенный | выведенный |
| Известны ли ключи и литералы | нет | да | да |
| Контекстный тип для литерала | да | да | нет |

Оператор нужен для констант, у которых важен и контракт, и точная форма:
конфигурации, словари обработчиков, таблицы маршрутов, тестовые данные.
Для параметров и полей, где тип - часть контракта, остается аннотация.
Форма `expr satisfies never` служит проверкой полноты
([7.5](narrowing.md#75-размеченные-объединения-и-проверка-полноты-через-never)).

---

## 8.6 Утверждения типов: `as`, `!`, двойное утверждение через `unknown`, границы допустимого

**Утверждение типа** `expr as T` - указание компилятору считать выражение
имеющим тип `T` без проверки в рантайме. Утверждение не преобразует
значение: после стирания типов от него не остается ничего.

```ts
interface Point {
  x: number;
  y: number;
}

const parsed = JSON.parse('{"x":1}') as Point; // компилятор верит
```

```
parsed.y: undefined | parsed.y.toFixed: TypeError
```

Утверждение - место, где ответственность переходит от компилятора к автору,
как и у предикатов типов ([7.3](narrowing.md#73-пользовательские-предикаты-типов-value-is-t)).
Разница в том, что предикат хотя бы содержит проверку; утверждение не
содержит ничего.

### Что компилятор все же проверяет

`as` допустим, только если типы **достаточно пересекаются**: один из них
присваиваем другому. Это отсекает утверждения, которые не могут быть верны
ни при каких данных, но пропускает все остальные:

```ts
const widened = 'admin' as string; // допустимо: литерал ⊆ string, безопасно
const narrowed = 'admin' as 'admin' | 'user'; // допустимо: сужение литерала

const incomplete = { x: 1 } as Point; // допустимо: Point ⊆ { x: number }, хотя y нет
const extra = { x: 1, y: 2, z: 3 } as Point; // допустимо: проверка избыточных свойств отключена

// const notNumber = 'text' as number;
// Ошибка TS2352: Conversion of type 'string' to type 'number' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
```

Строки с `incomplete` и `extra` - причина, по которой `as` не заменяет
аннотацию у объектного литерала: `const p: Point = { x: 1 }` - ошибка
TS2741, `{ x: 1 } as Point` - нет.

**Двойное утверждение** `as unknown as T` обходит и проверку пересечения:
через `unknown` любой тип совместим с любым. Это явный сигнал «компилятор
здесь выключен», и в коде приложения ему место только в тестах и при
миграции.

### Ненулевое утверждение

`expr!` - утверждение «здесь не `null` и не `undefined`». Оно короче
проверки и ровно настолько же опасно, насколько уверенность автора не
подкреплена кодом:

```ts
function readInput(): string {
  const field = document.querySelector<HTMLInputElement>('#email');
  if (field === null) {
    throw new Error('#email not found'); // понятная ошибка в момент проблемы
  }
  return field.value;
}

function readInputAssertive(): string {
  return document.querySelector<HTMLInputElement>('#email')!.value; // TypeError где-то дальше
}
```

Обе функции упадут, если элемента нет; разница - в сообщении и месте. Для
полей класса форма `field!: T` - определенное присваивание
([6.1](classes.md#61-поля-и-конструктор-инициализация-strictpropertyinitialization-параметры-свойства)).

### Границы допустимого

| Утверждение | Риск | Когда допустимо |
| --- | --- | --- |
| `as const` | нет | всегда: это указание выводу, а не утверждение |
| Расширение: `'a' as string` | нет | редко нужно; чаще - аннотация |
| Сужение после проверки: `el as HTMLInputElement` | низкий | когда проверка выполнена, но компилятор ее не понимает (`tagName === 'INPUT'`) |
| Обобщенный параметр вместо `as`: `querySelector<HTMLInputElement>(...)` | тот же | предпочтительнее `as` - без синтаксиса утверждения |
| Конструктор branded type: `raw as UserId` | контролируемый | единственная точка входа, [4.4](object-types.md#44-пересечения-слияние-свойств-конфликт-свойств-и-never-branded-types) |
| `!` | средний | после проверки, которую нельзя выразить; никогда - вместо проверки |
| `JSON.parse(...) as T` | высокий | никогда: это `unknown`, [7.6](narrowing.md#76-паттерны-тип-результата-состояние-асинхронной-операции-валидация-unknown-на-границе) |
| `as unknown as T`, `as any` | полный | тесты, миграция |

Синтаксис `<T>expr` равнозначен `expr as T`, но недоступен в `.tsx`, где
угловые скобки - JSX. Правила typescript-eslint `consistent-type-assertions`,
`no-unnecessary-type-assertion` и `no-non-null-assertion`
([19.4](testing-and-code-quality.md#194-eslint-и-typescript-eslint-type-aware-правила-конфигурации-ключевые-правила))
закрепляют границы на уровне проекта.

---

## 8.7 `extends` и `in`: контексты применения

Два ключевых слова встречаются в четырех и трех контекстах соответственно,
и в каждом означают свое. Единая модель для `extends` вне наследования -
«присваиваемо», то есть «подмножество».

| `extends` | Контекст | Смысл | Раздел |
| --- | --- | --- | --- |
| `interface Dog extends Animal` | объявление интерфейса | наследование членов | [4.5](object-types.md#45-type-против-interface-расширение-слияние-деклараций-выбор) |
| `class Circle extends Shape` | объявление класса | наследование реализации | [6.4](classes.md#64-наследование-extends-super-override-абстрактные-классы) |
| `<K extends keyof T>` | параметр типа | ограничение: `K` присваиваем `keyof T` | [9.4](generics.md#94-ограничения-extends-keyof-пересечение-ограничений) |
| `T extends string ? A : B` | условный тип | проверка: `T` присваиваем `string` | [10.3](mapped-and-conditional-types.md#103-условные-типы-синтаксис-отложенное-вычисление-сужение-в-ветках) |

| `in` | Контекст | Смысл | Раздел |
| --- | --- | --- | --- |
| `'name' in value` | выражение | проверка наличия свойства, сужает тип | [7.2](narrowing.md#72-встроенные-проверки-typeof-instanceof-in) |
| `#secret in value` | выражение | проверка принадлежности классу | [6.2](classes.md#62-модификаторы-доступа-public-protected-private-readonly-private-против-private) |
| `{ [K in keyof T]: ... }` | отображаемый тип | перебор ключей | [10.1](mapped-and-conditional-types.md#101-отображаемые-типы-p-in-keyof-t-гомоморфность-модификаторы-readonly-и-) |

```ts
interface Animal {
  name: string;
}
interface Dog extends Animal {
  breed: string;
}

function rename<T extends Animal, K extends keyof T>(target: T, key: K, value: T[K]): T {
  return { ...target, [key]: value };
}

type IsDog<T> = T extends Dog ? true : false;
type Flags<T> = { [K in keyof T]: boolean };

function hasBreed(value: Animal): value is Dog {
  return 'breed' in value;
}
```

Две ловушки чтения:

- `T extends U` в ограничении и в условном типе - **не** «`T` наследует
  `U`». `'admin' extends string` истинно, `{ x: 1; y: 2 } extends { x: number }`
  истинно: речь о присваиваемости, и наследование тут ни при чем.
- `[K in keyof T]` в отображаемом типе - не проверка, а перебор: `in`
  здесь ближе к `for...in`, чем к оператору `in`.

Условный тип с `extends` дополнительно распределяется по объединениям, и
это отдельное правило со своими последствиями
([10.4](mapped-and-conditional-types.md#104-распределение-по-объединениям-и-его-отключение)).

---

## Типичные ошибки

1. **`keyof` для шаблонного литерала без сужения до строк.** `keyof T`
   включает `number` и `symbol`; для `` `get${K}` `` нужен `string & keyof T`.
2. **`typeof` объектного литерала без `as const`.** Свойства расширены до
   примитивов; литералы не сохраняются. Для словарей - `as const`, для
   функций-конфигураторов - `const`-параметр типа.
3. **Значение в позиции индекса.** `User[key]` при `const key = 'name'` -
   ошибка; нужен `User[typeof key]`.
4. **Аннотация вместо `satisfies` у словаря.** `Record<string, T>`
   стирает набор ключей, и опечатка в имени ключа при чтении не ловится.
5. **`as` вместо аннотации у литерала.** `{ x: 1 } as Point` пропускает
   недостающие и лишние свойства; `const p: Point = ...` - нет.
6. **`as T` для данных извне.** `JSON.parse(text) as User` не проверяет
   ничего; результат `JSON.parse` - `unknown`, и его нужно валидировать.
7. **`!` вместо проверки.** Ошибка сдвигается из места, где ее можно
   осмысленно обработать, в случайную точку дальше по коду.
8. **`extends` прочитан как наследование** в ограничениях и условных
   типах. Смысл - присваиваемость; `'a' extends string` истинно без
   всякого наследования.

---

[← Сужение типов](narrowing.md) · [К содержанию](../README.md) ·
[Далее: обобщенные типы →](generics.md)
