# 13 Модули

[← К содержанию](../README.md)

Модуль - файл с `import` или `export`: у него собственная область видимости,
а все, что он не экспортировал, снаружи недоступно. В JavaScript две модульные
системы - ES-модули (стандарт) и CommonJS (Node.js до стандарта), и
TypeScript обязан работать с обеими: компилировать в любую из них, понимать
пакеты, написанные в каждой, и не ломать код при переходе. Тема разбирает
семантику обеих систем, формы импорта и экспорта, специфичные для TypeScript
конструкции (`import type`, `namespace`) и то, как компилятор находит файл по
строке в `import`. Настройки, управляющие всем этим, - `module`,
`moduleResolution`, `verbatimModuleSyntax` - разобраны в
[2.3](tsconfig.md#23-module-и-moduleresolution) и
[2.4](tsconfig.md#24-совместимость-модулей-esmoduleinterop-allowsyntheticdefaultimports-isolatedmodules-verbatimmodulesyntax);
здесь - то, чем они управляют.

---

## 13.1 ES-модули и CommonJS: синтаксис, семантика, вывод компилятора

**ES-модуль** (ESM) - модуль со статическими `import`/`export`,
разрешаемыми до выполнения кода. **CommonJS** (CJS) - модуль, экспортирующий
объект `module.exports`, который другой модуль получает вызовом `require()`
во время выполнения.

| | ES-модули | CommonJS |
| --- | --- | --- |
| Синтаксис | `import { x } from './m.js'`, `export const x` | `const { x } = require('./m')`, `module.exports = ...` |
| Разрешение | статическое, до выполнения | динамическое, в момент `require` |
| Привязки | живые: импорт видит изменения экспорта | копия значения в момент чтения |
| Загрузка | асинхронная, `await` на верхнем уровне допустим | синхронная |
| `this` на верхнем уровне | `undefined` | `module.exports` |
| Путь к файлу | `import.meta.url` | `__filename`, `__dirname` |
| Расширение в относительном импорте (Node.js) | обязательно | необязательно |
| Строгий режим | всегда | по директиве |

### Живые привязки

Различие, которое проявляется в коде, - семантика привязок. ESM экспортирует
не значение, а **ссылку на переменную**:

```ts
// src/counter.ts
export let count = 0;

export function increment(): void {
  count += 1;
}
```

```ts
// src/main.ts
import { count, increment } from './counter.js';

console.log('before:', count);
increment();
console.log('after:', count); // 1: импорт видит новое значение
```

При компиляции в CommonJS компилятор сохраняет эту семантику, насколько
может: экспорт становится свойством `exports`, присваивание `count += 1`
переписывается в `exports.count += 1`, а импорт читает свойство при каждом
обращении:

```js
// counter.js, module: commonjs
exports.count = 0;
function increment() {
    exports.count += 1;
}

// main.js
const counter_js_1 = require("./counter.js");
console.log('before:', counter_js_1.count);
(0, counter_js_1.increment)();
console.log('after:', counter_js_1.count); // тоже 1
```

Копия появляется там, где код написан на CommonJS вручную и деструктурирует
результат `require`:

```js
const { count, increment } = require('./counter.js');
increment();
console.log(count); // 0: count - копия на момент деструктуризации
console.log(require('./counter.js').count); // 1
```

### Что генерирует компилятор

Опция `module` задает систему модулей на выходе; при `nodenext` компилятор
выбирает ее для каждого файла по ближайшему `package.json` и расширению
([2.3](tsconfig.md#23-module-и-moduleresolution)). Исходный код при этом
пишется на синтаксисе ESM в обоих случаях - за одним исключением.

Для CommonJS-модулей, экспортирующих одно значение (`module.exports = Logger`),
у TypeScript есть собственный синтаксис: `export =` объявляет такой экспорт,
`import x = require()` - его импорт:

```ts
// cjs/src/legacy.ts
class Logger {
  log(message: string): void {
    console.log(message);
  }
}
export = Logger;
```

```ts
// cjs/src/consumer.ts
import Logger = require('./legacy.js');

const logger = new Logger();
logger.log('cjs ok');
```

```js
// consumer.js
const Logger = require("./legacy.js");
const logger = new Logger();
```

`export =` встречается в декларациях старых пакетов (`express`, `lodash`);
ESM-код импортирует их через `import x from` благодаря `esModuleInterop`
([2.4](tsconfig.md#24-совместимость-модулей-esmoduleinterop-allowsyntheticdefaultimports-isolatedmodules-verbatimmodulesyntax)).
В собственном коде `export =` нужен только для файлов, которые обязаны
остаться CommonJS и отдавать одно значение.

---

## 13.2 Формы импорта и экспорта: именованный, по умолчанию, пространство имен, реэкспорт, динамический `import()`

```ts
// src/shapes.ts
export interface Shape {
  area(): number;
}

export class Circle implements Shape {
  constructor(private readonly radius: number) {}

  area(): number {
    return Math.PI * this.radius ** 2;
  }
}

export const unit: Shape = { area: () => 1 };

export default function describe(shape: Shape): string {
  return `area=${shape.area().toFixed(2)}`;
}
```

| Форма | Запись | Замечание |
| --- | --- | --- |
| Именованный импорт | `import { Circle, unit } from './shapes.js'` | имена проверяются, переименование через `as` |
| Импорт по умолчанию | `import describe from './shapes.js'` | имя выбирает импортирующий |
| Пространство имен | `import * as shapes from './shapes.js'` | все экспорты как свойства объекта |
| Реэкспорт | `export { Circle } from './shapes.js'` | без импорта в текущую область |
| Реэкспорт всего | `export * from './shapes.js'` | без экспорта по умолчанию |
| Реэкспорт как пространство имен | `export * as shapes from './shapes.js'` | |
| Реэкспорт умолчания под именем | `export { default as describe } from './shapes.js'` | |
| Динамический импорт | `await import('./shapes.js')` | `Promise` с объектом модуля |
| Тип модуля | `typeof import('./shapes.js')` | тип объекта модуля без импорта |
| Импорт JSON | `import data from './data.json' with { type: 'json' }` | `resolveJsonModule`; атрибут обязателен в Node.js |

```ts
// src/index.ts
export { Circle, unit } from './shapes.js';
export type { Shape } from './shapes.js';
export { default as describe } from './shapes.js';
export * as shapes from './shapes.js';
```

```ts
// src/main.ts
import describe, { Circle, unit, type Shape } from './shapes.js';
import * as shapes from './shapes.js';
import { describe as describeAgain } from './index.js';
import data from './data.json' with { type: 'json' };

const circle: Shape = new Circle(1);
console.log(describe(circle), describeAgain(unit), shapes.unit.area(), data.name);

const lazy = await import('./shapes.js'); // typeof import('./shapes.js')
console.log(typeof lazy.default, lazy.Circle.name);

type ShapesModule = typeof import('./shapes.js');
const keys: (keyof ShapesModule)[] = ['Circle', 'unit', 'default'];
```

```
area=3.14 area=1.00 1 demo
function Circle
```

Файл `index.ts` с реэкспортами - «бочка» (barrel): единая точка входа
модуля из нескольких файлов. Удобно для потребителей, но с двумя издержками:
импорт из бочки загружает все ее файлы, даже если нужен один, а циклы
между бочкой и ее файлами - частый источник `undefined` при инициализации.

### Именованный или по умолчанию

Экспорт по умолчанию - обычный экспорт под именем `default`, и разница с
именованным - только в том, кто выбирает имя. Аргументы за именованные:
имя одно на всех потребителей, опечатка в нем - ошибка компиляции,
переименование в редакторе переименовывает везде, автоимпорт находит
символ. Аргументы за умолчание: модули с единственной сущностью (компонент,
класс), соглашения фреймворков (страницы Next.js, ленивые компоненты через
`React.lazy`). Правило `import/no-default-export` закрепляет выбор на уровне
проекта; важнее единообразия здесь нет ничего.

### Динамический импорт

`import()` - выражение, возвращающее промис с объектом модуля. Тип объекта
известен статически - это `typeof import('./shapes.js')`, - поэтому
`lazy.Circle` проверяется так же, как статический импорт. Применения:
загрузка по требованию (разделение бандла), условная загрузка, импорт
ESM-модуля из CommonJS-кода, где `import` недоступен.

---

## 13.3 Импорт и экспорт только типов: `import type`, `verbatimModuleSyntax`

Импорт типа - интерфейса, псевдонима - не существует в JavaScript: после
стирания типов ему не соответствует ничего. Компилятор `tsc` удаляет такие
импорты сам, по анализу использования; инструменты, которые типов не видят,
удалить их не могут ([1.7](type-system.md#17-стирание-типов-что-остается-в-javascript)).
**Импорт только типов** делает намерение явным в синтаксисе:

```ts
// src/models.ts
export class User {
  constructor(public readonly name: string) {}
}
export interface Repository<T> {
  find(id: string): T | undefined;
}
export type UserId = string;
```

```ts
// src/ok.ts
import { User, type Repository, type UserId } from './models.js'; // встроенные модификаторы
import type { User as UserType } from './models.js'; // весь импорт - только типы

export const users: Repository<User> = { find: () => new User('Ann') };
export const id: UserId = 'u1';
export const isUser = (value: unknown): value is UserType => value instanceof User;
export type { Repository } from './models.js';
export type * from './models.js';
```

```js
// ok.js
import { User } from './models.js';
export const users = { find: () => new User('Ann') };
export const id = 'u1';
export const isUser = (value) => value instanceof User;
```

В выводе остался только `User` - единственное, что используется как
значение. `import type { User }` импортирует класс исключительно как тип:
`new User()` и `instanceof User` с ним невозможны:

```ts
// import type { User } from './models.js';
// export const ann = new User('Ann');
// Ошибка TS1361: 'User' cannot be used as a value because it was imported using 'import type'.
```

### `verbatimModuleSyntax`

Опция ([2.4](tsconfig.md#24-совместимость-модулей-esmoduleinterop-allowsyntheticdefaultimports-isolatedmodules-verbatimmodulesyntax))
переводит удаление импортов из анализа в синтаксис: удаляется ровно то, что
помечено `type`, остальное сохраняется дословно. Импорт типа без пометки -
ошибка TS1484. Вторая ее обязанность - запрет ESM-синтаксиса в файлах,
которые компилируются в CommonJS:

```ts
// cjs/src/esm-syntax.ts - package.json с "type": "commonjs"
// import Logger from './legacy.js';
// Ошибка TS1295: ECMAScript imports and exports cannot be written in a CommonJS file under 'verbatimModuleSyntax'.
// export const logger = new Logger();
// Ошибка TS1287: A top-level 'export' modifier cannot be used on value declarations in a CommonJS module when 'verbatimModuleSyntax' is enabled.
```

Без этого запрета `import Logger from` в CommonJS-файле компилировался бы в
`require` с оберткой интеропа, и один и тот же исходный текст означал бы
разное в зависимости от `package.json`. С `verbatimModuleSyntax` синтаксис
файла соответствует его формату: ESM-файлы пишутся на `import`/`export`,
CommonJS-файлы - на `import x = require()` и `export =`.

Три причины включать опцию в новых проектах:

1. Импорт ради побочного эффекта (`import './polyfill.js'`) не будет удален
   как «неиспользуемый».
2. Однофайловые транспиляторы и режим stripping в Node дают тот же результат,
   что `tsc`.
3. Модуль, который экспортирует только типы, не порождает `import` в
   рантайме - и не тянет за собой свои зависимости.

---

## 13.4 Пространства имен против модулей

**Пространство имен** (`namespace`) - конструкция TypeScript для группировки
объявлений под общим именем внутри одного файла или глобальной области.
Появилась до стандартизации модулей как «внутренние модули» и компилируется
в объект, заполняемый функцией:

```ts
namespace Geometry {
  export interface Point {
    x: number;
    y: number;
  }

  export function distance(a: Point, b: Point): number {
    return Math.hypot(b.x - a.x, b.y - a.y);
  }

  export namespace Shapes {
    export const unit: Point = { x: 1, y: 1 };
  }
}

const origin: Geometry.Point = { x: 0, y: 0 };
Geometry.distance(origin, Geometry.Shapes.unit); // 1.414...
```

```js
var Geometry;
(function (Geometry) {
    function distance(a, b) {
        return Math.hypot(b.x - a.x, b.y - a.y);
    }
    Geometry.distance = distance;
    let Shapes;
    (function (Shapes) {
        Shapes.unit = { x: 1, y: 1 };
    })(Shapes = Geometry.Shapes || (Geometry.Shapes = {}));
})(Geometry || (Geometry = {}));
```

Для организации кода пространства имен проиграли модулям по всем пунктам:

| | `namespace` | Модуль |
| --- | --- | --- |
| Граница | имя внутри файла или глобальной области | файл |
| Стирание | нет: объект и функция в выводе | да, кроме значений |
| Удаление неиспользуемого кода сборщиком | нет: один объект | да, по экспортам |
| Зависимости между частями | порядок файлов, `/// <reference>` | `import` |
| Стандарт | нет | ECMAScript |

Ключевое слово `module` для объявления пространства имен (`module Foo {}`)
с версии 6.0 - ошибка TS1540; допустимо только `namespace`.

### Где пространства имен остаются уместны

**Группировка типов.** Пространство имен, содержащее только типы, не
порождает кода и допускается даже под `erasableSyntaxOnly` - режим stripping
в Node его стирает:

```ts
namespace Validation {
  export type Rule = (value: string) => boolean;
  export interface Result {
    valid: boolean;
  }
}

const rule: Validation.Rule = (value) => value.length > 0;
```

**Слияние с функцией или классом.** Пространство имен с тем же именем
добавляет к функции свойства и вложенные типы - так объявляются функции с
«статическими» членами:

```ts
function createUser(name: string): createUser.User {
  return { name };
}

namespace createUser {
  export interface User {
    name: string;
  }
  export const anonymous = createUser('anonymous');
}

createUser('Ann').name;
createUser.anonymous.name;
```

**Декларации.** В файлах `.d.ts` `declare namespace` описывает глобальные
объекты с вложенной структурой - `NodeJS.ProcessEnv`, `Express.Request` -
и это основной способ расширять их
([14.4](declarations.md#144-глобальные-декларации-declare-global-window-processenv-импорт-нескриптовых-файлов)).

Пространство имен со значениями в обычном коде - ошибка под
`erasableSyntaxOnly` (TS1294) и в режиме stripping Node. Для нового кода
это не ограничение: то же самое делает модуль.

---

## 13.5 Разрешение модулей: расширения в ESM, `package.json` (`type`, `exports`), `.mts` и `.cts`

**Разрешение модуля** - превращение строки в `import` в путь к файлу.
Компилятор делает это по правилам выбранной стратегии
([2.3](tsconfig.md#23-module-и-moduleresolution)), и правила должны совпадать
с правилами среды выполнения: иначе код компилируется и не запускается.

### Относительные импорты

В ESM Node.js требует полный путь с расширением, и `nodenext` требует того
же - с расширением **выходного** файла: `./counter.js` для `counter.ts`,
`./config.cjs` для `config.cts`. Компилятор сопоставляет их сам; ошибка
TS2835 при отсутствии расширения - его способ предупредить о падении в
рантайме. Стратегия `bundler` расширений не требует, потому что сборщик
разрешает пути по-своему.

### `package.json`

| Поле | Что определяет |
| --- | --- |
| `type` | формат `.js`-файлов пакета: `"module"` - ESM, `"commonjs"` или отсутствие - CJS |
| `main` | точка входа для старых инструментов |
| `exports` | точки входа и **закрытие** остального: пути вне `exports` недоступны |
| `imports` | внутренние алиасы `#name` ([2.7](tsconfig.md#27-пути-и-выходные-файлы-rootdir-outdir-baseurl-paths-declaration-sourcemap)) |
| `types` | декларации для точки входа `main` |

Поле `exports` с условиями отдает разный файл в зависимости от того, как
пакет импортируют:

```json
{
  "name": "dual",
  "exports": {
    ".": {
      "types": "./index.d.ts",
      "import": "./index.mjs",
      "require": "./index.cjs"
    },
    "./utils": {
      "types": "./utils.d.ts",
      "default": "./utils.mjs"
    }
  }
}
```

Условия перебираются в порядке записи: `import` - для `import`, `require` -
для `require()`, `types` - для компилятора, `default` - для всех. Компилятор
сначала берет условие среды, ищет рядом с целью декларацию (`index.d.mts`
для `index.mjs`) и, не найдя, продолжает перебор до `types`. Другие
инструменты могут остановиться на первом совпадении, поэтому `types`
принято ставить первым. Без деклараций вовсе импорт из пакета - ошибка
TS7016 `Could not find a declaration file for module 'dual'`.

Путь, не перечисленный в `exports`, закрыт для всех:

```ts
// import { internal } from 'dual/internal.cjs';
// Ошибка TS2307: Cannot find module 'dual/internal.cjs' or its corresponding type declarations.
```

### `.mts` и `.cts`

Расширения задают формат файла независимо от `package.json`: `.mts`
компилируется в `.mjs` и всегда ESM, `.cts` - в `.cjs` и всегда CommonJS.
Они нужны там, где в одном пакете нужны оба формата - конфигурация в
CommonJS для старого инструмента внутри ESM-проекта:

```ts
// src/config.cts
const config = { port: 3000 };
export = config;
```

```ts
// src/main.mts
import { flavor, greet } from 'dual';
import { twice } from 'dual/utils';
import config = require('./config.cjs');

console.log(flavor, greet('esm'), twice(21), config.port); // esm hello, esm 42 3000
```

```js
// dist/config.cjs
const config = { port: 3000 };
module.exports = config;
```

Импорт CommonJS-файла из ESM записывается через `import x = require()` -
компилятор превращает его в `createRequire` для ESM-вывода; для файлов с
`export =` это единственная форма, сохраняющая тип.

### Двойные пакеты

Пакет с условиями `import` и `require` существует в двух экземплярах, и
приложение, где часть кода на ESM, а часть на CommonJS, может загрузить
оба:

```ts
// src/hazard.cts
import dual = require('dual');
export = dual.flavor;
```

```ts
// src/hazard-main.mts
import { flavor } from 'dual';
import cjsFlavor = require('./hazard.cjs');

console.log('esm side:', flavor, '| cjs side:', cjsFlavor); // esm side: esm | cjs side: cjs
```

Один пакет, два разных модуля: состояние, синглтоны и `instanceof` между
ними не совпадают. Это «dual package hazard», и защита от него -
единообразный формат приложения: Node.js начиная с 22.12 умеет `require()`
ESM-модулей без верхнеуровневого `await`, так что для нового кода
достаточно ESM.

---

## Типичные ошибки

1. **Деструктуризация `require` ради «импорта».** Копирует значение;
   изменения экспорта дальше не видны. ESM-импорт или обращение через объект
   модуля.
2. **Относительный импорт без расширения под `nodenext`.** TS2835, а без
   проверки - `ERR_MODULE_NOT_FOUND` в Node. Расширение - выходного файла:
   `.js`, `.cjs`, `.mjs`.
3. **`import type` для класса, который нужен в рантайме.** `new` и
   `instanceof` с ним - ошибка TS1361. `type` - только для того, что
   используется исключительно как тип.
4. **ESM-синтаксис в CommonJS-файле.** С `verbatimModuleSyntax` - ошибка
   TS1295; без нее - тихая обертка интеропа. Формат файла задается
   `package.json` или расширением, синтаксис ему соответствует.
5. **`namespace` для организации кода.** Не стирается, не удаляется
   сборщиком, не является стандартом. Модуль делает то же лучше;
   пространства имен - для типов и деклараций.
6. **Обращение к пути пакета вне `exports`.** Закрыт для всех
   потребителей (TS2307); нужна точка входа в `exports`.
7. **Смешение ESM и CommonJS в одном приложении с двойным пакетом.** Два
   экземпляра пакета с разным состоянием. Один формат на приложение.
8. **Бочка с циклом.** `index.ts`, реэкспортирующий файл, который
   импортирует `index.ts`, дает `undefined` при инициализации; файлы внутри
   модуля импортируют друг друга напрямую.

---

[← Декораторы](decorators.md) · [К содержанию](../README.md) ·
[Далее: декларации типов и внешние библиотеки →](declarations.md)
