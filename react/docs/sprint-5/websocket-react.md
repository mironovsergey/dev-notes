# WebSocket в React и Redux

## 5.5 WebSocket в компоненте

> 📌 **Соединение в компоненте** - сокет, открываемый в `useEffect` при
> монтировании и закрываемый в функции очистки; объект сокета хранится в
> ссылке, а в состояние попадает только то, что нужно разметке: статус и
> сообщения.

Это прямое применение правила «эффект - синхронизация с внешней системой»
([1.20](../sprint-1/hooks.md#120-useeffect)): внешняя система - сокет,
очистка - его закрытие.

```ts
import { useCallback, useEffect, useRef, useState } from 'react';

export type SocketStatus = 'connecting' | 'open' | 'closed';

export interface UseWebSocketResult<T> {
  status: SocketStatus;
  lastMessage: T | null;
  send: (data: unknown) => void;
}

/**
 * Держит соединение, пока компонент смонтирован: открывает в эффекте, закрывает в очистке.
 * Входящие сообщения разбираются функцией parse; send сериализует объект в JSON.
 */
export function useWebSocket<T>(url: string, parse: (raw: string) => T | null): UseWebSocketResult<T> {
  const [status, setStatus] = useState<SocketStatus>('connecting');
  const [lastMessage, setLastMessage] = useState<T | null>(null);
  // Сокет живет в ref: его смена не должна вызывать рендер
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const socket = new WebSocket(url);
    // Через signal обработчики снимаются разом: события закрытого сокета не меняют состояние
    const listeners = new AbortController();
    const { signal } = listeners;
    socketRef.current = socket;
    setStatus('connecting');

    socket.addEventListener('open', () => setStatus('open'), { signal });
    socket.addEventListener('close', () => setStatus('closed'), { signal });
    socket.addEventListener('message', (event: MessageEvent<string>) => {
      const message = parse(event.data);
      if (message !== null) {
        setLastMessage(message);
      }
    }, { signal });

    return () => {
      // Очистка: при размонтировании и при смене url; в StrictMode - и при повторном монтировании
      listeners.abort();
      socket.close(1000, 'component unmounted');
      socketRef.current = null;
    };
  }, [url, parse]);

  const send = useCallback((data: unknown) => {
    const socket = socketRef.current;
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(data));
    }
  }, []);

  return { status, lastMessage, send };
}
```

```tsx
function Chat() {
  const parse = useCallback((raw: string): ChatMessage | null => {
    const parsed: unknown = JSON.parse(raw);
    return isChatMessage(parsed) ? parsed : null;
  }, []);
  const { status, lastMessage, send } = useWebSocket('wss://example.com/chat', parse);

  return (
    <>
      <output>{status}</output>
      <p>{lastMessage?.text ?? '-'}</p>
      <button onClick={() => send({ text: 'hi' })}>Отправить</button>
    </>
  );
}
```

Три детали, которые делают хук корректным:

- **`parse` в зависимостях эффекта.** Функцию передает вызывающий компонент; если
  создавать ее заново на каждом рендере, эффект будет переоткрывать
  соединение на каждом рендере. Поэтому вызывающая сторона оборачивает ее в
  `useCallback` или объявляет на уровне модуля.
- **Смена `url`** закрывает старое соединение и открывает новое. Обработчики
  старого сокета снимаются до `close()`: иначе его запоздалое событие
  `close` перезаписало бы статус нового соединения.
- **`StrictMode`** в разработке монтирует компонент дважды
  ([1.2](../sprint-1/fundamentals.md#12-пакеты-react-и-react-dom-корень-приложения)):
  создаются два сокета, и первый закрывается очисткой. Это не ошибка, а
  проверка, что очистка написана; эффект без `close()` в очистке оставил бы
  два живых соединения.

Хранить в состоянии **сам сокет** незачем: его смена не влияет на
разметку, а `setState` с объектом, который затем мутируется, нарушает
неизменяемость. В состояние идут статус и разобранные сообщения;
переподключение добавляется так же, как в
[5.4](websocket.md#54-протокол-приложения-и-переподключение), - обертка
вместо голого `WebSocket`.

Границы подхода: соединение живет ровно столько, сколько смонтирован
компонент, и данные из него видны только этому поддереву. Для чата на одной
странице этого достаточно; для данных, нужных всему приложению, - нет.

---

## 5.6 Socket middleware для Redux

> 📌 **Socket middleware** - middleware Redux, которое владеет объектом
> `WebSocket`: открывает и закрывает соединение по действиям
> (`ws/connect`, `ws/disconnect`), отправляет данные по действию
> (`ws/send`) и превращает события сокета в действия для редьюсеров
> (`ws/open`, `ws/message`, `ws/close`, `ws/error`).

Схема повторяет [2.14](../sprint-2/middleware-and-thunk.md#214-middleware):
компоненты ничего не знают о сокете и общаются с ним только через
`dispatch`; вся сетевая логика - в одном модуле, состояние соединения -
в хранилище, история сообщений - в DevTools.

```
   компонент ──dispatch(wsConnect(url))──► middleware ──new WebSocket──► сервер
   компонент ──dispatch(wsSend(data))────► middleware ──socket.send────► сервер
   редьюсер ◄──dispatch(wsMessage(data))── middleware ◄──message───────── сервер
   редьюсер ◄──dispatch(wsClose(…))─────── middleware ◄──close─────────── сервер
```

### Действия

```ts
import { createAction } from '@reduxjs/toolkit';

// Команды middleware: компоненты отправляют их как обычные действия
export const wsConnect = createAction<string>('ws/connect');
export const wsDisconnect = createAction('ws/disconnect');
export const wsSend = createAction<unknown>('ws/send');

// События соединения: middleware переводит их в действия для редьюсера
export const wsConnecting = createAction('ws/connecting');
export const wsOpen = createAction('ws/open');
export const wsClose = createAction<{ code: number; wasClean: boolean }>('ws/close');
export const wsError = createAction<string>('ws/error');
export const wsMessage = createAction<string>('ws/message');
```

⚠️ В действия попадают **сериализуемые** данные: код и флаг закрытия,
строка сообщения, текст ошибки. Объект события (`Event`, `CloseEvent`) в
`payload` - несериализуемое значение в хранилище: DevTools его не покажут,
а `configureStore` предупредит ([2.18](../sprint-2/redux-toolkit.md#218-зачем-redux-toolkit-configurestore)).

### Редьюсер

```ts
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { applyCommands, parseCommands, type TableRow } from './live-table';

export type SocketStatus = 'offline' | 'connecting' | 'online';

interface LiveTableState {
  status: SocketStatus;
  error: string | null;
  table: TableRow[];
}

const initialState: LiveTableState = { status: 'offline', error: null, table: [] };

export const liveTableSlice = createSlice({
  name: 'liveTable',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(wsConnecting, (state) => { state.status = 'connecting'; })
      .addCase(wsOpen, (state) => { state.status = 'online'; state.error = null; })
      .addCase(wsClose, (state) => { state.status = 'offline'; })
      .addCase(wsError, (state, action: PayloadAction<string>) => { state.error = action.payload; })
      .addCase(wsMessage, (state, action) => {
        // Разбор и валидация - в редьюсере или до него; здесь - при применении
        const commands = parseCommands(action.payload);
        if (commands) {
          state.table = [...applyCommands(state.table, commands)];
        }
      });
  },
});
```

Статус соединения - одно поле-перечисление, а не флаг `wsConnected`: три
состояния (`offline`, `connecting`, `online`) флагом не выразить, а
интерфейсу нужно показывать «подключение» отдельно от «отключено».

### Middleware

```ts
import type { Middleware } from '@reduxjs/toolkit';

export interface SocketMiddlewareOptions {
  /** Задержка перед переподключением после обрыва, мс; 0 отключает переподключение. */
  reconnectDelay?: number;
}

/**
 * Middleware владеет объектом WebSocket. Соединение открывается по wsConnect, закрывается по
 * wsDisconnect, сообщения уходят по wsSend; события сокета превращаются в действия.
 */
export function createSocketMiddleware({ reconnectDelay = 3000 }: SocketMiddlewareOptions = {}): Middleware {
  return (store) => {
    let socket: WebSocket | null = null;
    let listeners: AbortController | null = null;
    let url = '';
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;

    const connect = () => {
      store.dispatch(wsConnecting());
      socket = new WebSocket(url);
      listeners = new AbortController();
      const { signal } = listeners;

      // Обработчики назначаются один раз при создании сокета, а не на каждое действие
      socket.addEventListener('open', () => store.dispatch(wsOpen()), { signal });
      socket.addEventListener('message', (event: MessageEvent<string>) => store.dispatch(wsMessage(event.data)), { signal });
      socket.addEventListener('error', () => store.dispatch(wsError('Ошибка соединения')), { signal });
      socket.addEventListener('close', (event) => {
        store.dispatch(wsClose({ code: event.code, wasClean: event.wasClean }));
        socket = null;
        // Сюда попадает только закрытие не по команде: обрыв или штатное закрытие сервером
        if (event.code !== 1000 && reconnectDelay > 0) {
          reconnectTimer = setTimeout(connect, reconnectDelay);
        }
      }, { signal });
    };

    return (next) => (action) => {
      if (wsConnect.match(action)) {
        url = action.payload;
        if (socket === null) {
          clearTimeout(reconnectTimer); // соединение открывается сейчас, отложенная попытка не нужна
          connect();
        }
      } else if (wsDisconnect.match(action)) {
        clearTimeout(reconnectTimer);
        // Отписка до close(): события закрываемого сокета в хранилище уже не попадут
        listeners?.abort();
        socket?.close(1000, 'client disconnect');
        socket = null;
        store.dispatch(wsClose({ code: 1000, wasClean: true }));
      } else if (wsSend.match(action)) {
        if (socket?.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify(action.payload));
        }
      }
      return next(action);
    };
  };
}
```

```ts
export const store = configureStore({
  reducer: { liveTable: liveTableSlice.reducer },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(createSocketMiddleware()),
});
```

```tsx
function LiveTable() {
  const status = useAppSelector((state) => state.liveTable.status);
  const table = useAppSelector((state) => state.liveTable.table);
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(wsConnect('wss://example.com/table'));
    return () => {
      dispatch(wsDisconnect());
    };
  }, [dispatch]);

  return (
    <>
      <output>{status}</output>
      <ul>{table.map((row) => <li key={row.id}>{row.text}</li>)}</ul>
    </>
  );
}
```

Что в этой реализации существенно:

- **Обработчики назначаются при создании сокета**, внутри `connect`, а не в
  теле `(action) => …`. Назначение `socket.onmessage = …` на каждое
  действие переприсваивает обработчики сотни раз и запутывает, какой из них
  действует.
- **Все действия проходят дальше** (`return next(action)`): редьюсер
  видит и `wsConnect`, и `wsSend`, если ему это нужно (например, для
  оптимистичного отображения отправленного сообщения).
- **Отписка при `wsDisconnect`.** Обработчики снимаются через
  `AbortController` до `close()`: закрытие по команде не запускает
  переподключение, а следующий `wsConnect` сразу открывает новый сокет, не
  дожидаясь закрытия старого. Это важно и в `StrictMode`, где эффект
  компонента отправляет `wsConnect`, `wsDisconnect` и снова `wsConnect`
  подряд.
- **Несколько соединений** - несколько экземпляров middleware с разными
  наборами действий (фабрика `createSocketMiddleware(actions)`), а не один
  middleware с ветвлением.

---

## 5.7 Redux Saga и WebSocket

Сага описывает соединение как **процесс**: подключиться, читать сообщения,
после обрыва подождать и подключиться снова, по команде - остановиться.
Для событий сокета в `redux-saga` есть канал.

> 📌 **`eventChannel`** - канал `redux-saga`, который превращает внешний
> источник событий (сокет, таймер, подписку) в последовательность
> значений, читаемых сагой через `take`, как действия; функция подписки
> возвращает отписку, вызываемую при закрытии канала.

```ts
import { eventChannel, type EventChannel, type SagaIterator, type Task } from 'redux-saga';
import { call, cancel, cancelled, delay, fork, put, take } from 'redux-saga/effects';

// В канал попадает и открытие: иначе о нем пришлось бы узнавать отдельно от прочих событий
type SocketEvent =
  | { kind: 'open' }
  | { kind: 'message'; data: string }
  | { kind: 'close'; code: number; wasClean: boolean }
  | { kind: 'error' };

function openSocket(url: string): WebSocket {
  return new WebSocket(url);
}

/**
 * Превращает события сокета в канал: сага читает их через take, как действия.
 * Канал создается сразу после new WebSocket, до открытия: подписка после open теряет
 * первое сообщение сервера, а по протоколу первым приходит снимок.
 */
function createSocketChannel(socket: WebSocket): EventChannel<SocketEvent> {
  return eventChannel<SocketEvent>((emit) => {
    socket.addEventListener('open', () => emit({ kind: 'open' }));
    socket.addEventListener('message', (event: MessageEvent<string>) => emit({ kind: 'message', data: event.data }));
    socket.addEventListener('close', (event) => emit({ kind: 'close', code: event.code, wasClean: event.wasClean }));
    socket.addEventListener('error', () => emit({ kind: 'error' }));
    return () => socket.close(1000, 'channel closed'); // отписка: вызывается при channel.close()
  });
}

/** Держит соединение, пока не отменена: после обрыва ждет и подключается снова. */
// SagaIterator: результаты yield не выводятся - тип задается в объявлении переменной
export function* socketSession(url: string, reconnectDelay: number): SagaIterator {
  try {
    while (true) {
      yield put(wsConnecting());
      const socket: WebSocket = yield call(openSocket, url);
      const channel: EventChannel<SocketEvent> = yield call(createSocketChannel, socket);
      try {
        let isListening = true;
        while (isListening) {
          const event: SocketEvent = yield take(channel);
          if (event.kind === 'open') {
            yield put(wsOpen());
          } else if (event.kind === 'message') {
            yield put(wsMessage(event.data));
          } else if (event.kind === 'close') {
            yield put(wsClose({ code: event.code, wasClean: event.wasClean }));
            isListening = false; // выход во внешний цикл - переподключение
          } else {
            yield put(wsError('Ошибка соединения'));
          }
        }
      } finally {
        // Выполняется и при обрыве, и при отмене задачи: закрывает канал и сокет
        channel.close();
      }
      yield delay(reconnectDelay);
    }
  } finally {
    // Отмена задачи (wsDisconnect): сообщить о закрытии; сокет уже закрыт внутренним finally
    if (yield cancelled()) {
      yield put(wsClose({ code: 1000, wasClean: true }));
    }
  }
}

/** Watcher: wsConnect запускает сессию, wsDisconnect отменяет ее. */
export function* socketWatcher(reconnectDelay = 3000): SagaIterator {
  while (true) {
    const action: ReturnType<typeof wsConnect> = yield take(wsConnect.type);
    const task: Task = yield fork(socketSession, action.payload, reconnectDelay);
    yield take(wsDisconnect.type);
    yield cancel(task);
  }
}
```

Действия и редьюсер - те же, что в [5.6](#56-socket-middleware-для-redux);
меняется только владелец сокета.

Что здесь делает сага, а не код вокруг нее:

- **`fork` + `cancel`** - жизненный цикл соединения как задача: отмена
  раскручивает все `finally`, и канал с сокетом закрываются сами.
- **`finally` с `cancelled()`** различает штатное завершение и отмену.
- **Цикл переподключения** читается сверху вниз, без колбэков, таймеров и
  ручной отписки.

⚠️ Типизация: `SagaIterator` из `redux-saga` объявляет результат каждого
`yield` как `any` в самой библиотеке, поэтому тип задается в объявлении
переменной (`const socket: WebSocket = yield …`) и не проверяется. Строгая
типизация саг - через пакет `typed-redux-saga` с `yield*`.

### Чем подменить сервер

Проверять соединение на боевом сервере неудобно: нужны обрыв по команде,
предсказуемая последовательность сообщений и отсутствие сети в тестах.
MSW подменяет WebSocket так же, как HTTP, - и в браузере, и в jsdom:

```ts
import { ws } from 'msw';
import { setupServer } from 'msw/node';

const live = ws.link('ws://localhost/live');

// link - это адрес; обработчиком становится результат addEventListener
const handler = live.addEventListener('connection', ({ client }) => {
  client.send(JSON.stringify({ type: 'snapshot', data: [] })); // снимок при подключении
  client.addEventListener('message', (event) => {
    // разбор команд клиента: подписка, токен, ping
  });
});

const server = setupServer(handler);
```

Соединения перехватываются подменой глобального `WebSocket` в самой
странице, поэтому настоящего сокета нет: во вкладке Network браузера
кадры не появятся, а `client.close(4002)` закрывает соединение с кодом,
отличным от `1000`, - на этом проверяется переподключение.

### Где держать соединение

| | Компонент (`useEffect`) | Middleware | Saga | RTK Query (`onCacheEntryAdded`) |
| --- | --- | --- | --- | --- |
| Время жизни | Пока смонтирован компонент | Все приложение | Все приложение или до `cancel` | Пока есть подписчики на запрос |
| Кому видны данные | Поддереву компонента | Всему хранилищу | Всему хранилищу | Потребителям запроса через хук |
| Управление | Props и состояние | Действия | Действия | Автоматически по подпискам |
| Переподключение | Своими руками в обертке | Таймер и отписка | Цикл с `delay` | Своими руками внутри `onCacheEntryAdded` |
| Тестируемость | Рендер с поддельным сокетом | Хранилище с поддельным сокетом | Пошаговый прогон эффектов | Хранилище с поддельным сокетом |
| Когда | Один экран, данные нужны только ему | Данные общие; проект на Redux без саг | Проект уже на сагах; сложные сценарии (авторизация, очереди) | Данные - кеш серверного ресурса, обновляемый потоком |

Библиотека Socket.IO - отдельный протокол поверх WebSocket (с
откатом на long polling) с комнатами, подтверждениями и переподключением
«из коробки»; ее клиент требует такого же сервера и не совместим с чистым
`WebSocket`. Интеграция с React у нее та же: соединение живет в эффекте,
middleware или саге.

---

[← Протокол WebSocket и API браузера](websocket.md) · [К содержанию спринта](README.md)
