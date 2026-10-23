# События и формы

## 1.23 Синтетические события

> 📌 **Синтетическое событие (`SyntheticEvent`)** - объект-обертка React над
> нативным событием браузера с единым кроссбраузерным интерфейсом
> (`target`, `currentTarget`, `type`, `preventDefault()`,
> `stopPropagation()`) и ссылкой на исходное событие в свойстве
> `nativeEvent`.

Обработчик задается атрибутом с именем `on` + событие в camelCase и получает
синтетическое событие первым аргументом:

```jsx
<button onClick={(e) => console.log(e.type, e.nativeEvent instanceof Event)}>
  Нажми
</button>
// click true
```

Значение атрибута - функция, а не строка с кодом и не результат вызова:
❌ `onClick={handleClick()}` вызовет обработчик при рендере и передаст в
`onClick` его результат.

### Делегирование

React не вешает слушатель на каждый элемент с `onClick`. При создании корня
он регистрирует на **контейнере корня** нативные слушатели всех
поддерживаемых событий - для фаз захвата и всплытия - и сам доставляет
событие обработчикам компонентов, проходя по дереву React.

```
   DOM: контейнер корня ◄── нативный слушатель click
         └── div
              └── button        клик здесь ──► браузер поднимает событие
                                               до контейнера ──► React находит
                                               button в своем дереве и вызывает
                                               onClick по цепочке компонентов
```

Следствия: обработчики можно менять на каждом рендере без переподписки; один
слушатель на тысячу кнопок; событие в портале всплывает по дереву React, а не
DOM ([1.29](advanced.md#129-порталы)).

🕰️ В React ≤16 слушатели вешались на `document`. С React 17 - на контейнер
корня: несколько версий React на одной странице перестали мешать друг другу,
а `e.stopPropagation()` в нативном обработчике на промежуточном элементе стал
останавливать и события React. Тогда же исчез пул событий: 🕰️ `e.persist()`
больше не нужен, объект события можно читать асинхронно.

### Отличия от DOM

| Событие React | Поведение |
| --- | --- |
| `onChange` | Срабатывает при каждом изменении значения - как нативное `input`, а не `change` |
| `onFocus`, `onBlur` | Всплывают (реализованы через `focusin`/`focusout`) |
| `onScroll` | ⚠️ Не всплывает (с React 17): обработчик на родителе не вызывается |
| `onMouseEnter`, `onMouseLeave`, `onPointerEnter`, `onPointerLeave` | Не всплывают, как и в DOM |
| `onWheel`, `onTouchStart`, `onTouchMove` | Регистрируются как passive: `preventDefault()` внутри не действует |
| Возврат `false` из обработчика | ⚠️ Ничего не делает: форма с `onSubmit={() => false}` отправляется. Только `e.preventDefault()` |

---

## 1.24 Всплытие и захват, `target` и `currentTarget`

Событие в DOM проходит три фазы: от `window` вниз к целевому элементу
(**захват**), на самом элементе (**цель**), и обратно вверх (**всплытие**).
React воспроизводит обе фазы для своих обработчиков.

```
              захват (capture)                       всплытие (bubble)
              ────────────────                       ─────────────────
   window          │  ▲
   document        ▼  │
   <html>          │  ▲
   <body>          ▼  │
   <div>      onClickCapture ─┐    ┌─ onClick
   <button>   onClickCapture ─┤    ├─ onClick
                              ▼    ▲
                          цель (target)
```

Обычный `onClick` срабатывает на фазе всплытия. Обработчик фазы захвата
получает суффикс `Capture`: `onClickCapture`.

```jsx
function Panel() {
  return (
    <div onClickCapture={() => console.log('div: захват')} onClick={() => console.log('div: всплытие')}>
      <button onClickCapture={() => console.log('button: захват')} onClick={() => console.log('button: всплытие')}>
        Нажми
      </button>
    </div>
  );
}
```

Порядок вывода: `div: захват, button: захват, button: всплытие, div: всплытие`.
Захват нужен редко - например, чтобы перехватить событие раньше обработчика
потомка (аналитика, блокировка ввода).

### `target` и `currentTarget`

> 📌 **`target`** - элемент, на котором событие произошло.
> **`currentTarget`** - элемент, на котором стоит обработчик, выполняемый в
> данный момент.

```jsx
function Panel() {
  const handleClick = (e) => {
    console.log(e.target.tagName, e.currentTarget.tagName);
  };

  return (
    <div onClick={handleClick}>
      <button>
        <span>Текст</span>
      </button>
    </div>
  );
}
```

Клик по тексту выводит `SPAN DIV`, клик по краю кнопки - `BUTTON DIV`.
`currentTarget` всегда `DIV`, потому что обработчик стоит на нем. Для чтения
данных элемента, на котором стоит обработчик (`data-*`, `value` формы),
используется `currentTarget`; `target` меняется в зависимости от того, куда
именно попал курсор.

### `stopPropagation` и `preventDefault`

- `e.stopPropagation()` - остановить дальнейшее распространение: обработчики
  родителей не вызываются.
- `e.preventDefault()` - отменить действие браузера по умолчанию: переход по
  ссылке, отправку формы, ввод символа.

Одно не заменяет другое: отправка формы отменяется только `preventDefault`,
а всплытие клика по ссылке - только `stopPropagation`.

---

## 1.25 Обработчики событий в компонентах

В функциональном компоненте обработчик - функция, объявленная в теле
компонента или прямо в атрибуте:

```jsx
function Toolbar({ onSave }) {
  const handleSave = () => {
    onSave();
  };

  return (
    <>
      <button onClick={handleSave}>Сохранить</button>
      <button onClick={() => onSave({ draft: true })}>Черновик</button>
    </>
  );
}
```

Обработчик создается заново при каждом рендере. Это нормально и ничего не
стоит, пока функция не уходит в `memo`-потомок или в зависимости эффекта -
тогда `useCallback` ([1.21](hooks.md#121-usememo-и-usecallback)).
Соглашение об именах: собственный обработчик - `handle*`, prop с
обработчиком - `on*`.

### В классовых компонентах

🕰️ Три способа привязать `this` в обработчике класса:

| Способ | Запись | Особенность |
| --- | --- | --- |
| `bind` в конструкторе | `this.handleClick = this.handleClick.bind(this)` | Многословно; одна функция на экземпляр |
| Поле класса со стрелкой | `handleClick = () => { … }` | Одна функция на экземпляр; стандартный вариант |
| Стрелка в JSX | `onClick={(e) => this.handleClick(e)}` | Новая функция на каждый рендер; ломает `PureComponent` потомка |

Подробности привязки - в [1.15](state-and-lifecycle.md#115-классовые-компоненты-в-деталях).

### Нативный слушатель через ссылку

Иногда обработчик нужен на объекте, до которого JSX не дотягивается
(`window`, `document`), или с параметрами, которых у React-обработчика нет
(`{ passive: false }` для `wheel`). Тогда слушатель ставится вручную в
эффекте, с обязательной отпиской:

```jsx
function ZoomArea() {
  const areaRef = useRef(null);

  useEffect(() => {
    const node = areaRef.current;
    const handleWheel = (e) => {
      // Нативный wheel с passive: false - иначе preventDefault не сработает
      e.preventDefault();
    };
    node.addEventListener('wheel', handleWheel, { passive: false });
    return () => node.removeEventListener('wheel', handleWheel);
  }, []);

  return <div ref={areaRef} />;
}
```

В классовом компоненте та же пара: `addEventListener` в `componentDidMount`,
`removeEventListener` в `componentWillUnmount`
([1.16](state-and-lifecycle.md#116-жизненный-цикл-классового-компонента)).

---

## 1.26 Управляемые и неуправляемые элементы форм

Поле формы в браузере хранит собственное значение. React предлагает два
способа работать с ним.

> 📌 **Управляемый элемент** - элемент формы, значение которого хранится в
> состоянии React и задается через `value` (для чекбоксов - `checked`), а
> каждое изменение приходит через `onChange` и записывается в состояние.
> Источник истины - состояние React.

> 📌 **Неуправляемый элемент** - элемент формы, значение которого хранит сам
> DOM; React задает только начальное значение через `defaultValue` /
> `defaultChecked`, а текущее читается по необходимости через `ref` или
> `FormData`. Источник истины - DOM.

| | Управляемый | Неуправляемый |
| --- | --- | --- |
| Где значение | Состояние React | DOM |
| Атрибуты | `value` + `onChange` | `defaultValue`, при необходимости `ref` |
| Рендер при вводе | Каждый символ | Нет |
| Валидация и форматирование на лету | Да | Только через слушатели |
| Зависимые поля (кнопка недоступна, пока поле пусто) | Естественно | Требует состояния все равно |
| Когда выбирать | Значение нужно в разметке или логике до отправки | Значение нужно только при отправке; интеграция с не-React кодом |

### Управляемый `input`

```jsx
function NameInput() {
  const [value, setValue] = useState('');

  return (
    <label>
      Имя
      <input type="text" value={value} onChange={(e) => setValue(e.target.value)} />
    </label>
  );
}
```

`onChange` в React срабатывает при каждом изменении значения (как нативное
событие `input`), и состояние всегда совпадает с полем. ⚠️ `value` без
`onChange` делает поле доступным только для чтения: React возвращает значение
из состояния после каждой попытки ввода и предупреждает в консоли
`You provided a value prop to a form field without an onChange handler`.
Если поле действительно только для чтения - атрибут `readOnly`.

### Неуправляемый `textarea`

```jsx
function TitleForm({ onSubmitValue }) {
  const inputRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Значение читается из DOM в момент отправки
    onSubmitValue(inputRef.current.value);
  };

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Заголовок
        <textarea ref={inputRef} defaultValue="Привет, мир!" />
      </label>
      <button type="submit">Отправить</button>
    </form>
  );
}
```

В React `textarea` принимает значение через `value` / `defaultValue`, а не
через содержимое тега, как в HTML.

---

## 1.27 Типы полей и отправка формы

### `select`

```jsx
function RoleSelect() {
  const [role, setRole] = useState('designer');

  return (
    <label>
      Роль
      <select value={role} onChange={(e) => setRole(e.target.value)}>
        <option value="designer">Дизайнер</option>
        <option value="developer">Разработчик</option>
      </select>
    </label>
  );
}
```

Выбранный пункт задается `value` на `<select>`, а не атрибутом `selected` на
`<option>`. Для `<select multiple>` `value` - массив.

### `checkbox` и `radio`

```jsx
function RememberMe() {
  const [checked, setChecked] = useState(true);

  return (
    <label>
      Запомнить меня
      <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
    </label>
  );
}

function ThemeChoice() {
  const [mode, setMode] = useState('dark');
  const handleChange = (e) => setMode(e.target.value);

  return (
    <fieldset>
      <label>
        <input type="radio" name="theme" value="light" checked={mode === 'light'} onChange={handleChange} />
        Светлая
      </label>
      <label>
        <input type="radio" name="theme" value="dark" checked={mode === 'dark'} onChange={handleChange} />
        Темная
      </label>
    </fieldset>
  );
}
```

У чекбокса читается `e.target.checked`, а не `value`. У группы радиокнопок
одно состояние - выбранное значение; каждая кнопка «управляема» сравнением
`checked={mode === '…'}`.

### `file`

```jsx
function AvatarForm({ onFile }) {
  const fileRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    onFile(fileRef.current.files[0].name);
  };

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Фото
        <input type="file" ref={fileRef} />
      </label>
      <button type="submit">Сохранить</button>
    </form>
  );
}
```

`<input type="file">` всегда неуправляемый: браузер не позволяет задать его
значение из кода. Файлы читаются из `files` через ссылку или из `FormData`.

### Несколько полей одним обработчиком

Каждому полю задается `name`, совпадающий с ключом в объекте состояния; тип
поля определяет, откуда брать значение:

```jsx
function SubscribeSettings() {
  const [form, setForm] = useState({ email: '', subscribed: false });

  const handleChange = (e) => {
    const { name, type, value, checked } = e.target;
    // Ключ состояния совпадает с атрибутом name поля
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  return (
    <form>
      <label>
        Получать уведомления
        <input name="subscribed" type="checkbox" checked={form.subscribed} onChange={handleChange} />
      </label>
      <label>
        E-mail
        <input name="email" type="email" value={form.email} disabled={!form.subscribed} onChange={handleChange} />
      </label>
    </form>
  );
}
```

Обновление функциональное (`(prev) => …`): так оно не зависит от значения
`form`, замкнутого в обработчике.

### `FormData` при отправке

Если значения нужны только при отправке, состояние и ссылки не нужны вовсе:

```jsx
function LoginForm({ onLogin }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    // Все поля формы читаются разом, без состояния и без ref
    const data = new FormData(e.currentTarget);
    onLogin(Object.fromEntries(data));
  };

  return (
    <form onSubmit={handleSubmit}>
      <label>Логин<input name="login" /></label>
      <label>Пароль<input name="password" type="password" /></label>
      <button type="submit">Войти</button>
    </form>
  );
}
```

После ввода `admin` и `secret` `onLogin` получает
`{ login: 'admin', password: 'secret' }`. `e.currentTarget` - форма, на которой
стоит обработчик.

React 19 развивает этот подход: `<form action={fn}>` вызывает `fn(formData)`
без `preventDefault` и без обработчика `onSubmit`, а `useActionState` и
`useFormStatus` дают состояние отправки
([2.40](../sprint-2/react-async.md#240-действия-и-useactionstate)).

---

[← Хуки](hooks.md) · [К содержанию спринта](README.md) ·
[Далее: границы ошибок, порталы и HOC →](advanced.md)
