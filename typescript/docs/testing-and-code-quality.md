# 19 Тестирование и качество кода

[← К содержанию](../README.md)

Типы ловят класс ошибок, который тесты проверять не должны, а тесты - тот,
до которого типам не дотянуться. Тема о стыке: как запускать тесты на
TypeScript так, чтобы ни один из двух механизмов не выключился незаметно,
как типизировать моки и данные тестов, как тестировать сами типы, что
добавляет линтер с доступом к типам и как жить со `strictNullChecks` без
`!`. Инструменты проверены в работе: Vitest 5.0, Jest 30.5 с ts-jest 29.4,
встроенный `node --test` в Node 26, ESLint 10.10 с typescript-eslint 8.70.

Одно замечание о версиях с самого начала. Инструменты, которые
**анализируют** код (ts-jest, typescript-eslint), используют JavaScript API
компилятора. Пакет TypeScript 7.0 - нативный, и из `require('typescript')`
он отдает только номер версии; typescript-eslint 8.70 объявляет
совместимость с `typescript <6.1`, ts-jest - `<7`. Проект на 7.0 держит
рядом `typescript@6` для инструментов - npm ставит его сам как
peer-зависимость, либо подключается пакет `@typescript/typescript6`.
Vitest, esbuild и Node от компилятора не зависят вовсе.

---

## 19.1 Запуск тестов: `ts-jest`, Babel и swc, Vitest; где выполняется проверка типов

Тестовый файл на TypeScript нужно превратить в JavaScript, и вопрос
только в том, **проверяются ли при этом типы**. Ответ зависит от
инструмента, и у большинства он - «нет».

| Запуск | Кто транспилирует | Проверка типов | Где проверять типы |
| --- | --- | --- | --- |
| Vitest | esbuild | нет | `tsc --noEmit`; `vitest --typecheck` для type-тестов |
| Jest + `@swc/jest`, `babel-jest` | swc, Babel | нет | `tsc --noEmit` |
| Jest + `ts-jest` | компилятор TypeScript | да в CommonJS-режиме (ошибка типов валит набор); в проверенной ESM-конфигурации - нет | `tsc --noEmit` для надежности |
| `node --test` | режим stripping Node | нет | `tsc --noEmit` |

Тест с ошибкой типов под Vitest:

```ts
import { describe, expect, it } from 'vitest';
import { total, type Item } from '../src/cart.js';

describe('total', () => {
  it('sums price by quantity', () => {
    const items: Item[] = [{ id: 'a', price: 10, quantity: 2 }];
    expect(total(items)).toBe(20);
  });

  it('compiles despite a type error', () => {
    const broken: Item = { id: 'b', price: 5, quantity: 1 };
    // с price: '5' тест проходит: esbuild типы не проверяет
    expect(total([broken])).toBe(5);
  });
});
```

```
$ vitest run
 Test Files  1 passed (1)
      Tests  2 passed (2)

$ tsc --noEmit
tests/cart.test.ts(11,37): error TS2322: Type 'string' is not assignable to type 'number'.
```

Тест прошел, потому что строка `'5'` умножилась на `1` и дала `5`. Ошибку
нашел только `tsc`. Отсюда правило: **тесты входят в программу `tsc --noEmit`**.
Конфигурация для этого - та же, что для редактора
([2.1](tsconfig.md#21-структура-tsconfigjson-compileroptions-include-exclude-extends)):
`include` с тестами, а из сборки они исключаются отдельным
`tsconfig.build.json`.

```json
{
  "compilerOptions": {
    "module": "nodenext",
    "target": "es2024",
    "lib": ["es2024"],
    "types": ["node"],
    "strict": true,
    "noEmit": true,
    "verbatimModuleSyntax": true,
    "skipLibCheck": true
  },
  "include": ["src", "tests", "vitest.config.ts"]
}
```

Глобальные `describe`/`it` без импорта требуют `types: ["vitest/globals"]`
или `["jest"]`; явный импорт из `vitest` обходится без этого и не смешивает
глобальные пространства двух раннеров.

### ts-jest

Единственный вариант, где типы проверяются при запуске: ts-jest компилирует
тест самим TypeScript и по умолчанию сообщает диагностику. В
CommonJS-конфигурации тест с ошибкой типов не запускается:

```
● Test suite failed to run
  cart.test.ts:4:35 - error TS2322: Type 'string' is not assignable to type 'number'.
```

Цена - скорость: полная проверка на каждый запуск. `diagnostics: false`
отключает ее, и ts-jest становится обычным транспилятором. В
ESM-конфигурации (`useESM: true`) проверенный набор с той же ошибкой прошел
без сообщений - на проверку типов при запуске лучше не полагаться ни в
одном режиме.

### `node --test`

Node.js 22+ запускает `.ts`-тесты напрямую, стирая типы
([1.7](type-system.md#17-стирание-типов-что-остается-в-javascript)), с
встроенным раннером и `node:assert`. Без зависимостей и без конфигурации;
ограничения - только стираемый синтаксис и относительные импорты с
расширением `.ts`.

---

## 19.2 Типизация тестов: моки, фабрики тестовых данных, фикстуры

Тест - обычный код, и `strict` действует на него в полной мере. Три места,
где типизация тестов отличается от типизации приложения.

### Моки

Мок должен иметь сигнатуру замещаемой функции, иначе тест проверит вызов с
аргументами, которых в приложении не бывает. `vi.fn<Signature>()`
принимает сигнатуру параметром типа; тип берется из интерфейса приложения:

```ts
import { describe, expect, it, vi, type Mock } from 'vitest';
import { reprice, total, type Item, type PriceApi } from '../src/cart.js';

/**
 * Создает элемент корзины с разумными умолчаниями.
 *
 * Фабрика принимает частичное переопределение: тест указывает только то,
 * что для него существенно, остальное - значения по умолчанию.
 */
function makeItem(overrides: Partial<Item> = {}): Item {
  return { id: 'item', price: 10, quantity: 1, ...overrides };
}

describe('reprice', () => {
  it('replaces prices using the api', async () => {
    const fetchPrice = vi.fn<PriceApi['fetchPrice']>().mockResolvedValue(42); // Mock<(id: string) => Promise<number>>
    const api: PriceApi = { fetchPrice };

    const result = await reprice([makeItem({ id: 'a' }), makeItem({ id: 'b', quantity: 3 })], api);

    expect(fetchPrice).toHaveBeenCalledTimes(2);
    expect(fetchPrice).toHaveBeenCalledWith('a');
    expect(total(result)).toBe(42 * 4);
  });

  it('keeps mock signatures', async () => {
    const fetchPrice: Mock<PriceApi['fetchPrice']> = vi.fn(async (id) => id.length); // id: string
    expect(await fetchPrice('abc')).toBe(3);
  });
});

// vi.fn<PriceApi['fetchPrice']>().mockResolvedValue('42');
// Ошибка TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.
// const api: PriceApi = { fetchPrice: vi.fn(() => 42) };
// Ошибка TS2322: Type 'Mock<() => number>' is not assignable to type '(id: string) => Promise<number>'.
```

`PriceApi['fetchPrice']` - индексный доступ к типу метода
([8.3](type-operators.md#83-индексный-доступ-tk-и-tnumber)): сигнатура
мока следует за интерфейсом, и изменение интерфейса ломает тест на этапе
компиляции, а не в рантайме. `vi.mocked(module.fn)` делает то же для
модулей, замененных через `vi.mock`; в Jest роль `vi.fn<T>()` играет
`jest.fn<T>()`, а `jest.Mocked<typeof api>` типизирует объект моков целиком.

### Фабрики и фикстуры

Тестовые данные пишутся фабриками с `Partial<T>` для переопределений -
как `makeItem` выше. Литерал с лишним или отсутствующим полем в фабрике -
ошибка компиляции, и при добавлении поля в `Item` компилятор укажет на
все фабрики, которым нужно новое умолчание. Для фикстур-констант подходит
`satisfies` ([8.5](type-operators.md#85-satisfies-проверка-без-расширения-типа)):
проверка соответствия типу без потери литералов.

### Чего избегать

`as unknown as T` для «частичного» мока - объекта, у которого реализовано
два метода из десяти, - компилируется и молча передает в код `undefined`
вместо остальных методов. Честнее два варианта: интерфейс приложения
разбивается на узкие (`PriceApi` с одним методом вместо `Api` с десятью),
либо фабрика мока заполняет все методы заглушками `vi.fn()`, и утверждение
не нужно.

---

## 19.3 Тесты на уровне типов: `expectTypeOf`, `tsd`, `@ts-expect-error`

Библиотека или сложный тип - тоже код с контрактом: «`total` принимает
`readonly Item[]`», «`reprice` возвращает `Promise<Item[]>`». Такие
утверждения проверяются тестами на уровне типов: файл компилируется -
тест прошел.

### `expectTypeOf`

Vitest включает `expect-type`: `expectTypeOf(value)` или `expectTypeOf<T>()`
с методами сравнения типов. Файлы `*.test-d.ts` запускаются в режиме
`--typecheck`, который вызывает `tsc` и превращает ошибки типов в
проваленные тесты:

```ts
import { describe, expectTypeOf, it } from 'vitest';
import { reprice, total, type Item, type PriceApi } from '../src/cart.js';

describe('cart types', () => {
  it('total takes readonly items and returns number', () => {
    expectTypeOf(total).parameter(0).toEqualTypeOf<readonly Item[]>();
    expectTypeOf(total).returns.toEqualTypeOf<number>();
    expectTypeOf(total).toBeCallableWith([{ id: 'a', price: 1, quantity: 1 }]);
  });

  it('reprice resolves to mutable items', () => {
    expectTypeOf(reprice).returns.resolves.toEqualTypeOf<Item[]>();
    expectTypeOf<PriceApi['fetchPrice']>().returns.toEqualTypeOf<Promise<number>>();
  });
});
```

Проваленный type-тест - `expectTypeOf(total).returns.toEqualTypeOf<string>()`:

```
 FAIL  tests/cart.test-d.ts:16 > cart types > rejects wrong shapes
TypeCheckError: Type 'string' does not satisfy the constraint '"Expected string, Actual number"'.
```

`toEqualTypeOf` требует точного равенства типов, `toMatchTypeOf` -
присваиваемости; `.parameter(n)`, `.returns`, `.resolves` разбирают
сигнатуры. Пакет `tsd` делает то же для проектов без Vitest -
`expectType<T>(value)` в файлах `.test-d.ts` с собственным раннером.

В этом конспекте ту же роль играл вспомогательный тип
`Check<T, Expected>` - условный тип, равный `true` при взаимной
присваиваемости; `expectTypeOf` - его библиотечная версия с внятными
сообщениями.

### `@ts-expect-error`

Тест на то, что код **не** компилируется, - директива `// @ts-expect-error`
над строкой: компилятор требует ошибку на следующей строке, а если
ошибки нет - сообщает TS2578 `Unused '@ts-expect-error' directive`. Так
проверяется, что тип отвергает неверные данные:

```ts
import { expectTypeOf, it } from 'vitest';
import type { Item } from '../src/cart.js';

it('rejects wrong shapes', () => {
  // @ts-expect-error price must be a number
  const wrong: Item = { id: 'a', price: '1', quantity: 1 };
  expectTypeOf(wrong).toEqualTypeOf<Item>();
});
```

Директива с пояснением после нее - правило хорошего тона: без пояснения
через год неясно, какую ошибку тест ожидает. `// @ts-ignore` для этой
задачи не годится: он подавляет ошибку, если она есть, и молчит, если ее
нет, - в проверке на отсутствие ошибки он бесполезен. В коде приложения
обеим директивам не место: это подавление проверки, а не ее использование
([8.6](type-operators.md#86-утверждения-типов-as--двойное-утверждение-через-unknown-границы-допустимого)).

---

## 19.4 ESLint и typescript-eslint: type-aware правила, конфигурации, ключевые правила

Компилятор отвергает программы, которые не типизируются. Линтер отвергает
программы, которые типизируются, но написаны плохо: забытый `await`,
`any`, недостижимая ветка. **Type-aware** правила typescript-eslint
используют информацию о типах и находят то, что синтаксический анализ не
видит: промис, который никто не ждет, отличим от обычного значения только
по типу.

```js
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
    },
  },
);
```

`projectService: true` дает правилам доступ к программе TypeScript по
ближайшему `tsconfig.json`. Наборы: `recommendedTypeChecked` - базовый,
`strictTypeChecked` - строже, `stylisticTypeChecked` - единообразие
записи. Три правила добавлены явно: их нет ни в одном наборе, а пользы от
них больше, чем от половины включенных.

Файл, на котором конфигурация выше дает семь ошибок:

```ts
import { Item } from './types';

type Status = 'idle' | 'loading' | 'done';

export function label(status: Status): string {
  switch (status) {
    case 'idle':
      return 'Ожидание';
    case 'loading':
      return 'Загрузка';
  }
  return '';
}

export async function save(item: Item): Promise<void> {
  await Promise.resolve(item);
}

export function run(item: Item): void {
  save(item);
}

export function parse(text: string): any {
  return JSON.parse(text);
}

export function first(items: string[]): string {
  return items[0]!;
}

export function check(value: string | undefined): boolean {
  if (typeof value === 'string' && value !== undefined) {
    return true;
  }
  return false;
}
```

| Строка | Правило | Что нашло |
| --- | --- | --- |
| 1 | `consistent-type-imports` | импорт, используемый только как тип, без `import type` ([13.3](modules.md#133-импорт-и-экспорт-только-типов-import-type-verbatimmodulesyntax)) |
| 6 | `switch-exhaustiveness-check` | `switch` без ветки для `'done'` ([7.5](narrowing.md#75-размеченные-объединения-и-проверка-полноты-через-never)) |
| 20 | `no-floating-promises` | `save(item)` без `await`, `.catch` или `void` ([5.3](functions.md#53-возвращаемый-тип-вывод-и-явная-аннотация-void-в-callback-ах-promiset-у-async-функций)) |
| 23 | `no-explicit-any` | `any` в сигнатуре ([1.4](type-system.md#14-any-и-unknown)) |
| 28 | `no-non-null-assertion` | `!` вместо проверки ([8.6](type-operators.md#86-утверждения-типов-as--двойное-утверждение-через-unknown-границы-допустимого)) |
| 28 | `no-unnecessary-type-assertion` | `!` не меняет тип: `items[0]` уже `string` без `noUncheckedIndexedAccess` |
| 32 | `no-unnecessary-condition` | `value !== undefined` после `typeof === 'string'` всегда истинно |

Последние два - примеры того, что дает доступ к типам: правило знает,
что `items[0]` имеет тип `string`, а `value` в этой точке сужен. Правило
`no-unnecessary-condition` заодно ловит проверки, которые стали лишними
после изменения типа, - код, который компилятор пропускает молча.

Ключевые type-aware правила, ради которых стоит платить временем
проверки:

| Правило | Ловит |
| --- | --- |
| `no-floating-promises`, `no-misused-promises` | забытые `await` и промисы в `if`/callback-ах, где ждут `boolean`/`void` |
| `no-unsafe-*` (`assignment`, `call`, `member-access`, `return`) | распространение `any` |
| `no-unnecessary-condition`, `no-unnecessary-type-assertion` | мертвые проверки и лишние утверждения |
| `switch-exhaustiveness-check` | неполный разбор объединения |
| `restrict-template-expressions`, `no-base-to-string` | `[object Object]` в строках |
| `prefer-nullish-coalescing` | `\|\|` там, где `0` и `''` - допустимые значения ([1.6](type-system.md#16-null-и-undefined-при-strictnullchecks)) |
| `strict-boolean-expressions` | `if (value)` для строк и чисел |

Проверка с типами стоит столько же, сколько `tsc` над теми же файлами
([18](build-and-performance.md#18-сборка-и-производительность)); в
редакторе она работает инкрементально, а в CI запускается один раз рядом
с `tsc --noEmit`.

---

## 19.5 Паттерны при `strictNullChecks`: ранний выход, `?.` и `??`, `NonNullable`, утверждения вместо `!`

`strictNullChecks` ([1.6](type-system.md#16-null-и-undefined-при-strictnullchecks))
заставляет обрабатывать `undefined` в каждом месте, где оно возможно.
Ниже - приемы, которые делают это коротко и без `!`; файл проверен с
`noUncheckedIndexedAccess` и `exactOptionalPropertyTypes` - самыми
строгими настройками.

```ts
interface User {
  id: string;
  email?: string;
  profile?: { city?: string };
}

// ?. прерывает цепочку на первом null/undefined; ?? подставляет умолчание
export function domain(user: User): string | undefined {
  return user.email?.split('@')[1]; // [1]: string | undefined при noUncheckedIndexedAccess
}

export function city(user: User): string {
  return user.profile?.city ?? 'unknown';
}

// Ранний выход: после проверки тип сужен до конца функции
export function requireEmail(user: User): string {
  const { email } = user;
  if (email === undefined) {
    throw new Error(`user ${user.id} has no email`);
  }
  return email;
}

// Функция-утверждение вместо !: та же краткость, но с проверкой и сообщением
export function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

export function firstEmail(users: readonly User[]): string {
  const first = users[0]; // User | undefined
  invariant(first !== undefined, 'users must not be empty');
  return first.email ?? '';
}

// filter с выведенным предикатом убирает undefined из массива
export function emails(users: readonly User[]): string[] {
  return users.map((user) => user.email).filter((email) => email !== undefined);
}

// Map.get возвращает V | undefined; проверка в месте, где известно, что делать
export function findOrThrow(index: Map<string, User>, id: string): User {
  const user = index.get(id);
  if (!user) {
    throw new Error(`no user ${id}`);
  }
  return user;
}

// .at() честнее индекса: undefined в типе всегда
export function lastOf<T>(items: readonly T[]): T | undefined {
  return items.at(-1);
}

// NonNullable снимает null и undefined с параметра типа
export function withDefault<T>(value: T | null | undefined, fallback: NonNullable<T>): NonNullable<T> {
  return value ?? fallback;
}

// exactOptionalPropertyTypes: свойство либо есть, либо его нет; undefined записать нельзя
export function setEmail(user: User, email: string | undefined): User {
  const { email: _previous, ...rest } = user; // rest сохраняет необязательность profile
  return email === undefined ? rest : { ...rest, email };
}
```

| Задача | Прием | Вместо |
| --- | --- | --- |
| Достать вложенное свойство | `a?.b?.c ?? fallback` | `a && a.b && a.b.c \|\| fallback` |
| Гарантировать значение в начале функции | ранний `return`/`throw` | вложенные `if` |
| Инвариант, который не выразить типом | `invariant(condition, message)` | `value!` |
| Убрать `undefined` из массива | `filter((x) => x !== undefined)` | `filter(Boolean)` ([7.3](narrowing.md#73-пользовательские-предикаты-типов-value-is-t)) |
| Значение из `Map`, индекса, `find` | проверка там, где известно, что делать при отсутствии | `!` на месте чтения |
| Умолчание для числа или строки | `??` | `\|\|`, который подменяет `0` и `''` |
| Обобщение без `null` | `NonNullable<T>` | ручное `Exclude<T, null \| undefined>` |

Антипаттерны из того же файла, которые компилятор отвергает:

```
user.email.split('@')          error TS18048: 'user.email' is possibly 'undefined'.
users[0].email!                error TS2532: Object is possibly 'undefined'.   (индекс без проверки)
{ ...user, email }             error TS2375: ... with 'exactOptionalPropertyTypes: true'  (email: string | undefined)
port || 3000                   компилируется - и подменяет 0; ловит только prefer-nullish-coalescing
```

Последняя строка - напоминание, зачем в [19.4](#194-eslint-и-typescript-eslint-type-aware-правила-конфигурации-ключевые-правила)
нужен линтер: `||` при `number | undefined` корректен для компилятора и
неверен по смыслу.

Общее правило для `!`: каждое его использование - утверждение, которое
компилятор не может проверить. Если утверждение верно всегда - его можно
выразить проверкой с осмысленной ошибкой (`invariant`); если не всегда -
это не утверждение, а ошибка, ждущая своего часа. Правило
`no-non-null-assertion` закрепляет это на уровне проекта.

---

## Типичные ошибки

1. **Расчет на то, что раннер проверит типы.** Vitest, swc, Babel и Node
   типы не проверяют; тест с ошибкой типов может пройти. `tsc --noEmit`
   с тестами в `include`.
2. **Мок без сигнатуры.** `vi.fn()` без параметра типа принимает любые
   аргументы; изменение интерфейса тест не заметит. Сигнатура - из
   интерфейса приложения.
3. **`as unknown as T` для частичного мока.** Недостающие методы -
   `undefined` в рантайме. Узкие интерфейсы или полная заглушка.
4. **`@ts-ignore` в type-тесте.** Не проверяет наличие ошибки;
   `@ts-expect-error` сообщает, когда ошибка исчезла.
5. **Линтер без `projectService`.** Type-aware правила не работают и не
   сообщают об этом; `no-floating-promises` молчит.
6. **`||` для умолчаний числовых и строковых значений.** Компилятор
   пропускает, `0` и `''` подменяются; `??` и `prefer-nullish-coalescing`.
7. **`!` как ответ на любую ошибку `possibly undefined`.** Ошибка
   переезжает в рантайм; проверка или `invariant`.
8. **typescript-eslint или ts-jest с пакетом TypeScript 7.** Инструментам
   нужен JavaScript API компилятора; рядом ставится `typescript@6` или
   `@typescript/typescript6`.

---

[← Сборка и производительность](build-and-performance.md) · [К содержанию](../README.md)
