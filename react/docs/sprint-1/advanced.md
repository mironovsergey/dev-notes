# Границы ошибок, порталы и HOC

## 1.28 Границы ошибок

Исключение, брошенное в рендере, по умолчанию разрушает все дерево: React
не может показать половину интерфейса и размонтирует корень. Граница ошибок
локализует последствия.

> 📌 **Граница ошибок (error boundary)** - классовый компонент, который
> перехватывает ошибки, возникшие при рендере, в эффектах, методах
> жизненного цикла и конструкторах любого компонента его поддерева, и вместо
> сломанного поддерева показывает запасной интерфейс.

```jsx
import { Component } from 'react';

class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    // Фаза рендера: только возврат нового состояния, без побочных эффектов
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Фаза коммита: здесь допустимы побочные эффекты - отправка в систему логирования
    this.props.onError(error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

<ErrorBoundary fallback={<h1>Что-то пошло не так</h1>} onError={logError}>
  <Broken />
</ErrorBoundary>
```

Два метода делят работу по фазам обновления
([1.4](fundamentals.md#14-virtual-dom-и-согласование)):

| Метод | Фаза | Аргументы | Назначение |
| --- | --- | --- | --- |
| `static getDerivedStateFromError(error)` | Рендер | Ошибка | Вернуть состояние для запасного интерфейса; побочные эффекты запрещены |
| `componentDidCatch(error, info)` | Коммит | Ошибка и `info.componentStack` - строка с цепочкой компонентов до места ошибки | Логирование, отправка отчета |

### Что граница не ловит

| Источник ошибки | Ловится? | Почему |
| --- | --- | --- |
| Рендер, эффекты, конструкторы и методы жизненного цикла потомков | Да | Их вызывает сам React при рендере и коммите |
| Обработчики событий | ❌ Нет | Вызываются вне рендера; React уже знает, что показывать |
| Асинхронный код: `setTimeout`, промисы, `fetch` | ❌ Нет | Выполняются после завершения рендера |
| Серверный рендер | ❌ Нет | Другой механизм |
| Сама граница | ❌ Нет | Ошибка уходит к ближайшей границе выше |

Ошибка, брошенная в `onClick` внутри границы, запасной интерфейс не
показывает: кнопка остается на экране, а ошибка доходит до `window`
(событие `error`). Такие ошибки обрабатываются в самом обработчике:

```jsx
function SaveButton({ save }) {
  const [error, setError] = useState(null);

  const handleClick = () => {
    try {
      save();
      setError(null);
    } catch (e) {
      // Ошибка обработчика переводится в состояние и показывается в разметке
      setError(e.message);
    }
  };

  return (
    <>
      <button onClick={handleClick}>Сохранить</button>
      {error && <p role="alert">{error}</p>}
    </>
  );
}
```

Ошибка из асинхронного кода тем же способом переводится в состояние, а если
ее нужно показать через границу - бросается в рендере: `if (error) { throw
error; }`.

### Только класс

Хука-аналога у `getDerivedStateFromError` и `componentDidCatch` нет: это
единственный случай, где React 19 требует класс
([1.6](components.md#16-компонент)). На практике класс пишется один раз или
берется из библиотеки `react-error-boundary`, которая добавляет `fallbackRender`
с функцией сброса для кнопки «повторить», сброс границы по изменению
`resetKeys` и хук `useErrorBoundary` для проброса ошибок из обработчиков.

### Размещение

Границ обычно несколько, на разной глубине: одна вокруг всего приложения
(«страница недоступна»), отдельные вокруг независимых виджетов (сломанный
график не должен прятать таблицу рядом). Граница вокруг каждого компонента -
перебор: интерфейс распадается на набор заглушек.

### React 19: обработчики ошибок корня

С React 19 перехваченные ошибки не выбрасываются повторно и логируются один
раз; `createRoot` принимает обработчики:

```jsx
const root = createRoot(container, {
  onCaughtError: (error, info) => report('caught', error, info.componentStack),
  onUncaughtError: (error, info) => report('uncaught', error, info.componentStack),
  onRecoverableError: (error, info) => report('recoverable', error),
});
```

`onCaughtError` - ошибка, перехваченная границей; `onUncaughtError` - ошибка
без границы, разрушившая дерево; `onRecoverableError` - ошибка, которую
React исправил сам (например, расхождение при гидратации).

---

## 1.29 Порталы

> 📌 **Портал** - способ отрендерить дочерние элементы в DOM-узел вне
> DOM-иерархии родительского компонента, сохранив их место в дереве React.
> Создается вызовом `createPortal(children, domNode, key?)` из `react-dom`.

Зачем: модальные окна, всплывающие подсказки, уведомления должны рисоваться
поверх всего, а их родитель может иметь `overflow: hidden`, `transform` или
собственный `z-index`, которые обрежут или спрячут вложенный элемент. Портал
выводит разметку в отдельный контейнер на уровне `body`, где этих ограничений
нет.

```html
<body>
  <div id="root"></div>            <!-- корень приложения -->
  <div id="react-modals"></div>    <!-- контейнер для модальных окон -->
</body>
```

```jsx
import { useState } from 'react';
import { createPortal } from 'react-dom';

function Modal({ children, onClose }) {
  // Контейнер ищется при рендере, а не при загрузке модуля: к этому моменту DOM гарантированно готов
  const modalRoot = document.getElementById('react-modals');

  return createPortal(
    <div className="modal">
      {children}
      <button onClick={onClose}>Закрыть</button>
    </div>,
    modalRoot
  );
}

function App() {
  const [visible, setVisible] = useState(false);

  return (
    <div style={{ overflow: 'hidden' }}>
      <button onClick={() => setVisible(true)}>Открыть</button>
      {visible && (
        <Modal onClose={() => setVisible(false)}>
          <p>Спасибо за внимание!</p>
        </Modal>
      )}
    </div>
  );
}
```

### Дерево React против дерева DOM

```
   дерево React                   дерево DOM
   ───────────────                ─────────────────────────
   App                            body
   └── div (overflow: hidden)     ├── #root
       ├── button «Открыть»       │   └── div (overflow: hidden)
       └── Modal ─ портал ─┐      │       └── button «Открыть»
           └── div.modal   │      └── #react-modals
                           └───►      └── div.modal
```

Портал переносит только DOM-узлы. В дереве React `Modal` остается потомком
`App`: контекст ([2.2](../sprint-2/context-and-reducer.md#22-контекст))
доступен, границы ошибок работают, а **события всплывают по дереву React**
([1.23](events-and-forms.md#123-синтетические-события)).
⚠️ `onClick` на `div` с `overflow: hidden` получает и клики внутри
модального окна, хотя в DOM окно лежит вне этого `div`. Клик по фону для
закрытия окна ставится на сам фон, а не на родителя.

❌ Контейнер иногда ищут на уровне модуля - `const modalRoot =
document.getElementById(…)` до объявления компонента. Если модуль
загружается до готовности DOM (скрипт в `<head>`), это дает `null`, а при
серверном рендере `document` не определен вовсе. Поиск при рендере решает
первую проблему, контейнер, созданный в эффекте, - обе.

Что портал не делает: не управляет фокусом и не блокирует прокрутку фона -
это остается на разработчике или библиотеке. Для модальных окон существует
нативный `<dialog>` с методом `showModal()`, который решает фокус и слой
показа средствами браузера; портал остается инструментом для остальных
случаев.

---

## 1.30 Компоненты высшего порядка (HOC)

> 📌 **Компонент высшего порядка (higher-order component, HOC)** - функция,
> которая принимает компонент и возвращает новый компонент, добавляющий к
> исходному данные или поведение через композицию, не изменяя его.

Название - по аналогии с функциями высшего порядка. Соглашение об именах:
`withSomething`. HOC не компонент и не часть API React, а паттерн: React
ничего о нем не знает.

```jsx
import { useState, useEffect } from 'react';

/**
 * Возвращает компонент, который загружает данные по url и передает их в WrappedComponent.
 * Общая логика загрузки живет в одном месте, оборачиваемый компонент о ней не знает.
 */
function withFetch(url) {
  return function wrap(WrappedComponent) {
    function WithFetch(props) {
      const [state, setState] = useState({ isLoading: true, hasError: false, data: [] });

      useEffect(() => {
        let ignore = false;
        fetch(url)
          .then((res) => res.json())
          .then((data) => {
            if (!ignore) {
              setState({ isLoading: false, hasError: false, data });
            }
          })
          .catch(() => {
            if (!ignore) {
              setState({ isLoading: false, hasError: true, data: [] });
            }
          });
        return () => {
          ignore = true;
        };
      }, []);

      return <WrappedComponent {...props} {...state} />;
    }

    // Имя для React DevTools: withFetch(FilmList) вместо одинакового для всех WithFetch
    WithFetch.displayName = `withFetch(${WrappedComponent.displayName || WrappedComponent.name})`;
    return WithFetch;
  };
}

function FilmList({ isLoading, hasError, data }) {
  if (isLoading) {
    return <p>Загрузка…</p>;
  }
  if (hasError) {
    return <p>Произошла ошибка</p>;
  }
  return <ul>{data.map((film) => <li key={film.id}>{film.nameRU}</li>)}</ul>;
}

const FilmListWithFetch = withFetch('https://api.nomoreparties.co/beatfilm-movies')(FilmList);
```

`FilmList` - чистое представление: получает `isLoading`, `hasError`, `data` и
не знает, откуда они.

Правила аккуратного HOC: пробрасывать все входящие props
(`{...props}`), не изменять оборачиваемый компонент (не патчить его
прототип), задавать `displayName`, ❌ не вызывать HOC внутри рендера -
результат будет новым типом на каждом рендере
([1.6](components.md#16-компонент)).

### Проблемы паттерна

- **Вложенность оберток**: `withRouter(withTheme(connect(...)(Page)))` - в
  DevTools дерево из оберток, в коде - неясно, откуда какой prop.
- **Коллизии имен props**: две обертки, передающие `data`, перезаписывают
  друг друга.
- **Неявный контракт**: по сигнатуре `FilmList` не видно, что `data` придет
  из HOC, а не от родителя.
- **Статические методы и `ref`** оборачиваемого компонента теряются (для
  `ref` до React 19 требовался `forwardRef`).

### Хук вместо HOC

✅ С хуками та же логика записывается функцией, которую компонент вызывает
сам, - без обертки, без коллизий и с явными именами:

```jsx
/** Та же логика в виде хука: компонент сам решает, что делать с данными. */
function useFetch(url) {
  const [state, setState] = useState({ isLoading: true, hasError: false, data: [] });

  useEffect(() => {
    let ignore = false;
    fetch(url)
      .then((res) => res.json())
      .then((data) => { if (!ignore) { setState({ isLoading: false, hasError: false, data }); } })
      .catch(() => { if (!ignore) { setState({ isLoading: false, hasError: true, data: [] }); } });
    return () => { ignore = true; };
  }, [url]);

  return state;
}

function Films() {
  const { isLoading, hasError, data } = useFetch('https://api.nomoreparties.co/beatfilm-movies');
  return <FilmList isLoading={isLoading} hasError={hasError} data={data} />;
}
```

| | HOC | Хук |
| --- | --- | --- |
| Где логика | Снаружи компонента | Внутри компонента |
| Как передаются данные | Неявно, через props обертки | Явно, возвращаемым значением |
| Композиция нескольких | Вложенные вызовы | Несколько вызовов подряд |
| Может менять разметку вокруг компонента | Да | Нет: хук разметку не возвращает |
| Статус | Паттерн старого кода и библиотек | ✅ Основной способ переиспользования логики |

Единственное, чего хук не умеет, - обернуть компонент разметкой или заменить
его целиком без участия самого компонента. Поэтому HOC остаются в API
библиотек: `memo` из `react`
([1.18](state-and-lifecycle.md#118-чистые-компоненты-memo-и-purecomponent)),
`connect` из `react-redux` ([2.13](../sprint-2/react-redux.md#213-connect)),
🕰️ `withRouter` из React Router 5.

### Когда HOC не нужен

- Логика встречается в одном компоненте: обертка - лишний слой.
- Каждому обернутому компоненту нужна своя настройка поведения: HOC
  обрастает условиями, хук с аргументами читается проще.
- Обертке приходится передавать много props: контракт становится
  необозримым.

---

[← События и формы](events-and-forms.md) · [К содержанию спринта](README.md)
