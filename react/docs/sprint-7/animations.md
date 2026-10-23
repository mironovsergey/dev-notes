# Анимации

## 7.4 Анимации в React: CSS и проблема выхода

> 📌 **Анимация перехода** - плавное изменение визуальных свойств элемента
> между двумя состояниями интерфейса вместо мгновенной смены.

Большинство анимаций в React - **CSS-переходы, управляемые классом**:
состояние определяет `className`, а `transition` в CSS анимирует изменение
свойств.

```jsx
function Panel({ open }) {
  return <aside className={open ? 'panel panel_open' : 'panel'}>…</aside>;
}
```

```css
.panel {
  transform: translateX(-100%);
  transition: transform 300ms ease-out;
}

.panel_open {
  transform: translateX(0);
}
```

React меняет класс, браузер анимирует. Ни хуков, ни библиотек - и так
следует делать всегда, когда элемент **остается в DOM** в обоих состояниях.

### Проблема выхода

Появление анимируется средствами CSS: новый элемент вставляется в DOM уже с
нужным классом, и браузер проигрывает его `@keyframes` или переход от
`@starting-style`. Исчезновение - нет: как только условие `{show && <Toast />}`
стало ложным, React удаляет узел на коммите, и анимировать нечего.

```
   show: true → false
        │
        ▼
   React удаляет узел ─────► анимировать нечего
                                      ▲
   Библиотека: держит узел ──► добавляет класс/стиль выхода ──► ждет ──► удаляет
```

Отсюда задача любой библиотеки анимаций для React: **отложить удаление** -
оставить элемент в дереве, запустить анимацию выхода, удалить по ее
окончании. Именно это делают `TransitionGroup` ([7.5](#75-react-transition-group))
и `AnimatePresence` ([7.6](#76-motion-framer-motion)).

### Что умеет современный CSS

| Средство | Задача |
| --- | --- |
| `transition` + класс | Переход между состояниями элемента, который остается в DOM |
| `@keyframes` + `animation` | Анимация появления при монтировании: класс есть с первого рендера |
| `@starting-style` | Начальное состояние для перехода при появлении элемента (без `@keyframes`) |
| `transition-behavior: allow-discrete` | Переход `display: none ↔ block`: анимация выхода без JavaScript, если элемент скрывается классом, а не удаляется из разметки |
| View Transitions API | Анимация смены целых экранов, в том числе при навигации |

✅ Для появления и для исчезновения через `display: none` возможностей CSS
уже хватает; библиотека нужна, когда элемент действительно удаляется из
разметки (условный рендер, элемент списка), для списков с перестановкой и
для физики движения (пружины, перетаскивание).

---

## 7.5 React Transition Group

> 📌 **React Transition Group** - библиотека, которая не анимирует сама, а
> управляет **стадиями** появления и исчезновения элемента: переключает
> CSS-классы по фазам и удерживает элемент в DOM на время выхода.

Ядро - компонент `Transition` с четырьмя состояниями: `entering → entered`
при `in={true}`, `exiting → exited` при `in={false}`. Надстройка
`CSSTransition` переводит состояния в классы.

### `CSSTransition`

```jsx
import { useRef, useState } from 'react';
import { CSSTransition } from 'react-transition-group';

function FadeMessage() {
  const [show, setShow] = useState(false);
  const nodeRef = useRef(null);

  return (
    <>
      <button onClick={() => setShow((s) => !s)}>Показать / скрыть</button>
      <CSSTransition nodeRef={nodeRef} in={show} timeout={300} classNames="fade" unmountOnExit>
        <p ref={nodeRef}>Текст</p>
      </CSSTransition>
    </>
  );
}
```

```css
.fade-enter { opacity: 0; }
.fade-enter-active { opacity: 1; transition: opacity 300ms ease-in; }
.fade-exit { opacity: 1; }
.fade-exit-active { opacity: 0; transition: opacity 300ms ease-in; }
```

| Prop | Назначение |
| --- | --- |
| `in` | Показан ли элемент; смена значения запускает переход |
| `timeout` | Длительность в мс - библиотека не читает CSS и должна знать, когда снять классы; можно объект `{ enter, exit }` |
| `classNames` | Префикс классов: `fade` дает `fade-enter`, `fade-enter-active`, `fade-enter-done`, `fade-exit`, `fade-exit-active`, `fade-exit-done`, `fade-appear*` для первого рендера с `appear` |
| `nodeRef` | Ссылка на анимируемый DOM-узел |
| `unmountOnExit` | Удалить элемент из DOM после выхода (иначе он остается с классом `*-exit-done`) |
| `mountOnEnter` | Не рендерить до первого `in={true}` |
| `onEnter`, `onEntered`, `onExit`, `onExited` | Колбэки фаз |

```
   in: false → true                          in: true → false
   ┌───────────┬──────────────────┬────────┐  ┌──────────┬─────────────────┬────────┐
   │ fade-enter│ fade-enter-active│ -done  │  │ fade-exit│ fade-exit-active│ -done  │
   │ (1 кадр)  │ (timeout мс)     │        │  │ (1 кадр) │ (timeout мс)    │ удален │
   └───────────┴──────────────────┴────────┘  └──────────┴─────────────────┴────────┘
```

⚠️ **`nodeRef` обязателен на React 19.** Без него библиотека ищет узел через
`ReactDOM.findDOMNode`, который в React 19 удален: без `nodeRef` первый же
переход падает с `findDOMNode is not a function`. Ссылка
передается и в `CSSTransition`, и в сам элемент.

### `TransitionGroup`

Для списков: оборачивает набор `CSSTransition` с ключами и сам управляет
`in` каждого - новый ключ получает вход, исчезнувший ключ удерживается в
DOM на время выхода.

```jsx
import { createRef, useState } from 'react';
import { CSSTransition, TransitionGroup } from 'react-transition-group';

function TodoList() {
  const [items, setItems] = useState([
    // nodeRef хранится рядом с элементом данных: у каждого узла своя ссылка
    { id: 1, text: 'Купить яйца', nodeRef: createRef() },
    { id: 2, text: 'Оплатить счета', nodeRef: createRef() },
  ]);

  const remove = (id) => setItems((list) => list.filter((item) => item.id !== id));

  return (
    <TransitionGroup component="ul">
      {items.map(({ id, text, nodeRef }) => (
        <CSSTransition key={id} nodeRef={nodeRef} timeout={500} classNames="item">
          <li ref={nodeRef}>
            <button onClick={() => remove(id)}>×</button>
            {text}
          </li>
        </CSSTransition>
      ))}
    </TransitionGroup>
  );
}
```

Удаленный пункт еще 500 мс остается в DOM с классами `item-exit
item-exit-active`. `component="ul"` задает тег обертки (по умолчанию
`div`; `null` - без обертки). `key` обязателен и должен быть стабильным
([1.14](../sprint-1/state-and-lifecycle.md#114-списки-и-key)) - по нему
группа понимает, что именно исчезло.

`SwitchTransition` - для замены одного элемента другим по ключу (вкладки,
шаги формы): сначала выход старого, затем вход нового (`mode="out-in"`).

### Статус

Библиотека небольшая, стабильная и почти не развивается;
для новых проектов ее ниша - «нужны только классы по фазам, без
зависимости от движка анимаций». Все остальное делает Motion.

---

## 7.6 Motion (Framer Motion)

> 📌 **Motion** - библиотека декларативных анимаций для React: компоненты
> `motion.*` принимают целевые значения свойств через props (`initial`,
> `animate`, `exit`, `whileHover`) и анимируют переходы между ними сами,
> включая физику пружины и анимацию раскладки.

🕰️ До конца 2024 года библиотека называлась **Framer Motion** (пакет
`framer-motion`). Сейчас пакет - `motion`, импорт для React -
`motion/react`; API совместим, `framer-motion` публикуется как синоним.

### `motion.*` и props анимации

```jsx
import { motion } from 'motion/react';

<motion.div
  initial={{ opacity: 0, x: -20 }}   // состояние при монтировании
  animate={{ opacity: 1, x: 0 }}     // целевое состояние; при изменении - новая анимация
  transition={{ duration: 0.2 }}
>
  Блок
</motion.div>
```

`initial` записывается в `style` узла уже при первом рендере, поэтому
мерцания нет.
Любой HTML- или SVG-тег доступен как `motion.tag`; `motion.create(Component)`
оборачивает собственный компонент (он должен пробрасывать `ref`).

| Prop | Назначение |
| --- | --- |
| `initial` | Значения при монтировании; `false` отключает анимацию входа |
| `animate` | Целевые значения; меняются - анимируется переход |
| `exit` | Значения при удалении; работает только внутри `AnimatePresence` |
| `transition` | Как анимировать: `{ duration, ease }` или пружина `{ type: 'spring', stiffness, damping }` |
| `whileHover`, `whileTap`, `whileFocus`, `whileInView` | Состояния по взаимодействию |
| `variants` | Именованные наборы значений, наследуемые потомками |
| `layout` | Анимировать изменение размера и положения, вызванное раскладкой |

### Анимация раскладки

Переключатель, у которого ручка переезжает слева направо сменой
`justify-content` у контейнера:

```jsx
import { useState } from 'react';
import { motion } from 'motion/react';

const spring = { type: 'spring', stiffness: 700, damping: 30 };

function Switch() {
  const [isOn, setIsOn] = useState(false);

  return (
    <div className={isOn ? 'switch switch_on' : 'switch'} onClick={() => setIsOn((v) => !v)}>
      {/* layout: Motion измеряет положение до и после рендера и анимирует разницу */}
      <motion.div className="switch__handle" layout transition={spring} />
    </div>
  );
}
```

```css
.switch { display: flex; justify-content: flex-start; width: 160px; padding: 10px; border-radius: 50px; }
.switch_on { justify-content: flex-end; }
.switch__handle { width: 80px; height: 80px; border-radius: 40px; background: white; }
```

Ручка не имеет анимируемых свойств: ее положение - результат flex-раскладки.
`layout` делает то, что вручную требует техники FLIP: запомнить положение,
дать браузеру перестроить раскладку, измерить новое положение и
анимировать `transform` от старого к новому. Пружина `stiffness: 700,
damping: 30` дает быстрое движение с едва заметным перелетом.

### `AnimatePresence`

Решение проблемы выхода ([7.4](#74-анимации-в-react-css-и-проблема-выхода)):

```jsx
import { motion, AnimatePresence } from 'motion/react';

function Toast({ show }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.p
          key="toast"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
        >
          Сохранено
        </motion.p>
      )}
    </AnimatePresence>
  );
}
```

`AnimatePresence` замечает, что дочерний элемент с ключом исчез из
разметки, оставляет его в DOM, проигрывает `exit` и удаляет по окончании.
Ключ у потомков обязателен - по нему отслеживается
присутствие; для списков `AnimatePresence` оборачивает `map`, и каждый
элемент получает свои `initial`/`animate`/`exit`.

### Предпочтение «меньше движения»

Системная настройка `prefers-reduced-motion` - требование доступности, а
не вкусовая правка: движение на экране вызывает головокружение и тошноту у
части людей. `useReducedMotion` возвращает, включена ли эта настройка:

```jsx
import { motion, useReducedMotion } from 'motion/react';

function Card() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.article
      whileHover={prefersReducedMotion ? undefined : { y: -4 }}
      transition={prefersReducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 30 }}
    />
  );
}
```

Отключается именно движение, а не обратная связь: смена прозрачности и
цвета обычно остаются. `MotionConfig` задает режим сразу для поддерева:
`reducedMotion="user"` следует системной настройке, а `"always"` включает
режим принудительно - анимации положения, размеров и трансформаций
выполняются мгновенно, прозрачность и цвет анимируются по-прежнему. Для
CSS-переходов то же делает медиа-запрос:

```css
@media (prefers-reduced-motion: reduce) {
  .fade { transition: none; }
}
```

### Анимация перехода между страницами

В декларативном режиме роутера страницы анимируются через снимок адреса -
`<Routes location={location} key={location.pathname}>` внутри
`AnimatePresence`: копия, которую удерживает библиотека, продолжает
показывать прежний маршрут.

В data-режиме такого снимка нет. Обертка `AnimatePresence` вокруг
`<Outlet />` берет маршрут из контекста, поэтому удерживаемая копия тут же
превращается во вторую копию новой страницы - на экране их оказывается
две, а `mode="wait"` еще и откладывает появление новой на всю длительность
мнимого ухода. Надежный вариант - анимировать только появление:

```jsx
<motion.div
  key={location.pathname}
  initial={{ opacity: 0, y: 8 }}
  animate={{ opacity: 1, y: 0 }}
>
  <Outlet />
</motion.div>
```

Ключ по адресу пересоздает узел, и `initial` проигрывается заново.

### Сравнение

| | CSS | React Transition Group | Motion |
| --- | --- | --- | --- |
| Кто анимирует | Браузер | Браузер по классам | Библиотека (WAAPI и JS) |
| Анимация выхода | Только скрытие классом (`allow-discrete`) | `unmountOnExit` + `timeout` | `AnimatePresence` + `exit` |
| Списки | Нет | `TransitionGroup` | `AnimatePresence` |
| Раскладка (FLIP) | Нет | Нет | `layout` |
| Физика, жесты, перетаскивание | Нет | Нет | Да |
| Размер | 0 | ~ 5 КБ | ~ 30 КБ (есть облегченный `motion/react-m`) |
| Когда | Элемент остается в DOM | Нужны только классы по фазам | Все остальное |

---

[← Drag and Drop](drag-and-drop.md) · [К содержанию спринта](README.md)
