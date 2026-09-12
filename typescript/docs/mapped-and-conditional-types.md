# 10 Отображаемые и условные типы

[← К содержанию](../README.md)

Операторы из [8](type-operators.md#8-операторы-над-типами) достают из типа
его части. Эта тема - о том, как из частей собирать новые типы: перебором
ключей (отображаемые типы), ветвлением по условию (условные типы),
извлечением неизвестных частей по образцу (`infer`) и рекурсией. Это уже
программирование на уровне типов, и у него есть свои базовые случаи,
свои ошибки и свой предел глубины. В конце темы - стандартная библиотека
как набор примеров: каждый utility type из [9.5](generics.md#95-встроенные-utility-types)
умещается в одну-две строки на этих конструкциях.

---

## 10.1 Отображаемые типы: `[P in keyof T]`, гомоморфность, модификаторы `readonly` и `?`

**Отображаемый тип** (mapped type) - объектный тип, свойства которого
получены перебором множества ключей: `{ [P in K]: X }` создает для каждого
члена объединения `K` свойство с типом `X`, где `X` может зависеть от `P`.

```ts
interface User {
  readonly id: string;
  name: string;
  email?: string;
}

type Identity<T> = { [P in keyof T]: T[P] };
// Identity<User> = { readonly id: string; name: string; email?: string }

type Flags = { [K in 'debug' | 'verbose']: boolean };
// { debug: boolean; verbose: boolean }
```

Синтаксис похож на индексную сигнатуру
([4.1](object-types.md#41-свойства-объекта-необязательные-readonly-индексные-сигнатуры-record)),
но `in` здесь - перебор, а не проверка
([8.7](type-operators.md#87-extends-и-in-контексты-применения)): вместо
одного правила «любой ключ типа `K`» создается отдельное свойство для
каждого конкретного члена объединения.

### Гомоморфность

Отображение вида `[P in keyof T]` называется **гомоморфным**: оно
перебирает ключи конкретного типа и **сохраняет его модификаторы** -
`readonly` и `?`. В примере выше `Identity<User>` не потерял ни `readonly`
у `id`, ни `?` у `email`. Отображение по произвольному объединению
(`Flags`) модификаторов не имеет - ему неоткуда их взять.

У гомоморфных отображений есть еще два свойства, которые делают их
пригодными для utility types:

| Аргумент | `Stringify<T> = { [K in keyof T]: string }` |
| --- | --- |
| `[number, boolean]` | `[string, string]` - кортеж остается кортежем |
| `number[]` | `string[]` - массив остается массивом |
| `string` | `string` - примитив проходит без изменений |

Поэтому `Partial<[number, boolean]>` - кортеж с необязательными элементами,
а `Partial<string>` - по-прежнему `string`, а не объект с методами строки.

### Модификаторы

Перед ключом и после него можно добавить или снять модификаторы: `readonly`
и `?` добавляют, `-readonly` и `-?` снимают; форма `+readonly` равносильна
`readonly`.

```ts
type Optional<T> = { [P in keyof T]?: T[P] }; // Partial
type Concrete<T> = { [P in keyof T]-?: T[P] }; // Required
type Frozen<T> = { readonly [P in keyof T]: T[P] }; // Readonly
type Thawed<T> = { -readonly [P in keyof T]: T[P] }; // Mutable

// Concrete<User> = { readonly id: string; name: string; email: string }
// Thawed<User> = { id: string; name: string; email?: string }
```

`-?` не только делает свойство обязательным, но и убирает `undefined`,
добавленный необязательностью: `email: string`, а не `string | undefined`.

Тип свойства `T[P]` - индексный доступ
([8.3](type-operators.md#83-индексный-доступ-tk-и-tnumber)) к исходному
типу; его можно преобразовать: `T[P] | null` дает `Nullable`, `() => T[P]` -
объект геттеров.

---

## 10.2 Переименование и фильтрация ключей через `as`

Конструкция `[K in keyof T as N]` (TypeScript 4.1) заменяет ключ `K` на
тип `N`, вычисленный из `K`. Два применения: переименование через
шаблонные литералы и удаление - если `N` равен `never`, свойство не
создается.

### Переименование

```ts
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};
type Setters<T> = {
  [K in keyof T as `set${Capitalize<string & K>}`]: (value: T[K]) => void;
};

// Getters<{ name: string; age: number }> = { getName: () => string; getAge: () => number }
```

`string & K` отбрасывает ключи-числа и символы, которые нельзя подставить в
шаблонный литерал
([8.1](type-operators.md#81-keyof-ключи-объектного-типа-поведение-с-индексными-сигнатурами-и-массивами));
`Capitalize` - встроенный строковый тип
([11.2](template-literal-types.md#112-встроенные-строковые-типы-uppercase-lowercase-capitalize-uncapitalize)).
Переименование не отменяет гомоморфности: модификаторы исходных свойств
сохраняются и под новыми именами.

### Фильтрация

Ключ, отображенный в `never`, исчезает. Условие может смотреть на имя ключа
или на тип значения:

```ts
type WithoutKind<T> = { [K in keyof T as Exclude<K, 'kind'>]: T[K] };

type DataOnly<T> = {
  [K in keyof T as T[K] extends (...args: never[]) => unknown ? never : K]: T[K];
};

class Point {
  x = 0;
  y = 0;
  move(): void {}
}
// DataOnly<Point> = { x: number; y: number }

type ByValueType<T, V> = { [K in keyof T as T[K] extends V ? K : never]: T[K] };
// ByValueType<{ a: string; b: number; c: string }, string> = { a: string; c: string }
```

`DataOnly` - способ получить из класса тип его данных без методов, например
для сериализации. Практический вариант того же - DTO из модели без
служебных полей:

```ts
interface UserModel {
  id: number;
  email: string;
  password: string;
  createdAt: Date;
}

type UserDTO<T> = {
  [K in keyof T as T[K] extends Date ? never : K extends 'password' ? never : K]: T[K];
};
// UserDTO<UserModel> = { id: number; email: string }
```

### Отображение объединения в словарь

Перебирать можно не только ключи. Отображение по объединению объектных
типов с ключом, взятым из дискриминанта, превращает объединение событий в
словарь «имя события - его тип»:

```ts
interface UserCreated {
  kind: 'user.created';
  userId: string;
}
interface OrderPlaced {
  kind: 'order.placed';
  orderId: string;
}
type Event = UserCreated | OrderPlaced;

type EventMap = { [E in Event as E['kind']]: E };
// { 'user.created': UserCreated; 'order.placed': OrderPlaced }
```

Из такого словаря строится типизированный `on(event, handler)`, где тип
`handler` зависит от имени события
([11.5](template-literal-types.md#115-составные-примеры-типизированный-event-emitter-api-клиент-конструктор-форм)).

---

## 10.3 Условные типы: синтаксис, отложенное вычисление, сужение в ветках

**Условный тип** `T extends U ? X : Y` - тип, равный `X`, если `T`
присваиваем `U`, и `Y` в противном случае. `extends` здесь означает
присваиваемость, а не наследование
([8.7](type-operators.md#87-extends-и-in-контексты-применения)).

```ts
type IsString<T> = T extends string ? true : false;

type A = IsString<'hello'>; // true
type B = IsString<42>; // false
```

Цепочка условий - аналог `if / else if`, и так строится диспетчеризация по
типу:

```ts
type TypeName<T> = T extends string
  ? 'string'
  : T extends number
    ? 'number'
    : T extends boolean
      ? 'boolean'
      : T extends undefined
        ? 'undefined'
        : T extends (...args: never[]) => unknown
          ? 'function'
          : 'object';

type F = TypeName<() => void>; // 'function'
```

### Особые аргументы

| `T` | `IsString<T>` | Почему |
| --- | --- | --- |
| `any` | `boolean` | `any` может быть чем угодно; результат - объединение обеих веток |
| `unknown` | `false` | `unknown` не присваиваем `string` |
| `never` | `never` | распределение по пустому объединению, [10.4](#104-распределение-по-объединениям-и-его-отключение) |

### Сужение в ветках

В ветке `X` компилятор знает, что `T` присваиваем `U`, и разрешает операции,
допустимые для `U`. Без условия `T[number]` на неограниченном `T` - ошибка;
внутри ветки `T extends readonly unknown[]` - нет:

```ts
type ElementOf<T> = T extends readonly unknown[] ? T[number] : never;

type E = ElementOf<string[]>; // string
type N = ElementOf<string>; // never

// type Bad<T> = T[number];
// Ошибка TS2536: Type 'number' cannot be used to index type 'T'.
```

### Отложенное вычисление

Пока `T` - параметр типа без конкретного значения, условный тип не
вычисляется: он остается записью `T extends string ? 'text' : 'number'`.
Это видно внутри обобщенной функции с условным типом результата:

```ts
// function describe<T extends string | number>(value: T): T extends string ? 'text' : 'number' {
//   return typeof value === 'string' ? 'text' : 'number';
// }
// Ошибка TS2322: Type '"text"' is not assignable to type 'T extends string ? "text" : "number"'.
```

Компилятор не сопоставляет проверку `typeof value === 'string'` в теле с
условием в типе: для него `'text'` и отложенный условный тип - разные
вещи. Стандартный обход - перегрузка с условным типом в объявлении и
объединением в реализации
([5.4](functions.md#54-перегрузки-сигнатуры-и-реализация-когда-объединение-или-обобщение-лучше)):

```ts
function describe<T extends string | number>(value: T): T extends string ? 'text' : 'number';
function describe(value: string | number): 'text' | 'number' {
  return typeof value === 'string' ? 'text' : 'number';
}

const described = describe('x'); // 'text' - вычислено в месте вызова
```

Снаружи, где `T` подставлен, тип вычисляется до конкретной ветки.

---

## 10.4 Распределение по объединениям и его отключение

**Распределение** (distribution) - правило: если проверяемый тип в условном
типе - **голый** параметр типа (сам `T`, а не `T[]` или `[T]`), то при
подстановке объединения условие применяется к каждому члену по отдельности,
а результаты объединяются.

```ts
type ToArray<T> = T extends unknown ? T[] : never;

type D = ToArray<string | number>; // string[] | number[], а не (string | number)[]
```

Правило кажется странным, пока не становится ясно, что на нем построены
фильтры объединений. `Exclude` и `Extract` - это распределение плюс
`never`, который исчезает из объединения
([1.5](type-system.md#15-void-и-never)):

```ts
type MyExclude<T, U> = T extends U ? never : T;
type MyExtract<T, U> = T extends U ? T : never;

type X = MyExclude<'a' | 'b' | 'c', 'a'>; // 'b' | 'c': для 'a' получился never и выпал
type Y = MyExtract<string | number | (() => void), Function>; // () => void
```

Распределение отвечает и за поведение `never`: объединение без членов
распределяется в ноль результатов, то есть в `never`, - какие бы ветки ни
были записаны. `IsString<never>` равен `never`, а не `false`.

### Отключение

Обернуть проверяемый тип и образец в кортеж - `[T] extends [U]` - значит
сделать параметр «не голым», и распределение не происходит:

```ts
type ToArrayNonDist<T> = [T] extends [unknown] ? T[] : never;
type ND = ToArrayNonDist<string | number>; // (string | number)[]

type IsNever<T> = [T] extends [never] ? true : false;
type N1 = IsNever<never>; // true: без обертки было бы never
type N2 = IsNever<string>; // false
```

`IsNever` - самый частый повод отключить распределение: без обертки
проверить тип на `never` невозможно. Распределение не происходит и тогда,
когда параметр стоит внутри другого типа: `Promise<T> extends Promise<string>`
для `T = string | number` дает одну проверку, а не две.

Комбинация обеих форм различает объединение и одиночный тип:

```ts
type IsUnion<T, U = T> = T extends U ? ([U] extends [T] ? false : true) : never;

type U1 = IsUnion<'a' | 'b'>; // true
type U2 = IsUnion<'a'>; // false
type U3 = IsUnion<boolean>; // true: boolean = true | false
```

Внешнее условие распределяет `T` по членам, а `U` остается целым
объединением; для каждого члена проверяется, накрывает ли он все `U`. Для
одиночного типа - накрывает, для члена объединения - нет.

### Практика

Распределение работает в пользу автора, пока он о нем помнит. Типичный
случай, где оно нужно и его нет, - `Omit` от объединения
([9.5](generics.md#95-встроенные-utility-types)): `Omit` не условный тип и
не распределяется, а обертка в условный тип это исправляет. Обратный
случай - результат вида `string[] | number[]` там, где ожидался
`(string | number)[]`, - лечится кортежной оберткой.

---

## 10.5 `infer`: извлечение типов из функций, промисов, массивов и кортежей

**`infer X`** внутри образца условного типа объявляет переменную типа,
которую компилятор подбирает так, чтобы проверяемый тип соответствовал
образцу. Это сопоставление с образцом на уровне типов.

```ts
type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;

type P1 = UnwrapPromise<Promise<string>>; // string
type P2 = UnwrapPromise<number>; // number: образец не подошел
type P3 = UnwrapPromise<Promise<Promise<number>>>; // Promise<number>: снимается один уровень
```

Позиция `infer` может быть любой частью образца - аргументом обобщения,
параметром или результатом функции, элементом массива или кортежа:

```ts
type MyReturnType<T> = T extends (...args: never[]) => infer R ? R : never;
type MyParameters<T> = T extends (...args: infer P) => unknown ? P : never;
type FirstParameter<T> = T extends (first: infer F, ...rest: never[]) => unknown ? F : never;

function createUser(name: string, age: number) {
  return { name, age };
}
type R = MyReturnType<typeof createUser>; // { name: string; age: number }
type Ps = MyParameters<typeof createUser>; // [name: string, age: number]
type F = FirstParameter<typeof createUser>; // string

type ElementType<T> = T extends readonly (infer E)[] ? E : never;
type MyInstanceType<T> = T extends abstract new (...args: never[]) => infer I ? I : never;
```

### Кортежи

Образцы с rest-элементами разбирают кортежи с любого конца:

```ts
type Head<T extends readonly unknown[]> = T extends readonly [infer H, ...unknown[]] ? H : never;
type Tail<T extends readonly unknown[]> = T extends readonly [unknown, ...infer R] ? R : [];
type Last<T extends readonly unknown[]> = T extends readonly [...unknown[], infer L] ? L : never;

type H = Head<[1, 2, 3]>; // 1
type T2 = Tail<[1, 2, 3]>; // [2, 3]
type L = Last<[1, 2, 3]>; // 3
```

### Несколько кандидатов

Если одна переменная `infer` встречается в образце дважды и получает разные
кандидаты, результат зависит от позиции - так же, как вариантность
параметров функций ([5.6](functions.md#56-совместимость-функций-число-параметров-вариантность-strictfunctiontypes)):

```ts
type Covariant<T> = T extends { a: infer U; b: infer U } ? U : never;
type Cv = Covariant<{ a: string; b: number }>; // string | number: объединение

type Contravariant<T> = T extends { a: (x: infer U) => void; b: (x: infer U) => void } ? U : never;
type Ct = Contravariant<{ a: (x: string) => void; b: (x: number) => void }>; // never: пересечение string & number
type Ct2 = Contravariant<{ a: (x: string | number) => void; b: (x: string) => void }>; // string
```

В позициях свойств кандидаты объединяются; в позициях параметров -
пересекаются, потому что функция, подходящая на оба места, должна принимать
и то, и другое.

### Ограничение на `infer`

`infer U extends C` (TypeScript 4.7) требует, чтобы извлеченный тип
удовлетворял `C`, и позволяет использовать его как `C` без дополнительной
проверки. С шаблонными литералами это дает разбор строк:

```ts
type NumericString<T> = T extends `${infer N extends number}` ? N : never;
type Forty = NumericString<'42'>; // 42, число
type NaN = NumericString<'abc'>; // never

type EventName<T> = T extends `on${infer Name extends string}` ? Uncapitalize<Name> : never;
type Click = EventName<'onClick'>; // 'click'
```

Разбор строк по образцу продолжается в
[11.3](template-literal-types.md#113-разбор-строк-через-infer-параметры-маршрутов-ключи-с-точками).

---

## 10.6 Рекурсивные типы и предел глубины

Условный тип может ссылаться на себя, и тогда он обрабатывает вложенные
структуры любой глубины. Как и в [обычной рекурсии](../../algorithms/docs/sprint-3/recursion.md#31-рекурсия),
нужен базовый случай - ветка, которая не вызывает тип снова.

```ts
type DeepReadonly<T> = T extends (infer E)[]
  ? ReadonlyArray<DeepReadonly<E>>
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T; // базовый случай: примитив

interface Config {
  server: { host: string; ports: number[] };
  tags: string[];
}
type FrozenConfig = DeepReadonly<Config>;
// { readonly server: { readonly host: string; readonly ports: readonly number[] }; readonly tags: readonly string[] }
```

Рекурсивным может быть и псевдоним без условия - для описания структур
данных, которые содержат сами себя:

```ts
type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

const document: Json = { name: 'Ann', tags: ['a', 'b'], address: { city: 'Moscow', zip: null } };

type Flatten<T> = T extends readonly (infer E)[] ? Flatten<E> : T;
type Leaf = Flatten<string[][][]>; // string
```

Рекурсия по ключам собирает пути в объекте - тип для функций вида
`get(config, 'server.host')`:

```ts
type Paths<T> = T extends object
  ? {
      [K in keyof T & string]: T[K] extends readonly unknown[]
        ? K // массив - лист: пути внутрь него не строятся
        : T[K] extends object
          ? K | `${K}.${Paths<T[K]>}`
          : K;
    }[keyof T & string]
  : never;

type ConfigPaths = Paths<Config>; // 'server' | 'server.host' | 'server.ports' | 'tags'
```

Ветка для массивов здесь обязательна: массив - тоже `object`, и без нее в
пути попали бы `'server.ports.length'`, `'server.ports.push'` и все
остальные члены `Array`.

### Предел глубины

Компилятор ограничивает глубину вложенных инстанцирований и сообщает
ошибкой TS2589 `Type instantiation is excessively deep and possibly infinite`,
когда она превышена. Предел зависит от формы рекурсии:

```ts
// Рекурсивный вызов внутри шаблонного литерала: результат нужен для продолжения.
type RepeatString<S extends string, N extends number, Acc extends string[] = []> = Acc['length'] extends N
  ? ''
  : `${S}${RepeatString<S, N, [...Acc, S]>}`;

// Рекурсивный вызов - весь результат ветки: хвостовая рекурсия.
type Repeat<S extends string, N extends number, Acc extends string[] = []> = Acc['length'] extends N
  ? Acc
  : Repeat<S, N, [...Acc, S]>;

type Three = Repeat<'x', 3>; // ['x', 'x', 'x']
```

| Форма | Предел в эксперименте | Документированный ориентир |
| --- | --- | --- |
| Обычная: `RepeatString<'x', N>` | 47 уровней, при 48 - TS2589 | около 50 |
| Хвостовая: `Repeat<'x', N>` | 999 уровней, при 1000 - TS2589 | 1000 |

Хвостовой вызов компилятор (с версии 4.5) вычисляет итеративно, не
накапливая стек. Условие хвостовой формы: рекурсивная ссылка - **весь**
результат ветки, а не часть выражения. Аккумулятор `Acc` - обычный прием
превращения обычной рекурсии в хвостовую, тот же, что в коде.

Глубина - не единственная стоимость. Каждое инстанцирование условного и
отображаемого типа - работа компилятора при каждой проверке, и сложные
рекурсивные типы в горячих местах (типы пропсов, маршрутов) заметно
замедляют проверку проекта
([18.5](build-and-performance.md#185-стоимость-типов-взрыв-объединений-глубина-рекурсии-пределы-компилятора)).
В рантайме они не стоят ничего.

---

## 10.7 Как устроены встроенные utility types

Определения из `lib.es5.d.ts` - лучшие примеры на конструкции темы: они
коротки, и каждое иллюстрирует один прием. Ниже - определения в том виде, в
каком они объявлены в стандартной библиотеке.

### Отображаемые типы с модификаторами

```ts
type Partial<T> = { [P in keyof T]?: T[P] };
type Required<T> = { [P in keyof T]-?: T[P] };
type Readonly<T> = { readonly [P in keyof T]: T[P] };
```

Гомоморфные отображения; вся работа - в модификаторе.

### Отображение по подмножеству ключей

```ts
type Pick<T, K extends keyof T> = { [P in K]: T[P] };
type Record<K extends keyof any, T> = { [P in K]: T };
```

`Pick` перебирает не `keyof T`, а переданное подмножество `K` - и все же
сохраняет модификаторы: компилятор считает отображение гомоморфным, если
`K` ограничен через `keyof T`. `Record` перебирает произвольные ключи и
всем дает один тип; `keyof any` - это `string | number | symbol`.

### Распределенные условные типы

```ts
type Exclude<T, U> = T extends U ? never : T;
type Extract<T, U> = T extends U ? T : never;
type Omit<T, K extends keyof any> = Pick<T, Exclude<keyof T, K>>;
type NonNullable<T> = T & {};
```

`Omit` - композиция: исключить ключи из `keyof T`, потом выбрать оставшиеся.
Отсюда обе его особенности из [9.5](generics.md#95-встроенные-utility-types):
`K` ограничен `keyof any`, а не `keyof T` (несуществующий ключ проходит), и
`keyof T` от объединения дает только общие ключи. `NonNullable` с версии
4.8 - не условный тип, а пересечение с `{}`: `{}` не содержит `null` и
`undefined`, и пересечение с ним их отбрасывает
([4.4](object-types.md#44-пересечения-слияние-свойств-конфликт-свойств-и-never-branded-types)),
причем без распределения и быстрее.

### `infer`

```ts
type Parameters<T extends (...args: any) => any> = T extends (...args: infer P) => any ? P : never;
type ReturnType<T extends (...args: any) => any> = T extends (...args: any) => infer R ? R : any;
type InstanceType<T extends abstract new (...args: any) => any> =
  T extends abstract new (...args: any) => infer R ? R : any;
```

`any` в сигнатурах ограничений - тот самый случай «любая функция» из
[1.4](type-system.md#14-any-и-unknown); `abstract new` принимает и
абстрактные классы ([6.6](classes.md#66-тип-экземпляра-и-тип-конструктора-ограничение-на-конструктор-миксины)).

### Рекурсия

```ts
type Awaited<T> = T extends null | undefined
  ? T
  : T extends object & { then(onfulfilled: infer F, ...args: infer _): any }
    ? F extends (value: infer V, ...args: infer _) => any
      ? Awaited<V>
      : never
    : T;
```

`Awaited` повторяет семантику `await`: разворачивается любой объект с
вызываемым `then` (не только `Promise`), тип значения извлекается из
параметра callback-а `onfulfilled`, и результат разворачивается снова, пока
не останется не-thenable. Каждая из конструкций темы здесь на месте:
цепочка условий, `infer` в позиции параметра, рекурсия с базовым случаем.

Утверждения о том, что эти определения совпадают со встроенными, проверены
компиляцией: каждый тип, объявленный заново под другим именем, эквивалентен
библиотечному на тестовых аргументах.

---

## Типичные ошибки

1. **Ожидание модификаторов от негомоморфного отображения.** `{ [K in Keys]: ... }`
   по произвольному объединению не знает о `readonly` и `?` исходного типа;
   их сохраняет только `[K in keyof T]` (и `Pick` с `K extends keyof T`).
2. **`keyof T` без `string &` в шаблонном литерале.** Ключи могут быть
   числами и символами; `` `get${K}` `` требует `string & K`.
3. **Возврат конкретного значения из функции с условным типом результата.**
   Отложенный условный тип не сопоставляется с проверкой в теле; нужна
   перегрузка.
4. **Забытое распределение.** `ToArray<string | number>` - это
   `string[] | number[]`; для `(string | number)[]` - обертка `[T]`.
5. **Проверка на `never` голым условием.** `T extends never ? ... : ...`
   при `T = never` дает `never`; нужен `[T] extends [never]`.
6. **`any` в условном типе.** Результат - объединение обеих веток, и оно
   распространяется дальше как обычный тип, не как `any`.
7. **Массив как `object` в рекурсии по ключам.** Без отдельной ветки для
   массивов рекурсия уходит в члены `Array`.
8. **Рекурсия без хвостовой формы на больших входах.** Предел обычной
   рекурсии - около 50 уровней; аккумулятор переводит рекурсию в хвостовую
   с пределом 1000.

---

[← Обобщенные типы](generics.md) · [К содержанию](../README.md) ·
[Далее: шаблонные литеральные типы →](template-literal-types.md)
