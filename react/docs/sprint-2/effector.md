# Effector

## 2.25 Идея Effector: юниты и граф

> 📌 **Effector** - библиотека управления состоянием, в которой приложение
> описывается набором независимых юнитов - событий, сторов и эффектов, - а
> связи между ними образуют граф; обновление распространяется по графу
> детерминированно, в порядке, который задает ядро библиотеки.

Отличие от Redux - **много сторов вместо одного** (multi-store). Каждый стор
хранит одно значение и обновляется от своих событий; изменение одного стора
не касается других и не перерендеривает их подписчиков. Отличие от контекста
React - сторы живут вне дерева компонентов и не зависят от него.

> 📌 **Юнит (unit)** - базовая единица модели Effector; видов пять: `Event`
> (сигнал), `Store` (значение), `Effect` (асинхронная операция с событиями
> жизненного цикла), `Domain` (пространство имен для группы юнитов),
> `Scope` (изолированная копия состояния всех сторов).

| Юнит | Создание | Роль | Аналог в Redux |
| --- | --- | --- | --- |
| `Event` | `createEvent()` | Намерение или факт: «нажали кнопку», «пришли данные» | Действие + генератор |
| `Store` | `createStore(initial)` | Неизменяемое значение, обновляемое по событиям | Срез состояния |
| `Effect` | `createEffect(handler)` | Асинхронная функция с событиями `done` и `fail` и стором `pending` | Thunk / `createAsyncThunk` |
| `Domain` | `createDomain()` | Группировка юнитов: общие хуки, логирование | - |
| `Scope` | `fork()` | Изолированное состояние всех сторов: SSR, тесты | - |

```
   событие ──► стор ──► компонент
      │          │
      ▼          ▼
   эффект ──► событие doneData ──► другой стор ──► другой компонент
```

Соглашение об именах: сторы - с префиксом `$` (`$cart`), эффекты - с
суффиксом `Fx` (`getQuoteFx`). Оно позволяет по имени видеть вид юнита.

**Событие** - вызываемая функция; аргумент становится данными события:

```js
import { createEvent } from 'effector';

const addToCart = createEvent();
addToCart(35); // событие произошло с данными 35
```

Событие не хранит значение и ничего не делает само - оно лишь сигнал, на
который могут быть подписаны сторы, эффекты и `watch`.

---

## 2.26 `Store`: `on`, `reset`, `watch`, `combine`, `merge`

> 📌 **Стор** - юнит, хранящий одно неизменяемое значение; обновляется
> редьюсером `(state, payload) => newState`, привязанным к событию через
> `on`, и уведомляет подписчиков, если новое значение отличается от
> текущего.

```js
import { createEvent, createStore } from 'effector';

const update = createEvent();
const clear = createEvent();

const $store = createStore(0)
  .on(update, (state, value) => state + value) // trigger + редьюсер
  .reset(clear);                                // вернуть начальное значение

$store.watch((state) => console.log('state:', state));

update(1); // state: 1
update(2); // state: 3
clear();   // state: 0
```

| Метод | Что делает |
| --- | --- |
| `.on(trigger, reducer)` | Подписка: при срабатывании `trigger` (событие, эффект или другой стор) значение заменяется результатом `reducer(state, payload)` |
| `.reset(trigger, …)` | При срабатывании - вернуть начальное значение |
| `.watch(fn)` | Побочный эффект на каждое значение, **включая текущее при подписке** |
| `.updates` | Событие, срабатывающее только на изменения; `.updates.watch` пропускает начальное значение |
| `.getState()` | Прочитать значение вне React; в компонентах - только через хуки |
| `.map(fn)` | Производный стор |

Редьюсер в `on` - чистая функция, возвращающая **новое** значение; мутация
объекта состояния - та же ошибка, что в Redux
([2.8](redux.md#28-редьюсеры-и-combinereducers)). Запись
`(state) => (state += 1)` работает лишь потому, что для числа `+=` создает
новое значение; правильная форма - `(state) => state + 1`.

Два случая, когда стор **не обновляется**: редьюсер вернул то же значение
(сравнение `===`) или вернул `undefined`. ⚠️ Пропуск
`undefined` в effector 23 объявлен устаревшим и в разработке пишет в консоль
`undefined is used to skip updates. To allow undefined as a value provide
explicit { skipVoid: false } option`; в следующей мажорной версии
`undefined` станет обычным значением.

### `combine`

> 📌 **`combine`** - создает производный стор, значение которого вычисляется
> из нескольких сторов и пересчитывается при изменении любого из них.

```js
import { combine, createStore } from 'effector';

const $firstName = createStore('Keanu');
const $lastName = createStore('Reeves');

const $fullName = combine($firstName, $lastName, (first, last) => `${first} ${last}`);
const $user = combine({ fullName: $fullName, firstName: $firstName, lastName: $lastName });

$user.getState(); // { fullName: 'Keanu Reeves', firstName: 'Keanu', lastName: 'Reeves' }
```

Производные данные не хранятся отдельно и не могут разойтись с
источником - тот же принцип, что «минимальное состояние» в React
([1.17](../sprint-1/state-and-lifecycle.md#117-подъем-состояния)).

### `merge`

`merge([eventA, eventB])` возвращает событие, срабатывающее при любом из
переданных. Полезно, когда стор должен одинаково реагировать на
несколько сигналов: `.reset(merge([logout, sessionExpired]))`.

---

## 2.27 `Effect`: жизненный цикл запроса, `attach`

> 📌 **Эффект** - юнит-обертка над асинхронной функцией: вызывается как
> функция, возвращает промис и порождает события о ходе выполнения -
> `done`, `doneData`, `fail`, `failData`, `finally`, - а также сторы
> `pending` и `inFlight`.

```js
import { createEffect, createStore } from 'effector';

const getQuoteFx = createEffect(async () => {
  const response = await fetch('https://api.kanye.rest');
  return response.json();
});

// Стор подписывается на успешный результат эффекта
const $quote = createStore(null).on(getQuoteFx.doneData, (_, data) => data.quote);
const $error = createStore(null).on(getQuoteFx.failData, (_, error) => error.message);

getQuoteFx.fail.watch(() => console.log('При получении данных произошла ошибка'));
```

| Поле | Тип | Когда |
| --- | --- | --- |
| `done` | Event `{ params, result }` | Успех; с параметрами вызова |
| `doneData` | Event `result` | Успех; только результат |
| `fail` | Event `{ params, error }` | Ошибка; с параметрами |
| `failData` | Event `error` | Ошибка; только ошибка |
| `finally` | Event `{ status, params, result \| error }` | В любом случае |
| `pending` | Store `boolean` | `true`, пока выполняется хотя бы один вызов |
| `inFlight` | Store `number` | Число незавершенных вызовов |

Состояние загрузки **не хранится отдельным стором** - `pending` уже есть у
эффекта. Отдельный `$isLoading.on(getQuoteFx.pending, …)` дублирует то, что
дает `useUnit(getQuoteFx.pending)`.

### `attach`

> 📌 **`attach`** - создает новый эффект на основе существующего, добавляя
> к его параметрам данные из стора и/или преобразуя параметры.

```js
import { attach, createEffect, createStore } from 'effector';

const $baseUrl = createStore('https://pokeapi.co/api/v2/');

const requestFx = createEffect(async (url) => {
  const res = await fetch(url);
  return res.json();
});

// Новый эффект принимает id, а к requestFx уходит полный URL
const fetchPokemonByIdFx = attach({
  effect: requestFx,
  source: $baseUrl,
  mapParams: (id, baseUrl) => `${baseUrl}pokemon/${id}`,
});

fetchPokemonByIdFx(1); // requestFx('https://pokeapi.co/api/v2/pokemon/1')
```

Типичное применение - один базовый эффект-обертка над `fetch` (токен и
адрес из сторов) и десятки конкретных эффектов поверх него.

---

## 2.28 Связи между юнитами: `sample`; `effector-react`

Юниты объявлены, но пока не связаны: событие не знает, какой эффект
запустить, эффект не знает, откуда взять данные. Связи описываются
отдельно - и это то, чем Effector отличается от «вызвать эффект в
обработчике клика»: компонент сообщает о событии, а что за ним следует,
решает модель.

> 📌 **`sample`** - оператор связи: при срабатывании `clock` читает
> текущее значение `source`, при необходимости фильтрует (`filter`) и
> преобразует (`fn`) и передает результат в `target`.

```js
import { createEvent, createStore, sample } from 'effector';

const update = createEvent();
const targetEvent = createEvent();
const $store = createStore(0).on(update, (state) => state + 1);

sample({
  clock: update,                                     // когда
  source: $store,                                    // что читать
  fn: (storeValue) => `Event triggered with: ${storeValue}`, // как преобразовать
  target: targetEvent,                               // куда отправить
});

targetEvent.watch(console.log);
update(); // Event triggered with: 1
update(); // Event triggered with: 2
```

`sample` читает `$store` **после** того, как `update` обновил его, хотя оба
подписаны на одно событие: граф гарантирует, что стор обновится раньше, чем
его прочитают.

`sample` покрывает все виды связей; специализированные операторы ранних
версий объявлены устаревшими:

| Задача | 🕰️ Effector 21 | ✅ Effector 23 |
| --- | --- | --- |
| Переслать событие в эффект | `forward({ from: pageMounted, to: loadDataFx })` | `sample({ clock: pageMounted, target: loadDataFx })` |
| Переслать при условии | `guard({ source: $store, filter: (v) => v > 2, target: clear })` | `sample({ clock: $store, filter: (v) => v > 2, target: clear })` |
| Взять данные из стора по событию | `sample({ source, clock, target })` | То же |

`forward` и `guard` в версии 23 работают, но пишут в консоль
`forward is deprecated, use sample instead` и `guard is deprecated, use
sample instead`.

Если `clock` не указан, триггером служит `source`; если `fn` нет, в `target`
уходит значение `source` как есть; если `target` нет, `sample` возвращает
новый юнит.

### `effector-react`

```jsx
import { createStore, createEvent } from 'effector';
import { useUnit } from 'effector-react';

export const $count = createStore(0);
export const increment = createEvent();
export const decrement = createEvent();
export const clear = createEvent();

$count
  .on(increment, (count, by) => count + by)
  .on(decrement, (count, by) => count - by)
  .reset(clear);

function Counter() {
  // useUnit подписывает компонент на стор и привязывает события к текущему scope
  const [count, inc, dec, reset] = useUnit([$count, increment, decrement, clear]);

  return (
    <section>
      <output>{count}</output>
      <button onClick={() => dec(1)}>-</button>
      <button onClick={() => inc(1)}>+</button>
      <button onClick={() => reset()}>clear</button>
    </section>
  );
}
```

> 📌 **`useUnit`** - хук `effector-react`, который для стора возвращает
> текущее значение и подписывает компонент на обновления, а для события
> или эффекта - функцию вызова, привязанную к текущей области видимости
> (scope, нужен для SSR и тестов).

Компонент рендерится только при изменении `$count`; другие сторы
приложения его не касаются - это выборочная подписка «из коробки», без
селекторов.

🕰️ `useStore($count)` и `useEvent(increment)` объявлены устаревшими в
`effector-react` 23; `useUnit` заменяет оба и принимает как
один юнит, так и массив или объект юнитов.

### Effector против Redux

| | Redux (Toolkit) | Effector |
| --- | --- | --- |
| Состояние | Одно дерево | Много атомарных сторов |
| Изменение | Действие → редьюсер среза | Событие → редьюсер стора |
| Подписка компонента | Селектор по дереву | Стор целиком (он уже атомарен) |
| Асинхронность | Thunk, `createAsyncThunk`, saga | `Effect` со встроенными `pending`/`done`/`fail` |
| Связи между частями | Слайс реагирует на чужие действия в `extraReducers` | Явный граф: `sample`, `combine`, `attach` |
| Инструменты | Redux DevTools, история действий | Инспектор через `effector/inspect`, SSR через `fork`/`scope` |
| Распространенность | Стандарт де-факто, огромная экосистема | Заметно меньше; сильная в русскоязычном сообществе |

---

[← Redux Saga](redux-saga.md) · [К содержанию спринта](README.md) ·
[Далее: Zustand →](zustand.md)
