# Тестирование компонентов

## 6.5 Testing Library: рендер и запросы

> 📌 **Testing Library** - набор библиотек для тестирования интерфейса через
> DOM так, как его воспринимает пользователь: элементы ищутся по роли,
> подписи и тексту, а не по классам и структуре компонентов; внутреннее
> состояние компонента намеренно недоступно.

```tsx
import { test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Counter } from './counter';

test('shows the initial value and increments on click', async () => {
  const user = userEvent.setup();
  render(<Counter initial={0} />);

  // Запрос по роли: так элемент находит пользователь и screen reader
  expect(screen.getByRole('status')).toHaveTextContent('0');

  await user.click(screen.getByRole('button', { name: '+' }));
  await user.click(screen.getByRole('button', { name: '+' }));
  await user.click(screen.getByRole('button', { name: '−' }));

  expect(screen.getByRole('status')).toHaveTextContent('1');
});
```

`render` монтирует компонент в `document.body` jsdom; `screen` - объект с
запросами ко всему документу. Компонент `Counter` здесь - `<output>` для
значения (роль `status`) и две кнопки; проверяется не состояние `count`, а
то, что показано и что стало после кликов.

### Приоритет запросов

| Запрос | Ищет по | Когда |
| --- | --- | --- |
| `getByRole('button', { name: 'Найти' })` | Роли доступности и доступному имени | ✅ Основной: так элемент видят и пользователь, и вспомогательные технологии; заодно проверяет доступность |
| `getByLabelText('Запрос')` | Подписи поля формы | Поля ввода |
| `getByPlaceholderText`, `getByText`, `getByDisplayValue` | Тексту | Когда роли и подписи нет |
| `getByAltText`, `getByTitle` | Атрибутам изображений и подсказкам | Изображения |
| `getByTestId('count')` | `data-testid` | Последнее средство: элемент без семантики и текста |

Роли берутся из HTML: `button`, `link`, `heading`, `textbox`, `checkbox`,
`list`/`listitem`, `status` (`<output>`, `role="status"`), `alert`, `form` (у
`<form>` с доступным именем), `region` (`<section>` с именем). Тест,
написанный через роли, не проходит, если кнопка сделана из `<div>` без
роли, - и это правильно: пользователь клавиатуры ее тоже не найдет.

### Три семейства

| Семейство | Нет элемента | Несколько | Асинхронность |
| --- | --- | --- | --- |
| `getBy*` | Бросает ошибку с дампом DOM | Бросает | Нет |
| `queryBy*` | Возвращает `null` | Бросает | Нет |
| `findBy*` | Ждет до 1000 мс, затем бросает | Бросает | Возвращает промис |

`getAllBy*`, `queryAllBy*`, `findAllBy*` - то же для списков.
`screen.getByRole('heading')` в компоненте без заголовка падает с
`Unable to find an accessible element with the role "heading"` и печатает
разметку, а `queryByRole('heading')` дает `null` - им проверяют отсутствие.

`within(container)` ограничивает запросы поддеревом:
`within(form).getByRole('button')` находит кнопку именно этой формы.

---

## 6.6 Действия, формы и асинхронность

> 📌 **`user-event`** - библиотека Testing Library, которая воспроизводит
> действия пользователя как последовательность событий браузера: клик - это
> `pointerdown`, `mousedown`, `focus`, `pointerup`, `mouseup`, `click`; ввод -
> нажатия клавиш с обновлением значения поля.

```tsx
import { vi } from 'vitest';

test('submit button is disabled for an empty query and submits the trimmed value', async () => {
  const user = userEvent.setup();
  const onSearch = vi.fn();
  render(<SearchForm onSearch={onSearch} />);

  const button = screen.getByRole('button', { name: 'Найти' });
  expect(button).toBeDisabled();

  await user.type(screen.getByLabelText('Запрос'), '  Кюри  ');
  expect(button).toBeEnabled();
  await user.keyboard('{Enter}'); // отправка формы клавишей, как это делает пользователь

  expect(onSearch).toHaveBeenCalledWith('Кюри');
});
```

| | `user-event` | `fireEvent` |
| --- | --- | --- |
| Что делает | Цепочку событий, как браузер: фокус, нажатия, `input`, `change` | Одно синтетическое событие |
| `disabled` | Уважает: клик по недоступной кнопке ничего не вызывает | Событие отправляется в любом случае; обработчики мыши недоступного элемента отсекает уже React |
| Асинхронность | `await` на каждое действие | Синхронно |
| Когда | ✅ По умолчанию | Событие, которое `user-event` не воспроизводит: `scroll`, `load`, произвольные `CustomEvent` |

`userEvent.setup()` вызывается в начале теста; методы - `click`, `dblClick`,
`type`, `clear`, `keyboard`, `selectOptions`, `upload`, `hover`, `tab`.

### Проверка обработчиков

Обработчик из props заменяется `vi.fn()` и проверяется факт и аргументы
вызова:

```tsx
const onOpen = vi.fn();
render(<Link title="Рецепт пельменей" url="https://pelmeni.gov" onOpen={onOpen} />);
await user.click(screen.getByRole('link', { name: 'Рецепт пельменей' }));
expect(onOpen).toHaveBeenCalledTimes(1);
expect(onOpen).toHaveBeenCalledWith('https://pelmeni.gov');
```

> 📌 **`vi.fn()`** - функция-заглушка, которая записывает все свои вызовы
> (`mock.calls`) и возвращает заданное значение (`mockReturnValue`,
> `mockResolvedValue`); матчеры `toHaveBeenCalled*` проверяют записи.

Браузерный API, который компонент вызывает сам (`window.alert`,
`navigator.clipboard`), подменяется `vi.spyOn(window, 'alert')
.mockImplementation(() => {})` - и восстанавливается `mockRestore()` в конце.

### Состояние проверяется через эффект

Внутреннее состояние компонента тесту недоступно - и не нужно: проверяется
его **проявление**. Для счетчика это текст в `<output>`; для формы -
доступность кнопки; для списка - число элементов. Если проявления нет,
состояние либо лишнее, либо тест нужно писать на уровне выше.

### Асинхронные изменения

Компонент, который показывает результат после запроса или таймера,
проверяется ожиданием:

```tsx
render(<Delayed />);
expect(screen.queryByText('Готово')).toBeNull();
expect(await screen.findByText('Готово')).toBeInTheDocument(); // опрос до появления, по умолчанию до 1000 мс
await waitFor(() => expect(screen.queryByText('Ждем…')).toBeNull());
```

`findBy*` - для появления элемента; `waitFor(callback)` - для любого
условия: повторяет `callback`, пока тот не перестанет бросать. ❌ `setTimeout`
в тесте «чтобы подождать» - хрупко и медленно; ожидание должно быть
привязано к условию.

**Предупреждение `act`**: Testing Library оборачивает `render`, действия
`user-event` и `findBy*` в `act` сама; предупреждение
`An update to X inside a test was not wrapped in act(...)` означает, что
обновление состояния произошло вне этих вызовов - обычно после
завершения теста (незавершенный запрос, таймер) или из-за прямого вызова
`fireEvent` вместо ожидания. Лечится ожиданием результата (`findBy`,
`waitFor`), а не оборачиванием всего подряд в `act`.

---

## 6.7 Снапшоты

> 📌 **Снапшот-тест** - тест, который при первом запуске сохраняет
> результат (обычно сериализованную разметку) в файл, а при следующих
> сравнивает новый результат с сохраненным; любое расхождение - падение.

```tsx
test('DOM snapshot of a presentational component', () => {
  const { asFragment } = render(<Link title="Рецепт пельменей" url="https://pelmeni.gov" />);
  expect(asFragment()).toMatchSnapshot();
});
```

Первый запуск создает `__snapshots__/link.test.tsx.snap`:

```
// Vitest Snapshot v1, https://vitest.dev/guide/snapshot.html

exports[`DOM snapshot of a presentational component 1`] = `
<DocumentFragment>
  <a
    href="https://pelmeni.gov"
  >
    Рецепт пельменей
  </a>
</DocumentFragment>
`;
```

Файл снапшота попадает в репозиторий и проверяется на code review, как
код: изменение снапшота - это изменение поведения. Обновление после
намеренной правки - `vitest run -u` (или `u` в режиме наблюдения).

**Инлайн-снапшот** держит эталон в самом тесте - раннер вписывает его при
первом запуске:

```tsx
expect(container.innerHTML).toMatchInlineSnapshot(`"<a href="/p">Пельмени</a>"`);
```

🕰️ `react-test-renderer` с `.create(<Link />).toJSON()` - способ до Testing
Library; в React 19 пакет объявлен устаревшим. `asFragment()` из `render`
дает такой же снимок, но построенный по реальному DOM.

### Границы применимости

| Снапшот уместен | Снапшот вреден |
| --- | --- |
| Небольшой презентационный компонент без логики | Большой компонент: сотни строк, которые никто не читает |
| Сериализованный вывод функции (форматирование, генерация разметки) | Компонент с датами, случайными идентификаторами, данными сети |
| Защита от случайного изменения разметки | Замена содержательным проверкам: снапшот говорит «что-то изменилось», но не «что должно быть» |

Снапшоты обновляют не глядя, когда их много и они большие, - и тогда они не
защищают ни от чего. ✅ Правило: снапшот маленький, читаемый в diff и
дополняет, а не заменяет утверждения о поведении.

---

## 6.8 Заглушки: модули, время, сеть; тестирование хуков

### Модули и время

| Инструмент | Что заменяет | Пример |
| --- | --- | --- |
| `vi.fn()` | Функцию | Callback-prop, обработчик |
| `vi.spyOn(obj, 'method')` | Метод существующего объекта, с восстановлением | `window.alert`, `console.error`, `globalThis.fetch` |
| `vi.mock('./api')` | Модуль целиком (поднимается в начало файла) | Модуль с запросами, тяжелая библиотека |
| `vi.useFakeTimers()` | `setTimeout`, `setInterval`, `Date` | Debounce, опрос, анимации |

```tsx
import { renderHook, act } from '@testing-library/react';

test('renderHook + fake timers', () => {
  vi.useFakeTimers();
  const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), { initialProps: { value: 'a' } });
  expect(result.current).toBe('a');

  rerender({ value: 'ab' });
  expect(result.current).toBe('a'); // еще не прошло 300 мс
  act(() => { vi.advanceTimersByTime(299); });
  expect(result.current).toBe('a');
  act(() => { vi.advanceTimersByTime(1); });
  expect(result.current).toBe('ab');
  vi.useRealTimers();
});
```

> 📌 **`renderHook`** - функция Testing Library, которая вызывает хук внутри
> служебного компонента и отдает его результат через `result.current`;
> `rerender` меняет входные данные, а обертка `wrapper` подставляет
> провайдеры.

Хук тестируется напрямую, когда его логика самостоятельна (debounce,
подписка, форма); хук, существующий ради одного компонента, проверяется
через этот компонент. Ручное продвижение времени оборачивается в `act`:
обновление состояния должно быть применено до проверки. ⚠️ Фейковые
таймеры и `user-event` конфликтуют: `userEvent.setup({ advanceTimers:
vi.advanceTimersByTime })` связывает их.

### Провайдеры

Компонент, читающий хранилище или маршрутизатор, рендерится внутри тех же
провайдеров, что и в приложении, - с тестовым хранилищем и
`MemoryRouter`:

```tsx
render(
  <Provider store={makeStore(fakeApi)}>
    <MemoryRouter initialEntries={['/cart']}>
      <Cart />
    </MemoryRouter>
  </Provider>
);
```

Повторяющуюся обертку выносят в функцию `renderWithProviders(ui, { store,
route })`; `renderHook` принимает ее через `wrapper`.

### Сеть: MSW

> 📌 **MSW (Mock Service Worker)** - библиотека, которая перехватывает
> запросы на уровне сети (в тестах - через подмену `fetch`/`XHR` в Node.js,
> в браузере - через service worker) и отвечает по описанным
> обработчикам; код приложения при этом остается нетронутым и делает
> настоящие `fetch`.

```tsx
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

// Обработчики по умолчанию: «сервер» для всех тестов файла
const server = setupServer(
  http.get('/api/laureates', () => HttpResponse.json([{ id: '1', name: 'Мария Кюри' }, { id: '2', name: 'Нильс Бор' }]))
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => { server.resetHandlers(); cleanup(); });
afterAll(() => server.close());

test('renders the list from the API', async () => {
  render(<Laureates />);
  expect(screen.getByRole('status')).toHaveTextContent('Загрузка…');
  const list = await screen.findByRole('list', { name: 'Лауреаты' });
  expect(list.children).toHaveLength(2);
});

test('shows the error state on 500', async () => {
  // Переопределение обработчика только для этого теста
  server.use(http.get('/api/laureates', () => HttpResponse.json({ message: 'boom' }, { status: 500 })));
  render(<Laureates />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Ошибка: 500');
});
```

Запрос по адресу без обработчика при `onUnhandledRequest: 'error'`
завершается ошибкой, а MSW печатает его в консоли: неожиданный запрос сразу
заметен.

Почему MSW, а не заглушка `fetch`: компонент не знает, что тестируется,
обработчики описывают API один раз и переиспользуются в тестах, в
Storybook и при разработке без бэкенда, а смена `fetch` на `axios` тестов
не ломает. Заглушка `fetch` остается для точечных модульных тестов
функции-обертки:

```tsx
const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
  new Response(JSON.stringify([{ id: '1', name: 'Кюри' }]), { status: 200, headers: { 'Content-Type': 'application/json' } })
);
render(<Laureates />);
expect(await screen.findByText('Кюри')).toBeInTheDocument();
expect(spy).toHaveBeenCalledWith('/api/laureates');
spy.mockRestore();
```

🕰️ `fetch-mock` и `jest.spyOn(global, 'fetch')` с самодельным объектом
`{ ok: true, json: () => … }` - тот же прием до MSW; настоящий `Response`
точнее подделки: `res.ok`, `status`, `headers` ведут себя как в браузере.

---

[← Подходы, виды тестов и инструменты](basics.md) · [К содержанию спринта](README.md) ·
[Далее: тестирование Redux и сквозные тесты →](redux-and-e2e.md)
