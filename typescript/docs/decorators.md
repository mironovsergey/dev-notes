# 12 Декораторы

[← К содержанию](../README.md)

**Декоратор** - функция, которая применяется к классу или его члену в
момент объявления и может наблюдать, изменять или заменять его. Записывается
как `@имя` перед объявлением. Декораторы - основа фреймворков с
внедрением зависимостей и маршрутизацией по аннотациям: NestJS, Angular,
TypeORM.

У темы есть особенность, которой нет у остальных: в TypeScript существуют
**две несовместимые реализации** декораторов. Старая появилась в 2015 году по
раннему проекту стандарта и включается опцией `experimentalDecorators`; новая
следует текущему предложению TC39 (stage 3) и работает без опций с версии
5.0. У них разные сигнатуры, разный порядок применения и разные механизмы
метаданных, и в одном проекте они не смешиваются. Фреймворки, перечисленные
выше, по-прежнему используют старую.

Декораторы не стираются ([1.7](type-system.md#17-стирание-типов-что-остается-в-javascript)):
компилятор генерирует для них код. Два практических следствия проверены на
Node 26: режим stripping (`node file.ts`) декораторы отвергает, а при
`target: esnext` компилятор оставляет `@`-синтаксис как есть - и Node
падает с `SyntaxError`. Для запуска нужен `target` не выше `es2025`, при
котором декораторы переписываются во вспомогательные функции.

---

## 12.1 Две реализации: `experimentalDecorators` и стандартные декораторы TypeScript 5

| | Стандартные (5.0+) | `experimentalDecorators` |
| --- | --- | --- |
| Спецификация | TC39 stage 3 | проект 2015 года, в стандарт не вошел |
| Включение | по умолчанию | `"experimentalDecorators": true` |
| Сигнатура | `(value, context)` | `(target, key, descriptor)` / `(target, key, index)` |
| Декораторы параметров | нет | да |
| Автоаксессоры `accessor` | да | нет |
| Метаданные | `context.metadata`, `Symbol.metadata` | `emitDecoratorMetadata` + `reflect-metadata` |
| Типы полей и параметров в метаданных | нет | `design:type`, `design:paramtypes`, `design:returntype` |
| Вспомогательный код | `__esDecorate`, `__runInitializers` | `__decorate`, `__param`, `__metadata` |
| Кто использует | новый код, Lit 3 | NestJS, Angular, TypeORM, class-validator |

Различие в выводе компилятора показывает, что это разные конструкции, а не
два синтаксиса для одной:

```js
// experimentalDecorators: метод create() класса UsersController
__decorate([
    Get(':id'),
    __param(0, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Object)
], UsersController.prototype, "findOne", null);

// стандартные: тот же метод
__esDecorate(this, null, _findOne_decorators, { kind: "method", name: "findOne", static: false, private: false, ... }, null, _instanceExtraInitializers);
```

Выбор определяется фреймворком: под NestJS и TypeORM - старая реализация,
потому что их внедрение зависимостей читает `design:paramtypes`, а
декораторы параметров вроде `@Body()` в новой не существуют. Собственный
код без такого фреймворка пишется на стандартных декораторах: у них
понятный объект контекста, `addInitializer` вместо ручной работы с
прототипом и будущее в стандарте языка.

Компилятор помогает не перепутать: сигнатура старого декоратора в
стандартном режиме дает ошибку TS1241 `Unable to resolve signature of
method decorator when called as an expression. The runtime will invoke the
decorator with 2 arguments, but the decorator expects 3`, а декоратор
параметра - TS1206 `Decorators are not valid here`.

Дальше в теме стандартная реализация разбирается как основная, старая -
там, где без нее не обойтись: декораторы параметров, метаданные типов,
NestJS.

---

## 12.2 Декораторы класса, метода, аксессора, свойства и параметра

Стандартный декоратор получает два аргумента: декорируемое **значение** (сам
метод, класс, пара `get`/`set` или `undefined` для поля) и **контекст** -
объект с описанием места применения.

| Поле контекста | Значение |
| --- | --- |
| `kind` | `'class'`, `'method'`, `'getter'`, `'setter'`, `'field'`, `'accessor'` |
| `name` | имя члена: `string \| symbol` |
| `static`, `private` | модификаторы члена |
| `access` | `{ get, set }` для чтения и записи члена у экземпляра в обход приватности |
| `addInitializer(fn)` | регистрация функции, которая выполнится при создании экземпляра (для членов) или после объявления класса (для статических членов и класса) |
| `metadata` | объект метаданных класса, [12.4](#124-метаданные-reflect-metadata-emitdecoratormetadata-symbolmetadata) |

Тип контекста для каждого вида - `ClassMethodDecoratorContext`,
`ClassFieldDecoratorContext`, `ClassAccessorDecoratorContext`,
`ClassGetterDecoratorContext`, `ClassDecoratorContext` и общий
`DecoratorContext`. Возвращаемое значение зависит от вида: метод - замена
метода, поле - функция преобразования начального значения, `accessor` -
объект с новыми `get`, `set` и `init`, класс - замена класса.

### Метод

```ts
/**
 * Логирует вызовы метода с аргументами и результатом.
 *
 * Параметры This, Args и Return выводятся из декорируемого метода, поэтому
 * обертка сохраняет его сигнатуру, а this передается без изменений.
 */
function logged<This, Args extends unknown[], Return>(
  method: (this: This, ...args: Args) => Return,
  context: ClassMethodDecoratorContext<This, (this: This, ...args: Args) => Return>,
) {
  const name = String(context.name);
  return function (this: This, ...args: Args): Return {
    console.log(`→ ${name}(${args.map((a) => JSON.stringify(a)).join(', ')})`);
    const result = method.call(this, ...args);
    console.log(`← ${name} = ${JSON.stringify(result)}`);
    return result;
  };
}

/**
 * Привязывает метод к экземпляру, чтобы его можно было передавать как callback.
 *
 * Замена самого метода здесь не поможет: this известен только при создании
 * экземпляра, и привязка выполняется в инициализаторе.
 */
function bound<This, Args extends unknown[], Return>(
  _method: (this: This, ...args: Args) => Return,
  context: ClassMethodDecoratorContext<This, (this: This, ...args: Args) => Return>,
): void {
  context.addInitializer(function (this: This) {
    const self = this as Record<string | symbol, unknown>;
    const original = self[context.name];
    if (typeof original === 'function') {
      self[context.name] = original.bind(this);
    }
  });
}

class Calculator {
  precision = 2;

  @logged
  add(a: number, b: number): number {
    return Number((a + b).toFixed(this.precision));
  }

  @bound
  describe(): string {
    return `precision=${this.precision}`;
  }
}

const calculator = new Calculator();
calculator.add(0.1, 0.2);
const detached = calculator.describe;
detached(); // this на месте: 'precision=2'
```

```
→ add(0.1, 0.2)
← add = 0.3
```

`bound` решает задачу оторванного метода из
[5.5](functions.md#55-типизация-this) без стрелочного поля - и это
типичный случай для декоратора: сквозное поведение, которое не хочется
писать в каждом методе.

### Поле, аксессор и класс

```ts
/**
 * Подставляет значение по умолчанию вместо undefined.
 *
 * Декоратор поля возвращает функцию, которая получает начальное значение и
 * возвращает то, что будет записано в поле.
 */
function defaultTo<T>(fallback: T) {
  return (_value: undefined, context: ClassFieldDecoratorContext<unknown, T | undefined>) => {
    return (initial: T | undefined): T => {
      console.log(`init field ${String(context.name)}:`, initial);
      return initial ?? fallback;
    };
  };
}

/**
 * Ограничивает значение автоаксессора диапазоном.
 *
 * Ключевое слово accessor объявляет поле с парой get/set; декоратор получает
 * исходную пару и возвращает новую вместе с инициализатором.
 */
function clamp(min: number, max: number) {
  return (
    target: ClassAccessorDecoratorTarget<unknown, number>,
    context: ClassAccessorDecoratorContext<unknown, number>,
  ): ClassAccessorDecoratorResult<unknown, number> => ({
    get() {
      return target.get.call(this);
    },
    set(value: number) {
      target.set.call(this, Math.min(max, Math.max(min, value)));
    },
    init(initial: number) {
      console.log(`init accessor ${String(context.name)}:`, initial);
      return initial;
    },
  });
}

/**
 * Запечатывает экземпляры класса после конструирования.
 *
 * Декоратор класса возвращает наследника; any[] в конструкторе обязателен
 * для классов-примесей (TS2545).
 */
function sealed<T extends new (...args: any[]) => object>(target: T, context: ClassDecoratorContext<T>): T {
  console.log(`seal class ${context.name}`);
  return class extends target {
    constructor(...args: any[]) {
      super(...args);
      Object.seal(this);
    }
  };
}

@sealed
class Settings {
  @defaultTo('light') theme: string | undefined = undefined;

  @clamp(0, 100) accessor volume = 50;
}

const settings = new Settings();
settings.volume = 150;
console.log(settings.theme, settings.volume, Object.isSealed(settings)); // light 100 true
```

```
seal class Settings
init field theme: undefined
init accessor volume: 50
```

Замена класса имеет цену: у возвращенного анонимного класса пустое
`name`, и он не равен исходному по `instanceof` для кода, который сохранил
ссылку на исходный класс до декорирования.

### Декораторы параметров

В стандартной реализации их нет. В старой декоратор параметра получает
прототип (или конструктор для статики), имя метода и индекс параметра и
обычно только записывает метаданные, которые потом читает метод или
фреймворк:

```ts
import 'reflect-metadata';

function Body(): ParameterDecorator {
  return (target, propertyKey, index) => {
    const key = propertyKey ?? 'constructor';
    const existing: number[] = Reflect.getOwnMetadata('body:params', target, key) ?? [];
    Reflect.defineMetadata('body:params', [...existing, index], target, key);
  };
}

class UsersController {
  create(@Body() name: string, age: number): string {
    return `${name}:${age}`;
  }
}

Reflect.getOwnMetadata('body:params', UsersController.prototype, 'create'); // [0]
```

Старые сигнатуры для остальных видов: класс - `(target)`, метод и аксессор -
`(target, key, descriptor)` с возможностью вернуть новый дескриптор,
свойство - `(target, key)` без дескриптора и без доступа к значению.
Пример с дескриптором - `memoize` в
[12.5](#125-практика-nestjs-injectable-controller-get-собственные-декораторы).

---

## 12.3 Фабрики декораторов, композиция и порядок вызова

**Фабрика декораторов** - функция, которая принимает параметры и возвращает
декоратор: `@clamp(0, 100)` - вызов фабрики, результат которого применяется
как декоратор. Так параметризуются все декораторы из предыдущего раздела.

### Порядок

Два разных порядка: выражения-фабрики **вычисляются** сверху вниз, а
полученные декораторы **применяются** снизу вверх - ближайший к объявлению
первым. Порядок между членами класса тоже определен, и у двух реализаций
он разный.

```ts
function trace(kind: string) {
  return (_value: unknown, context: DecoratorContext): void => {
    console.log(`apply ${kind} on ${context.kind} "${String(context.name)}"`);
  };
}

@trace('class')
class Widget {
  @trace('field') size = 1;

  @trace('accessor') accessor scale = 1;

  @trace('outer')
  @trace('inner')
  render(): void {}

  @trace('getter')
  get area(): number {
    return this.size ** 2;
  }

  @trace('static')
  static create(): Widget {
    return new Widget();
  }
}
```

```
apply static on method "create"
apply accessor on accessor "scale"
apply inner on method "render"
apply outer on method "render"
apply getter on getter "area"
apply field on field "size"
apply class on class "Widget"
```

| Стандартные | `experimentalDecorators` |
| --- | --- |
| 1. Статические методы и аксессоры | 1. Члены экземпляра в порядке объявления: для метода сначала его параметры (справа налево), потом сам метод |
| 2. Методы и аксессоры экземпляра в порядке объявления | 2. Статические члены |
| 3. Статические поля, затем поля экземпляра | 3. Параметры конструктора (справа налево) |
| 4. Класс | 4. Класс |

Для одного члена в обеих реализациях - снизу вверх: `inner` до `outer`.
Практическое следствие: декоратор, который читает метаданные, записанные
другим декоратором того же члена, должен стоять **выше** него.

### Инициализаторы

`addInitializer` откладывает работу до момента, когда есть экземпляр:
инициализаторы методов и полей выполняются при конструировании, до
инициализаторов полей класса; инициализаторы статических членов и класса -
сразу после объявления класса. Это единственный способ из декоратора метода
получить `this` - сам метод при декорировании еще ни к чему не привязан.

### Композиция

Несколько декораторов на одном члене - это композиция функций: результат
нижнего передается верхнему как `value`. `@logged` над `@bound`
логирует уже привязанный метод. Декоратор, возвращающий `undefined`,
оставляет значение как есть, поэтому наблюдающие декораторы (`trace`)
можно ставить в любом месте цепочки.

---

## 12.4 Метаданные: `reflect-metadata`, `emitDecoratorMetadata`, `Symbol.metadata`

Декоратор выполняется в рантайме и типов не видит
([1.7](type-system.md#17-стирание-типов-что-остается-в-javascript)). Все,
что он знает о члене, - имя и значение. Фреймворку внедрения зависимостей
этого мало: чтобы создать `UserService`, нужно знать типы параметров его
конструктора. Две реализации решают это по-разному.

### `emitDecoratorMetadata` и `reflect-metadata`

Опция старой реализации заставляет компилятор записать рядом с каждым
декорированным членом три записи: `design:type` (тип свойства),
`design:paramtypes` (типы параметров) и `design:returntype`. Записи
делаются вызовом `Reflect.metadata`, которого в JavaScript нет: его
предоставляет пакет `reflect-metadata`, импортируемый один раз в точке
входа.

```ts
import 'reflect-metadata';

function Injectable(): ClassDecorator {
  return (target) => {
    Reflect.defineMetadata('injectable', true, target);
  };
}

class Logger {}

@Injectable()
class UserService {
  constructor(
    private readonly logger: Logger,
    readonly prefix: string,
  ) {}
}

(Reflect.getMetadata('design:paramtypes', UserService) as Function[]).map((t) => t.name); // ['Logger', 'String']
```

Метаданные записываются только для членов, у которых есть хотя бы один
декоратор, - поэтому `@Injectable()` без тела и нужен: он включает запись
`design:paramtypes` для конструктора.

Компилятор может записать только то, что выражается конструктором в
рантайме. Проверено на полях класса:

| Аннотация | `design:type` |
| --- | --- |
| `name: string` | `String` |
| `createdAt: Date`, `logger: Logger` | `Date`, `Logger` |
| `tags: string[]` | `Array` - без типа элементов |
| `status: 'active' \| 'blocked'` | `String` - объединение литералов одного примитива |
| `nullable: string \| null` | `Object` |
| `address: Address` (интерфейс) | `Object` |
| `cache = new Map()` (без аннотации) | `Object` - вывод не участвует |

Для интерфейса, объединения или обобщения фреймворк получает `Object` и
не может ничего внедрить; в NestJS для таких зависимостей нужен явный
токен: `@Inject(CONFIG)`. Второе ограничение - циклические импорты: тип
класса, еще не объявленного к моменту декорирования, дает `undefined`, и
NestJS требует `forwardRef`.

### `Symbol.metadata`

Стандартные декораторы получают `context.metadata` - объект, общий для всех
декораторов одного класса и доступный после объявления как
`Class[Symbol.metadata]`. Компилятор туда ничего не пишет: это хранилище
только для того, что декораторы записали сами.

```ts
// Symbol.metadata пока не реализован в Node 26: нужен полифилл.
(Symbol as { metadata?: symbol }).metadata ??= Symbol('Symbol.metadata');

type ColumnInfo = { name: string; type: 'text' | 'int' };
const COLUMNS = Symbol('columns');

function column(type: ColumnInfo['type']) {
  return (_value: undefined, context: ClassFieldDecoratorContext): void => {
    const columns = (context.metadata[COLUMNS] ??= []) as ColumnInfo[];
    columns.push({ name: String(context.name), type });
  };
}

function table(name: string) {
  return (_value: abstract new (...args: never[]) => unknown, context: ClassDecoratorContext): void => {
    context.metadata.table = name;
  };
}

@table('users')
class User {
  @column('int') id = 0;
  @column('text') name = '';
}

const metadata = User[Symbol.metadata];
console.log(metadata?.table, JSON.stringify(metadata?.[COLUMNS]));
// users [{"name":"id","type":"int"},{"name":"name","type":"text"}]
```

Тип поля здесь указан явно в аргументе декоратора - `@column('int')` -
потому что взять его из аннотации `id = 0` негде. Это осознанное решение
стандарта: типы стерты, и метаданные о них не появляются волшебным
образом. Для внедрения зависимостей на стандартных декораторах это
означает явные токены у каждого параметра.

Для типизации `Symbol.metadata` нужна `lib` с `esnext` (или `esnext.decorators`).

---

## 12.5 Практика NestJS: `@Injectable`, `@Controller`, `@Get`, собственные декораторы

NestJS - самый распространенный потребитель старой реализации. Его
конфигурация ([2.8](tsconfig.md#28-конфигурации-для-типовых-проектов-nodejs-nestjs-react-библиотека))
включает `experimentalDecorators` и `emitDecoratorMetadata`, а `reflect-metadata`
импортируется фреймворком. Контроллер ниже проверен компиляцией и запуском
с `@nestjs/common` 12.0.1:

```ts
import 'reflect-metadata';
import { Body, Controller, Get, Injectable, Param, Post, createParamDecorator, type ExecutionContext } from '@nestjs/common';

interface User {
  id: string;
  name: string;
}

@Injectable()
export class UsersService {
  private readonly users = new Map<string, User>();

  create(name: string): User {
    const user = { id: String(this.users.size + 1), name };
    this.users.set(user.id, user);
    return user;
  }

  find(id: string): User | undefined {
    return this.users.get(id);
  }
}

/**
 * Извлекает идентификатор пользователя из заголовка запроса.
 *
 * createParamDecorator - способ Nest объявить собственный декоратор
 * параметра: фабрика получает контекст выполнения и возвращает значение,
 * которое будет передано в параметр.
 */
export const CurrentUserId = createParamDecorator((_data: unknown, context: ExecutionContext): string => {
  const request = context.switchToHttp().getRequest<{ headers: Record<string, string | undefined> }>();
  return request.headers['x-user-id'] ?? 'anonymous';
});

class CreateUserDto {
  name!: string;
}

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get(':id')
  findOne(@Param('id') id: string): User | undefined {
    return this.users.find(id);
  }

  @Post()
  create(@Body() dto: CreateUserDto, @CurrentUserId() author: string): User & { author: string } {
    return { ...this.users.create(dto.name), author };
  }
}

Reflect.getMetadata('path', UsersController); // 'users'
(Reflect.getMetadata('design:paramtypes', UsersController) as Function[]).map((t) => t.name); // ['UsersService']
Reflect.getMetadata('path', UsersController.prototype.findOne); // ':id'
```

Каждый декоратор Nest - запись метаданных: `@Controller('users')` кладет
`path` на класс, `@Get(':id')` - `path` и `method` на метод, `@Param('id')` -
описание параметра. Сам фреймворк при старте читает эти записи и строит
маршруты, а `design:paramtypes` конструктора использует для внедрения
`UsersService`. Поле `name!: string` в DTO - определенное присваивание из
[6.1](classes.md#61-поля-и-конструктор-инициализация-strictpropertyinitialization-параметры-свойства):
объект создает и заполняет фреймворк.

### Как устроено внедрение

Контейнер, который делает то же, что `@Injectable()` и `Reflect.getMetadata`
в Nest, умещается в тридцать строк:

```ts
import 'reflect-metadata';

type Constructor<T = object> = new (...args: never[]) => T;

const INJECTABLE = Symbol('injectable');

function Injectable(): ClassDecorator {
  return (target) => {
    Reflect.defineMetadata(INJECTABLE, true, target);
  };
}

/**
 * Минимальный контейнер внедрения зависимостей.
 *
 * Зависимости класса читаются из design:paramtypes, которые компилятор
 * записал при emitDecoratorMetadata; каждый параметр конструктора
 * разрешается рекурсивно и кэшируется как синглтон.
 */
class Container {
  private readonly instances = new Map<Constructor, object>();

  resolve<T extends object>(target: Constructor<T>): T {
    const cached = this.instances.get(target);
    if (cached !== undefined) {
      return cached as T;
    }
    if (Reflect.getMetadata(INJECTABLE, target) !== true) {
      throw new Error(`${target.name} is not injectable`);
    }
    const dependencies: Constructor[] = Reflect.getMetadata('design:paramtypes', target) ?? [];
    const args = dependencies.map((dependency) => this.resolve(dependency));
    const instance = new target(...(args as never[]));
    this.instances.set(target, instance);
    return instance;
  }
}

@Injectable()
class Config {
  readonly prefix = 'app';
}

@Injectable()
class Logger {
  constructor(private readonly config: Config) {}

  log(message: string): void {
    console.log(`[${this.config.prefix}] ${message}`);
  }
}

@Injectable()
class UserService {
  constructor(
    private readonly logger: Logger,
    private readonly config: Config,
  ) {}

  create(name: string): void {
    this.logger.log(`created ${name} with prefix ${this.config.prefix}`);
  }
}

const container = new Container();
container.resolve(UserService).create('Ann'); // [app] created Ann with prefix app
container.resolve(Logger) === container.resolve(Logger); // true
```

Два утверждения типа в `resolve` - границы, за которыми компилятор
бессилен: `Map` не связывает конструктор с типом экземпляра, а
`design:paramtypes` - данные из рантайма без типа.

### Собственный декоратор метода

Старая сигнатура метода дает дескриптор свойства, и замена `descriptor.value`
подменяет метод - так пишутся кэширование, повтор при ошибке, измерение
времени:

```ts
/**
 * Кэширует результаты метода по сериализованным аргументам.
 *
 * Старая реализация: третий параметр - дескриптор, замена value подменяет
 * метод в прототипе.
 */
function memoize(_target: object, key: string, descriptor: PropertyDescriptor): PropertyDescriptor {
  const original = descriptor.value as (...args: unknown[]) => unknown;
  const cache = new Map<string, unknown>();
  descriptor.value = function (this: unknown, ...args: unknown[]): unknown {
    const cacheKey = JSON.stringify(args);
    if (!cache.has(cacheKey)) {
      cache.set(cacheKey, original.apply(this, args));
    }
    return cache.get(cacheKey);
  };
  return descriptor;
}

class Fibonacci {
  @memoize
  at(n: number): number {
    return n < 2 ? n : this.at(n - 1) + this.at(n - 2);
  }
}

new Fibonacci().at(50); // без кэша - миллиарды вызовов
```

Кэш здесь общий для всех экземпляров - он создан при декорировании
прототипа, а не в конструкторе. Для кэша на экземпляр нужен `WeakMap` по
`this` либо, в стандартной реализации, `addInitializer`.

---

## Типичные ошибки

1. **Смешение двух реализаций.** Декоратор со старой сигнатурой в проекте
   без `experimentalDecorators` (TS1241) или декоратор параметра в
   стандартном режиме (TS1206). Реализацию задает фреймворк, и она одна на
   проект.
2. **`target: esnext` с декораторами.** Компилятор оставляет `@`-синтаксис
   как есть, а движок его не понимает. Для запуска - `target` не выше
   `es2025`.
3. **Ожидание типов в метаданных.** `design:type` для интерфейса,
   объединения с `null` или поля без аннотации - `Object`; для массива -
   `Array` без элементов. Такие зависимости требуют явного токена.
4. **`emitDecoratorMetadata` без `reflect-metadata`.** Сгенерированный код
   вызывает `Reflect.metadata`, которого в JavaScript нет; импорт полифилла -
   один раз в точке входа.
5. **Метаданные конструктора без декоратора класса.** `design:paramtypes`
   записывается только у декорированных членов; классу без `@Injectable()`
   нечего внедрять.
6. **Порядок чтения и записи метаданных.** Декораторы одного члена
   применяются снизу вверх; читающий должен стоять выше пишущего.
7. **`this` в декораторе метода.** При декорировании экземпляра еще нет;
   привязка и доступ к полям - через `addInitializer`.
8. **Кэш или состояние в замыкании декоратора.** Оно общее для всех
   экземпляров класса. Состояние на экземпляр - в `WeakMap` или через
   инициализатор.

---

[← Шаблонные литеральные типы и паттерны на типах](template-literal-types.md) · [К содержанию](../README.md) ·
[Далее: модули →](modules.md)
