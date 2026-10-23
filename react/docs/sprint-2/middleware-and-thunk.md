# Middleware, Redux Thunk и DevTools

## 2.14 Middleware

> 📌 **Middleware** в Redux - функция, встроенная между `dispatch` и
> редьюсером: она получает каждое отправленное действие, может выполнить
> побочный эффект, изменить, задержать или отбросить действие, и передает
> его дальше вызовом `next(action)`.

Сигнатура - три вложенные функции:

```js
const logger = (storeApi) => (next) => (action) => {
  console.log('до редьюсера:', action.type, storeApi.getState());
  const result = next(action); // передать действие следующему middleware или редьюсеру
  console.log('после редьюсера:', storeApi.getState());
  return result;
};
```

- `storeApi` - объект с `getState` и `dispatch` хранилища (не само
  хранилище: `subscribe` там нет).
- `next` - следующий шаг цепочки: очередное middleware или сам редьюсер.
- `action` - отправленное действие. Не обязательно объект: до middleware
  доходит все, что передали в `dispatch`, - на этом построен thunk.

`dispatch` возвращает то, что вернуло первое middleware цепочки: обычно
это результат `next(action)`, а последнее звено, `dispatch` хранилища,
возвращает само действие.

### Цепочка

```
   store.dispatch(action)
          │
          ▼
   ┌─ middleware 1 ─────────────────────────────────────┐
   │  до            next(action)             после      │
   │   │      ┌─ middleware 2 ────────────┐    ▲        │
   │   └────► │ до    next(action)  после │────┘        │
   │          │  │   ┌─ reducer ─┐   ▲    │             │
   │          │  └─► │ new state │───┘    │             │
   │          │      └───────────┘        │             │
   │          └───────────────────────────┘             │
   └────────────────────────────────────────────────────┘
```

Если два middleware пишут в лог до и после `next`, порядок записей такой:
`first: до, second: до, reducer, second: после, first: после`. Код до
`next` выполняется в порядке подключения, код после - в обратном, как у
вложенных вызовов функций.

Middleware может **не вызвать `next`** - тогда действие до редьюсера не
дойдет. Может вызвать `storeApi.dispatch(другое действие)` - оно пройдет
всю цепочку с начала.

### Подключение

```js
import { legacy_createStore as createStore, applyMiddleware } from 'redux';

const store = createStore(rootReducer, applyMiddleware(logger, errorReporter));
```

> 📌 **Расширитель хранилища (store enhancer)** - функция высшего порядка,
> принимающая `createStore` и возвращающая его улучшенную версию.
> `applyMiddleware(...middlewares)` - расширитель, который оборачивает
> `dispatch` цепочкой middleware.

Несколько расширителей объединяются `compose(enhancerA, enhancerB)` -
применяются справа налево. В Redux Toolkit все это скрыто за
`configureStore({ middleware })` ([2.18](redux-toolkit.md#218-зачем-redux-toolkit-configurestore)).

Типичные middleware: логирование (`redux-logger`), асинхронные операции
(thunk, saga), проверки в разработке (Toolkit: неизменяемость,
сериализуемость), отправка действий в аналитику, сохранение состояния в
`localStorage`, WebSocket ([5.6](../sprint-5/websocket-react.md#56-socket-middleware-для-redux)).

---

## 2.15 Redux Thunk

Без middleware `dispatch` принимает только простые объекты:
`store.dispatch(() => {})` бросает `Actions must be plain objects. Instead,
the actual type was: 'function'`.

> 📌 **Thunk** - функция, которая откладывает вычисление: вместо значения
> возвращается функция, вычисляющая его позже. В Redux **thunk** -
> функция вида `(dispatch, getState, extraArgument) => …`, которую можно
> отправить в `dispatch` вместо объекта действия.

> 📌 **Redux Thunk** - middleware, которое перехватывает функции в
> `dispatch`, вызывает их с `dispatch`, `getState` и дополнительным
> аргументом и возвращает результат вызова; объекты пропускает дальше.

Вся библиотека - десяток строк:

```js
function createThunkMiddleware(extraArgument) {
  return ({ dispatch, getState }) => (next) => (action) => {
    if (typeof action === 'function') {
      // Функция не идет к редьюсеру: она вызывается здесь и сама решает, что отправлять
      return action(dispatch, getState, extraArgument);
    }
    return next(action);
  };
}

export const thunk = createThunkMiddleware();
export const withExtraArgument = createThunkMiddleware;
```

⚠️ `redux-thunk` 3 (2023) экспортирует только именованные `thunk` и
`withExtraArgument`; 🕰️ `import thunk from 'redux-thunk'` - API версий 1–2,
в версии 3 default-экспорта нет.

### Асинхронное действие

Запрос к серверу описывается тремя действиями - начало, успех, ошибка - и
одной функцией, которая их отправляет по ходу запроса:

```js
const GET_FEED = 'feed/request';
const GET_FEED_SUCCESS = 'feed/success';
const GET_FEED_FAILED = 'feed/failed';

/** Thunk: функция вместо объекта; получает dispatch, getState и extraArgument (здесь api). */
export function getFeed() {
  return async function (dispatch, getState, api) {
    dispatch({ type: GET_FEED });
    try {
      const data = await api.fetchFeed();
      dispatch({ type: GET_FEED_SUCCESS, payload: data });
    } catch {
      dispatch({ type: GET_FEED_FAILED });
    }
  };
}
```

```js
const initialState = { feedRequest: false, feedFailed: false, feed: [] };

export function feedReducer(state = initialState, action) {
  switch (action.type) {
    case GET_FEED:
      // Запрос начался: показать индикатор, сбросить ошибку прошлой попытки
      return { ...state, feedRequest: true, feedFailed: false };
    case GET_FEED_SUCCESS:
      return { ...state, feedRequest: false, feed: action.payload };
    case GET_FEED_FAILED:
      return { ...state, feedRequest: false, feedFailed: true };
    default:
      return state;
  }
}
```

```js
import { legacy_createStore as createStore, applyMiddleware } from 'redux';
import { withExtraArgument } from 'redux-thunk';

const api = { fetchFeed: () => fetch('/feed').then((res) => res.json()) };
const store = createStore(feedReducer, applyMiddleware(withExtraArgument(api)));

await store.dispatch(getFeed()); // dispatch вернул промис из thunk - его можно ждать
```

### Что дает thunk

- **Логика вне компонента.** Компонент отправляет `getFeed()` и не знает
  ни URL, ни формы ответа.
- **`getState` внутри.** Thunk читает актуальное состояние: проверить кеш,
  взять токен, собрать тело запроса.
- **Возвращаемое значение.** `dispatch(thunk)` возвращает то, что вернул
  thunk - обычно промис, который компонент может дождаться, чтобы закрыть
  форму или перейти на другую страницу.
- **`extraArgument`.** Место для зависимостей (API-клиент), которые в тестах
  заменяются заглушками - без моков `fetch`.

Три действия на запрос - шаблон, который Redux Toolkit сводит к одному вызову
`createAsyncThunk` ([2.21](redux-toolkit.md#221-createasyncthunk)); в
`configureStore` thunk включен по умолчанию.

⚠️ Thunk не отменяет запросы и не защищает от гонки: два быстрых
`dispatch(getFeed())` - два запроса, побеждает пришедший последним. Для
отмены нужны `AbortController` внутри thunk или `takeLatest` из redux-saga
([2.23](redux-saga.md#223-саги-worker-effects-watcher)); не запускать
повторный запрос, пока идет первый, позволяет `condition` в
`createAsyncThunk` ([2.21](redux-toolkit.md#221-createasyncthunk)).

---

## 2.16 Redux DevTools

> 📌 **Redux DevTools** - расширение браузера, которое показывает историю
> действий и состояние после каждого из них, позволяет откатывать действия
> и воспроизводить их («путешествие во времени»), а также сохранять и
> импортировать сессии.

Возможно это только потому, что состояние неизменяемо, а действия
сериализуемы: расширение хранит снимки состояния и переигрывает историю
через те же редьюсеры.

🕰️ Подключение в чистом Redux - через расширитель, который расширение
кладет в `window`:

```js
import { legacy_createStore as createStore, applyMiddleware, compose } from 'redux';
import { thunk } from 'redux-thunk';

// Если расширение установлено, его compose обернет расширители; иначе обычный compose
const composeEnhancers =
  typeof window === 'object' && window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__
    ? window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__({})
    : compose;

const store = createStore(rootReducer, composeEnhancers(applyMiddleware(thunk)));
```

Проверка `typeof window === 'object'` нужна для серверного рендера и
тестов в Node без jsdom, где `window` нет; без установленного расширения
выбирается обычный `compose`. 🕰️ Пакет `redux-devtools-extension` с функцией
`composeWithDevTools` не поддерживается; его преемник -
`@redux-devtools/extension`.

✅ В Redux Toolkit ничего из этого не нужно: `configureStore` подключает
DevTools автоматически (опция `devTools: false` отключает, например в
production) - [2.18](redux-toolkit.md#218-зачем-redux-toolkit-configurestore).

---

## 2.17 Формы в Redux

Форму можно хранить целиком в Redux: каждое поле - в состоянии, каждый ввод -
действие `SET_VALUE`. Прием встречается в проектах, и его полезно уметь
читать, но сначала - когда он оправдан.

### Стоит ли хранить форму в хранилище

Руководство по стилю Redux прямо говорит: **не хранить состояние формы в
Redux** без необходимости. Причины:

- Каждый символ - действие в истории и рендер всех подписчиков среза; в
  DevTools тысячи `SET_VALUE`.
- Значения полей нужны одному компоненту до момента отправки - это
  локальное состояние ([1.26](../sprint-1/events-and-forms.md#126-управляемые-и-неуправляемые-элементы-форм)).
- Валидация «на лету» проще рядом с полем, чем через селекторы.

Когда хранить все же нужно: черновик должен пережить переход между
страницами или перезагрузку; форма многошаговая и шаги - разные
компоненты; несколько компонентов показывают вводимые данные одновременно.
Даже тогда чаще хранят не поля, а **результат** отправки (статус запроса,
ошибка сервера) - и это как раз то, что в Redux уместно.

### Реализация формы в хранилище

```js
const SET_VALUE = 'registration/setValue';
const SUBMIT = 'registration/submit';
const SUBMIT_SUCCESS = 'registration/submitSuccess';
const SUBMIT_FAILED = 'registration/submitFailed';

export const setFormValue = (field, value) => ({ type: SET_VALUE, payload: { field, value } });

export const register = () => async (dispatch, getState, api) => {
  dispatch({ type: SUBMIT });
  try {
    // Тело запроса берется из хранилища: thunk видит актуальное состояние
    await api.register(getState().registration.form);
    dispatch({ type: SUBMIT_SUCCESS });
  } catch {
    dispatch({ type: SUBMIT_FAILED });
  }
};

const initialState = {
  form: { name: '', surname: '', numberOfPets: '', extraSocket: false, ownRack: false },
  registrationRequest: false,
  registrationFailed: false,
};

export function registrationReducer(state = initialState, action) {
  switch (action.type) {
    case SET_VALUE:
      // ...state обязателен: без него исчезают registrationRequest и registrationFailed
      return { ...state, form: { ...state.form, [action.payload.field]: action.payload.value } };
    case SUBMIT:
      return { ...state, registrationRequest: true, registrationFailed: false };
    case SUBMIT_SUCCESS:
      return { ...state, registrationRequest: false, form: initialState.form };
    case SUBMIT_FAILED:
      return { ...state, registrationRequest: false, registrationFailed: true };
    default:
      return state;
  }
}
```

```jsx
export function Registration() {
  const form = useSelector((state) => state.registration.form);
  const registrationRequest = useSelector((state) => state.registration.registrationRequest);
  const dispatch = useDispatch();

  const handleChange = (e) => {
    const { name, type, value, checked } = e.target;
    dispatch(setFormValue(name, type === 'checkbox' ? checked : value));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(register());
  };

  return (
    <form onSubmit={handleSubmit}>
      <label>Имя<input name="name" value={form.name} onChange={handleChange} /></label>
      <label>Фамилия<input name="surname" value={form.surname} onChange={handleChange} /></label>
      <label>Количество питомцев<input name="numberOfPets" type="number" min="1" value={form.numberOfPets} onChange={handleChange} /></label>
      <label>Нужна розетка<input name="extraSocket" type="checkbox" checked={form.extraSocket} onChange={handleChange} /></label>
      <label>Свой стеллаж<input name="ownRack" type="checkbox" checked={form.ownRack} onChange={handleChange} /></label>
      <button type="submit" disabled={registrationRequest}>Зарегистрироваться</button>
    </form>
  );
}
```

На что обратить внимание в такой реализации:

- В `SET_VALUE` обязателен `...state`: редьюсер, возвращающий только
  `{ form: {…} }`, теряет `registrationRequest` и `registrationFailed` из
  среза после первого же ввода.
- Чекбокс управляется `checked`, а не `value`
  ([1.27](../sprint-1/events-and-forms.md#127-типы-полей-и-отправка-формы)).
- Числовое поле инициализируется пустой строкой, а не `null`: с
  `value={null}` поле считается неуправляемым, React предупреждает об этом
  сразу, а при первом вводе - о переключении в управляемый режим.
- Тип поля определяется по `type === 'checkbox'`, а не по списку имен полей,
  иначе каждый новый чекбокс требует правки обработчика.

---

[← React и Redux](react-redux.md) · [К содержанию спринта](README.md) ·
[Далее: Redux Toolkit →](redux-toolkit.md)
