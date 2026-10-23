# Drag and Drop

## 7.1 Нативный Drag and Drop

> 📌 **HTML5 Drag and Drop** - встроенный в браузер механизм
> перетаскивания: элемент с атрибутом `draggable` можно захватить мышью, а
> элементы, разрешившие бросок, получают событие `drop`; данные между ними
> передаются через объект `DataTransfer`.

### Способы реализовать перетаскивание

| Способ | События | Особенности |
| --- | --- | --- |
| Мышь | `onMouseDown` (захват) → `onMouseMove` (перенос) → `onMouseUp` (бросок) | Полный контроль над визуализацией; координаты вручную; не работает на сенсорных экранах |
| Касания | `onTouchStart` → `onTouchMove` → `onTouchEnd` | Аналог для сенсорных экранов |
| Указатель | `onPointerDown` → `onPointerMove` → `onPointerUp` | ✅ Объединяет мышь, касания и перо; на этом строятся современные библиотеки |
| HTML5 DnD | `onDragStart` … `onDrop` | Браузер сам рисует «призрак» элемента и ведет его за курсором; работает между вкладками и с файлами; ⚠️ на сенсорных устройствах поддержка неполная |

### События HTML5 DnD

```
   перетаскиваемый элемент (draggable)        целевой элемент (drop zone)
   ────────────────────────────────────       ────────────────────────────
   onDragStart  начало: положить данные       onDragEnter  курсор вошел в зону
        │       в dataTransfer                onDragOver   курсор над зоной (много раз);
        ▼                                                  preventDefault() разрешает бросок
   onDrag       периодически во время         onDragLeave  курсор покинул зону
        │       переноса                      onDrop       бросок: прочитать dataTransfer,
        ▼                                                  изменить состояние
   onDragEnd    конец: успешный или нет
```

| Событие | На каком элементе | Назначение |
| --- | --- | --- |
| `onDragStart` | Перетаскиваемый | Записать данные: `e.dataTransfer.setData(type, string)` |
| `onDrag` | Перетаскиваемый | Периодически в процессе; нужен редко |
| `onDragEnd` | Перетаскиваемый | Убрать визуальное состояние перетаскивания |
| `onDragEnter` / `onDragLeave` | Целевой | Подсветить зону |
| `onDragOver` | Целевой | ⚠️ **Обязательно `e.preventDefault()`**: по умолчанию бросок запрещен |
| `onDrop` | Целевой | `e.preventDefault()` (иначе браузер может открыть данные как ссылку) и чтение `e.dataTransfer.getData(type)` |

```jsx
import { useState } from 'react';

function Board() {
  const [lists, setLists] = useState({
    cart: [{ id: 1, text: 'Кофе' }, { id: 2, text: 'Чай' }],
    postponed: [],
  });

  const handleDragStart = (e, item, from) => {
    // Данные переезжают вместе с событием; они доступны в drop у другого элемента
    e.dataTransfer.setData('application/json', JSON.stringify({ id: item.id, from }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (e, to) => {
    e.preventDefault();
    const { id, from } = JSON.parse(e.dataTransfer.getData('application/json'));
    if (from === to) {
      return;
    }
    setLists((prev) => {
      const item = prev[from].find((i) => i.id === id);
      return { ...prev, [from]: prev[from].filter((i) => i.id !== id), [to]: [...prev[to], item] };
    });
  };

  const renderList = (name, title) => (
    <section
      aria-label={title}
      // Без preventDefault в dragover браузер запрещает бросок
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => handleDrop(e, name)}
    >
      <h2>{title}</h2>
      <ul>
        {lists[name].map((item) => (
          <li key={item.id} draggable onDragStart={(e) => handleDragStart(e, item, name)}>
            {item.text}
          </li>
        ))}
      </ul>
    </section>
  );

  return (
    <>
      {renderList('cart', 'Корзина')}
      {renderList('postponed', 'Отложенные')}
    </>
  );
}
```

`DataTransfer` хранит только строки, поэтому объект сериализуется в JSON.
Альтернатива - держать перетаскиваемый элемент в состоянии React или в
`useRef`, а `dataTransfer` использовать лишь для разрешения броска; так проще
с типами, но теряется перенос между окнами.

⚠️ Записать данные можно только в `onDragStart`, а прочитать - только в
`onDrop`: в остальных событиях `setData` не действует, а `getData`
возвращает пустую строку.

---

## 7.2 `react-dnd`

> 📌 **`react-dnd`** - библиотека, которая скрывает события перетаскивания
> за двумя хуками: `useDrag` для источника и `useDrop` для цели; источники
> и цели сопоставляются по строковому типу, а фактический механизм (HTML5,
> касания, тестовый) задает подключаемый backend.

⚠️ Последний релиз `react-dnd` - 16.0.1 (апрель 2022); библиотека не
развивается и не имеет официальной поддержки React 19 (работает, но типы и
поведение не обновляются). Для нового кода - `@dnd-kit/core`
(Pointer Events, сортировка, доступность с клавиатуры) или
`@atlaskit/pragmatic-drag-and-drop` (тонкая обертка над нативным DnD).
Ниже - API `react-dnd`, чтобы читать существующий код.

### Подключение

```jsx
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

<DndProvider backend={HTML5Backend}>
  <App />
</DndProvider>
```

Провайдер один на приложение (или на изолированную область перетаскивания).
`HTML5Backend` транслирует нативные события DnD; `TouchBackend` из
`react-dnd-touch-backend` - касания; `TestBackend` - имитация в тестах.

### `useDrag`

```jsx
import { useDrag } from 'react-dnd';

const ItemTypes = { PRODUCT: 'product' };

function Product({ id, text }) {
  const [{ isDragging }, dragRef] = useDrag({
    type: ItemTypes.PRODUCT,   // с чем сопоставляется accept у цели
    item: { id },              // данные, которые получит drop у цели
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  return (
    <li ref={dragRef} style={{ opacity: isDragging ? 0.5 : 1 }}>
      {text}
    </li>
  );
}
```

Возвращает `[collectedProps, dragRef, dragPreviewRef]`:

| | |
| --- | --- |
| `collectedProps` | Результат `collect(monitor)`: производные значения для рендера (`isDragging`, `canDrag`) |
| `dragRef` | Ссылка на перетаскиваемый DOM-узел |
| `dragPreviewRef` | Ссылка на узел, который браузер покажет как «призрак» вместо самого элемента |

Второй аргумент `useDrag(spec, deps)` - зависимости, как у `useMemo`: спека
пересобирается при их изменении.

### `useDrop`

```jsx
import { useDrop } from 'react-dnd';

function Postponed({ onDropItem }) {
  const [{ isOver }, dropRef] = useDrop({
    accept: ItemTypes.PRODUCT, // строка или массив типов
    // drop возвращает объект или undefined: результат попадает в monitor.getDropResult() источника
    drop: (item) => {
      onDropItem(item.id);
    },
    collect: (monitor) => ({ isOver: monitor.isOver() }),
  });

  return (
    <section ref={dropRef} style={{ background: isOver ? '#eef' : 'transparent' }}>
      Отложенные
    </section>
  );
}
```

| Поле | Назначение |
| --- | --- |
| `accept` | Типы источников, которые зона принимает |
| `drop(item, monitor)` | Бросок; `item` - объект из `useDrag` |
| `hover(item, monitor)` | Источник над зоной; для сортировки списков (`monitor.getClientOffset()`) |
| `canDrop(item, monitor)` | Условие приема |
| `collect(monitor)` | `isOver`, `canDrop` для подсветки |

⚠️ Если `drop` вернет число или строку, библиотека бросит `Drop result must
either be an object or undefined`: например, `drop: (item) => list.push(item)`
падает из-за возвращаемой длины массива.

### Где хранить результат

Перетаскивание изменяет данные, а не только внешний вид, поэтому `drop`
обычно отправляет действие: `dispatch(moveToPostponed(item.id))` в
приложении на Redux или вызов события в Effector. Сама библиотека DnD о
состоянии приложения не знает и знать не должна - она отвечает на вопрос
«что и куда бросили», а не «что с этим делать».

---

## 7.3 `@dnd-kit`

> 📌 **`@dnd-kit`** - набор хуков для перетаскивания поверх Pointer Events:
> вместо нативных событий DnD он слушает указатель, клавиатуру или другой
> источник ввода через подключаемые сенсоры, сам считает пересечения и
> положение элементов, а разметку и стили полностью оставляет приложению.

Пакеты ставятся по надобности: `@dnd-kit/core` - контекст, хуки и сенсоры;
`@dnd-kit/sortable` - сортировка списков; `@dnd-kit/utilities` - помощник
`CSS` для перевода смещения в `transform`; `@dnd-kit/modifiers` -
ограничители движения (по оси, в пределах контейнера).

### Контекст, источник и цель

```tsx
import { DndContext, useDraggable, useDroppable, type DragEndEvent } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

function Draggable({ id, children }: { id: string; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    data: { kind: 'product' }, // произвольные данные доедут до обработчика
  });

  return (
    <div
      ref={setNodeRef}
      className={isDragging ? 'card card_dragging' : 'card'}
      style={{ transform: CSS.Translate.toString(transform) }}
      {...listeners}
      {...attributes}
    >
      {children}
    </div>
  );
}

function Droppable({ id, children }: { id: string; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div ref={setNodeRef} className={isOver ? 'zone zone_over' : 'zone'}>
      {children}
    </div>
  );
}

function Board() {
  const handleDragEnd = (event: DragEndEvent): void => {
    // Библиотека отвечает на вопрос «что и куда бросили»
    if (event.over?.id === 'cart') {
      dispatch(addToCart(String(event.active.id)));
    }
  };

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <Draggable id="candy">Леденец</Draggable>
      <Droppable id="cart">Корзина</Droppable>
    </DndContext>
  );
}
```

| Что дает хук | Назначение |
| --- | --- |
| `setNodeRef` | Ссылка на узел: библиотека измеряет его положение |
| `listeners` | Обработчики указателя и клавиатуры - вешаются на элемент или на ручку |
| `attributes` | `role`, `tabIndex`, `aria-*` для доступности |
| `transform` | Смещение за курсором; переводится в CSS помощником `CSS.Translate` |
| `isDragging` / `isOver` | Состояния для модификаторов классов |

⚠️ Нативных событий `dragstart` и `drop` здесь нет: `@dnd-kit` работает на
Pointer Events, поэтому одинаково ведет себя с мышью, касанием и пером, а
`draggable` в разметке не нужен.

### Сенсоры и доступность

```tsx
import { KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';

const sensors = useSensors(
  // Перетаскивание начнется после 8 пикселей движения: иначе обычный клик
  // по кнопке внутри карточки превратился бы в перетаскивание
  useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
);
```

`KeyboardSensor` дает то, чего у нативного DnD нет вовсе: захват по пробелу
или Enter, перемещение стрелками, отпускание пробелом или Enter, отмена по
Escape.
Тексты для скринридера задаются явно:

```tsx
<DndContext
  sensors={sensors}
  accessibility={{
    screenReaderInstructions: {
      draggable: 'Нажмите пробел, чтобы взять позицию, стрелками выберите место, пробелом опустите.',
    },
    announcements: {
      onDragStart: ({ active }) => `Взяли позицию ${String(active.id)}`,
      onDragOver: ({ active, over }) =>
        over === null ? undefined : `Позиция ${String(active.id)} над ${String(over.id)}`,
      onDragEnd: ({ active, over }) =>
        over === null
          ? `Позиция ${String(active.id)} возвращена на место`
          : `Позиция ${String(active.id)} опущена на ${String(over.id)}`,
      onDragCancel: ({ active }) => `Перетаскивание ${String(active.id)} отменено`,
    },
  }}
>
```

⚠️ В jsdom нет раскладки: размеры всех элементов нулевые, поэтому
библиотека не находит цель под источником, и `over` в `onDragEnd` равен
`null` с любым сенсором. Тест броска задает размеры источника и цели,
подменяя `getBoundingClientRect`.

### Сортировка списка

```tsx
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableRow({ id }: { id: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? 'row row_dragging' : 'row'}
    >
      {/* Ручка: перетаскивание начинается только с нее, остальное остается кликабельным */}
      <button type="button" className="row__handle" {...listeners} {...attributes}>
        ⠿
      </button>
      …
    </li>
  );
}

function List({ ids }: { ids: string[] }) {
  return (
    <SortableContext items={ids} strategy={verticalListSortingStrategy}>
      <ul>{ids.map((id) => <SortableRow key={id} id={id} />)}</ul>
    </SortableContext>
  );
}

const handleDragEnd = ({ active, over }: DragEndEvent): void => {
  if (over === null || active.id === over.id) {
    return;
  }

  dispatch(reorder(arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id)))));
};
```

⚠️ Массив `items` у `SortableContext` должен содержать **идентификаторы в
том же порядке**, в каком элементы нарисованы, а сами идентификаторы -
быть постоянными. Индекс массива в роли идентификатора ломает сортировку
сразу после первого перемещения.

`arrayMove(array, from, to)` - чистая функция из `@dnd-kit/sortable`: она
возвращает новый массив и годится прямо для редьюсера.

### `DragOverlay`

Без наложения за курсором едет сама строка списка. Чтобы за курсором ехала
отдельная копия, а строка оставалась в списке на месте будущего броска,
копию рисуют в наложении:

```tsx
<DragOverlay>{activeId === null ? null : <RowPreview id={activeId} />}</DragOverlay>
```

Идентификатор активного элемента запоминают в `onDragStart` и сбрасывают в
`onDragEnd` и `onDragCancel`.

### Определение коллизий

`collisionDetection` у `DndContext` отвечает на вопрос, над какой целью
находится источник: `rectIntersection` (по умолчанию), `closestCenter`
(подходит для сортируемых списков), `closestCorners`, `pointerWithin` (для
крупных зон и вложенных целей). Неверный алгоритм - обычная причина «зона не
принимает», когда цель заметно больше или меньше источника.

---

[← К содержанию спринта](README.md) · [Далее: анимации →](animations.md)
