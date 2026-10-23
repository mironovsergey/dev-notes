# React

Конспект по React и его экосистеме, разбитый на спринты по программе курса
«React-разработчик»: основы библиотеки, управление состоянием, маршрутизация,
TypeScript, WebSockets, тестирование, перетаскивание и анимации. К конспекту
прилагается учебный проект «Лавка», реализованный одиннадцатью способами
([примеры](#примеры)).

Материал проверен на React 19.3 и React DOM 19.3. Значительная его часть
относится к эпохе React 17–18, поэтому API, которые с тех пор удалены или не
рекомендуются, не исключены, а оставлены с пометкой.

## Состав раздела

```
   docs/
     sprint-N/
       README.md        оглавление спринта со ссылками на каждый пункт
       <тема>.md        файл на тему, нумерация пунктов сквозная внутри спринта
   examples/
     NN-<подход>/       вариант проекта «Лавка», самостоятельный npm-проект
```

## Условные обозначения

| Знак | Смысл |
| --- | --- |
| 📌 | Определение термина |
| ✅ | Рекомендуемый подход |
| ❌ | Ошибка или антипаттерн |
| 🕰️ | Устаревшее: встречается в старом коде, в новом не используется |
| ⚠️ | Неочевидное поведение, о котором легко забыть |

---

## Программа курса

### [1. Основы React](docs/sprint-1/README.md)

Элементы, JSX, компоненты, props и состояние, хуки, события и формы, границы
ошибок, порталы и компоненты высшего порядка.

| Раздел | Содержание |
| --- | --- |
| [Основы: React, элементы, Virtual DOM и JSX](docs/sprint-1/fundamentals.md) | Что такое React, пакеты `react` и `react-dom`, корень приложения, элемент, Virtual DOM и согласование, JSX |
| [Компоненты и props](docs/sprint-1/components.md) | Функциональные и классовые компоненты, декомпозиция и композиция, props, `children`, PropTypes и TypeScript |
| [Состояние, списки и жизненный цикл](docs/sprint-1/state-and-lifecycle.md) | `useState`, неизменяемость, `setState`, ключи списков, классовые компоненты и жизненный цикл, подъем состояния, `memo` |
| [Хуки](docs/sprint-1/hooks.md) | Правила хуков, `useEffect`, `useMemo` и `useCallback`, `useRef`, `createRef` и `forwardRef` |
| [События и формы](docs/sprint-1/events-and-forms.md) | Синтетические события, всплытие и захват, обработчики, управляемые и неуправляемые поля |
| [Границы ошибок, порталы и HOC](docs/sprint-1/advanced.md) | Error boundary, `createPortal`, компоненты высшего порядка |

### [2. Управление состоянием](docs/sprint-2/README.md)

Контекст и `useReducer`, Redux и его экосистема, Effector, современные подходы
к состоянию вне программы курса (Zustand, MobX, TanStack Query, средства
React 19, данные в маршрутах).

| Раздел | Содержание |
| --- | --- |
| [Контекст и `useReducer`](docs/sprint-2/context-and-reducer.md) | Пределы проброса props, контекст и его стоимость, `useReducer`, редьюсер с контекстом как замена библиотеки |
| [Redux](docs/sprint-2/redux.md) | Три принципа, экшены и генераторы, редьюсеры и `combineReducers`, хранилище |
| [React и Redux](docs/sprint-2/react-redux.md) | `Provider`, `useSelector` и селекторы, `useDispatch`, `connect` |
| [Middleware, Redux Thunk и DevTools](docs/sprint-2/middleware-and-thunk.md) | Цепочка middleware, thunk и асинхронные действия, DevTools, формы в хранилище |
| [Redux Toolkit](docs/sprint-2/redux-toolkit.md) | `configureStore`, `createSlice` и Immer, `createAction`/`createReducer`, `createAsyncThunk` |
| [Redux Saga](docs/sprint-2/redux-saga.md) | Генераторы, worker/effects/watcher, подключение, сравнение с thunk |
| [Effector](docs/sprint-2/effector.md) | Юниты и граф, `Store`, `Effect`, `sample`, `effector-react` |
| [Zustand](docs/sprint-2/zustand.md) | Стор как хук, `set` и слияние, селекторы и перерисовки, `useShallow`, срезы, middleware (`devtools`, `persist`, `immer`), стор на экземпляр |
| [MobX](docs/sprint-2/mobx.md) | Наблюдаемое состояние и `makeAutoObservable`, `observer` и потеря наблюдаемости, реакции, `runInAction` и `flow`, корневой стор, тесты |
| [TanStack Query](docs/sprint-2/tanstack-query.md) | Серверное состояние, `useQuery` и статусы, ключи и инвалидация, мутации и оптимистичные обновления, клиент и тесты |
| [React 19: `use`, Suspense и действия](docs/sprint-2/react-async.md) | `use` и приостановка рендера, действия форм, `useActionState` и `useFormStatus`, `useOptimistic`, переходы, границы подхода |
| [Данные в маршрутах](docs/sprint-2/router-data.md) | Data-режим React Router: `createBrowserRouter`, `loader` и `action`, ошибки маршрута, `useNavigation` и `useFetcher`, отложенные данные, тесты |

### [3. Маршрутизация и безопасность](docs/sprint-3/README.md)

History API и React Router, аутентификация и защита маршрутов.

| Раздел | Содержание |
| --- | --- |
| [Маршрутизация в SPA и History API](docs/sprint-3/routing.md) | Серверная и клиентская маршрутизация, `pushState`/`popstate`, собственный маршрутизатор |
| [React Router](docs/sprint-3/react-router.md) | Режимы и версии, конфигурация и сопоставление маршрутов, навигация, параметры и `location`, хлебные крошки и 404 |
| [Безопасность: аутентификация и авторизация](docs/sprint-3/auth.md) | Идентификация/аутентификация/авторизация, JWT, сессии и cookie, хранение токена, защищенные маршруты |

### [4. TypeScript в React](docs/sprint-4/README.md)

Настройка, типизация компонентов и props, событий, хуков и Redux.

| Раздел | Содержание |
| --- | --- |
| [TypeScript в проекте React: настройка](docs/sprint-4/setup.md) | Подключение, `tsconfig.json` для React, типы `@types/react`, объявления модулей, `satisfies` |
| [Типизация компонентов и props](docs/sprint-4/components.md) | Функциональный и классовый компонент, props и размеченные объединения, props нативных элементов, события, обобщенные компоненты и `ref` |
| [Типизация хуков](docs/sprint-4/hooks.md) | `useState`, `useReducer` с проверкой полноты, `useRef`, `useContext`, пользовательские хуки, хуки React Router |
| [Типизация Redux](docs/sprint-4/redux.md) | Действия, редьюсер с `UnknownAction`, `RootState` и `AppDispatch`, thunk, типизированные хуки, Redux Toolkit |

### [5. WebSockets](docs/sprint-5/README.md)

Протокол и API браузера, протокол приложения и переподключение, соединение в
React и Redux.

| Раздел | Содержание |
| --- | --- |
| [Протокол WebSocket и API браузера](docs/sprint-5/websocket.md) | Рукопожатие и альтернативы, `readyState`, события и коды закрытия, кадры и JSON, протокол приложения, heartbeat, переподключение |
| [WebSocket в React и Redux](docs/sprint-5/websocket-react.md) | Хук `useWebSocket`, socket middleware, `eventChannel` и сага, где держать соединение |

### [6. Тестирование](docs/sprint-6/README.md)

Подходы и виды тестов, Vitest и Testing Library, заглушки и MSW, Redux,
Cypress.

| Раздел | Содержание |
| --- | --- |
| [Подходы, виды тестов и инструменты](docs/sprint-6/basics.md) | TDD/TLD/BDD, модульные, интеграционные и сквозные тесты, стенд и его настройка для Vite |
| [Тестирование компонентов](docs/sprint-6/components.md) | Testing Library и приоритет запросов, `user-event`, асинхронность, снапшоты, заглушки, `renderHook`, MSW |
| [Тестирование Redux и сквозные тесты](docs/sprint-6/redux-and-e2e.md) | Редьюсеры и селекторы, thunk с настоящим хранилищем, интеграция, Cypress, стратегия покрытия |

### [7. Drag and Drop и анимации](docs/sprint-7/README.md)

Нативный HTML5 Drag and Drop, `react-dnd` и `@dnd-kit`; анимации на CSS, React
Transition Group и Motion.

| Раздел | Содержание |
| --- | --- |
| [Drag and Drop](docs/sprint-7/drag-and-drop.md) | Нативный HTML5 DnD, `react-dnd`, `@dnd-kit`: сенсоры, доступность с клавиатуры, сортировка списков |
| [Анимации](docs/sprint-7/animations.md) | CSS и проблема выхода, React Transition Group, Motion |

## Примеры

### Варианты

| № | Каталог | Тема |
| --- | --- | --- |
| 01 | [`01-classes`](examples/01-classes/README.md) | Классовые компоненты, жизненный цикл, `createRef`, портал, граница ошибок, HOC |
| 02 | [`02-hooks`](examples/02-hooks/README.md) | Функциональные компоненты и хуки |
| 03 | [`03-context-reducer`](examples/03-context-reducer/README.md) | `useReducer` и контекст |
| 04 | [`04-redux`](examples/04-redux/README.md) | Redux, react-redux, thunk, middleware, DevTools |
| 05 | [`05-redux-toolkit`](examples/05-redux-toolkit/README.md) | Redux Toolkit |
| 06 | [`06-redux-saga`](examples/06-redux-saga/README.md) | Redux Saga |
| 07 | [`07-effector`](examples/07-effector/README.md) | Effector |
| 08 | [`08-zustand`](examples/08-zustand/README.md) | Zustand: минималистичный стор без провайдера |
| 09 | [`09-mobx`](examples/09-mobx/README.md) | MobX: изменяемое наблюдаемое состояние |
| 10 | [`10-tanstack-query`](examples/10-tanstack-query/README.md) | TanStack Query: серверное состояние, кеш, мутации |
| 11 | [`11-react-async`](examples/11-react-async/README.md) | React 19 без библиотек: `use`, Suspense, действия формы, `useOptimistic` |

### Спецификация

#### Каталог

- Список товаров с картинкой, названием, категорией, ценой и остатком на складе.
- Фильтр по категории и поиск по названию (без учета регистра).
- Кнопка «В корзину»; товар с нулевым остатком добавить нельзя, у товара в
  корзине кнопка показывает количество.

#### Корзина

- Позиции с количеством: `+`, `−`, «Удалить»; количество не превышает остаток.
- «Отложить» переносит позицию в список отложенных с сохранением количества;
  «Вернуть» - обратно. Отложенные в расчете не участвуют.
- Форма промокода: ввод, отправка, асинхронная проверка на сервере, сообщение
  об ошибке (нет такого кода, код истек, не достигнут порог) или об успехе;
  промокод можно снять.
- Выбор способа доставки (самовывоз, курьер, почта).
- Итоги: подытог, каждая скидка отдельной строкой, доставка, итого.
- «Оформить заказ» открывает окно с формой (имя, телефон, адрес); после
  отправки показывается номер заказа, корзина очищается.

#### Правила расчета

Реализованы в `src/domain/pricing.ts` функцией
`calculateTotals(lines, promo, delivery)` и проверены тестами
`src/domain/pricing.test.ts`; операции над позициями корзины - тестами
`src/domain/cart.test.ts`.

| Правило | Значение |
| --- | --- |
| Скидка за количество | Позиция с количеством от 3 - минус 5 % от стоимости позиции (округление вниз) |
| Промокод в процентах | `SALE10` - минус 10 % от подытога после скидки за количество |
| Промокод фиксированный | `MINUS500` - минус 500 ₽, не больше оставшейся суммы; порог 2000 ₽ |
| Промокод на доставку | `FREESHIP` - доставка 0 ₽; порог 1000 ₽ |
| Истекший промокод | `SUMMER2022` - сервер отвечает 410 |
| Порог промокода | Сравнивается с подытогом до скидок; ниже порога код не применяется |
| Доставка | Самовывоз 0 ₽; курьер 300 ₽, бесплатно от 3000 ₽ после скидок; почта 200 ₽ |
| Пустая корзина | Доставка 0 ₽, итого 0 ₽ |

#### Mock-API

Обработчики MSW в `src/mocks/handlers.ts`; в разработке они работают через
service worker (`mocks/browser`), в тестах - через `msw/node` (`mocks/node`).

| Запрос | Ответ |
| --- | --- |
| `GET /api/products` | `Product[]` |
| `POST /api/promo/validate` `{ code }` | `200 Promo`, `404 { message }` для неизвестного кода, `410 { message }` для истекшего |
| `POST /api/orders` `OrderRequest` | `201 Order` с номером и суммой; `400` для пустой корзины |

Задержка ответов - 300 мс в разработке, 0 в тестах.

### Состав варианта

Все, что не зависит от способа реализации, - предметная модель, правила
расчета, фикстуры, mock-API и стили - лежит в каждом варианте в одних и тех
же каталогах; варианты различаются только интерфейсом и управлением
состоянием.

```
   src/
     domain/            предметный слой, точка входа - index.ts
       types.ts         предметная модель
       pricing.ts       правила расчета, DELIVERY_OPTIONS, formatPrice
       cart.ts          операции над позициями корзины: toCartLines, withQty, withoutItem, countItems
       catalog.ts       отбор товаров: filterProducts, CatalogFilter
       format.ts        pluralize для подписей интерфейса
       validators.ts    проверки формы данных на границе с сетью
       api.ts           клиент API: fetchProducts, validatePromo, createOrder, errorMessage
       fixtures/        товары и промокоды
     assets/products/   картинки товаров (SVG); фикстуры получают их URL через
                        new URL(..., import.meta.url), который Vite превращает в ссылку на ресурс
     mocks/             обработчики MSW, worker для браузера и server для тестов
     styles/            стили по БЭМ: токены, база, по файлу на блок
```

В варианте 11 модуля `cart.ts` нет: корзина там хранит сами товары и
обходится собственными операциями в `src/model/cart-reducer.ts`.
