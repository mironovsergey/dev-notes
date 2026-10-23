# 5 WebSockets

## Содержание

### [Протокол WebSocket и API браузера](websocket.md)

- [5.1 Что такое WebSocket](websocket.md#51-что-такое-websocket)
  - [Рукопожатие](websocket.md#рукопожатие)
  - [Место среди альтернатив](websocket.md#место-среди-альтернатив)
- [5.2 Объект `WebSocket`: состояния, события, закрытие](websocket.md#52-объект-websocket-состояния-события-закрытие)
  - [`readyState`](websocket.md#readystate)
  - [События](websocket.md#события)
  - [Закрытие](websocket.md#закрытие)
- [5.3 Данные: кадры, текст, JSON, бинарные сообщения](websocket.md#53-данные-кадры-текст-json-бинарные-сообщения)
  - [Отправка](websocket.md#отправка)
  - [Получение](websocket.md#получение)
  - [Heartbeat](websocket.md#heartbeat)
- [5.4 Протокол приложения и переподключение](websocket.md#54-протокол-приложения-и-переподключение)
  - [Пример: живая таблица](websocket.md#пример-живая-таблица)
  - [Правила проектирования](websocket.md#правила-проектирования)
  - [Аутентификация](websocket.md#аутентификация)
  - [Переподключение](websocket.md#переподключение)

### [WebSocket в React и Redux](websocket-react.md)

- [5.5 WebSocket в компоненте](websocket-react.md#55-websocket-в-компоненте)
- [5.6 Socket middleware для Redux](websocket-react.md#56-socket-middleware-для-redux)
  - [Действия](websocket-react.md#действия)
  - [Редьюсер](websocket-react.md#редьюсер)
  - [Middleware](websocket-react.md#middleware)
- [5.7 Redux Saga и WebSocket](websocket-react.md#57-redux-saga-и-websocket)
  - [Чем подменить сервер](websocket-react.md#чем-подменить-сервер)
  - [Где держать соединение](websocket-react.md#где-держать-соединение)
