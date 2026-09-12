# 14 Декларации типов и внешние библиотеки

[← К содержанию](../README.md)

После стирания типов ([1.7](type-system.md#17-стирание-типов-что-остается-в-javascript))
от библиотеки остается JavaScript, и компилятору потребителя неоткуда узнать,
что принимает и возвращает ее код. **Декларации типов** - файлы `.d.ts`,
которые описывают форму уже существующего кода, не содержа самого кода.
Тема разбирает, как они устроены, где компилятор их ищет, что делать с
библиотекой без них, как объявить то, чего в типах нет (глобальные
переменные, импорт картинок), как дополнить чужие типы и как оформить
собственную библиотеку, чтобы ее типы находились у всех потребителей.

---

## 14.1 Файлы `.d.ts`: `declare`, ambient-декларации, генерация через `declaration`

**Файл деклараций** (`.d.ts`) - файл, содержащий только описания типов и
сигнатур: интерфейсы, псевдонимы и объявления с ключевым словом `declare`.
Реализаций в нем нет, и компилятор из него ничего не генерирует.

**Ambient-декларация** - объявление с `declare`: «такая сущность существует
в рантайме, вот ее тип». `declare const`, `declare function`, `declare class`,
`declare module`, `declare global` - каждое описывает значение, которое
предоставит кто-то другой: библиотека, среда выполнения, сборщик.

```ts
// src/types/vendor.d.ts
declare const VERSION: string;
declare function track(event: string, payload?: Record<string, unknown>): void;
declare class Analytics {
  constructor(key: string);
  send(event: string): Promise<void>;
}
```

Инициализатор в такой декларации - ошибка TS1039 `Initializers are not
allowed in ambient contexts`: файл описывает, а не определяет.

### Генерация

Для собственного кода декларации не пишутся вручную - их генерирует
компилятор при `declaration: true` ([2.7](tsconfig.md#27-пути-и-выходные-файлы-rootdir-outdir-baseurl-paths-declaration-sourcemap)).
Из исходника:

```ts
// src/repository.ts
interface Row {
  id: string;
}

export interface Options {
  retries?: number;
}

export class Repository<T extends Row> {
  private readonly rows = new Map<string, T>();
  protected hits = 0;

  constructor(private readonly name: string) {}

  save(row: T) {
    this.rows.set(row.id, row);
    return this;
  }

  find(id: string) {
    this.hits += 1;
    return this.rows.get(id);
  }
}

export function withRetry(options: Options = {}) {
  return options.retries ?? 3;
}

export const DEFAULTS = { retries: 3, name: 'default' } as const;
```

получается:

```ts
// dist/repository.d.ts
interface Row {
    id: string;
}
export interface Options {
    retries?: number;
}
export declare class Repository<T extends Row> {
    private readonly name;
    private readonly rows;
    protected hits: number;
    constructor(name: string);
    save(row: T): this;
    find(id: string): T | undefined;
}
export declare function withRetry(options?: Options): number;
export declare const DEFAULTS: {
    readonly retries: 3;
    readonly name: 'default';
};
export {};
```

Что видно по результату:

- выведенные типы записаны явно: `find` получил `T | undefined`, `withRetry` -
  `number`, `DEFAULTS` - литеральные типы из `as const`;
- `private` члены сохранили имена, но потеряли типы: потребителю они
  недоступны, а имя нужно для номинальной совместимости
  ([6.2](classes.md#62-модификаторы-доступа-public-protected-private-readonly-private-против-private));
- неэкспортированный `Row`, использованный в публичной сигнатуре,
  скопирован в декларацию как локальный тип - `export {}` в конце
  превращает файл в модуль, и `Row` наружу не виден;
- значение по умолчанию `options = {}` стало `options?`.

`declarationMap` добавляет `.d.ts.map`: переход к определению в редакторе
ведет в `.ts`-исходник библиотеки, а не в декларацию.

### `isolatedDeclarations`

Генерация деклараций требует полного вывода типов, то есть проверки всего
проекта. Опция `isolatedDeclarations` (5.5) требует, чтобы тип каждого
экспорта был записан явно, - тогда декларации строит любой инструмент, файл
за файлом, без проверки:

```
src/repository.ts(17,12): error TS9013: Expression type can't be inferred with --isolatedDeclarations.
```

Ошибка указывает на `save(row: T) {` - метод без аннотации результата. Для
библиотек цена (аннотации на экспортах) окупается скоростью сборки в
монорепозиториях ([18.1](build-and-performance.md#181-проверка-и-эмит-tsc-noemit-транспиляция-без-проверки-esbuild-swc-babel)).

### Скрипт и модуль

Файл `.d.ts` без `import` и `export` на верхнем уровне - **скрипт**: его
объявления глобальны. Файл хотя бы с одним `import` или `export` - **модуль**:
объявления локальны, и наружу уходит только экспортированное. Эта граница
определяет смысл `declare module` и `declare global` в следующих разделах.

---

## 14.2 Пакеты `@types` и DefinitelyTyped: порядок поиска типов, опции `types` и `typeRoots`

Библиотека поставляет типы одним из двух способов: в собственном пакете
(поле `types` или условие `types` в `exports`) либо отдельным пакетом
`@types/<имя>` из репозитория DefinitelyTyped - общего хранилища деклараций
для библиотек, которые своих не публикуют. Пакеты `@types` устанавливаются
как `devDependencies`; для scoped-пакетов имя кодируется двойным
подчеркиванием: `@types/babel__core`.

### Порядок поиска

Для `import { fromTypes } from 'untyped'` компилятор при `nodenext` и
`bundler` проверяет по очереди:

1. `node_modules/untyped/package.json`: условие `types` в `exports`, затем
   поле `types` (или `typings`);
2. декларацию рядом с точкой входа: `index.d.ts` для `main: index.js`;
3. `node_modules/@types/untyped`;
4. то же в `node_modules` каждого родительского каталога.

Трассировка `--traceResolution` для пакета без собственных типов
заканчивается на третьем шаге:

```
Found 'package.json' at '.../node_modules/@types/untyped/package.json'.
======== Module name 'untyped' was successfully resolved to '.../node_modules/@types/untyped/index.d.ts'. ========
```

Если ни один шаг не дал результата - ошибка TS7016
`Could not find a declaration file for module 'bare'` с подсказкой:
`npm i --save-dev @types/bare` или `declare module 'bare';`.

### `types` и `typeRoots`

Опция `types` не влияет на разрешение импортов: `@types/untyped` найдется
при `types: []`. Она управляет только **автоматическим подключением
глобальных** деклараций - пакетов вроде `@types/node`, которые объявляют
`process`, `Buffer` и `setTimeout` без импорта. В 5.9 подключались все
пакеты из `node_modules/@types`; с 6.0 умолчание - `[]`, и каждый глобальный
пакет перечисляется явно ([2](tsconfig.md#2-настройка-компилятора)):

```ts
// src/main.ts
import { own } from 'withtypes'; // типы из самого пакета
import { fromTypes } from 'untyped'; // типы из @types/untyped - при любом значении types

console.log(own(), fromTypes(), APP_GLOBAL);
// APP_GLOBAL объявлен в @types/globals: без "types": ["globals"] -
// Ошибка TS2304: Cannot find name 'APP_GLOBAL'.
```

`typeRoots` меняет каталоги, откуда берутся такие пакеты, по умолчанию -
все `node_modules/@types` вверх по дереву. Собственный каталог деклараций
проекта в `typeRoots` добавлять не нужно: достаточно, чтобы он попадал в
`include`.

---

## 14.3 Библиотеки без типов: `declare module`, локальные декларации, `skipLibCheck`

Для пакета без типов и без `@types` декларацию пишет потребитель - в файле
`.d.ts` внутри проекта, обычно в `src/types/`. Две формы:

```ts
// src/types/bare.d.ts
declare module 'bare';
```

Сокращенная форма объявляет модуль существующим, а все его экспорты -
`any`. Ошибка TS7016 исчезает, проверки типов для этого пакета нет.
Это временная мера: `any` из такого импорта распространяется по коду
([1.4](type-system.md#14-any-и-unknown)).

```ts
// src/types/bare.d.ts
declare module 'bare' {
  export function nothing(level?: import('untyped').Level): number;
  export interface BareOptions {
    verbose?: boolean;
  }
}
```

Полная форма описывает ровно те экспорты, которые проект использует, -
описывать библиотеку целиком не нужно. Ссылка на тип из другого пакета
внутри `declare module` записывается через `import('untyped').Level`, а не
через `import` на верхнем уровне файла - иначе файл станет модулем, и
`declare module 'bare'` превратится в дополнение несуществующего модуля:

```
src/types/bare.d.ts(3,16): error TS2665: Invalid module name in augmentation. Module 'bare' resolves to an untyped module at '.../node_modules/bare/index.js', which cannot be augmented.
```

Правило: в файле-скрипте `declare module 'x'` **объявляет** модуль, у
которого типов нет; в файле-модуле - **дополняет** модуль, у которого они
есть ([14.5](#145-расширение-модулей-и-слияние-деклараций-requestuser-в-express-defaulttheme)).

Третий путь - отправить декларацию в DefinitelyTyped или в саму библиотеку;
локальный файл до тех пор служит черновиком.

### `skipLibCheck`

Чужие декларации проверяются как обычный код, и ошибки в них - ошибки
сборки проекта. Реальный случай: `styled-components` 6.5 ссылается в своих
`.d.ts` на пакет `stylis`, у которого типов нет:

```
node_modules/styled-components/dist/models/StyleSheetManager.d.ts(2,25): error TS7016: Could not find a declaration file for module 'stylis'.
```

Проект не может исправить чужой файл, и `skipLibCheck: true` - штатный
ответ: проверка `.d.ts` отключается, использование типов из них остается.
Цена и границы опции разобраны в
[2.6](tsconfig.md#26-дополнительные-проверки-nouncheckedindexedaccess-exactoptionalpropertytypes-noimplicitoverride-и-другие).

---

## 14.4 Глобальные декларации: `declare global`, `Window`, `process.env`, импорт нескриптовых файлов

Часть окружения существует вне модулей: свойство, добавленное в `window`
скриптом на странице, константа, подставленная сборщиком, переменные
окружения. Компилятор о них не знает, и объявить их - задача проекта.

### Два способа записи

В файле-скрипте глобальные объявления пишутся напрямую; в файле-модуле -
внутри `declare global`. Обе формы дают одно и то же:

```ts
// src/types/globals.d.ts - скрипт: нет import и export
interface Window {
  appVersion: string;
}

declare var __BUILD_ID__: string;

declare namespace NodeJS {
  interface ProcessEnv {
    PORT?: string;
    NODE_ENV: 'development' | 'production' | 'test';
  }
}
```

```ts
// src/types/globals.d.ts - модуль: тот же результат
declare global {
  interface Window {
    appVersion: string;
  }

  var __BUILD_ID__: string;

  namespace NodeJS {
    interface ProcessEnv {
      PORT?: string;
      NODE_ENV: 'development' | 'production' | 'test';
    }
  }
}

export {};
```

`declare global` в скрипте - ошибка TS2669 `Augmentations for the global
scope can only be directly nested in external modules or ambient module
declarations`; `export {}` в конце второго варианта и есть то, что делает
файл модулем. Форма с модулем предпочтительнее: файл не превратится в скрипт
случайно, если из него удалят единственный импорт.

`interface Window` сливается со встроенным интерфейсом
([4.5](object-types.md#45-type-против-interface-расширение-слияние-деклараций-выбор)),
`declare var` объявляет глобальную переменную, `namespace NodeJS` дополняет
пространство имен из `@types/node` - так `process.env.NODE_ENV` получает
точный тип вместо `string | undefined`:

```ts
// src/main.ts
window.appVersion = '1.0.0';
const build: string = __BUILD_ID__;
const port: string | undefined = process.env.PORT;
const mode: 'development' | 'production' | 'test' = process.env.NODE_ENV;
```

Декларация обещает, что `NODE_ENV` задан всегда; выполнение обещания - на
скрипте запуска. Для переменных, которых может не быть, тип остается
необязательным, как у `PORT`.

### Импорт нескриптовых файлов

Сборщики позволяют импортировать картинки, стили и другие ресурсы; для
компилятора это модули без деклараций. Шаблон `*.svg` в `declare module`
описывает все файлы с таким расширением:

```ts
// src/types/assets.d.ts
declare module '*.svg' {
  const src: string;
  export default src;
}

declare module '*.module.css' {
  const classes: { readonly [className: string]: string };
  export default classes;
}

declare module '*.css';
```

```ts
// src/assets.ts
import logo from './logo.svg'; // string
import styles from './card.module.css'; // { readonly [className: string]: string }
import './reset.css'; // импорт ради побочного эффекта
```

Без деклараций первые два импорта - TS2307, третий - TS2882 из-за
`noUncheckedSideEffectImports` ([2.4](tsconfig.md#24-совместимость-модулей-esmoduleinterop-allowsyntheticdefaultimports-isolatedmodules-verbatimmodulesyntax)).
Vite поставляет такой набор деклараций в `vite/client`; для других
сборщиков файл пишется вручную.

---

## 14.5 Расширение модулей и слияние деклараций: `Request.user` в Express, `DefaultTheme`

**Расширение модуля** (module augmentation) - `declare module 'имя'` для
модуля, у которого типы уже есть: объявления внутри сливаются с
существующими. Основано на слиянии деклараций интерфейсов и пространств имен
([4.5](object-types.md#45-type-против-interface-расширение-слияние-деклараций-выбор)):
интерфейс с тем же именем добавляет члены, не заменяя объявленные.

### `Request.user` в Express

Middleware аутентификации кладет пользователя в `req.user`, и типы Express
об этом свойстве не знают. Оба примера ниже проверены на `@types/express`
5.0.6:

```ts
// src/types/express.d.ts
import type { User } from '../user.js';

declare module 'express-serve-static-core' {
  interface Request {
    user?: User;
  }
}
```

```ts
// src/app.ts
import express, { type Request, type Response, type NextFunction } from 'express';
import type { User } from './user.js';

const app = express();

function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const user: User = { id: req.header('x-user-id') ?? 'anonymous', role: 'member' };
  req.user = user; // свойство добавлено расширением модуля
  next();
}

app.use(authenticate);
app.get('/me', (req, res) => {
  res.json({ id: req.user?.id, role: req.user?.role }); // req выведен из сигнатуры app.get
});

export { app };
```

Расширяется `express-serve-static-core`, а не `express`: интерфейс
`Request` объявлен там, а `express` его наследует. Расширение самого
`express` дополняет только унаследованный интерфейс - параметр `req`,
выведенный из `app.get`, имеет тип из `express-serve-static-core` и
свойства не получает:

```
src/app.ts(14,22): error TS2339: Property 'user' does not exist on type 'Request<{}, any, any, ParsedQs, Record<string, any>>'.
```

Файл с расширением - модуль (у него есть `import type`), поэтому
`declare module` здесь однозначно дополнение. Если импорт не нужен, файл
делают модулем через `export {}` - по той же причине, что и для
`declare global`.

### `DefaultTheme` в styled-components

Библиотека объявляет пустой интерфейс `DefaultTheme` специально для
расширения: тема проекта описывается один раз и типизирует `props.theme`
во всех компонентах.

```ts
// src/types/styled.d.ts
import 'styled-components';

declare module 'styled-components' {
  export interface DefaultTheme {
    colors: { primary: string; background: string };
    spacing: (multiplier: number) => string;
  }
}
```

```ts
// src/theme.ts
import type { DefaultTheme } from 'styled-components';

export const theme: DefaultTheme = {
  colors: { primary: '#1976d2', background: '#fff' },
  spacing: (multiplier) => `${multiplier * 8}px`, // multiplier: number - из расширенного интерфейса
};
```

Без расширения `DefaultTheme` пуст, и параметр `multiplier` получает
неявный `any` (TS7006).

### Границы

| Можно | Нельзя |
| --- | --- |
| Добавить члены в интерфейс | Изменить тип существующего члена |
| Добавить новые экспорты в модуль | Дополнить экспорт по умолчанию |
| Дополнить пространство имен | Дополнить псевдоним типа (`type`) |
| Дополнить модуль с типами | Объявить типы для модуля без них из файла-модуля (TS2665) |

Расширение действует на весь проект, как только файл попал в программу.
Это и сила, и опасность: два расширения одного интерфейса в разных
пакетах сливаются молча, а опечатка в имени модуля дает не ошибку, а новую
ambient-декларацию.

---

## 14.6 Публикация типизированной библиотеки: `types` и `exports` в `package.json`

Библиотека, которую устанавливают через npm, обязана поставлять декларации
так, чтобы их нашел каждый вариант разрешения: `nodenext` из ESM и из
CommonJS, `bundler`, старые инструменты с `node10`. Минимальный пакет,
проверенный на этих режимах:

```json
{
  "name": "@example/retry",
  "version": "1.0.0",
  "type": "module",
  "files": ["dist"],
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./package.json": "./package.json"
  },
  "types": "./dist/index.d.ts",
  "main": "./dist/index.js"
}
```

```json
{
  "compilerOptions": {
    "module": "nodenext",
    "target": "es2022",
    "lib": ["es2022"],
    "types": ["node"],
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

| Поле | Зачем |
| --- | --- |
| `exports["."].types` | декларации для `nodenext` и `bundler`; первое условие в списке |
| `exports["."].import` | код для ESM-потребителей |
| `types`, `main` | то же для инструментов, не читающих `exports` (`node10`) |
| `files` | в пакет попадает только `dist` |
| `./package.json` в `exports` | доступ к метаданным пакета для инструментов |
| `declaration`, `declarationMap` | сами декларации и карта к исходникам |
| `isolatedDeclarations` | явные типы на экспортах: декларации собираются без полной проверки |

Пакет с CommonJS-вариантом добавляет условие `require` с отдельной сборкой
и **отдельными** декларациями `.d.cts`: формат `.d.ts` определяется по тем
же правилам, что у `.js`, и один файл деклараций не может описывать оба
варианта ([13.5](modules.md#135-разрешение-модулей-расширения-в-esm-packagejson-type-exports-mts-и-cts)).

### Проверка перед публикацией

Два инструмента проверяют упаковку без установки: `publint` - структуру
`package.json` и наличие файлов, `@arethetypeswrong/cli` - разрешение типов
в каждом режиме компилятора:

```
$ npx publint
All good!

$ npx @arethetypeswrong/cli --pack .
┌───────────────────┬──────────────────────────────┐
│                   │ "@example/retry"             │
├───────────────────┼──────────────────────────────┤
│ node10            │ 🟢                           │
│ node16 (from CJS) │ ⚠️ ESM (dynamic import only) │
│ node16 (from ESM) │ 🟢 (ESM)                     │
│ bundler           │ 🟢                           │
└───────────────────┴──────────────────────────────┘
```

Предупреждение в строке CommonJS - следствие решения публиковать только ESM:
потребитель на CommonJS получит модуль через `import()` или, в Node.js
22.12 и новее, через `require()`. Для библиотеки, которой нужны оба
формата, добавляется вторая сборка; для новой библиотеки ESM-only - обычный
выбор.

---

## Типичные ошибки

1. **`declare module 'x'` в файле с импортом.** Файл становится модулем, а
   объявление - дополнением несуществующего модуля (TS2665). Типы из других
   пакетов внутри объявления - через `import('pkg').Type`.
2. **`declare global` в скрипте.** TS2669; в скрипте глобальные объявления
   пишутся напрямую, в модуле - внутри `declare global`.
3. **Расширение `express` вместо `express-serve-static-core`.** Свойство
   появляется у `Request` из `express`, но не у `req`, выведенного из
   обработчика.
4. **`types: []` как причина «не находятся типы пакета».** Опция не влияет
   на импорты; она отключает только автоподключение глобальных пакетов
   вроде `@types/node`.
5. **Сокращенное `declare module 'x';` как постоянное решение.** Все
   экспорты - `any`, и он расходится по проекту.
6. **Опечатка в имени модуля при расширении.** Не ошибка, а новая
   ambient-декларация; расширение молча не применяется.
7. **Публикация без условия `types` в `exports`.** `nodenext` игнорирует
   поле `types` верхнего уровня, если `exports` задан; потребитель получает
   TS7016.
8. **Одни `.d.ts` на ESM и CommonJS-сборки.** Формат декларации определяется
   как у `.js`; для второго варианта нужны `.d.cts` или `.d.mts`.

---

[← Модули](modules.md) · [К содержанию](../README.md) ·
[Далее: типизация Node.js и Express →](node-express.md)
