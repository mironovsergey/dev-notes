# React и Redux

## 2.10 `Provider`

> 📌 **`Provider`** - компонент `react-redux`, который через контекст
> React делает хранилище доступным всем компонентам своего поддерева.

```jsx
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';

import { store } from './services/store';
import App from './components/app';

createRoot(document.getElementById('root')).render(
  <Provider store={store}>
    <App />
  </Provider>
);
```

Под капотом - обычный `createContext`
([2.2](context-and-reducer.md#22-контекст)), но в значении контекста лежит
не состояние, а сам объект `store`. Объект хранилища не меняется за время
жизни приложения, поэтому провайдер **не вызывает** рендеров при изменении
состояния - подписка устроена иначе ([2.11](#211-useselector)). Это ответ на
вопрос, чем `react-redux` лучше «состояния в контексте»: контекст с
состоянием рендерит всех потребителей, контекст с хранилищем - никого.

`Provider` ставится один раз на вершине дерева. Несколько провайдеров с
разными хранилищами возможны, но это редкость и почти всегда ошибка
проектирования.

---

## 2.11 `useSelector`

> 📌 **Селектор** - функция `(state) => value`, извлекающая из состояния
> хранилища нужный компоненту фрагмент.

> 📌 **`useSelector(selector, equalityFn?)`** - хук, который вызывает
> селектор на текущем состоянии, подписывает компонент на хранилище и
> перерендеривает его только тогда, когда результат селектора изменился.

```jsx
import { useSelector, useDispatch } from 'react-redux';

function TodoList() {
  const filter = useSelector((state) => state.filter);
  const todos = useSelector((state) => state.todos);
  const dispatch = useDispatch();

  const visible = filter === 'all'
    ? todos
    : todos.filter((t) => (filter === 'done' ? t.completed : !t.completed));

  return (
    <ul>
      {visible.map((todo) => (
        <li key={todo.id}>
          <label>
            <input type="checkbox" checked={todo.completed} onChange={() => dispatch(toggleTodo(todo.id))} />
            {todo.text}
          </label>
        </li>
      ))}
    </ul>
  );
}
```

### Как работает подписка

После каждого `dispatch` `react-redux` вызывает селектор заново и сравнивает
результат с предыдущим через `===`. Совпало - компонент не рендерится;
изменилось - рендерится. Например, компонент с селектором `state.filter`
рендерится при смене фильтра и не рендерится при добавлении задачи;
компонент с `state.todos.length` - наоборот; при переключении задачи
(`todos` изменился, `length` - нет) не рендерится ни один.

Отсюда правила:

**Селектор возвращает минимум.** ❌ `useSelector((state) => state)` -
компонент рендерится при любом изменении в приложении. ✅ Конкретное поле
или примитив.

**Селектор не создает новых объектов.** ❌ `useSelector((state) => ({ todos:
state.todos, filter: state.filter }))` - каждый вызов новый объект, `===`
всегда `false`, компонент рендерится на каждый `dispatch`. `react-redux` 9
обнаруживает это в разработке и предупреждает в консоли: `Selector unknown
returned a different result when called with the same parameters`. Решения:

| Способ | Когда |
| --- | --- |
| Несколько `useSelector`, по одному на поле | По умолчанию: просто и точно |
| Второй аргумент `shallowEqual` из `react-redux` | Селектор возвращает объект из нескольких полей; компонент рендерится, только когда изменилось хотя бы одно из них |
| Мемоизированный селектор `createSelector` из `reselect` | Селектор вычисляет производные данные (фильтрация, сортировка); кеш по входным срезам |

```jsx
import { createSelector } from '@reduxjs/toolkit'; // реэкспорт из reselect

const selectVisibleTodos = createSelector(
  [(state) => state.todos, (state) => state.filter],
  (todos, filter) => (filter === 'all' ? todos : todos.filter((t) => t.completed === (filter === 'done')))
);

const visible = useSelector(selectVisibleTodos);
```

`createSelector` пересчитывает результат, только если изменился хотя бы один
входной селектор; иначе возвращает прежнюю ссылку, и `useSelector` не
рендерит компонент.

**Селекторы выносятся из компонентов** в файл рядом с редьюсером
(`selectTodos`, `selectFilter`): форма состояния известна одному модулю, а
не каждому компоненту, и переименование поля - правка в одном месте.

### Собственные props в селекторе

Селектор - замыкание внутри компонента, поэтому props доступны без
дополнительного API:

```jsx
function Todo({ id }) {
  const todo = useSelector((state) => state.todos.find((t) => t.id === id));
  // …
}
```

Такой селектор создается заново при каждом рендере - это нормально:
`useSelector` сравнивает результаты, а не функции.

---

## 2.12 `useDispatch`

> 📌 **`useDispatch()`** - хук, возвращающий функцию `dispatch` хранилища
> из ближайшего `Provider`.

```jsx
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';

function AddTodo() {
  const dispatch = useDispatch();

  const handleSubmit = (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    dispatch(addTodo(new FormData(form).get('text')));
    form.reset();
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="text" />
      <button type="submit">Добавить</button>
    </form>
  );
}

function DeliveryOptions() {
  const dispatch = useDispatch();

  useEffect(() => {
    // Запрос данных при монтировании - через действие, а не через fetch в компоненте
    dispatch({ type: 'delivery/optionsRequested' });
  }, [dispatch]);
  // …
}
```

`dispatch` - одна и та же функция на протяжении жизни хранилища, поэтому
включать ее в зависимости эффекта безопасно (и правило `exhaustive-deps`
этого требует). Компонент, использующий только `useDispatch`, на изменения
состояния не подписан и не рендерится при них.

Компонент не знает, что произойдет после `dispatch`: синхронно обновится
состояние, сработает middleware, уйдет запрос. Это и есть граница между
представлением и логикой, ради которой берут Redux.

---

## 2.13 `connect`

🕰️ До хуков (`react-redux` 7.1, 2019) единственным способом связать
компонент с хранилищем был HOC `connect`
([1.30](../sprint-1/advanced.md#130-компоненты-высшего-порядка-hoc)). Он
по-прежнему работает в версии 9 и встречается в старых проектах; в новом
коде используются хуки.

> 📌 **`connect(mapStateToProps?, mapDispatchToProps?)`** - функция,
> возвращающая HOC, который подписывает компонент на хранилище и передает
> ему выбранные данные и обработчики через props.

```jsx
import { connect } from 'react-redux';

function TodoCounterView({ count, filter, onReset }) {
  return <button onClick={onReset}>{filter}: {count}</button>;
}

// Первый аргумент - состояние, второй - собственные props компонента
const mapStateToProps = (state, ownProps) => ({
  count: state.todos.length,
  filter: ownProps.label ? ownProps.label : state.filter,
});

// Объектная форма: каждый генератор оборачивается в dispatch автоматически
const mapDispatchToProps = { onReset: () => setFilter('all') };

export const TodoCounter = connect(mapStateToProps, mapDispatchToProps)(TodoCounterView);
```

При фильтре `done` и одной задаче `<TodoCounter />` показывает `done: 1`, а
`<TodoCounter label="Итого" />` - `Итого: 1`; клик отправляет
`setFilter('all')`.

### `mapStateToProps(state, ownProps?)`

Возвращает объект - он сливается с props компонента. Вызывается после каждого
изменения хранилища; компонент рендерится, если хотя бы одно поле
результата изменилось по `===` (поверхностное сравнение объекта целиком, в
отличие от `useSelector`, сравнивающего одно значение).

### `mapDispatchToProps`

| Форма | Запись | Особенность |
| --- | --- | --- |
| Функция | `(dispatch, ownProps) => ({ addTodo: (text) => dispatch(addTodo(text)) })` | Полный контроль; доступ к `ownProps` |
| Функция с `bindActionCreators` | `(dispatch) => bindActionCreators({ addTodo, removeTodo }, dispatch)` | Оборачивает объект генераторов разом |
| Объект | `{ addTodo, removeTodo }` | Самая короткая; `connect` сам применяет `bindActionCreators` |
| Не передан | - | В props попадает сам `dispatch` |

> 📌 **`bindActionCreators(creators, dispatch)`** - функция из `redux`,
> которая для каждого генератора экшенов возвращает функцию, сразу
> отправляющую результат в `dispatch`.

После `const actions = bindActionCreators({ addTodo, setFilter },
store.dispatch)` вызов `actions.addTodo('a')` добавляет задачу без явного
`dispatch`.

### `connect` против хуков

| | `connect` | Хуки |
| --- | --- | --- |
| Где данные | В props обернутого компонента | Внутри компонента |
| Компонент знает о Redux | Нет: получает обычные props, тестируется без хранилища | Да: импортирует хуки |
| Собственные props в селекторе | `ownProps` | Замыкание |
| Сравнение | Все поля результата поверхностно | Одно значение по `===` (или `equalityFn`) |
| Обертки в дереве | Да, `Connect(Component)` в DevTools | Нет |
| Статус | Поддерживается ради совместимости | ✅ Основной API |

Единственное содержательное преимущество `connect` - разделение на
«презентационный» компонент без знаний о Redux и «контейнер». Сегодня оно
достигается иначе: компонент с хуками принимает данные как props, а хуки
вызывает небольшой родительский компонент.

---

[← Redux](redux.md) · [К содержанию спринта](README.md) ·
[Далее: middleware, Redux Thunk и DevTools →](middleware-and-thunk.md)
