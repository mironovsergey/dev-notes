# Контекст и `useReducer`

## 2.1 Проброс props и его пределы

Данные в React движутся сверху вниз: родитель хранит состояние и передает его
потомкам через props ([1.8](../sprint-1/components.md#18-props)). Когда одни
и те же данные нужны нескольким компонентам, состояние поднимается к их
общему предку ([1.17](../sprint-1/state-and-lifecycle.md#117-подъем-состояния)).
Чем выше поднято состояние, тем длиннее путь от него до компонента, которому
оно нужно.

> 📌 **Проброс props (props drilling)** - передача данных через цепочку
> промежуточных компонентов, которым сами данные не нужны, только чтобы
> доставить их компоненту глубже по дереву.

```jsx
function App() {
  const [user, setUser] = useState({ name: 'Андрей' });
  return <UserPage user={user} setUser={setUser} />;
}

function UserPage({ user, setUser }) {
  // UserPage не использует user и setUser - только передает дальше
  return (
    <section>
      <h2>Личный кабинет</h2>
      <UserEditForm user={user} updateUserInfo={setUser} />
    </section>
  );
}
```

Подъем состояния и проброс props часто смешивают. Подъем состояния - решение,
где данным жить; проброс - цена этого решения, которая растет с глубиной
дерева.

Чем плох глубокий проброс:

- **Связность.** Промежуточные компоненты знают о данных, которые им не
  нужны; переименование поля затрагивает всю цепочку.
- **Ложный интерфейс.** По сигнатуре `UserPage` кажется, что он работает с
  `user`, хотя он лишь транзит.
- **Лишние рендеры.** Каждый компонент цепочки рендерится при изменении
  данных, даже если сам их не отображает.

Два-три уровня проброса - нормальная практика, и решать ее «глобальным»
инструментом не нужно. Когда цепочка длиннее, есть два выхода, не требующих
библиотек: **композиция** - передать готовый элемент через `children`, чтобы
промежуточные компоненты его не разбирали
([1.9](../sprint-1/components.md#19-children)), и **контекст**.

---

## 2.2 Контекст

> 📌 **Контекст** - механизм React, позволяющий компоненту-провайдеру сделать
> значение доступным любому компоненту своего поддерева без передачи через
> props; потомок читает значение хуком `useContext` (или `use`) и
> перерендеривается при его изменении.

Три шага:

1. **Создать** контекст на уровне модуля: `createContext(defaultValue)`.
2. **Предоставить** значение поддереву: `<MyContext value={…}>…</MyContext>`.
3. **Прочитать** в любом потомке: `useContext(MyContext)`.

```jsx
import { createContext, useContext, useState, useMemo } from 'react';

const UserContext = createContext(null);

function UserProvider({ children }) {
  const [user, setUser] = useState({ name: 'Виссарион' });
  // Объект значения создается один раз на изменение user, а не на каждый рендер провайдера
  const value = useMemo(() => ({ user, setUser }), [user]);
  return <UserContext value={value}>{children}</UserContext>;
}

function UserPage() {
  const { user } = useContext(UserContext);
  return (
    <section>
      <h2>Привет, {user.name}!</h2>
      <UserEditForm />
    </section>
  );
}

function UserEditForm() {
  const { user, setUser } = useContext(UserContext);

  const handleSubmit = (e) => {
    e.preventDefault();
    setUser({ name: new FormData(e.currentTarget).get('name') });
  };

  return (
    <form onSubmit={handleSubmit}>
      <label>Имя<input name="name" defaultValue={user.name} /></label>
      <button type="submit">Сохранить</button>
    </form>
  );
}

<UserProvider>
  <UserPage />
</UserProvider>
```

Отправка формы в `UserEditForm` меняет заголовок в `UserPage`, хотя между
ними нет ни одного prop.

### Детали API

| | |
| --- | --- |
| `createContext(defaultValue)` | Значение по умолчанию используется, когда над потребителем нет провайдера. Это не «начальное значение», которое потом меняется, - оно только для отсутствия провайдера |
| `<MyContext value={…}>` | ✅ React 19: сам объект контекста - провайдер. 🕰️ `<MyContext.Provider value={…}>` - запись до React 19; работает без предупреждений, но в будущих версиях будет объявлена устаревшей |
| `useContext(MyContext)` | Возвращает `value` ближайшего провайдера выше по дереву. Подчиняется правилам хуков |
| `use(MyContext)` | React 19: то же, но допускается внутри условий и циклов |
| Вложенные провайдеры | Ближайший провайдер перекрывает внешний - так делаются локальные переопределения темы или языка |

Контекст доставляет значение через **дерево React**, а не DOM: компонент в
портале ([1.29](../sprint-1/advanced.md#129-порталы)) видит контекст своего
React-родителя.

### Для чего контекст подходит

Данные, которые нужны многим компонентам на разной глубине и меняются
редко: тема оформления, язык, текущий пользователь и статус авторизации,
маршрутизатор, объект хранилища состояния (так `Provider` из `react-redux`
передает `store` - [2.10](react-redux.md#210-provider)).

❌ Контекст - не хранилище состояния и не замена props. Если данные нужны
одному-двум компонентам, props короче и прозрачнее. Если данные меняются
часто и читаются во многих местах, встает вопрос стоимости.

---

## 2.3 Стоимость контекста

При изменении `value` провайдера React перерендеривает **каждый компонент,
читающий этот контекст**, независимо от `memo` и от того, какую часть
значения компонент использует. Компоненты поддерева, которые контекст не
читают, не затрагиваются.

Следствия:

**Один контекст «на все»** - плохо. Если в одном значении лежат
авторизация, пользователь, тема, язык и уведомления, изменение имени
пользователя перерендерит переключатель темы и список уведомлений.
✅ Отдельный контекст на каждую независимую группу данных.

**Значение-объект, создаваемое в рендере,** - плохо. `value={{ user,
setUser }}` - каждый рендер провайдера новый объект, `Object.is` дает
`false`, все потребители рендерятся, даже если `user` не изменился.
✅ Значение стабилизируется `useMemo`, а функции - `useCallback` или
выносятся в отдельный контекст (как `dispatch` в
[2.5](#25-редьюсер-и-контекст-вместе)).

**Разделение на контексты** приводит к вложенности провайдеров:

```jsx
<ThemeProvider>
  <I18nProvider>
    <AuthProvider>
      <UserProvider>
        <App />
      </UserProvider>
    </AuthProvider>
  </I18nProvider>
</ThemeProvider>
```

Это неудобство синтаксическое, а не архитектурное: провайдеры собираются в
один компонент `AppProviders` и вложенность видна в одном месте.

Когда данных много, они меняются часто и потребителям нужны разные их части,
контекст перестает подходить: у него нет выборочной подписки. Это ниша
внешних библиотек - Redux ([2.6](redux.md#26-что-такое-redux)), где компонент
подписывается на часть состояния через селектор, Effector
([2.25](effector.md#225-идея-effector-юниты-и-граф)) с атомарными сторами и
других.

---

## 2.4 `useReducer`

`useState` удобен, пока обновлений мало и они просты. Когда одно состояние
меняется по-разному из десятка обработчиков, логика размазывается по
компоненту, и понять, какие переходы возможны, трудно.

> 📌 **Редьюсер (reducer)** - чистая функция `(state, action) => newState`,
> которая по текущему состоянию и описанию произошедшего события возвращает
> следующее состояние, не изменяя текущее.

> 📌 **Действие (action)** - простой объект, описывающий, что произошло:
> обязательное поле `type` (строка) и произвольные данные события.

> 📌 **`useReducer(reducer, initialArg, init?)`** - хук, который хранит
> состояние и возвращает пару `[state, dispatch]`; вызов `dispatch(action)`
> передает действие в редьюсер, а результат становится новым состоянием.

```
   const [state, dispatch] = useReducer(reducer, initialArg, init);
          ──┬──  ───┬────               ───┬───  ────┬─────  ─┬─
            │       │                      │         │        └─ необязательная функция инициализации:
            │       │                      │         │           state₀ = init(initialArg)
            │       │                      │         └─ начальное состояние (или аргумент для init)
            │       │                      └─ функция-обработчик (state, action) => state
            │       └─ функция отправки действия: dispatch({ type, … })
            └─ текущее состояние
```

```jsx
import { useReducer } from 'react';

const initialState = { count: 0 };

function reducer(state, action) {
  switch (action.type) {
    case 'increment':
      return { count: state.count + 1 };
    case 'decrement':
      return { count: state.count - 1 };
    case 'add':
      return { count: state.count + action.amount };
    default:
      // Неизвестное действие - ошибка программиста, а не ситуация для молчаливого игнорирования
      throw new Error(`Unknown action: ${action.type}`);
  }
}

function Counter() {
  const [state, dispatch] = useReducer(reducer, initialState);

  return (
    <>
      <output>{state.count}</output>
      <button onClick={() => dispatch({ type: 'decrement' })}>-</button>
      <button onClick={() => dispatch({ type: 'increment' })}>+</button>
      <button onClick={() => dispatch({ type: 'add', amount: 10 })}>+10</button>
    </>
  );
}
```

### Что дает редьюсер

| | `useState` | `useReducer` |
| --- | --- | --- |
| Где логика изменения | В каждом обработчике | В одной функции, по одному `case` на событие |
| Что передает компонент | Новое значение | Описание события |
| Тестируемость | Через рендер компонента | Редьюсер - чистая функция, тестируется вызовом |
| Отладка | Смотреть все `setX` | Логировать действия: каждое изменение имеет имя |
| Когда | Одно-два независимых поля | Несколько связанных полей; много видов изменений; переходы зависят от текущего состояния |

Все, что верно для состояния `useState`, верно и здесь: редьюсер **возвращает
новый объект**, а не мутирует полученный
([1.12](../sprint-1/state-and-lifecycle.md#112-неизменяемость-состояния)); если
он вернул ту же ссылку, React пропускает обновление.

### Функция инициализации

Третий аргумент вызывается только при первом рендере с `initialArg` и
возвращает начальное состояние. Нужен, когда вычисление начального
состояния дорого или зависит от props:

```jsx
function init(start) {
  return { count: start * 2 };
}

const [state, dispatch] = useReducer(reducer, 5, init); // state.count === 10
```

`dispatch` - одна и та же функция при каждом рендере: ее можно передавать
потомкам и в зависимости эффектов без `useCallback`.

Терминология и форма `{ type, …payload }` взяты из Redux
([2.7](redux.md#27-экшены-и-генераторы-экшенов)): `useReducer` - это Redux в
пределах одного компонента, без хранилища, middleware и инструментов.

---

## 2.5 Редьюсер и контекст вместе

Редьюсер описывает изменения; контекст доставляет состояние и `dispatch`
всему поддереву. Вместе они дают управление состоянием без внешней
библиотеки.

```jsx
import { createContext, useContext, useReducer, useState } from 'react';

const TasksContext = createContext(null);
const TasksDispatchContext = createContext(null);

function tasksReducer(tasks, action) {
  switch (action.type) {
    case 'added':
      return [...tasks, { id: action.id, text: action.text, done: false }];
    case 'toggled':
      return tasks.map((t) => (t.id === action.id ? { ...t, done: !t.done } : t));
    case 'deleted':
      return tasks.filter((t) => t.id !== action.id);
    default:
      throw new Error(`Unknown action: ${action.type}`);
  }
}

function TasksProvider({ children }) {
  const [tasks, dispatch] = useReducer(tasksReducer, []);
  return (
    // Два контекста: потребители dispatch не перерендериваются при изменении списка
    <TasksContext value={tasks}>
      <TasksDispatchContext value={dispatch}>{children}</TasksDispatchContext>
    </TasksContext>
  );
}

let nextId = 0;

function AddTask() {
  const dispatch = useContext(TasksDispatchContext);
  const [text, setText] = useState('');
  return (
    <>
      <input value={text} onChange={(e) => setText(e.target.value)} />
      <button onClick={() => { dispatch({ type: 'added', id: nextId++, text }); setText(''); }}>
        Добавить
      </button>
    </>
  );
}

function TaskList() {
  const tasks = useContext(TasksContext);
  const dispatch = useContext(TasksDispatchContext);
  return (
    <ul>
      {tasks.map((task) => (
        <li key={task.id}>
          <label>
            <input type="checkbox" checked={task.done} onChange={() => dispatch({ type: 'toggled', id: task.id })} />
            {task.text}
          </label>
          <button onClick={() => dispatch({ type: 'deleted', id: task.id })}>Удалить</button>
        </li>
      ))}
    </ul>
  );
}
```

Два контекста вместо одного - следствие [2.3](#23-стоимость-контекста):
`dispatch` стабилен, поэтому `AddTask`, читающий только его, не рендерится
при каждом изменении списка.

Схема данных та же, что будет в Redux, - только без библиотеки:

```
   компонент ──dispatch(action)──► редьюсер ──новое состояние──► провайдер ──контекст──► компоненты
       ▲                                                                                     │
       └───────────────────────────── событие пользователя ◄─────────────────────────────────┘
```

Чего здесь нет и ради чего берут Redux: выборочной подписки (каждый
потребитель `TasksContext` рендерится при любом изменении списка),
middleware для асинхронных операций и логирования, инструментов отладки с
историей действий, готовых соглашений для команды. Для небольшого приложения
этого и не нужно.

---

[← К содержанию спринта](README.md) · [Далее: Redux →](redux.md)
