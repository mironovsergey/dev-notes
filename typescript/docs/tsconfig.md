# 2 Настройка компилятора

[← К содержанию](../README.md)

`tsconfig.json` отвечает на три вопроса: какие файлы составляют программу,
насколько строго их проверять и во что компилировать. Ошибка в конфигурации
не похожа на ошибку в коде: ослабленная проверка не сообщает о себе, а молча
пропускает то, что должна была поймать. Поэтому конфигурацию нужно понимать, а
не копировать.

Тема написана для TypeScript 7 с оговорками о версиях 5.9 и 6.0 там, где
поведение расходится. Расхождений много: в 6.0 изменились значения по
умолчанию, а 7.0 - нативная реализация компилятора - удалил все, что 6.0
объявил устаревшим.

### Три версии

| Опция | 5.9 | 6.0 и 7.0 |
| --- | --- | --- |
| `strict` | `false` | `true` |
| `target` | `es5` | последний стабильный стандарт (ES2025) |
| `module` | `commonjs` | `esnext` |
| `moduleResolution` | `node10` | `bundler` для `esnext`, `nodenext` для `nodenext` |
| `types` | все пакеты из `@types` | `[]` - ни одного |
| `rootDir` | общий каталог исходников | каталог `tsconfig.json`; при несовпадении ошибка TS5011 |
| `esModuleInterop` | `false` | `true`, отключить нельзя |
| `noUncheckedSideEffectImports` | `false` | `true` |

Удалены в 7.0: `moduleResolution` со значениями `node`, `node10` и
`classic`; `baseUrl`; `target: es5` и `downlevelIteration`; `module` со
значениями `amd`, `umd`, `system` и `none`; `outFile`; значение `false` для
`esModuleInterop` и `allowSyntheticDefaultImports`.

Версия 6.0 - переходная: на устаревшие опции она выдает ошибку TS5101 или
TS5107 с указанием обхода `"ignoreDeprecations": "6.0"`. В 7.0 обхода нет,
только ошибки TS5102 и TS5108 с подсказкой замены:

```
tsconfig.json(1,40): error TS5108: Option 'moduleResolution=node10' has been removed. Please remove it from your configuration.
tsconfig.json(1,82): error TS5102: Option 'baseUrl' has been removed. Please remove it from your configuration.
  Use '"paths": {"*": ["./*"]}' instead.
```

Практический вывод из таблицы: конфигурация, которая полагается на значения
по умолчанию, меняет смысл при смене версии. Опции `strict`, `target`,
`module`, `types` и `rootDir` стоит задавать явно всегда.

---

## 2.1 Структура `tsconfig.json`: `compilerOptions`, `include`, `exclude`, `extends`

**`tsconfig.json`** - файл, который превращает каталог в проект: задает
множество файлов программы и параметры компилятора. `tsc` без аргументов ищет
его от текущего каталога вверх; `tsc -p <каталог>` указывает проект явно.

```json
{
  "extends": "@tsconfig/node24/tsconfig.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist",
    "strict": true
  },
  "include": ["src"],
  "exclude": ["src/**/*.test.ts"]
}
```

| Поле | Назначение | Значение по умолчанию |
| --- | --- | --- |
| `compilerOptions` | параметры проверки и генерации кода | |
| `files` | явный список файлов | |
| `include` | шаблоны файлов, входящих в программу | `**/*` - все `.ts`, `.tsx`, `.d.ts` от каталога конфига |
| `exclude` | шаблоны, исключаемые из `include` | `node_modules`, `bower_components`, `jspm_packages`, `outDir` |
| `extends` | базовая конфигурация | |
| `references` | зависимые проекты, [18.3](build-and-performance.md#183-project-references-composite-references-tsc--b-монорепозитории) | |

### Что попадает в программу

Программа - это файлы из `include` за вычетом `exclude` **плюс все, что из
них импортируется**, транзитивно. `exclude` действует только на результат
`include` и не защищает файл от проверки, если на него есть импорт:

```
legacy/old.ts     export const legacy: number = 'not a number';
src/main.ts       import { legacy } from '../legacy/old';
tsconfig.json     "include": ["src"], "exclude": ["legacy"]
```

```
$ tsc
legacy/old.ts(1,14): error TS2322: Type 'string' is not assignable to type 'number'.
```

Файл исключен, но ошибка в нем есть: иначе компилятор не мог бы знать тип
`legacy`. Единственный способ не проверять файл - не импортировать его. Список
файлов программы показывает `tsc --listFilesOnly`.

### Наследование через `extends`

`extends` берет базовый файл и накладывает на него текущий:

- `compilerOptions` сливаются по ключам: дочернее значение замещает базовое,
  остальные ключи наследуются;
- `files`, `include` и `exclude` **замещаются целиком**, а не сливаются;
- относительные пути внутри базового файла разрешаются относительно него, а
  не относительно наследника.

Готовые базы публикуются в npm: `@tsconfig/node24`, `@tsconfig/strictest`,
`@tsconfig/vite-react`. Итоговую конфигурацию после всех слияний показывает
`tsc --showConfig`.

Обычная схема для проекта с тестами - два файла: `tsconfig.json` включает
все, чтобы редактор проверял и тесты, а `tsconfig.build.json` наследует его и
исключает тесты из сборки: `tsc -p tsconfig.build.json`.

### `tsc` с аргументами

Вызов `tsc src/main.ts` игнорирует `tsconfig.json` полностью - это способ
скомпилировать один файл с параметрами по умолчанию. До версии 6.0 такое
игнорирование происходило молча; теперь это ошибка TS5112, а для
сознательного обхода есть флаг `--ignoreConfig`.

---

## 2.2 `target` и `lib`

**`target`** - версия ECMAScript, в синтаксис которой компилятор переводит
код. **`lib`** - набор файлов деклараций, описывающих встроенные API среды
выполнения.

Разделение обязанностей: `target` отвечает за **синтаксис**, `lib` - за
**наличие API**. Первое компилятор может преобразовать, второе - нет.

### `target`: понижение синтаксиса

Один файл, два значения `target`:

```ts
class Counter {
  count = 0;
  #secret = 1;
}

const port = process.env.PORT ?? '3000';
```

```js
// target: es2019 - поля класса и ?? переписаны
var _a;
var _Counter_secret;
class Counter {
    constructor() {
        this.count = 0;
        _Counter_secret.set(this, 1);
    }
}
_Counter_secret = new WeakMap();
const port = (_a = process.env.PORT) !== null && _a !== void 0 ? _a : '3000';

// target: es2022 - код совпадает с исходным
class Counter {
    count = 0;
    #secret = 1;
}
const port = process.env.PORT ?? '3000';
```

Понижение стоит размера и скорости: приватное поле через `WeakMap` медленнее
нативного. Поэтому `target` выбирается по самой старой среде, которую нужно
поддерживать, а не по привычке. Минимальное значение в 7.0 - `es2015`.

| Синтаксис | Переписывается при `target` ниже |
| --- | --- |
| `class`, стрелочные функции, `let`/`const`, шаблонные строки | ES2015 |
| `async`/`await` | ES2017 |
| `?.`, `??` | ES2020 |
| `??=`, `||=`, `&&=` | ES2021 |
| поля класса, `#private`, `static {}`, top-level `await` | ES2022 |
| `using` | ESNext |

Для Node.js `target` соответствует версии - по базам `@tsconfig/bases`:
Node 20 и 22 - `es2022`, Node 24 - `es2024`, Node 26 - `es2025`. Для браузера без сборщика - по таблице
поддержки; со сборщиком понижением обычно занимается он, и `target` в
`tsconfig` влияет только на проверку.

### `lib`: декларации API

Если `lib` не задан, он выводится из `target` **и включает DOM**. Как только
`lib` задан явно, включается только перечисленное:

```ts
const grouped = Object.groupBy([1, 2, 3], (n) => (n % 2 ? 'odd' : 'even'));
const attempt = Promise.try(() => 1);
const doc = document.title;
```

```
// target: es2022, lib не задан
error TS2550: Property 'groupBy' does not exist on type 'ObjectConstructor'. Do you need to change your target library?
error TS2550: Property 'try' does not exist on type 'PromiseConstructor'.

// lib: ["es2024"]
error TS2550: Property 'try' does not exist on type 'PromiseConstructor'.
error TS2584: Cannot find name 'document'. Do you need to change your target library?

// lib: ["es2025", "dom"] - ошибок нет
```

`lib` только **объявляет** API, а не добавляет его. `[1, 2, 3].at(0)`
компилируется с `lib: ["es2022"]` при любом `target`, но на движке без
`Array.prototype.at` упадет с `TypeError`. Полифилы - отдельная забота, и
`lib` должен соответствовать тому, что есть в среде на самом деле.

| Проект | `lib` | Почему |
| --- | --- | --- |
| Node.js | `["es2024"]` (по версии Node) | `dom` не нужен и опасен: его глобальные имена маскируют ошибки |
| Браузер | `["es2023", "dom", "dom.iterable"]` | `dom.iterable` дает `for...of` по `NodeList` |
| Библиотека | по самому старому потребителю | |

Отдельные возможности подключаются точечно: `"ESNext.Iterator"`,
`"ESNext.Promise"`, `"ESNext.Temporal"` - так база `@tsconfig/node26`
добавляет API, которые Node уже поддерживает, а стандарт еще не закрепил.

---

## 2.3 `module` и `moduleResolution`

**`module`** - формат модулей в результате компиляции и правила
интерпретации `import`/`export` в исходном коде. **`moduleResolution`** -
алгоритм, по которому строка в `import` превращается в путь к файлу.

Опции связаны: `nodenext` требует `nodenext` с обеих сторон (ошибки TS5109 и
TS5110), а `bundler` допустим только с `esnext`, `preserve` и `commonjs`
(TS5095).

### Значения `module`

| Значение | Вывод | Когда |
| --- | --- | --- |
| `nodenext` | формат каждого файла по `package.json` и расширению | код для Node.js: приложения, библиотеки |
| `esnext` / `es2022` | ES-модули как есть | код, который дальше обрабатывает сборщик |
| `preserve` | синтаксис сохраняется без интерпретации | сборщики, понимающие смесь ESM и CJS |
| `commonjs` | `require`/`exports` для всех файлов | старые проекты на Node без `"type": "module"` |

Один и тот же файл с импортом локального модуля и пакета `express`, у
которого декларация вида `export = express`:

```ts
import { add } from './util';
import express from 'express';
console.log(add(1, 2), typeof express);
```

```js
// module: commonjs
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("./util");
const express_1 = __importDefault(require("express"));
console.log((0, util_1.add)(1, 2), typeof express_1.default);

// module: esnext
import { add } from './util';
import express from 'express';
console.log(add(1, 2), typeof express);
```

`nodenext` не выбирает формат сам - он читает ближайший `package.json`. Без
`"type": "module"` результат совпадает с `commonjs`, с ним - с `esnext`, но
с дополнительным требованием, которое предъявляет сам Node.js:

```
src/main.ts(1,21): error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean './util.js'?
```

Импорт пишется как `'./util.js'` - с расширением **выходного** файла, хотя
исходник называется `util.ts`. Компилятор знает соответствие и находит
`util.ts`; Node после компиляции найдет `util.js`. Это единственная запись,
которая работает и там, и там.

### Значения `moduleResolution`

| Значение | Расширения в относительных импортах | `exports` в `package.json` | Когда |
| --- | --- | --- | --- |
| `nodenext` | обязательны в ESM | учитывает, с условиями `import`/`require` | Node.js |
| `bundler` | не нужны | учитывает | Vite, webpack, esbuild, Bun |
| `node10` | не нужны | игнорирует | удален в 7.0 |

`bundler` разрешает и импорт с расширением `.ts`, но только при
`allowImportingTsExtensions`, а тот - только при `noEmit` или
`emitDeclarationOnly` (TS5096): в скомпилированном коде такой импорт не
работал бы. Для проектов, которым нужен и вывод, и `.ts` в импортах, есть
`rewriteRelativeImportExtensions` (5.7): он переписывает `./util.ts` в
`./util.js` при генерации.

Порядок поиска для строки `'express'` при обеих стратегиях: `node_modules`
текущего каталога, затем каждого родительского; внутри пакета - поле `exports`
с условием `types`, затем `types` или `typings`, затем `main` с соседним
`.d.ts`; если типов нет - пакет `@types/express`. Подробно - в
[14.2](declarations.md#142-пакеты-types-и-definitelytyped-порядок-поиска-типов-опции-types-и-typeroots).

### Что выбирать

| Проект | `module` | `moduleResolution` |
| --- | --- | --- |
| Приложение на Node.js | `nodenext` | `nodenext` |
| Библиотека для Node.js и сборщиков | `nodenext` | `nodenext` |
| Фронтенд со сборщиком | `esnext` или `preserve` | `bundler` |
| NestJS 12 | `nodenext` | `nodenext` |

Правило: сборщик - `bundler`, иначе `nodenext`. Комбинация `esnext` +
`bundler` для кода, который запускает Node.js напрямую, компилируется без
ошибок и падает в рантайме - см. типичные ошибки.

---

## 2.4 Совместимость модулей: `esModuleInterop`, `allowSyntheticDefaultImports`, `isolatedModules`, `verbatimModuleSyntax`

Четыре опции решают одну задачу - сделать так, чтобы модульный код вел себя
одинаково в компиляторе, в сборщике и в среде выполнения.

### `esModuleInterop` и `allowSyntheticDefaultImports`

У CommonJS нет экспорта по умолчанию. Модуль `module.exports = express`
экспортирует функцию целиком, и по правилам ESM ей соответствует не
`default`, а весь объект пространства имен. Без вспомогательного кода
`import express from 'express'` в рантайме дал бы `undefined`, и приходилось
писать `import * as express from 'express'`, что нарушает семантику ESM.

`esModuleInterop` вставляет обертку `__importDefault` из примера выше: она
подставляет `{ default: module.exports }` для модулей без признака
`__esModule`. `allowSyntheticDefaultImports` - половина той же опции на
уровне типов: разрешает записать `import x from` для модуля с `export =`.
С 6.0 обе включены и отключению не подлежат; знать о них нужно, чтобы читать
старые конфигурации и понимать, откуда в выводе берется `__importDefault`.

### `isolatedModules`

**`isolatedModules`** - режим, запрещающий конструкции, которые нельзя
корректно скомпилировать, видя один файл без остальных.

Компилятор `tsc` видит всю программу и, например, знает, что `Shape` -
интерфейс, а значит, `export { Shape } from './types'` нужно удалить.
Однофайловые транспиляторы - esbuild, swc, Babel, режим стирания в Node -
не знают этого и оставили бы экспорт несуществующего значения. Опция делает
такой код ошибкой заранее:

```
src/reexport.ts(1,10): error TS1205: Re-exporting a type when 'isolatedModules' is enabled requires using 'export type'.
```

Второе следствие: `const enum` перестает инлайниться и компилируется как
обычный `enum` - однофайловый инструмент не может подставить значение из
другого файла ([3.3](arrays-tuples-enums.md#33-перечисления-числовые-строковые-const-enum-представление-в-javascript)).

### `verbatimModuleSyntax`

**`verbatimModuleSyntax`** (5.0) - режим, при котором импорт или экспорт без
модификатора `type` попадает в вывод дословно, а с модификатором - удаляется
целиком.

Это более сильное требование, чем `isolatedModules`: не только реэкспорты, но
и каждый импорт типа должен быть помечен:

```ts
// import { Shape, unit } from './types';
// Ошибка TS1484: 'Shape' is a type and must be imported using a type-only import when 'verbatimModuleSyntax' is enabled.

import { type Shape, unit, Level } from './types';
import type { Shape as S2 } from './types';
```

```js
// вывод: помеченное удалено, остальное сохранено как есть
import { unit, Level } from './types';
```

Выигрыш - предсказуемость: вывод любого инструмента совпадает с выводом `tsc`,
а импорт, оставленный ради побочного эффекта, не будет удален по ошибке. В
разделе [1.7](type-system.md#17-стирание-типов-что-остается-в-javascript) показано,
как без этой опции корректный для `tsc` код падает в Node.

| | `isolatedModules` | `verbatimModuleSyntax` |
| --- | --- | --- |
| Реэкспорт типа без `type` | ошибка | ошибка |
| Импорт типа без `type` | допустим, удаляется по анализу | ошибка |
| Неиспользуемый импорт значения | удаляется | сохраняется |
| Поведение `const enum` | как обычный `enum` | как обычный `enum` |
| Рекомендация | старые проекты | новые проекты |

### `moduleDetection`

Файл без единого `import` или `export` - по правилам JavaScript не модуль, а
скрипт с глобальной областью видимости. Два таких файла делят имена:

```
src/script-a.ts(1,7): error TS2451: Cannot redeclare block-scoped variable 'shared'.
src/script-b.ts(1,7): error TS2451: Cannot redeclare block-scoped variable 'shared'.
```

`"moduleDetection": "force"` объявляет модулем каждый файл. В проекте со
сборщиком или на Node.js скриптов не бывает, и опция уместна всегда;
`tsc --init` включает ее, но значением по умолчанию она не является.

### `noUncheckedSideEffectImports`

Импорт ради побочного эффекта - `import './styles.css'` - раньше не проверялся
вовсе: опечатка в пути обнаруживалась только сборщиком. С 6.0 опция включена по
умолчанию, и для такого импорта нужен либо существующий модуль, либо декларация
([14.4](declarations.md#144-глобальные-декларации-declare-global-window-processenv-импорт-нескриптовых-файлов)):

```
src/consumer.ts(2,8): error TS2882: Cannot find module or type declarations for side-effect import of './styles.css'.
```

---

## 2.5 `strict` и его составляющие

**`strict`** - опция, включающая семейство проверок, каждая из которых
отвергает программы, способные упасть в рантайме. С 6.0 она включена по
умолчанию.

`strict` - не фиксированный список: новые проверки этого семейства по мере
появления добавляются в него автоматически (`useUnknownInCatchVariables` -
в 4.4, `strictBuiltinIteratorReturn` - в 5.6). Проект со `strict: true`
получает их при обновлении компилятора; любую из них можно отключить отдельно,
как делает NestJS с `strictPropertyInitialization`.

| Опция | Что отвергает | Ошибка |
| --- | --- | --- |
| `strictNullChecks` | `null` и `undefined` вне явного объединения, [1.6](type-system.md#16-null-и-undefined-при-strictnullchecks) | TS2322, TS18047, TS18048 |
| `noImplicitAny` | параметры и переменные с невыводимым типом, [1.3](type-system.md#13-аннотации-и-вывод-типов-расширение-литералов) | TS7006 |
| `strictFunctionTypes` | ковариантные параметры функций | TS2322 |
| `strictBindCallApply` | нетипизированные `call`, `apply`, `bind` | TS2345 |
| `strictPropertyInitialization` | поля класса без инициализации | TS2564 |
| `noImplicitThis` | `this` с типом `any` | TS2683 |
| `useUnknownInCatchVariables` | `any` в `catch`, [1.4](type-system.md#14-any-и-unknown) | TS18046 |
| `strictBuiltinIteratorReturn` | `any` в `IteratorResult.value` | TS18048 |
| `alwaysStrict` | код вне `"use strict"`; с 6.0 отключить нельзя | |

Один файл, восемь ошибок под `strict` и ноль без него:

```ts
// strictFunctionTypes
interface Animal {
  name: string;
}
interface Dog extends Animal {
  breed: string;
}
let handleAnimal: (animal: Animal) => void = () => {};
const handleDog = (dog: Dog): void => {
  console.log(dog.breed.toUpperCase());
};
// handleAnimal = handleDog;
// Ошибка TS2322: Type '(dog: Dog) => void' is not assignable to type '(animal: Animal) => void'.
//   Types of parameters 'dog' and 'animal' are incompatible.
handleAnimal({ name: 'cat' });

// strictBindCallApply
function greet(name: string, age: number): string {
  return `${name} is ${age}`;
}
// greet.call(null, 'John', '25');
// Ошибка TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.

// strictPropertyInitialization
class User {
  // name: string;
  // Ошибка TS2564: Property 'name' has no initializer and is not definitely assigned in the constructor.
  email?: string; // допустимо: необязательное
  age: number = 0; // допустимо: инициализировано
  id: string; // допустимо: присваивается в конструкторе
  constructor(id: string) {
    this.id = id;
  }
}

// noImplicitThis
const counter = {
  count: 0,
  start() {
    return function () {
      // return this.count;
      // Ошибка TS2683: 'this' implicitly has type 'any' because it does not have a type annotation.
    };
  },
};

// strictBuiltinIteratorReturn
const iterator = [1, 2, 3].values();
const value = iterator.next().value; // number | undefined, а не any
// value.toFixed(1);
// Ошибка TS18048: 'value' is possibly 'undefined'.
```

Пример со `strictFunctionTypes` стоит проследить до конца. Присваивание
`handleAnimal = handleDog` выглядит безобидно: `Dog` - это `Animal` с
дополнительным полем. Но после него вызов `handleAnimal({ name: 'cat' })`
передает в `handleDog` объект без `breed`, и в рантайме:

```
TypeError: Cannot read properties of undefined (reading 'toUpperCase')
```

Функция, принимающая `Dog`, требует **больше**, чем функция, принимающая
`Animal`, поэтому подставлять ее вместо второй нельзя. Параметры функций
сравниваются в обратном направлении - контравариантно. До появления опции
компилятор допускал обе стороны; для методов, объявленных синтаксисом метода,
он допускает их и сейчас - ради совместимости встроенных типов
([5.6](functions.md#56-совместимость-функций-число-параметров-вариантность-strictfunctiontypes)).

`strictPropertyInitialization` отключают фреймворки с внедрением
зависимостей: поля заполняет контейнер после конструктора, и компилятор этого
не видит. Альтернатива без отключения - оператор определенного присваивания
`name!: string`, который честнее: он помечает конкретное поле, а не снимает
проверку со всех ([6.1](classes.md#61-поля-и-конструктор-инициализация-strictpropertyinitialization-параметры-свойства)).

---

## 2.6 Дополнительные проверки: `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride` и другие

Проверки вне `strict` не вошли в него по одной из двух причин: они отвергают
и корректные программы, требуя от кода определенного стиля, либо делают тип
менее удобным ради редких случаев. Каждая из них - осознанный выбор проекта.

| Опция | Что ловит | Ошибка | Цена |
| --- | --- | --- | --- |
| `noUncheckedIndexedAccess` | `list[i]` и `dict[key]` без проверки на `undefined` | TS18048 | проверка после каждого индекса, даже в цикле по `length` |
| `exactOptionalPropertyTypes` | явное `undefined` в необязательном свойстве | TS2375 | нельзя записать `{ retries: undefined }` |
| `noImplicitOverride` | переопределение метода без `override` | TS4114 | |
| `noImplicitReturns` | функция без аннотации, где не все пути возвращают значение | TS7030 | |
| `noFallthroughCasesInSwitch` | `case` без `break` с телом | TS7029 | |
| `noUnusedLocals`, `noUnusedParameters` | неиспользуемые переменные и параметры | TS6133 | параметры-заглушки называются с `_` |
| `noPropertyAccessFromIndexSignature` | `env.HOME` вместо `env['HOME']` для индексных сигнатур | TS4111 | стилистическое требование |
| `erasableSyntaxOnly` | `enum`, `namespace`, параметры-свойства, [1.7](type-system.md#17-стирание-типов-что-остается-в-javascript) | TS1294 | |

```ts
// noUncheckedIndexedAccess
const scores = [10, 20];
const third = scores[2]; // number | undefined
// third.toFixed(1);
// Ошибка TS18048: 'third' is possibly 'undefined'.

// exactOptionalPropertyTypes
interface Options {
  retries?: number; // ровно number либо отсутствие свойства
}
// const options: Options = { retries: undefined };
// Ошибка TS2375: Type '{ retries: undefined; }' is not assignable to type 'Options' with 'exactOptionalPropertyTypes: true'.

// noImplicitOverride
class Base {
  render(): string {
    return 'base';
  }
}
class Derived extends Base {
  // render(): string {
  // Ошибка TS4114: This member must have an 'override' modifier because it overrides a member in the base class 'Base'.
  override render(): string {
    return 'derived';
  }
}

// noImplicitReturns: без аннотации тип выводится как number | undefined,
// и без опции это не ошибка
// function sign(n: number) {
//   if (n > 0) {
//     return 1;
//   }
//   if (n < 0) {
//     return -1;
//   }
// }
// Ошибка TS7030: Not all code paths return a value.

// noPropertyAccessFromIndexSignature
const env: Record<string, string> = {};
// const home = env.HOME;
// Ошибка TS4111: Property 'HOME' comes from an index signature, so it must be accessed with ['HOME'].
const home = env['HOME'];
```

`noUncheckedIndexedAccess` - самая полезная и самая спорная из списка. Она
закрывает единственную дыру `strictNullChecks`
([1.6](type-system.md#16-null-и-undefined-при-strictnullchecks)), но в
цикле `for (let i = 0; i < list.length; i++)` элемент `list[i]` тоже
получает `undefined`, хотя цикл его исключает. Компенсация - `for...of`,
`.at()` там, где `undefined` действительно возможен, и деструктуризация с
проверкой.

`exactOptionalPropertyTypes` различает «свойства нет» и «свойство равно
`undefined`». Разница реальна: `'retries' in options` и `Object.keys` видят
второе, а не первое. Цена - код, который передает `undefined` явно (обычный
результат условного выражения), перестает компилироваться.

`noImplicitOverride` защищает от переименования в базовом классе: без
`override` метод наследника молча превратился бы в новый, никем не вызываемый.

Набор `@tsconfig/strictest` включает все перечисленное разом; для нового
проекта это разумная отправная точка, из которой проверки убирают по
одной, а не добавляют.

### `skipLibCheck`

`skipLibCheck` отключает проверку всех файлов `.d.ts` - как из
`node_modules`, так и собственных. Включают ее ради двух вещей: скорости
(декларации `@types/node` и `@types/react` - тысячи строк) и устойчивости к
конфликтам между пакетами, у которых расходятся версии типов. Цена: ошибка в
собственном файле деклараций тоже не будет замечена:

```
// skipLibCheck: false
libs/broken.d.ts(1,32): error TS1039: Initializers are not allowed in ambient contexts.

// skipLibCheck: true - ошибок нет
```

Опция не отключает **использование** деклараций - типы из `.d.ts` по-прежнему
участвуют в проверке `.ts`-файлов. Не проверяется только их внутренняя
согласованность.

---

## 2.7 Пути и выходные файлы: `rootDir`, `outDir`, `baseUrl`, `paths`, `declaration`, `sourceMap`

### `rootDir` и `outDir`

Компилятор воспроизводит в `outDir` структуру каталогов относительно
`rootDir`: `src/utils/math.ts` превращается в `dist/utils/math.js` при
`rootDir: "src"`. До 6.0 `rootDir` вычислялся как общий каталог всех
исходников; теперь по умолчанию это каталог `tsconfig.json`, и при
несовпадении компилятор не строит `dist/src/...` молча, а требует решения:

```
error TS5011: The common source directory of 'tsconfig.json' is './src'. The 'rootDir' setting must be explicitly set to this or another path to adjust your output's file layout.
```

### `paths` без `baseUrl`

**`paths`** - таблица подстановок для строк импорта: `"@/*": ["./src/*"]`
превращает `'@/utils/math'` в `./src/utils/math` при разрешении модулей. С
6.0 пути в `paths` разрешаются относительно `tsconfig.json`; `baseUrl` удален,
и его прежняя роль «корня для голых импортов» воспроизводится записью
`"*": ["./*"]`.

Главное свойство `paths`: **компилятор не переписывает импорты в выводе**.
Файл с `import { twice } from '@/utils/math'` компилируется без ошибок, а в
`dist/main.js` остается та же строка:

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find package '@/utils' imported from dist/main.js
```

`paths` - контракт для проверки типов, а разрешать алиасы в рантайме должен
кто-то другой: сборщик (Vite и webpack читают `tsconfig` через плагины) или
загрузчик. Для Node.js существует родной механизм, который понимают и Node,
и компилятор при `nodenext`, - поле `imports` в `package.json`:

```json
{
  "type": "module",
  "imports": { "#utils/*": "./dist/utils/*.js" }
}
```

```ts
import { twice } from '#utils/math';
console.log(twice(21)); // компилируется в nodenext и запускается: 42
```

Спецификатор с `#` разрешается самим Node.js по `package.json`, и никакой
переписки не требуется. Для проектов на Node.js это замена `paths`, а не
дополнение к ним.

### Выходные файлы

| Опция | Результат | Когда |
| --- | --- | --- |
| `declaration` | `.d.ts` рядом с каждым `.js` | библиотеки, project references |
| `declarationMap` | `.d.ts.map` - переход из декларации в исходник | библиотеки в монорепозитории |
| `sourceMap` | `.js.map` - стек ошибок указывает на `.ts` | все, что запускается |
| `emitDeclarationOnly` | только `.d.ts`; код генерирует сборщик | библиотеки с esbuild/swc |
| `noEmit` | ничего; только проверка | фронтенд, где код собирает Vite |
| `noEmitOnError` | при ошибках вывод не создается | сборка в CI |
| `isolatedDeclarations` | требует явных типов на экспортах, чтобы `.d.ts` строились без проверки | крупные библиотеки, [18.1](build-and-performance.md#181-проверка-и-эмит-tsc-noemit-транспиляция-без-проверки-esbuild-swc-babel) |

Результат для `src/main.ts` и `src/utils/math.ts` при `declaration`,
`declarationMap` и `sourceMap`:

```
dist/main.d.ts        dist/main.d.ts.map      dist/main.js        dist/main.js.map
dist/utils/math.d.ts  dist/utils/math.d.ts.map  dist/utils/math.js  dist/utils/math.js.map
```

Опции `incremental`, `tsBuildInfoFile` и `composite` относятся к скорости
сборки и разобраны в [18.2](build-and-performance.md#182-инкрементальная-компиляция-incremental-tsbuildinfofile-режим-watch)
и [18.3](build-and-performance.md#183-project-references-composite-references-tsc--b-монорепозитории).

---

## 2.8 Конфигурации для типовых проектов: Node.js, NestJS, React, библиотека

Четыре конфигурации ниже проверены компиляцией и запуском образцов под
TypeScript 7.0. Общее ядро у всех одно: явные `strict`, `target`, `types`,
`rootDir`, `skipLibCheck` и модификатор `type` на импортах типов. Различаются
модульная система, среда и то, кто генерирует код.

| | Node.js | NestJS | React (Vite) | Библиотека |
| --- | --- | --- | --- | --- |
| `module` / `moduleResolution` | `nodenext` | `nodenext` | `esnext` / `bundler` | `nodenext` |
| `target` | по версии Node | по версии Node | `es2023` | ниже, чем у приложений |
| `lib` | без `dom` | без `dom` | с `dom` | по потребителю |
| `types` | `["node"]` | `["node"]` | `["vite/client"]` | `[]` |
| Кто генерирует код | `tsc` | `tsc` или swc | Vite (esbuild), `tsc` только проверяет | `tsc` |
| Особое | | декораторы, `strictPropertyInitialization: false` | `noEmit`, `jsx` | `declaration`, `declarationMap` |

### Сервис на Node.js

```json
{
  "compilerOptions": {
    "module": "nodenext",
    "target": "es2024",
    "lib": ["es2024"],
    "types": ["node"],
    "rootDir": "src",
    "outDir": "dist",
    "sourceMap": true,
    "strict": true,
    "verbatimModuleSyntax": true,
    "noUncheckedIndexedAccess": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

В `package.json` - `"type": "module"`, в импортах - расширения `.js`.
`types: ["node"]` обязателен: без него `process` и `node:http` неизвестны
компилятору (TS2591). Вместо ручного `target` и `lib` можно наследовать
`@tsconfig/node24`.

### NestJS

```json
{
  "compilerOptions": {
    "module": "nodenext",
    "target": "es2023",
    "types": ["node"],
    "rootDir": "src",
    "outDir": "dist",
    "sourceMap": true,
    "incremental": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "strict": true,
    "strictPropertyInitialization": false,
    "isolatedModules": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

Две опции декораторов включают старую реализацию декораторов и генерацию
метаданных о типах параметров - на них построено внедрение зависимостей
NestJS ([12.4](decorators.md#124-метаданные-reflect-metadata-emitdecoratormetadata-symbolmetadata)).
`strictPropertyInitialization` отключен, потому что поля заполняет контейнер.
Стартовый шаблон NestJS 12 использует ESM (`"type": "module"`) и `nodenext`,
поэтому расширения в импортах нужны и здесь.

### React со сборщиком Vite

```json
{
  "compilerOptions": {
    "module": "esnext",
    "moduleResolution": "bundler",
    "target": "es2023",
    "lib": ["es2023", "dom", "dom.iterable"],
    "types": ["vite/client"],
    "jsx": "react-jsx",
    "noEmit": true,
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "erasableSyntaxOnly": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

Код генерирует esbuild внутри Vite, файл за файлом и без проверки типов;
`tsc --noEmit` запускается отдельно - в `lint`-скрипте и в CI. Отсюда три
опции, которые делают поведение однофайлового транспилятора предсказуемым:
`verbatimModuleSyntax`, `moduleDetection: "force"` и `erasableSyntaxOnly`.
`types: ["vite/client"]` дает типы `import.meta.env` и импортов ресурсов
(`.svg`, `.css`). `jsx: "react-jsx"` - автоматический рантайм React 17+,
при котором `import React` в каждом файле не нужен
([16.1](react.md#161-компонент-как-функция-reactfc-против-обычной-функции-reactnode-и-jsxelement)).

### Библиотека

```json
{
  "compilerOptions": {
    "module": "nodenext",
    "target": "es2022",
    "lib": ["es2022"],
    "types": [],
    "rootDir": "src",
    "outDir": "dist",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "strict": true,
    "verbatimModuleSyntax": true,
    "isolatedDeclarations": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

`target` ниже, чем у приложений: библиотека не знает, где ее запустят.
`declaration` обязателен - без `.d.ts` потребители получат `any` на каждом
импорте. `isolatedDeclarations` заставляет аннотировать типы всех экспортов,
и в обмен `.d.ts` можно генерировать без полной проверки. Как оформить
`exports` и `types` в `package.json` - в
[14.6](declarations.md#146-публикация-типизированной-библиотеки-types-и-exports-в-packagejson).

---

## Типичные ошибки

1. **`exclude` как способ не проверять файл.** Исключенный, но импортированный
   файл проверяется наравне с остальными. Не проверяется только то, что не
   входит в граф импортов.
2. **Расчет на значения по умолчанию.** Конфигурация без явных `strict`,
   `target`, `module` и `types` означала одно в 5.9 и другое в 6.0. Явные
   значения делают ее независимой от версии.
3. **`Cannot find name 'process'` после обновления.** `types` по умолчанию
   пуст, и `@types/node` больше не подключается сам. Нужен `"types": ["node"]`.
4. **`paths` в проекте на Node.js.** Компилятор алиасы не переписывает, Node
   их не знает: `ERR_MODULE_NOT_FOUND`. Замена - поле `imports` в
   `package.json`.
5. **`moduleResolution: bundler` без сборщика.** Импорт `'./util'` без
   расширения компилируется и падает в Node ESM с `ERR_MODULE_NOT_FOUND`;
   `nodenext` потребовал бы `'./util.js'` еще на этапе проверки.
6. **`dom` в `lib` серверного проекта.** Декларации DOM объявляют глобальные
   `name`, `document`, `location`. Опечатка в имени переменной `name`
   компилируется, потому что глобальная `name` существует, и обнаруживается
   только в рантайме. Без `dom` это ошибка TS2304.
7. **`skipLibCheck` и собственные `.d.ts`.** Опция отключает проверку всех
   деклараций, включая написанные вручную; ошибка в них не будет замечена, пока
   не сломается зависящий код.
8. **`module: esnext` для Node.js без `"type": "module"`.** Вывод содержит
   `import`, Node читает файл как CommonJS и отказывается его выполнять.
   Формат должен определять `package.json`, а компилятору - `nodenext`,
   который его читает.

---

[← Система типов](type-system.md) · [К содержанию](../README.md) ·
[Далее: массивы, кортежи и перечисления →](arrays-tuples-enums.md)
