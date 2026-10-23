# Протокол WebSocket и API браузера

## 5.1 Что такое WebSocket

> 📌 **WebSocket** - протокол (RFC 6455) постоянного двустороннего
> соединения между клиентом и сервером поверх одного TCP-соединения:
> после установления любая сторона в любой момент отправляет сообщения
> другой, без нового запроса и без заголовков HTTP на каждое сообщение.

### Рукопожатие

Соединение начинается как обычный HTTP-запрос с просьбой сменить протокол:

```
   клиент ──► GET /chat HTTP/1.1
              Upgrade: websocket
              Connection: Upgrade
              Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==

   сервер ──► HTTP/1.1 101 Switching Protocols
              Upgrade: websocket
              Connection: Upgrade
              Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=

   далее по тому же TCP-соединению - кадры WebSocket в обе стороны
```

Поэтому WebSocket работает через те же порты и прокси, что и HTTP, а
адрес начинается с `ws://` (как `http://`) или `wss://` (как `https://`,
TLS). ✅ В production - только `wss://`: незашифрованный `ws://` со страницы
`https://` браузер блокирует как смешанное содержимое.

### Место среди альтернатив

| Способ | Направление | Как устроен | Когда |
| --- | --- | --- | --- |
| Короткий опрос (polling) | клиент → сервер | `fetch` по таймеру | Редкие обновления, простота важнее задержки |
| Длинный опрос (long polling) | клиент → сервер | Сервер держит запрос до появления данных | 🕰️ Обходной прием до WebSocket |
| Server-Sent Events (`EventSource`) | сервер → клиент | Один HTTP-ответ, который не заканчивается; текст; автоматическое переподключение | Уведомления, лента, прогресс - когда клиенту не нужно писать |
| **WebSocket** | оба | Отдельный протокол после рукопожатия; текст и бинарные данные | Чат, совместное редактирование, игры, живые данные с частыми обновлениями в обе стороны |
| WebTransport | оба | Поверх HTTP/3 (QUIC), несколько потоков | Новый; там, где важны задержки и неупорядоченные данные |

WebSocket стоит держать открытым только там, где обновления действительно
частые или нужны в обе стороны: каждое соединение - ресурс сервера, а
SSE и обычный `fetch` проще и проходят через любую HTTP-инфраструктуру.

---

## 5.2 Объект `WebSocket`: состояния, события, закрытие

> 📌 **`WebSocket`** - встроенный класс браузера: конструктор открывает
> соединение с указанным адресом, объект сообщает о его ходе событиями
> `open`, `message`, `error`, `close`, а методы `send` и `close`
> отправляют данные и закрывают соединение.

```ts
const socket = new WebSocket('wss://example.com/chat');

socket.addEventListener('open', () => {
  console.log('Соединение установлено');
  socket.send(JSON.stringify({ type: 'subscribe', room: 'general' }));
});

socket.addEventListener('message', (event: MessageEvent<string>) => {
  console.log('Получено:', event.data);
});

socket.addEventListener('close', (event: CloseEvent) => {
  console.log('Закрыто:', event.code, event.reason, event.wasClean);
});

socket.addEventListener('error', () => {
  console.log('Ошибка соединения'); // подробностей событие не содержит
});
```

Конструктор возвращает объект **сразу**, а соединение устанавливается
асинхронно: между `new WebSocket(…)` и событием `open` отправлять нельзя -
`send()` до `open` бросает `InvalidStateError`.

### `readyState`

| Значение | Константа | Смысл |
| --- | --- | --- |
| `0` | `WebSocket.CONNECTING` | Объект создан, рукопожатие идет |
| `1` | `WebSocket.OPEN` | Соединение открыто; `send` работает |
| `2` | `WebSocket.CLOSING` | Вызван `close()` или получен кадр закрытия; обмен завершается |
| `3` | `WebSocket.CLOSED` | Соединение закрыто или не установилось |

Значения сменяются так: `0 → 1` (к событию `open`) `→ 2` (сразу после
`close()`) `→ 3` (к событию `close`). Сравнение - с константами класса, а
не с числами.

### События

| Событие | Тип объекта | Когда |
| --- | --- | --- |
| `open` | `Event` | Рукопожатие завершено |
| `message` | `MessageEvent` | Пришел кадр данных; содержимое в `event.data` |
| `error` | `Event` | Сбой: отказ в соединении, обрыв, нарушение протокола. ⚠️ Подробностей нет - браузер скрывает их по соображениям безопасности; за `error` **всегда** следует `close` |
| `close` | `CloseEvent` | Соединение закрыто любой стороной или оборвано; `code`, `reason`, `wasClean` |

Попытка соединиться с портом, на котором никто не слушает, дает `error`
(объект `Event` без подробностей), затем `close` с `code: 1006` и
`wasClean: false`. Отсюда правило: **логика восстановления пишется в
обработчике `close`**, а `error` служит только для журналирования.

✅ `addEventListener` вместо свойств `onopen`/`onmessage`: несколько
подписчиков, снятие через `removeEventListener` или `AbortSignal`, и
случайное переприсваивание невозможно.

### Закрытие

`socket.close(code?, reason?)` - штатное завершение: стороны обмениваются
кадрами закрытия, событие `close` приходит с `wasClean: true`. Обрыв сети
или падение сервера кадра закрытия не дает - `wasClean: false`.

| Код | Смысл | Кто отправляет |
| --- | --- | --- |
| `1000` | Штатное закрытие | Обе стороны |
| `1001` | Сторона уходит: сервер выключается, пользователь закрыл вкладку | Сервер; браузер - сам при уходе со страницы |
| `1002`, `1003`, `1007` | Ошибка протокола, неподдерживаемый тип данных, некорректная нагрузка | Обе стороны |
| `1005` | Кода в кадре закрытия не было | Только в `event.code`, отправить нельзя |
| `1006` | Аварийное закрытие без кадра: обрыв сети, отказ в соединении | Только в `event.code` |
| `1008` | Нарушение политики (например, нет авторизации) | Сервер |
| `1009` | Сообщение слишком большое | Обе стороны |
| `1011` | Внутренняя ошибка сервера | Сервер |
| `3000–3999` | Зарезервированы для библиотек и фреймворков | По их правилам |
| `4000–4999` | Коды приложения | По договоренности клиента и сервера |

⚠️ Из браузера `close()` принимает только `1000` или `3000–4999`:
`socket.close(1001)` бросает `InvalidAccessError`. `reason` - строка до 123
байт UTF-8. Код и причину, с которыми соединение закрыл сервер, клиент
получает в событии `close` с `wasClean: true`; обрыв без кадра закрытия
дает `1006` и `wasClean: false`.

---

## 5.3 Данные: кадры, текст, JSON, бинарные сообщения

> 📌 **Кадр (frame)** - единица передачи в WebSocket; сообщение состоит из
> одного или нескольких кадров, а кадры бывают данных (текстовые, бинарные)
> и служебные (ping, pong, close).

| Вид кадра | Кто видит | Назначение |
| --- | --- | --- |
| Текстовый | Приложение: `event.data` - строка | JSON и любой текст |
| Бинарный | Приложение: `Blob` или `ArrayBuffer` | Файлы, аудио, компактные протоколы |
| Ping / pong | Только браузер и сервер | Проверка, что соединение живо; браузер отвечает на ping сам, из JavaScript кадры недоступны |
| Close | Браузер | Штатное закрытие с кодом и причиной |

### Отправка

`send()` принимает `string`, `ArrayBuffer`, `Blob` или типизированный
массив (`ArrayBufferView`); объект передать нельзя - его сериализуют:

```ts
interface ChatMessage {
  id: number;
  name: string;
  message: string;
}

const outgoing: ChatMessage = { id: 8, name: 'Mr. Smith', message: 'Hello, World!' };
socket.send(JSON.stringify(outgoing));
```

`socket.bufferedAmount` показывает, сколько байт еще не ушло в сеть, - при
потоковой отправке по нему регулируют скорость.

### Получение

Текст приходит строкой; данные разбираются и **проверяются**: результат
`JSON.parse` записывается в `unknown`, потому что форма сообщения - не
гарантия, а предположение о поведении сервера ([4.13](../sprint-4/hooks.md#413-usememo-usecallback-и-пользовательские-хуки)).

```ts
socket.addEventListener('message', (event: MessageEvent<string>) => {
  const parsed: unknown = JSON.parse(event.data);
  if (isChatMessage(parsed)) {
    render(parsed);
  }
});
```

Бинарные данные по умолчанию приходят как `Blob`; для работы с байтами
напрямую переключается `binaryType`:

```ts
socket.binaryType = 'arraybuffer';

socket.addEventListener('message', (event: MessageEvent<ArrayBuffer | string>) => {
  if (event.data instanceof ArrayBuffer) {
    const view = new DataView(event.data);
    console.log(view.getInt32(0)); // первое 32-битное число сообщения
  }
});
```

### Heartbeat

Протокольные ping/pong недоступны из JavaScript, поэтому «живость»
соединения на уровне приложения проверяют собственными сообщениями:
сервер периодически шлет `{ "type": "ping" }`, клиент отвечает
`{ "type": "pong" }`; молчание в обе стороны дольше интервала - признак
полуоткрытого соединения (сеть пропала, кадра `close` не будет), и
соединение закрывают и открывают заново.

```ts
socket.addEventListener('message', (event: MessageEvent<string>) => {
  const message: unknown = JSON.parse(event.data);
  if (isPing(message)) {
    socket.send(JSON.stringify({ type: 'pong' }));
    return;
  }
  // …
});
```

---

## 5.4 Протокол приложения и переподключение

WebSocket передает байты и строки; **что они значат**, определяет
приложение. Без явного протокола обработчик `message` превращается в
разбор строк по догадкам.

> 📌 **Протокол приложения** - соглашение о формате сообщений поверх
> WebSocket: конверт с полем типа и полезной нагрузкой, перечень типов в
> каждую сторону и правила порядка (снимок при подключении, затем
> изменения).

### Пример: живая таблица

Сервер хранит таблицу строк `{ id, text }` и рассылает изменения. При
подключении клиент получает полный снимок, дальше - только команды
изменений, пачками в одном сообщении:

```ts
export interface TableRow {
  id: number;
  text: string;
}

export type LiveTable = readonly TableRow[];

// Команда - размеченное объединение: поле type определяет форму data
export type LiveTableCommand =
  | { type: 'data'; data: TableRow[] }                        // полный снимок при подключении
  | { type: 'insert'; data: { rows: TableRow[]; pos: number } }
  | { type: 'update'; data: TableRow[] }
  | { type: 'delete'; data: number[] }                        // идентификаторы строк
  | { type: 'move'; data: { from: number; to: number }[] };
```

Применение команд - чистая функция от таблицы и команды. Она не знает ни
о сокете, ни о хранилище и тестируется без них:

```ts
/**
 * Применяет одну команду к таблице и возвращает новую таблицу.
 * Чистая функция: сервер и клиент могут прогнать одну и ту же последовательность и сойтись.
 */
export function applyCommand(table: LiveTable, command: LiveTableCommand): LiveTable {
  switch (command.type) {
    case 'data':
      return command.data;
    case 'insert':
      return [...table.slice(0, command.data.pos), ...command.data.rows, ...table.slice(command.data.pos)];
    case 'update': {
      const updated = new Map(command.data.map((row) => [row.id, row]));
      return table.map((row) => updated.get(row.id) ?? row);
    }
    case 'delete': {
      const removed = new Set(command.data);
      return table.filter((row) => !removed.has(row.id));
    }
    case 'move': {
      const next = [...table];
      for (const { from, to } of command.data) {
        const [row] = next.splice(from, 1);
        if (row !== undefined) {
          next.splice(to, 0, row);
        }
      }
      return next;
    }
    default: {
      const exhaustive: never = command;
      return exhaustive;
    }
  }
}

/** Пакет команд приходит одним сообщением; применяется по порядку. */
export function applyCommands(table: LiveTable, commands: LiveTableCommand[]): LiveTable {
  return commands.reduce(applyCommand, table);
}
```

Например, снимок `1:a, 2:b, 3:c` и пакет `insert 4:d@1, update 2→B,
delete 3, move 0→2` дают `4:d, 2:B, 1:a`; исходная таблица при этом не
меняется.

Разбор входящего сообщения проверяет форму до применения и отбрасывает
неизвестное:

```ts
const COMMAND_TYPES = new Set(['data', 'insert', 'update', 'delete', 'move']);

/** Возвращает null для сообщений, которые протоколу не соответствуют. */
export function parseCommands(raw: string): LiveTableCommand[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed)) {
    return null;
  }
  const valid = parsed.every(
    (item): item is LiveTableCommand =>
      typeof item === 'object' && item !== null && 'type' in item && typeof item.type === 'string' && COMMAND_TYPES.has(item.type) && 'data' in item
  );
  return valid ? parsed : null;
}
```

Невалидный JSON, объект вместо массива и неизвестный `type` дают `null`.
Для боевого протокола проверка глубже - схема (Zod и подобные) на каждый
тип команды.

### Правила проектирования

- **Конверт `{ type, data }`** в обе стороны; `type` - строковый литерал,
  по нему сужается объединение.
- **Снимок, затем изменения.** Первое сообщение после подключения - полное
  состояние; дальше - дельты. Так переподключение не требует особого
  режима: клиент просто получает новый снимок.
- **Порядок и идемпотентность.** Команды применяются в порядке получения;
  при возможных повторах (переподключение с повторной отправкой) нужны
  идентификаторы, по которым дубликат распознается.
- **Версия протокола** в первом сообщении или в подпротоколе
  (`new WebSocket(url, ['live-table.v1'])`) - чтобы старый клиент не
  разбирал новый формат.

### Аутентификация

Заголовки к рукопожатию из браузера задать нельзя: `Authorization` не
добавить. Варианты: cookie (уходит автоматически, работает с
`HttpOnly`-сессиями - [3.11](../sprint-3/auth.md#311-сессии-cookie-и-хранение-токена)),
токен в первом сообщении после `open` (сервер закрывает соединение с
`4001`, если его нет), ⚠️ токен в query-строке - попадает в журналы серверов
и прокси. WebSocket не подчиняется CORS: сервер обязан сам проверять
заголовок `Origin`, иначе любой сайт откроет соединение от имени
пользователя с его cookie.

### Переподключение

Соединение рвется: уходит сеть, перезапускается сервер, засыпает ноутбук.
Клиент восстанавливает его сам - с растущей задержкой, чтобы тысяча
клиентов не засыпала попытками сервер, который еще поднимается.

```ts
/**
 * Соединение, которое само восстанавливается после обрыва.
 * Задержка удваивается с каждой неудачей и сбрасывается после успешного открытия;
 * явный close() отключает переподключение.
 */
export function createReconnectingSocket({ url, onMessage, onStatus, baseDelay = 1000, maxDelay = 30_000 }: ReconnectingSocketOptions): ReconnectingSocket {
  let socket: WebSocket | null = null;
  let attempt = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let closedByUser = false;

  const connect = () => {
    onStatus?.('connecting');
    socket = new WebSocket(url);

    socket.addEventListener('open', () => {
      attempt = 0; // успешное соединение сбрасывает задержку
      onStatus?.('open');
    });
    socket.addEventListener('message', (event: MessageEvent<string>) => {
      onMessage(event.data);
    });
    socket.addEventListener('close', (event) => {
      onStatus?.('closed');
      // 1000 - штатное закрытие; переподключение только после обрыва и если close() не вызывался
      if (closedByUser || event.code === 1000) {
        return;
      }
      const delay = Math.min(baseDelay * 2 ** attempt, maxDelay);
      attempt += 1;
      timer = setTimeout(connect, delay);
    });
    // error всегда сопровождается close - вся логика восстановления в обработчике close
  };

  connect();

  return {
    send(data) {
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(data);
      }
    },
    close() {
      closedByUser = true;
      clearTimeout(timer);
      socket?.close(1000, 'client closed');
    },
  };
}
```

> 📌 **Экспоненциальная задержка (exponential backoff)** - пауза перед
> повторной попыткой, удваивающаяся после каждой неудачи до заданного
> максимума и сбрасываемая после успеха; часто к ней добавляют случайный
> разброс (jitter), чтобы клиенты не синхронизировались.

Что еще учитывает боевая реализация: остановка попыток при `document.hidden`
и возобновление по `visibilitychange`, событие `online`/`offline`,
ограничение числа попыток с сообщением пользователю, повторная подписка на
каналы после нового `open`.

---

[← К содержанию спринта](README.md) · [Далее: WebSocket в React и Redux →](websocket-react.md)
