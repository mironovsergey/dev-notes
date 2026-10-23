# Redux Saga

## 2.22 Генераторы

> 📌 **Генератор** - функция, объявленная через `function*`, выполнение
> которой можно приостановить оператором `yield` и позже возобновить с того
> же места; вызов генератора не выполняет тело, а возвращает объект-итератор
> с методом `next()`.

```js
function* generator(i) {
  console.log('start');
  yield i + 2;
  console.log('after first yield');
  yield i + 10;
  return 'end';
}

const it = generator(10);
it.next(); // печатает start;             → { value: 12, done: false }
it.next(); // печатает after first yield; → { value: 20, done: false }
it.next(); //                             → { value: 'end', done: true }
```

Каждый `next()` выполняет код до следующего `yield` и возвращает
`{ value, done }`: `value` - то, что стоит после `yield`, `done: false`.
Когда тело завершилось, `done: true`, а `value` - результат `return`.
Локальные переменные между вызовами сохраняются - генератор помнит, где
остановился.

### Передача значений внутрь

`next(arg)` передает аргумент **внутрь** генератора: он становится
результатом выражения `yield`, на котором генератор стоял.

```js
function* dialog() {
  const name = yield 'Как вас зовут?';
  const age = yield `Привет, ${name}! Сколько вам лет?`;
  return `${name}, ${age}`;
}

const it = dialog();
it.next().value;        // 'Как вас зовут?'
it.next('Анна').value;  // 'Привет, Анна! Сколько вам лет?'
it.next(30);            // { value: 'Анна, 30', done: true }
```

Так генератор становится двусторонним каналом: наружу - «что мне нужно»,
внутрь - «вот результат». Метод `it.throw(error)` бросает исключение в
точке `yield`, и его ловит `try/catch` внутри генератора.

### Генератор и промисы

Если генератор отдает промисы, внешний код может дождаться каждого и
вернуть результат внутрь. Такой «раннер» - десяток строк:

```js
/**
 * Запускает генератор, который отдает промисы: результат каждого промиса
 * возвращается в генератор через next(), ошибка - через throw().
 * Так устроен redux-saga; так работал бы async/await, написанный руками.
 */
function run(generatorFn, ...args) {
  const it = generatorFn(...args);
  return new Promise((resolve, reject) => {
    function step(result) {
      if (result.done) {
        resolve(result.value);
        return;
      }
      Promise.resolve(result.value).then(
        (value) => step(it.next(value)),
        (error) => step(it.throw(error))
      );
    }
    step(it.next());
  });
}

function* getRings(url) {
  try {
    const response = yield fetch(url);   // yield вместо await
    const data = yield response.json();
    return data.rings;
  } catch {
    return 0;
  }
}

await run(getRings, '/rings');
```

Если `fetch` отклонит промис, раннер передаст ошибку через `throw()`,
генератор поймает ее в `catch` и вернет `0`. Это и есть модель
redux-saga: код саги синхронен на вид, а асинхронность обеспечивает
middleware, вызывающее `next()`.

### Бесконечный генератор

```js
function* createNewRing() {
  let num = 1;
  while (true) {
    yield `ring #${num}`;
    num += 1;
  }
}

const ringMaker = createNewRing();
ringMaker.next().value; // 'ring #1'
ringMaker.next().value; // 'ring #2'
```

`while (true)` не зависает: тело выполняется только до очередного `yield`
и только по запросу. Так пишутся саги-наблюдатели, которые ждут действия
бесконечно.

---

## 2.23 Саги: worker, effects, watcher

> 📌 **Сага** - функция-генератор, которая описывает побочные эффекты как
> последовательность объектов-инструкций (эффектов), отдаваемых через
> `yield`; выполняет инструкции middleware redux-saga, возвращая результат
> в генератор.

Три роли:

| Роль | Что делает |
| --- | --- |
| **Worker** | Выполняет одну операцию: запрос, серию `put`, ожидание |
| **Effect** | Объект-инструкция: «вызови функцию», «отправь действие», «дождись действия» |
| **Watcher** | Бесконечно ждет действия определенного типа и запускает worker |

### Worker

Для сравнения - та же загрузка в виде thunk
([2.15](middleware-and-thunk.md#215-redux-thunk)) и в виде саги:

```js
// thunk: функция сама вызывает API и dispatch
export const getItems = () => async (dispatch, getState, api) => {
  dispatch(getItemsRequest());
  try {
    const { data } = await api.getItems();
    dispatch(getItemsSuccess(data));
  } catch (e) {
    dispatch(getItemsFailed(e.message));
  }
};
```

```js
import { call, put, takeEvery } from 'redux-saga/effects';

/** Worker: описывает шаги эффектами; сам ничего не вызывает. */
function* getItemsWorker(api) {
  try {
    const { data } = yield call(api.getItems);
    yield put(getItemsSuccess(data));
  } catch (e) {
    yield put(getItemsFailed(e.message));
  }
}
```

`call(fn, ...args)` не вызывает `fn` - он возвращает **описание** вызова,
простой объект: первый `next()` воркера дает
`{ '@@redux-saga/IO': true, type: 'CALL', payload: { fn, args: [] } }`
(служебные поля опущены). Middleware читает описание, вызывает `fn`,
дожидается промиса и передает результат обратно через `next(result)`.
`put(action)` - описание `dispatch(action)`.

Отсюда главное свойство саг - **тестируемость без хранилища и без моков**:
воркер прогоняется вручную как итератор.

```js
const it = getItemsWorker(api);
expect(it.next().value).toEqual(call(api.getItems));                        // шаг 1: запрос
expect(it.next({ data: [1, 2] }).value).toEqual(put(getItemsSuccess([1, 2]))); // шаг 2: успех
expect(it.next().done).toBe(true);

const failing = getItemsWorker(api);
failing.next();
expect(failing.throw(new Error('500')).value).toEqual(put(getItemsFailed('500'))); // ветка ошибки
```

`api.getItems` при этом не вызывается ни разу: тест сверяет только описания
эффектов.

### Эффекты

| Эффект | Описание |
| --- | --- |
| `call(fn, ...args)` | Вызвать функцию, дождаться результата (промис - дождаться разрешения) |
| `put(action)` | Отправить действие в хранилище |
| `select(selector)` | Прочитать состояние: `yield select((s) => s.items.status)` |
| `take(type)` | Дождаться одного действия указанного типа |
| `takeEvery(type, worker, ...args)` | На **каждое** действие запускать worker; параллельные запуски допускаются |
| `takeLatest(type, worker, ...args)` | Запускать worker, **отменяя** предыдущий незавершенный |
| `fork(fn)` | Запустить сагу параллельно, не дожидаясь |
| `all([...])` | Запустить несколько эффектов параллельно и дождаться всех |
| `delay(ms)` | Пауза |
| `race({...})` | Первый завершившийся из нескольких |

`takeLatest` - решение гонки запросов, которого нет у thunk: новое действие
отменяет незавершенный воркер, и в состояние попадает результат только
последнего запроса. Сам сетевой запрос при этом не прерывается: отменяется
сага, а не `fetch`.

### Watcher

```js
/** Watcher: на каждый getItemsRequest запускает worker с аргументом api. */
function* getItemsWatcher(api) {
  yield takeEvery(getItemsRequest.type, getItemsWorker, api);
}
```

`takeEvery` внутри - бесконечный цикл `while (true) { const action = yield
take(type); yield fork(worker, ...args, action); }`. Воркер получает
действие последним аргументом - оттуда берется `payload`.

Компонент теперь отправляет обычное действие `dispatch(getItemsRequest())`
и не знает о существовании саги. В этом отличие от thunk: там компонент
отправляет функцию, и по коду видно, что за ней стоит запрос; здесь -
данные, а связь «действие → эффект» описана в одном месте, в watcher.

---

## 2.24 Подключение и сравнение с thunk

```js
import { configureStore } from '@reduxjs/toolkit';
import createSagaMiddleware from 'redux-saga';
import { all } from 'redux-saga/effects';

import itemsReducer from './items-slice';
import { getItemsWatcher } from './items-sagas';
import { authWatcher } from './auth-sagas';

/** Корневая сага запускает всех наблюдателей параллельно. */
function* rootSaga(api) {
  yield all([getItemsWatcher(api), authWatcher(api)]);
}

const sagaMiddleware = createSagaMiddleware();

export const store = configureStore({
  reducer: { items: itemsReducer },
  // thunk отключается, если саги берут все побочные эффекты на себя
  middleware: (getDefaultMiddleware) => getDefaultMiddleware({ thunk: false }).concat(sagaMiddleware),
});

// run обязателен: без него наблюдатели не стартуют, и действия уходят в пустоту
sagaMiddleware.run(rootSaga, api);
```

🕰️ Подключение через `createStore(rootReducer,
composeEnhancers(applyMiddleware(sagaMiddleware)))` работает, но
`configureStore` короче и добавляет DevTools и проверки
([2.18](redux-toolkit.md#218-зачем-redux-toolkit-configurestore)).

⚠️ В `all` передаются **вызванные** генераторы (`getItemsWatcher(api)`), а
не ссылки на функции: `yield all([getItemsWatcher, authWatcher])` без
вызова ничего не запускает.

### Thunk против saga

| | Redux Thunk | Redux Saga |
| --- | --- | --- |
| Единица логики | Функция `(dispatch, getState) => …` | Генератор с эффектами |
| Кто выполняет побочный эффект | Сам thunk | Middleware по описанию |
| Тестирование | Моки `dispatch`/API или заглушка через `extraArgument` | Пошаговый прогон итератора без моков |
| Отмена, гонки | Вручную: `AbortController`, флаги | `takeLatest`, `cancel`, `race` |
| Сложные сценарии (последовательности действий, опрос, WebSocket) | Разрастаются в промисы и колбэки | Естественны: `take`, `fork`, каналы |
| Порог входа | Низкий | Генераторы и словарь эффектов |
| Размер | Десяток строк | Отдельная библиотека |
| Статус | ✅ Включен в RTK, основной инструмент | Поддерживается; для новых проектов RTK рекомендует thunk, `createAsyncThunk`, RTK Query и `createListenerMiddleware` |

Саги оправданы там, где логика - это **процессы**, а не одиночные запросы:
авторизация с обновлением токена, синхронизация через WebSocket
([5.7](../sprint-5/websocket-react.md#57-redux-saga-и-websocket)), пошаговые сценарии, отмена по действию пользователя. Для
загрузки данных по действию `createAsyncThunk` короче и не требует
изучения генераторов.

---

[← Redux Toolkit](redux-toolkit.md) · [К содержанию спринта](README.md) ·
[Далее: Effector →](effector.md)
