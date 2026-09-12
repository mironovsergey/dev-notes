# 15 Типизация Node.js и Express

[← К содержанию](../README.md)

Серверный код - место, где типы встречаются с внешним миром: переменные
окружения, HTTP-запросы, тела в JSON. Все это приходит без типов, и задача
темы - показать, где проходит граница между «компилятор гарантирует» и
«нужно проверить». Примеры проверены на Node.js 26, `@types/node` 22.20,
Express 5.2 с `@types/express` 5.0 и zod 4.6; серверы запускались, ответы
в тексте - из прогонов. Конфигурация проекта - из
[2.8](tsconfig.md#28-конфигурации-для-типовых-проектов-nodejs-nestjs-react-библиотека):
`module: nodenext`, `types: ["node"]`, ESM.

---

## 15.1 Окружение Node.js: `@types/node`, `process.env`, пространство имен `NodeJS`

Node.js не поставляет типы; их публикует пакет `@types/node`, и подключается
он через `types: ["node"]` ([14.2](declarations.md#142-пакеты-types-и-definitelytyped-порядок-поиска-типов-опции-types-и-typeroots)).
Пакет объявляет глобальные значения (`process`, `Buffer`, `setTimeout`),
встроенные модули (`node:fs`, `node:events`) и пространство имен `NodeJS` с
типами, у которых нет собственного модуля.

```ts
import { readFile } from 'node:fs/promises';
import { EventEmitter } from 'node:events';
import path from 'node:path';

const port: string | undefined = process.env.PORT; // NodeJS.ProcessEnv: любая переменная может отсутствовать

const timer = setTimeout(() => {}, 0); // NodeJS.Timeout, а не number
clearTimeout(timer);
type PortableTimer = ReturnType<typeof setTimeout>; // работает и в Node, и в браузере

const here: string = import.meta.dirname; // замена __dirname в ESM, Node.js 20.11+
const file = path.join(here, 'data.txt');

const bus = new EventEmitter<{ tick: [count: number]; done: [] }>();
bus.on('tick', (count) => console.log('tick', count)); // count: number
bus.emit('tick', 1);
// bus.emit('tick', 'one');
// Ошибка TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.
// bus.emit('tock');
// Ошибка TS2345: Argument of type '[]' is not assignable to parameter of type 'never'.

process.on('SIGTERM', (signal) => console.log(signal)); // signal: NodeJS.Signals

function isErrno(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}

try {
  const text = await readFile(file, 'utf8'); // string: перегрузка по кодировке
  console.log(text.length);
} catch (error) {
  if (isErrno(error) && error.code === 'ENOENT') {
    console.log('missing file:', path.basename(file));
  }
}
```

Что здесь стоит запомнить:

| Факт | Следствие |
| --- | --- |
| `process.env` - `{ [key: string]: string \| undefined }` | каждое чтение требует проверки; точные типы задаются расширением `NodeJS.ProcessEnv` ([14.4](declarations.md#144-глобальные-декларации-declare-global-window-processenv-импорт-нескриптовых-файлов)) |
| `setTimeout` возвращает `NodeJS.Timeout` | код, общий для Node и браузера, объявляет таймер как `ReturnType<typeof setTimeout>` |
| `EventEmitter<T>` принимает словарь событий | аргументы `emit` и параметры слушателей проверяются, [11.5](template-literal-types.md#115-составные-примеры-типизированный-event-emitter-api-клиент-конструктор-форм) |
| Ошибки файловой системы - `NodeJS.ErrnoException` | поле `code` доступно после предиката |
| Префикс `node:` | однозначно отличает встроенный модуль от пакета |

### Конфигурация из окружения

Переменные читаются один раз при старте и превращаются в типизированный
объект; остальной код с `process.env` не работает. Функция-утверждение из
[7.4](narrowing.md#74-функции-утверждения-asserts-condition-asserts-value-is-t)
превращает отсутствие обязательной переменной в понятную ошибку запуска:

```ts
function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === '') {
    throw new Error(`Environment variable ${name} is required`);
  }
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: requireEnv('DATABASE_URL'),
  logLevel: process.env.LOG_LEVEL === 'debug' ? 'debug' : 'info',
} as const;
```

---

## 15.2 `Request` и `Response`: параметры обобщений, `RequestHandler`, типизированные обработчики

Типы `@types/express` параметризованы четырьмя аргументами:
`Request<P, ResBody, ReqBody, ReqQuery, Locals>` и
`Response<ResBody, Locals>`, а `RequestHandler` собирает их вместе.

| Параметр | Что типизирует | По умолчанию |
| --- | --- | --- |
| `P` | `req.params` | выводится из строки маршрута: `'/users/:id'` дает `{ id: string }` |
| `ResBody` | аргумент `res.json`, `res.send` | `any` |
| `ReqBody` | `req.body` | **`any`** |
| `ReqQuery` | `req.query` | `ParsedQs` |
| `Locals` | `res.locals` | `Record<string, any>` |

```ts
import express, { type Request, type Response, type RequestHandler } from 'express';

interface User {
  id: string;
  name: string;
}

interface CreateUserBody {
  name: string;
}

type ErrorBody = { error: string };

const users = new Map<string, User>([['1', { id: '1', name: 'Ann' }]]);
const app = express();
app.use(express.json());

app.get('/users/:id', (req, res) => {
  const user = users.get(req.params.id); // params: { id: string } - из строки маршрута
  // req.params.userId;
  // Ошибка TS2339: Property 'userId' does not exist on type '{ id: string; }'.
  if (user === undefined) {
    res.status(404).json({ error: 'not found' });
    return;
  }
  res.json(user);
});

const createUser: RequestHandler<Record<string, never>, User | ErrorBody, CreateUserBody> = (req, res) => {
  const user: User = { id: String(users.size + 1), name: req.body.name }; // body: CreateUserBody
  users.set(user.id, user);
  res.status(201).json(user); // ResBody: только User или ErrorBody
};
app.post('/users', createUser);

app.get('/search', (req: Request<Record<string, never>, User[], never, { q?: string }>, res: Response<User[]>) => {
  const q = req.query.q ?? '';
  res.json([...users.values()].filter((user) => user.name.includes(q)));
});
```

```
GET /users/1  -> 200 {"id":"1","name":"Ann"}
GET /users/9  -> 404 {"error":"not found"}
POST /users   -> 201 {"id":"2","name":"Bob"}
GET /search?q=B -> 200 [{"id":"2","name":"Bob"}]
```

### Что проверяется, а что нет

`req.params` выводится из строки маршрута - редкий случай, когда типы
берутся из литерала пути; опечатка в имени параметра - ошибка. `ResBody`
ограничивает форму ответа: `res.json({ name: 'wrong shape' })` при
`ResBody = User` - ошибка TS2353. Это единственный способ гарантировать, что
обработчик отвечает тем, что обещает контракт API.

Два параметра, напротив, лгут по умолчанию. `req.body` - `any`: Express
не знает, что пришло, и типы честно это отражают, но `any` означает, что
`req.body.name.toUpperCase()` компилируется при любом теле. `req.query` -
`ParsedQs`, где значение каждого ключа - `string | (string | ParsedQs)[] | ParsedQs | undefined`:
`?page=2` приходит строкой, `?tag=a&tag=b` - массивом, и присвоить
`req.query.q` переменной типа `string` нельзя (TS2322). Оба параметра
требуют проверки на границе ([15.6](#156-валидация-на-границе-тело-запроса-как-unknown-схемы-и-вывод-типа-из-схемы)).

---

## 15.3 Middleware: сигнатура, расширение `Request`, предикаты для аутентифицированного запроса

**Middleware** - обработчик `(req, res, next)`, который либо отвечает, либо
передает управление дальше вызовом `next()`. Его тип - тот же
`RequestHandler`; отличие от конечного обработчика только в том, что он
вызывает `next`.

Middleware аутентификации кладет пользователя в `req.user`; свойство
объявляется расширением модуля `express-serve-static-core`
([14.5](declarations.md#145-расширение-модулей-и-слияние-деклараций-requestuser-в-express-defaulttheme)):

```ts
import express, { type NextFunction, type Request, type RequestHandler, type Response } from 'express';

interface User {
  id: string;
  role: 'admin' | 'member';
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: User;
  }
}

const authenticate: RequestHandler = (req, _res, next) => {
  const id = req.header('x-user-id');
  if (id !== undefined) {
    req.user = { id, role: id === 'root' ? 'admin' : 'member' };
  }
  next();
};
```

Свойство необязательное - до `authenticate` его нет. Обработчикам, которым
пользователь нужен обязательно, приходится проверять `req.user` в каждом.
Предикат типа ([7.3](narrowing.md#73-пользовательские-предикаты-типов-value-is-t))
переносит проверку в одно место и сужает `req` до типа с обязательным
`user`:

```ts
class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'HttpError';
    this.status = status;
  }
}

function isAuthenticated(req: Request): req is Request & { user: User } {
  return req.user !== undefined;
}

function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!isAuthenticated(req)) {
    next(new HttpError(401, 'authentication required'));
    return;
  }
  console.log('authenticated:', req.user.id); // req.user: User - без проверки на undefined
  next();
}

/**
 * Возвращает middleware, требующий роль.
 *
 * Фабрика - обычный способ параметризовать middleware: замыкание хранит
 * параметр, а сигнатура остается RequestHandler.
 */
function requireRole(role: User['role']): RequestHandler {
  return (req, _res, next) => {
    if (req.user?.role !== role) {
      next(new HttpError(403, `role ${role} required`));
      return;
    }
    next();
  };
}

const app = express();
app.use(authenticate);
app.get('/me', requireAuth, (req, res) => {
  res.json({ id: req.user?.id });
});
app.get('/admin', requireAuth, requireRole('admin'), (_req, res) => {
  res.json({ ok: true });
});
```

```
GET /me                -> 401 {"error":"authentication required"}
GET /me as u1          -> 200 {"id":"u1"}
GET /admin as u1       -> 403 {"error":"role admin required"}
GET /admin as root     -> 200 {"ok":true}
```

Сужение через предикат действует внутри `requireAuth`, но не в следующем
обработчике: `app.get('/me', requireAuth, (req, res) => ...)` получает
обычный `Request`, и `req.user` там по-прежнему `User | undefined`.
Обработчики в цепочке не знают друг о друге; гарантия «после `requireAuth`
пользователь есть» существует в рантайме, а в типах ее нет. Два способа
закрыть разрыв: `res.locals` с типом через параметр `Locals`
([15.6](#156-валидация-на-границе-тело-запроса-как-unknown-схемы-и-вывод-типа-из-схемы))
либо утверждение в обработчике - осознанное, со ссылкой на middleware.

Ошибки передаются в `next(error)`, а не бросаются: так они попадают в
error middleware независимо от того, синхронный обработчик или нет.

---

## 15.4 Обработка ошибок: классы ошибок, `unknown` в `catch`, error middleware

Ошибка в приложении - значение типа `unknown` ([1.4](type-system.md#14-any-и-unknown)):
бросить можно что угодно, и `catch` это отражает. Порядок в обработке
ошибок начинается с классов: собственная иерархия `Error` с полями, которые
нужны для ответа, и проверка через `instanceof`
([7.2](narrowing.md#72-встроенные-проверки-typeof-instanceof-in)).

`HttpError` из предыдущего раздела несет статус; `options?.cause` сохраняет
исходную ошибку для логов. Явное поле вместо параметра-свойства - чтобы
класс работал и в режиме stripping Node ([1.7](type-system.md#17-стирание-типов-что-остается-в-javascript)).

### Error middleware

Обработчик с **четырьмя** параметрами Express считает обработчиком ошибок:
он получает то, что было передано в `next(error)` или брошено в обработчике.
Его тип - `ErrorRequestHandler`, и первый параметр в нем - `any`, потому что
типы Express не могут знать, что бросает приложение:

```ts
import { type ErrorRequestHandler } from 'express';

const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  // error: any - сужается проверками, как unknown
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: error.message });
    return;
  }
  console.error('unexpected:', error instanceof Error ? error.message : error);
  res.status(500).json({ error: 'internal error' }); // без деталей наружу
};

app.get('/boom', () => {
  throw new Error('sync failure'); // синхронное исключение Express ловит сам
});
app.use(errorHandler); // после всех маршрутов
```

```
GET /boom -> 500 {"error":"internal error"}
```

Параметр `_next` обязателен даже неиспользуемый: без четвертого параметра
функция станет обычным middleware. Регистрируется обработчик последним -
Express вызывает обработчики ошибок в порядке объявления после
маршрутов.

### Правила

| Ситуация | Действие |
| --- | --- |
| Ожидаемая ошибка запроса: нет записи, нет прав, неверные данные | `HttpError` с точным статусом через `next(error)` или `throw` |
| Ошибка программиста: `TypeError`, нарушенный инвариант | 500 без деталей клиенту, полная запись в лог с `cause` |
| Ошибка в библиотеке с собственным классом | предикат или `instanceof` класса библиотеки |
| Промис без обработчика | `process.on('unhandledRejection')` как последняя линия; правило `no-floating-promises` ([19.4](testing-and-code-quality.md#194-eslint-и-typescript-eslint-type-aware-правила-конфигурации-ключевые-правила)) |

Функции, которые всегда бросают, аннотируются `never`
([1.5](type-system.md#15-void-и-never)); тип результата для ожидаемых
ошибок в сервисном слое - альтернатива исключениям
([7.6](narrowing.md#76-паттерны-тип-результата-состояние-асинхронной-операции-валидация-unknown-на-границе)).

---

## 15.5 Асинхронные обработчики: обертка для `Promise`, необработанные отклонения, Express 5

Почти каждый обработчик асинхронен: он ждет базу данных или другой сервис.
Тип `RequestHandler` в `@types/express` 5 допускает результат
`void | Promise<void>`, и `async`-обработчик компилируется без оберток.
Вопрос в том, что произойдет с отклоненным промисом.

Один и тот же обработчик под двумя версиями Express:

```ts
import express, { type NextFunction, type Request, type RequestHandler, type Response } from 'express';

async function loadUser(id: string): Promise<{ id: string }> {
  if (id === 'missing') {
    throw new Error(`user ${id} not found`);
  }
  return { id };
}

const app = express();

app.get('/users/:id', async (req, res) => {
  res.json(await loadUser(req.params.id)); // отклонение промиса при id = 'missing'
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  res.status(500).json({ error: error instanceof Error ? error.message : 'unknown' });
});
```

```
Express 5, async handler     : 500 {"error":"user missing not found"}
Express 4, async handler     : no response (TimeoutError)
                               unhandledRejection: user missing not found
Express 4, asyncHandler wrap : 500 {"error":"user missing not found"}
```

Express 5 передает отклонение промиса в `next()` сам. Express 4 о промисе
не знает: обработчик вернул `Promise`, Express его проигнорировал, отклонение
ушло в `unhandledRejection`, а клиент не получил ответа - соединение висит
до таймаута. Для Express 4 нужна обертка:

```ts
/**
 * Оборачивает асинхронный обработчик для Express 4.
 *
 * Отклонение промиса передается в next(); параметры типа сохраняют
 * типизацию params, body и query обернутого обработчика.
 */
function asyncHandler<P, ResBody, ReqBody, ReqQuery>(
  handler: (req: Request<P, ResBody, ReqBody, ReqQuery>, res: Response<ResBody>, next: NextFunction) => Promise<void>,
): RequestHandler<P, ResBody, ReqBody, ReqQuery> {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
}

app.get(
  '/legacy/:id',
  asyncHandler(async (req: Request<{ id: string }>, res) => {
    res.json(await loadUser(req.params.id));
  }),
);
```

Обертка обобщенная, иначе `req.params` внутри обернутого обработчика
потерял бы тип. В Express 5 она не нужна, но и не мешает.

Компилятор не отличает `await`-нутый промис от забытого: `loadUser(id)`
без `await` внутри `async`-обработчика компилируется, а ответ уйдет до
завершения операции. Это ловит только линтер.

---

## 15.6 Валидация на границе: тело запроса как `unknown`, схемы и вывод типа из схемы

`req.body` - `any`, и первое, что с ним делает обработчик, - объявляет его
`unknown` и проверяет. Проверка по схеме ([7.6](narrowing.md#76-паттерны-тип-результата-состояние-асинхронной-операции-валидация-unknown-на-границе))
дает три вещи разом: тип, разбор и сообщение об ошибке. Оформленная как
middleware, она типизирует `req.body` для следующих обработчиков маршрута:

```ts
import express, { type RequestHandler } from 'express';
import { z } from 'zod';

const CreateUserSchema = z.object({
  name: z.string().min(1),
  email: z.email(),
  age: z.number().int().nonnegative().optional(),
});

/**
 * Проверяет тело запроса по схеме и подменяет его разобранным значением.
 *
 * ReqBody обработчика выводится из схемы: следующие обработчики маршрута
 * получают req.body с типом z.infer<S>.
 */
function validateBody<S extends z.ZodType<object>>(schema: S): RequestHandler<Record<string, string>, unknown, z.infer<S>> {
  return (req, res, next) => {
    const body: unknown = req.body;
    const result = schema.safeParse(body);
    if (!result.success) {
      res.status(400).json({ error: 'invalid body', issues: z.treeifyError(result.error) });
      return;
    }
    req.body = result.data;
    next();
  };
}

const app = express();
app.use(express.json());

app.post('/users', validateBody(CreateUserSchema), (req, res) => {
  // req.body: { name: string; email: string; age?: number | undefined } - выведено из схемы
  res.status(201).json({ id: '1', name: req.body.name, email: req.body.email });
});
```

```
POST {"name":"Ann","email":"ann@example.com"} -> 201 {"id":"1","name":"Ann","email":"ann@example.com"}
POST {"name":"","email":"nope","age":-1}       -> 400 {"error":"invalid body","issues":{"errors":[],"properties":{"name":{"errors":["Too small: expected string to have >=1 characters"]},"email":{"errors":["Invalid email address"]},"age":{"errors":["Too small: expected number to be >=0"]}}}}
```

Вывод работает потому, что все обработчики одного вызова `app.post`
разделяют параметры типа: `validateBody` возвращает `RequestHandler` с
`ReqBody = z.infer<S>`, и компилятор подставляет тот же `ReqBody` в
следующий обработчик. `ResBody` у middleware - `unknown`: иначе его тип
ответа распространился бы на весь маршрут.

### Строка запроса и `res.locals`

`req.query` в Express 5 - геттер: разбирается при каждом обращении, и
записать в него разобранное значение нельзя (присваивание молча
теряется - `page` останется строкой). Типизированное хранилище на время
запроса - `res.locals`, а его тип задает пятый параметр `RequestHandler`:

```ts
const ListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  q: z.string().optional(),
});

/**
 * Проверяет строку запроса по схеме и кладет результат в res.locals.query.
 */
function validateQuery<S extends z.ZodType<object>>(
  schema: S,
): RequestHandler<Record<string, string>, unknown, unknown, Record<string, unknown>, { query: z.infer<S> }> {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      res.status(400).json({ error: 'invalid query', issues: z.treeifyError(result.error) });
      return;
    }
    res.locals.query = result.data;
    next();
  };
}

app.get('/users', validateQuery(ListQuerySchema), (_req, res) => {
  // res.locals.query: { page: number; q?: string | undefined }
  res.json({ page: res.locals.query.page, q: res.locals.query.q ?? null });
});
```

```
GET /users?page=3&q=an -> 200 {"page":3,"q":"an"}
GET /users?page=zero   -> 400 {"error":"invalid query","issues":{"errors":[],"properties":{"page":{"errors":["Invalid input: expected number, received NaN"]}}}}
```

`z.coerce.number()` превращает строку `'3'` в число `3` - в ответе `page`
уже число, а не строка. Тот же механизм `Locals` типизирует все, что
middleware передает дальше: пользователя из `requireAuth`, идентификатор
запроса, соединение с базой.

### Граница проходит один раз

Валидация на входе избавляет остальной код от `unknown`: сервисный слой
принимает `CreateUser`, а не `req.body`, и не знает об HTTP. Схема здесь -
единственное описание формы данных: тип выводится из нее, а не пишется
рядом ([7.6](narrowing.md#76-паттерны-тип-результата-состояние-асинхронной-операции-валидация-unknown-на-границе)).
Ответы типизируются через `ResBody` ([15.2](#152-request-и-response-параметры-обобщений-requesthandler-типизированные-обработчики))
и, при необходимости, проверяются той же схемой перед отправкой.

---

## Типичные ошибки

1. **`req.body` как типизированное значение.** Это `any`; без проверки
   любое обращение компилируется. На входе - `unknown` и схема.
2. **`req.query.q` как `string`.** Тип - объединение со строкой, массивом,
   объектом и `undefined`; нужен разбор с приведением.
3. **Расширение `express` вместо `express-serve-static-core`.** `req` в
   обработчиках свойства не получит ([14.5](declarations.md#145-расширение-модулей-и-слияние-деклараций-requestuser-в-express-defaulttheme)).
4. **Ожидание, что сужение из middleware дойдет до обработчика.**
   Обработчики цепочки типизированы независимо; общие данные - через
   `res.locals` с параметром `Locals`.
5. **Error middleware с тремя параметрами.** Без четвертого параметра
   Express считает функцию обычным middleware и ошибок в нее не передает.
6. **Async-обработчик в Express 4 без обертки.** Отклонение промиса уходит
   в `unhandledRejection`, клиент ждет таймаута.
7. **Запись в `req.query` в Express 5.** Геттер; значение теряется, тип
   врет. Разобранный запрос - в `res.locals`.
8. **`setTimeout` как `number` в серверном коде.** В Node это
   `NodeJS.Timeout`; для переносимого кода - `ReturnType<typeof setTimeout>`.
9. **Параметры-свойства в классах ошибок при запуске без компиляции.**
   Режим stripping их не поддерживает; явные поля работают везде.

---

[← Декларации типов и внешние библиотеки](declarations.md) · [К содержанию](../README.md) ·
[Далее: типизация React →](react.md)
