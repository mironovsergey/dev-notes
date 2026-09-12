# TypeScript

Конспект по TypeScript: от системы типов и настройки компилятора до типизации
серверного кода на Node.js и клиентского на React. Каждая тема - отдельный
файл в каталоге `docs/`, нумерация сквозная, без деления на блоки. Каждая тема
завершается разделом «Типичные ошибки» или, для тем без однозначной
правильности, «Когда не применять».

## Содержание

### [1 Система типов](docs/type-system.md)

- [1.1 Структурная типизация и совместимость типов](docs/type-system.md#11-структурная-типизация-и-совместимость-типов)
- [1.2 Примитивные и литеральные типы](docs/type-system.md#12-примитивные-и-литеральные-типы)
- [1.3 Аннотации и вывод типов, расширение литералов](docs/type-system.md#13-аннотации-и-вывод-типов-расширение-литералов)
- [1.4 `any` и `unknown`](docs/type-system.md#14-any-и-unknown)
- [1.5 `void` и `never`](docs/type-system.md#15-void-и-never)
- [1.6 `null` и `undefined` при `strictNullChecks`](docs/type-system.md#16-null-и-undefined-при-strictnullchecks)
- [1.7 Стирание типов: что остается в JavaScript](docs/type-system.md#17-стирание-типов-что-остается-в-javascript)
- [Типичные ошибки](docs/type-system.md#типичные-ошибки)

### [2 Настройка компилятора](docs/tsconfig.md)

- [2.1 Структура `tsconfig.json`: `compilerOptions`, `include`, `exclude`, `extends`](docs/tsconfig.md#21-структура-tsconfigjson-compileroptions-include-exclude-extends)
- [2.2 `target` и `lib`](docs/tsconfig.md#22-target-и-lib)
- [2.3 `module` и `moduleResolution`](docs/tsconfig.md#23-module-и-moduleresolution)
- [2.4 Совместимость модулей: `esModuleInterop`, `allowSyntheticDefaultImports`, `isolatedModules`, `verbatimModuleSyntax`](docs/tsconfig.md#24-совместимость-модулей-esmoduleinterop-allowsyntheticdefaultimports-isolatedmodules-verbatimmodulesyntax)
- [2.5 `strict` и его составляющие](docs/tsconfig.md#25-strict-и-его-составляющие)
- [2.6 Дополнительные проверки: `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride` и другие](docs/tsconfig.md#26-дополнительные-проверки-nouncheckedindexedaccess-exactoptionalpropertytypes-noimplicitoverride-и-другие)
- [2.7 Пути и выходные файлы: `rootDir`, `outDir`, `baseUrl`, `paths`, `declaration`, `sourceMap`](docs/tsconfig.md#27-пути-и-выходные-файлы-rootdir-outdir-baseurl-paths-declaration-sourcemap)
- [2.8 Конфигурации для типовых проектов: Node.js, NestJS, React, библиотека](docs/tsconfig.md#28-конфигурации-для-типовых-проектов-nodejs-nestjs-react-библиотека)
- [Типичные ошибки](docs/tsconfig.md#типичные-ошибки)

### [3 Массивы, кортежи и перечисления](docs/arrays-tuples-enums.md)

- [3.1 Массивы: `T[]`, `Array<T>`, `readonly`-массивы, вывод типа элементов](docs/arrays-tuples-enums.md#31-массивы-t-arrayt-readonly-массивы-вывод-типа-элементов)
- [3.2 Кортежи: фиксированная длина, необязательные и rest-элементы, именованные элементы](docs/arrays-tuples-enums.md#32-кортежи-фиксированная-длина-необязательные-и-rest-элементы-именованные-элементы)
- [3.3 Перечисления: числовые, строковые, `const enum`, представление в JavaScript](docs/arrays-tuples-enums.md#33-перечисления-числовые-строковые-const-enum-представление-в-javascript)
- [3.4 `enum` против объединения литералов и объекта `as const`](docs/arrays-tuples-enums.md#34-enum-против-объединения-литералов-и-объекта-as-const)
- [Типичные ошибки](docs/arrays-tuples-enums.md#типичные-ошибки)

### [4 Объектные типы, объединения и пересечения](docs/object-types.md)

- [4.1 Свойства объекта: необязательные, `readonly`, индексные сигнатуры, `Record`](docs/object-types.md#41-свойства-объекта-необязательные-readonly-индексные-сигнатуры-record)
- [4.2 Проверка избыточных свойств и свежесть объектного литерала](docs/object-types.md#42-проверка-избыточных-свойств-и-свежесть-объектного-литерала)
- [4.3 Объединения: доступ к общим членам, литеральные объединения, размеченные объединения](docs/object-types.md#43-объединения-доступ-к-общим-членам-литеральные-объединения-размеченные-объединения)
- [4.4 Пересечения: слияние свойств, конфликт свойств и `never`, branded types](docs/object-types.md#44-пересечения-слияние-свойств-конфликт-свойств-и-never-branded-types)
- [4.5 `type` против `interface`: расширение, слияние деклараций, выбор](docs/object-types.md#45-type-против-interface-расширение-слияние-деклараций-выбор)
- [Типичные ошибки](docs/object-types.md#типичные-ошибки)

### [5 Функции](docs/functions.md)

- [5.1 Тип функции: сигнатура, псевдоним типа, сигнатуры вызова и конструктора в интерфейсе](docs/functions.md#51-тип-функции-сигнатура-псевдоним-типа-сигнатуры-вызова-и-конструктора-в-интерфейсе)
- [5.2 Параметры: необязательные, значения по умолчанию, rest, деструктуризация](docs/functions.md#52-параметры-необязательные-значения-по-умолчанию-rest-деструктуризация)
- [5.3 Возвращаемый тип: вывод и явная аннотация, `void` в callback-ах, `Promise<T>` у `async`-функций](docs/functions.md#53-возвращаемый-тип-вывод-и-явная-аннотация-void-в-callback-ах-promiset-у-async-функций)
- [5.4 Перегрузки: сигнатуры и реализация, когда объединение или обобщение лучше](docs/functions.md#54-перегрузки-сигнатуры-и-реализация-когда-объединение-или-обобщение-лучше)
- [5.5 Типизация `this`](docs/functions.md#55-типизация-this)
- [5.6 Совместимость функций: число параметров, вариантность, `strictFunctionTypes`](docs/functions.md#56-совместимость-функций-число-параметров-вариантность-strictfunctiontypes)
- [Типичные ошибки](docs/functions.md#типичные-ошибки)

### [6 Классы](docs/classes.md)

- [6.1 Поля и конструктор: инициализация, `strictPropertyInitialization`, параметры-свойства](docs/classes.md#61-поля-и-конструктор-инициализация-strictpropertyinitialization-параметры-свойства)
- [6.2 Модификаторы доступа: `public`, `protected`, `private`, `readonly`; `private` против `#private`](docs/classes.md#62-модификаторы-доступа-public-protected-private-readonly-private-против-private)
- [6.3 Статические члены и `typeof Class`](docs/classes.md#63-статические-члены-и-typeof-class)
- [6.4 Наследование: `extends`, `super`, `override`, абстрактные классы](docs/classes.md#64-наследование-extends-super-override-абстрактные-классы)
- [6.5 `implements`: класс как реализация интерфейса, структурная совместимость](docs/classes.md#65-implements-класс-как-реализация-интерфейса-структурная-совместимость)
- [6.6 Тип экземпляра и тип конструктора, ограничение на конструктор, миксины](docs/classes.md#66-тип-экземпляра-и-тип-конструктора-ограничение-на-конструктор-миксины)
- [Типичные ошибки](docs/classes.md#типичные-ошибки)

### [7 Сужение типов](docs/narrowing.md)

- [7.1 Анализ потока управления: проверки, присваивания, истинность, равенство](docs/narrowing.md#71-анализ-потока-управления-проверки-присваивания-истинность-равенство)
- [7.2 Встроенные проверки: `typeof`, `instanceof`, `in`](docs/narrowing.md#72-встроенные-проверки-typeof-instanceof-in)
- [7.3 Пользовательские предикаты типов: `value is T`](docs/narrowing.md#73-пользовательские-предикаты-типов-value-is-t)
- [7.4 Функции-утверждения: `asserts condition`, `asserts value is T`](docs/narrowing.md#74-функции-утверждения-asserts-condition-asserts-value-is-t)
- [7.5 Размеченные объединения и проверка полноты через `never`](docs/narrowing.md#75-размеченные-объединения-и-проверка-полноты-через-never)
- [7.6 Паттерны: тип результата, состояние асинхронной операции, валидация `unknown` на границе](docs/narrowing.md#76-паттерны-тип-результата-состояние-асинхронной-операции-валидация-unknown-на-границе)
- [Типичные ошибки](docs/narrowing.md#типичные-ошибки)

### [8 Операторы над типами](docs/type-operators.md)

- [8.1 `keyof`: ключи объектного типа, поведение с индексными сигнатурами и массивами](docs/type-operators.md#81-keyof-ключи-объектного-типа-поведение-с-индексными-сигнатурами-и-массивами)
- [8.2 `typeof` в контексте типов: тип значения, функции, класса](docs/type-operators.md#82-typeof-в-контексте-типов-тип-значения-функции-класса)
- [8.3 Индексный доступ `T[K]` и `T[number]`](docs/type-operators.md#83-индексный-доступ-tk-и-tnumber)
- [8.4 `as const`: литеральные типы, `readonly` на всех уровнях, словари констант](docs/type-operators.md#84-as-const-литеральные-типы-readonly-на-всех-уровнях-словари-констант)
- [8.5 `satisfies`: проверка без расширения типа](docs/type-operators.md#85-satisfies-проверка-без-расширения-типа)
- [8.6 Утверждения типов: `as`, `!`, двойное утверждение через `unknown`, границы допустимого](docs/type-operators.md#86-утверждения-типов-as--двойное-утверждение-через-unknown-границы-допустимого)
- [8.7 `extends` и `in`: контексты применения](docs/type-operators.md#87-extends-и-in-контексты-применения)
- [Типичные ошибки](docs/type-operators.md#типичные-ошибки)

### [9 Обобщенные типы](docs/generics.md)

- [9.1 Зачем нужны обобщения: потеря типа при `any`, дублирование при перегрузках](docs/generics.md#91-зачем-нужны-обобщения-потеря-типа-при-any-дублирование-при-перегрузках)
- [9.2 Обобщенные функции: параметры типа, вывод аргументов типа, значения по умолчанию](docs/generics.md#92-обобщенные-функции-параметры-типа-вывод-аргументов-типа-значения-по-умолчанию)
- [9.3 Обобщенные интерфейсы, псевдонимы и классы](docs/generics.md#93-обобщенные-интерфейсы-псевдонимы-и-классы)
- [9.4 Ограничения: `extends`, `keyof`, пересечение ограничений](docs/generics.md#94-ограничения-extends-keyof-пересечение-ограничений)
- [9.5 Встроенные utility types](docs/generics.md#95-встроенные-utility-types)
- [9.6 Собственные utility types](docs/generics.md#96-собственные-utility-types)
- [Типичные ошибки](docs/generics.md#типичные-ошибки)

### [10 Отображаемые и условные типы](docs/mapped-and-conditional-types.md)

- [10.1 Отображаемые типы: `[P in keyof T]`, гомоморфность, модификаторы `readonly` и `?`](docs/mapped-and-conditional-types.md#101-отображаемые-типы-p-in-keyof-t-гомоморфность-модификаторы-readonly-и-)
- [10.2 Переименование и фильтрация ключей через `as`](docs/mapped-and-conditional-types.md#102-переименование-и-фильтрация-ключей-через-as)
- [10.3 Условные типы: синтаксис, отложенное вычисление, сужение в ветках](docs/mapped-and-conditional-types.md#103-условные-типы-синтаксис-отложенное-вычисление-сужение-в-ветках)
- [10.4 Распределение по объединениям и его отключение](docs/mapped-and-conditional-types.md#104-распределение-по-объединениям-и-его-отключение)
- [10.5 `infer`: извлечение типов из функций, промисов, массивов и кортежей](docs/mapped-and-conditional-types.md#105-infer-извлечение-типов-из-функций-промисов-массивов-и-кортежей)
- [10.6 Рекурсивные типы и предел глубины](docs/mapped-and-conditional-types.md#106-рекурсивные-типы-и-предел-глубины)
- [10.7 Как устроены встроенные utility types](docs/mapped-and-conditional-types.md#107-как-устроены-встроенные-utility-types)
- [Типичные ошибки](docs/mapped-and-conditional-types.md#типичные-ошибки)

### [11 Шаблонные литеральные типы и паттерны на типах](docs/template-literal-types.md)

- [11.1 Синтаксис и комбинирование объединений](docs/template-literal-types.md#111-синтаксис-и-комбинирование-объединений)
- [11.2 Встроенные строковые типы: `Uppercase`, `Lowercase`, `Capitalize`, `Uncapitalize`](docs/template-literal-types.md#112-встроенные-строковые-типы-uppercase-lowercase-capitalize-uncapitalize)
- [11.3 Разбор строк через `infer`: параметры маршрутов, ключи с точками](docs/template-literal-types.md#113-разбор-строк-через-infer-параметры-маршрутов-ключи-с-точками)
- [11.4 Шаблонные литералы в отображаемых типах: геттеры, обработчики событий](docs/template-literal-types.md#114-шаблонные-литералы-в-отображаемых-типах-геттеры-обработчики-событий)
- [11.5 Составные примеры: типизированный event emitter, API-клиент, конструктор форм](docs/template-literal-types.md#115-составные-примеры-типизированный-event-emitter-api-клиент-конструктор-форм)
- [Типичные ошибки](docs/template-literal-types.md#типичные-ошибки)

### [12 Декораторы](docs/decorators.md)

- [12.1 Две реализации: `experimentalDecorators` и стандартные декораторы TypeScript 5](docs/decorators.md#121-две-реализации-experimentaldecorators-и-стандартные-декораторы-typescript-5)
- [12.2 Декораторы класса, метода, аксессора, свойства и параметра](docs/decorators.md#122-декораторы-класса-метода-аксессора-свойства-и-параметра)
- [12.3 Фабрики декораторов, композиция и порядок вызова](docs/decorators.md#123-фабрики-декораторов-композиция-и-порядок-вызова)
- [12.4 Метаданные: `reflect-metadata`, `emitDecoratorMetadata`, `Symbol.metadata`](docs/decorators.md#124-метаданные-reflect-metadata-emitdecoratormetadata-symbolmetadata)
- [12.5 Практика NestJS: `@Injectable`, `@Controller`, `@Get`, собственные декораторы](docs/decorators.md#125-практика-nestjs-injectable-controller-get-собственные-декораторы)
- [Типичные ошибки](docs/decorators.md#типичные-ошибки)

### [13 Модули](docs/modules.md)

- [13.1 ES-модули и CommonJS: синтаксис, семантика, вывод компилятора](docs/modules.md#131-es-модули-и-commonjs-синтаксис-семантика-вывод-компилятора)
- [13.2 Формы импорта и экспорта: именованный, по умолчанию, пространство имен, реэкспорт, динамический `import()`](docs/modules.md#132-формы-импорта-и-экспорта-именованный-по-умолчанию-пространство-имен-реэкспорт-динамический-import)
- [13.3 Импорт и экспорт только типов: `import type`, `verbatimModuleSyntax`](docs/modules.md#133-импорт-и-экспорт-только-типов-import-type-verbatimmodulesyntax)
- [13.4 Пространства имен против модулей](docs/modules.md#134-пространства-имен-против-модулей)
- [13.5 Разрешение модулей: расширения в ESM, `package.json` (`type`, `exports`), `.mts` и `.cts`](docs/modules.md#135-разрешение-модулей-расширения-в-esm-packagejson-type-exports-mts-и-cts)
- [Типичные ошибки](docs/modules.md#типичные-ошибки)

### [14 Декларации типов и внешние библиотеки](docs/declarations.md)

- [14.1 Файлы `.d.ts`: `declare`, ambient-декларации, генерация через `declaration`](docs/declarations.md#141-файлы-dts-declare-ambient-декларации-генерация-через-declaration)
- [14.2 Пакеты `@types` и DefinitelyTyped: порядок поиска типов, опции `types` и `typeRoots`](docs/declarations.md#142-пакеты-types-и-definitelytyped-порядок-поиска-типов-опции-types-и-typeroots)
- [14.3 Библиотеки без типов: `declare module`, локальные декларации, `skipLibCheck`](docs/declarations.md#143-библиотеки-без-типов-declare-module-локальные-декларации-skiplibcheck)
- [14.4 Глобальные декларации: `declare global`, `Window`, `process.env`, импорт нескриптовых файлов](docs/declarations.md#144-глобальные-декларации-declare-global-window-processenv-импорт-нескриптовых-файлов)
- [14.5 Расширение модулей и слияние деклараций: `Request.user` в Express, `DefaultTheme`](docs/declarations.md#145-расширение-модулей-и-слияние-деклараций-requestuser-в-express-defaulttheme)
- [14.6 Публикация типизированной библиотеки: `types` и `exports` в `package.json`](docs/declarations.md#146-публикация-типизированной-библиотеки-types-и-exports-в-packagejson)
- [Типичные ошибки](docs/declarations.md#типичные-ошибки)

### [15 Типизация Node.js и Express](docs/node-express.md)

- [15.1 Окружение Node.js: `@types/node`, `process.env`, пространство имен `NodeJS`](docs/node-express.md#151-окружение-nodejs-typesnode-processenv-пространство-имен-nodejs)
- [15.2 `Request` и `Response`: параметры обобщений, `RequestHandler`, типизированные обработчики](docs/node-express.md#152-request-и-response-параметры-обобщений-requesthandler-типизированные-обработчики)
- [15.3 Middleware: сигнатура, расширение `Request`, предикаты для аутентифицированного запроса](docs/node-express.md#153-middleware-сигнатура-расширение-request-предикаты-для-аутентифицированного-запроса)
- [15.4 Обработка ошибок: классы ошибок, `unknown` в `catch`, error middleware](docs/node-express.md#154-обработка-ошибок-классы-ошибок-unknown-в-catch-error-middleware)
- [15.5 Асинхронные обработчики: обертка для `Promise`, необработанные отклонения, Express 5](docs/node-express.md#155-асинхронные-обработчики-обертка-для-promise-необработанные-отклонения-express-5)
- [15.6 Валидация на границе: тело запроса как `unknown`, схемы и вывод типа из схемы](docs/node-express.md#156-валидация-на-границе-тело-запроса-как-unknown-схемы-и-вывод-типа-из-схемы)
- [Типичные ошибки](docs/node-express.md#типичные-ошибки)

### [16 Типизация React](docs/react.md)

- [16.1 Компонент как функция: `React.FC` против обычной функции, `ReactNode` и `JSX.Element`](docs/react.md#161-компонент-как-функция-reactfc-против-обычной-функции-reactnode-и-jsxelement)
- [16.2 Props: `children`, необязательные свойства и значения по умолчанию, `ComponentProps`, размеченные объединения props](docs/react.md#162-props-children-необязательные-свойства-и-значения-по-умолчанию-componentprops-размеченные-объединения-props)
- [16.3 События и обработчики: `MouseEvent`, `ChangeEvent`, `FormEvent`](docs/react.md#163-события-и-обработчики-mouseevent-changeevent-formevent)
- [16.4 Хуки: `useState`, `useReducer`, `useContext`, `useRef`](docs/react.md#164-хуки-usestate-usereducer-usecontext-useref)
- [16.5 Пользовательские хуки: возврат кортежа, обобщенные хуки, состояние асинхронной операции](docs/react.md#165-пользовательские-хуки-возврат-кортежа-обобщенные-хуки-состояние-асинхронной-операции)
- [16.6 Обобщенные компоненты и `forwardRef`](docs/react.md#166-обобщенные-компоненты-и-forwardref)
- [Типичные ошибки](docs/react.md#типичные-ошибки)

### [17 Типизация Redux](docs/redux.md)

- [17.1 Действия как размеченные объединения, редьюсеры с проверкой полноты](docs/redux.md#171-действия-как-размеченные-объединения-редьюсеры-с-проверкой-полноты)
- [17.2 Redux Toolkit: `createSlice`, `PayloadAction`, `configureStore`](docs/redux.md#172-redux-toolkit-createslice-payloadaction-configurestore)
- [17.3 `RootState` и `AppDispatch`: вывод из store, типизированные хуки](docs/redux.md#173-rootstate-и-appdispatch-вывод-из-store-типизированные-хуки)
- [17.4 Селекторы: типизация, `createSelector`](docs/redux.md#174-селекторы-типизация-createselector)
- [17.5 `createAsyncThunk` и `extraReducers`](docs/redux.md#175-createasyncthunk-и-extrareducers)
- [Типичные ошибки](docs/redux.md#типичные-ошибки)

### [18 Сборка и производительность](docs/build-and-performance.md)

- [18.1 Проверка и эмит: `tsc`, `noEmit`, транспиляция без проверки (esbuild, swc, Babel)](docs/build-and-performance.md#181-проверка-и-эмит-tsc-noemit-транспиляция-без-проверки-esbuild-swc-babel)
- [18.2 Инкрементальная компиляция: `incremental`, `tsBuildInfoFile`, режим `watch`](docs/build-and-performance.md#182-инкрементальная-компиляция-incremental-tsbuildinfofile-режим-watch)
- [18.3 Project references: `composite`, `references`, `tsc -b`, монорепозитории](docs/build-and-performance.md#183-project-references-composite-references-tsc--b-монорепозитории)
- [18.4 Ускорение проверки типов: `skipLibCheck`, границы `include`, явные типы экспортов, `interface` против пересечений](docs/build-and-performance.md#184-ускорение-проверки-типов-skiplibcheck-границы-include-явные-типы-экспортов-interface-против-пересечений)
- [18.5 Стоимость типов: взрыв объединений, глубина рекурсии, пределы компилятора](docs/build-and-performance.md#185-стоимость-типов-взрыв-объединений-глубина-рекурсии-пределы-компилятора)
- [Типичные ошибки](docs/build-and-performance.md#типичные-ошибки)

### [19 Тестирование и качество кода](docs/testing-and-code-quality.md)

- [19.1 Запуск тестов: `ts-jest`, Babel и swc, Vitest; где выполняется проверка типов](docs/testing-and-code-quality.md#191-запуск-тестов-ts-jest-babel-и-swc-vitest-где-выполняется-проверка-типов)
- [19.2 Типизация тестов: моки, фабрики тестовых данных, фикстуры](docs/testing-and-code-quality.md#192-типизация-тестов-моки-фабрики-тестовых-данных-фикстуры)
- [19.3 Тесты на уровне типов: `expectTypeOf`, `tsd`, `@ts-expect-error`](docs/testing-and-code-quality.md#193-тесты-на-уровне-типов-expecttypeof-tsd-ts-expect-error)
- [19.4 ESLint и typescript-eslint: type-aware правила, конфигурации, ключевые правила](docs/testing-and-code-quality.md#194-eslint-и-typescript-eslint-type-aware-правила-конфигурации-ключевые-правила)
- [19.5 Паттерны при `strictNullChecks`: ранний выход, `?.` и `??`, `NonNullable`, утверждения вместо `!`](docs/testing-and-code-quality.md#195-паттерны-при-strictnullchecks-ранний-выход--и--nonnullable-утверждения-вместо-)
