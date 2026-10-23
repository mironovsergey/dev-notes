# React Router

## 3.4 Режимы и подключение

> 📌 **React Router** - библиотека клиентской (а с версии 7 - и серверной)
> маршрутизации для React, которая связывает URL с компонентами через
> конфигурацию маршрутов и синхронизирует адрес с интерфейсом поверх
> History API.

### Версии

| Версия | Год | Что изменилось |
| --- | --- | --- |
| 5 | 2019 | `Switch`, `exact`, `component`/`render`, `useHistory`, `Redirect`, `activeClassName` |
| 6 | 2021 | `Routes` с ранжированием вместо `Switch`, `element`, вложенные маршруты и `Outlet`, `useNavigate`, `Navigate` |
| 6.4 | 2022 | Data-режим: `createBrowserRouter`, `loader`/`action`, `useMatches` |
| 7 | 2024 | Слияние с Remix: один пакет `react-router`, режим framework с серверным рендером |
| 8 | 2026 | Пакет `react-router-dom` удален, ESM-only, React ≥ 19.2, middleware включено всегда |

### Три режима

| Режим | Как задаются маршруты | Когда |
| --- | --- | --- |
| **Declarative** | JSX: `<BrowserRouter><Routes><Route …>` | SPA, где данные загружают компоненты; самый простой вход |
| **Data** | Объекты: `createBrowserRouter([...])` + `<RouterProvider>`; у маршрутов есть `loader`, `action`, `handle` | SPA с загрузкой данных до рендера, редиректами в loader, хлебными крошками |
| **Framework** | Файловая конфигурация через `@react-router/dev`, серверный рендер | Полноценный фреймворк, аналог Next.js |

Тема разбирает declarative-режим. Data-режим подробно разобран в
[2.43-2.45](../sprint-2/router-data.md#243-маршрут-как-источник-данных), а
здесь показан там, где он заметно короче
([3.8](#38-хлебные-крошки-и-страница-404),
[3.12](auth.md#312-защищенные-маршруты-и-выход)).

### Подключение

```jsx
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';

import App from './app';

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
```

`BrowserRouter` подписывается на History API и предоставляет `location`
всему поддереву через контекст; хуки и компоненты роутера работают только
внутри него. Для тестов есть `MemoryRouter` с `initialEntries` - история в
памяти без `window.location`.

🕰️ Импорты `from 'react-router-dom'` - до версии 7. В версии 7 пакет
оставлен как реэкспорт ради совместимости, в 8 удален: все импортируется из
`react-router`, а `RouterProvider` для браузера - из `react-router/dom`.

---

## 3.5 Конфигурация маршрутов

> 📌 **Маршрут (route)** - пара «шаблон пути → элемент»: если URL
> соответствует шаблону, роутер рендерит элемент; вложенные маршруты
> рендерятся внутри родительского через `<Outlet>`.

```jsx
import { Routes, Route, Outlet } from 'react-router';

function Layout() {
  return (
    <>
      <Header />
      <main>
        <Outlet /> {/* сюда попадает подходящий дочерний маршрут */}
      </main>
    </>
  );
}

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="list">
          <Route index element={<List />} />
          <Route path=":country" element={<Country />} />
          <Route path=":country/:personId" element={<Person />} />
        </Route>
        <Route path="login" element={<Login />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
```

| Запись | Смысл |
| --- | --- |
| `<Route path="list">` с детьми | Префикс пути; дети получают `/list/…` |
| `<Route index element>` | Маршрут по умолчанию для родительского пути - рендерится в `Outlet` родителя на `/list` |
| `<Route element={<Layout />}>` без `path` | Layout-маршрут: добавляет обертку, не добавляя сегмента в URL |
| `:country` | Динамический сегмент; значение - в `useParams()` |
| `:personId?` | Необязательный сегмент |
| `*` | Splat: любые оставшиеся сегменты; для страницы 404 и вложенных приложений |

### Сопоставление

`Routes` выбирает **один** наиболее подходящий маршрут независимо от порядка
объявления: статический сегмент важнее динамического, динамический -
важнее splat.

🕰️ В версии 5 сопоставление шло **по порядку** и **по префиксу**: `path="/"`
совпадал с любым адресом, поэтому требовался `<Switch>` (первый подходящий)
и `exact` (полное совпадение). Элемент передавался через `component={Home}`
или `render={() => …}`, вложенность строилась вручную с `useRouteMatch`.

```jsx
// 🕰️ React Router 5
<Switch>
  <Route path="/" exact component={Home} />
  <Route path="/list" exact component={List} />
  <Route path="/list/:country" component={Country} />
  <Route component={NotFound} />
</Switch>
```

Ранжирование в 6+ убрало и `Switch`, и `exact`: `path="/"` совпадает только
с корнем, а более конкретный маршрут выигрывает всегда.

---

## 3.6 Навигация

| Средство | Когда |
| --- | --- |
| `<Link to>` | Обычная ссылка |
| `<NavLink to>` | Ссылка в меню: получает класс `active` и `aria-current="page"` при совпадении с текущим адресом |
| `useNavigate()` | Переход из кода: после отправки формы, по таймеру, после выхода |
| `<Navigate to>` | Редирект, выраженный разметкой: рендер этого элемента и есть переход |

```jsx
import { Link, NavLink, useNavigate, Navigate } from 'react-router';

<Link to="/list">Все лауреаты</Link>

<nav>
  <NavLink to="/" end>Главная</NavLink>
  <NavLink to="/list" className={({ isActive }) => (isActive ? 'menu__link menu__link_active' : 'menu__link')}>
    Лауреаты
  </NavLink>
</nav>
```

`Link` рендерит `<a href>` и перехватывает клик - с сохранением открытия в
новой вкладке и клавиатурной навигации, как в
[3.3](routing.md#33-собственный-маршрутизатор). `to` может быть строкой или
объектом `{ pathname, search, hash }`; относительный `to="edit"` строится
от пути текущего маршрута.

**`NavLink`** активна, когда текущий адрес **начинается** с ее `to`:
`/list` активна и на `/list/sweden`. Для «точных» пунктов - `end`; ссылку на
корень `/` роутер и без него считает активной только на главной. Класс
задается строкой, функцией
`({ isActive, isPending }) => …` или `style`-функцией. 🕰️ `activeClassName`
из версии 5 удален в 6.

**`useNavigate`** возвращает функцию: `navigate('/list')`, `navigate(-1)`
(назад), `navigate('/login', { replace: true, state: { from } })`.
🕰️ В версии 5 - `useHistory()` с `history.push` / `history.replace`.

**`<Navigate>`** - компонент: как только он отрендерился, происходит
переход. Удобен для условий в разметке:
`if (!user) { return <Navigate to="/login" replace />; }`.
🕰️ В версии 5 - `<Redirect to>`.

✅ Для действий пользователя - `Link`/`NavLink`: у них есть `href`,
контекстное меню, средняя кнопка мыши. `useNavigate` - только там, где
переход инициирует код, а не клик.

---

## 3.7 Параметры, query и `location`

> 📌 **`useParams()`** - хук, возвращающий объект значений динамических
> сегментов текущего маршрута: для `path=":country/:personId"` и адреса
> `/list/sweden/42` - `{ country: 'sweden', personId: '42' }`.

Значения всегда строки; число приводится явно. Параметр - часть **пути**, и
маршрут без него не совпадет.

> 📌 **`useSearchParams()`** - хук, возвращающий пару
> `[URLSearchParams, setSearchParams]` для части адреса после `?`.

Query-параметры - для того, что не определяет страницу, а уточняет ее
состояние: фильтр, сортировка, страница списка, поисковый запрос. Хранить
их в URL, а не в `useState`, - значит получить закладки, кнопку «назад» и
ссылку на результат бесплатно.

```jsx
import { useSearchParams } from 'react-router';

function SearchBox() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') ?? '';

  const handleChange = (e) => {
    const value = e.target.value;
    // Пустой запрос убирает параметр из URL вместо ?q=; replace не засоряет историю
    setSearchParams(value ? { q: value } : {}, { replace: true });
  };

  return <input value={query} onChange={handleChange} />;
}
```

Поле управляемое ([1.26](../sprint-1/events-and-forms.md#126-управляемые-и-неуправляемые-элементы-форм)),
но источник истины - URL: состояние `useState` не нужно.

⚠️ Роутер по умолчанию применяет смену адреса в переходе
(`startTransition`), а значение управляемого поля React восстанавливает
сразу после события: до завершения перехода в поле видно прежнее значение,
и курсор может перескочить в конец. Для поля, связанного с URL, переходы
отключают: `<BrowserRouter useTransitions={false}>`.

🕰️ В версии 5 `useSearchParams` не было: строка бралась из
`useLocation().search` и разбиралась `new URLSearchParams(search)`, а
записывалась через `history.replace({ search: '?q=…' })` в эффекте.

> 📌 **`useLocation()`** - хук, возвращающий текущий объект `location`:
> `pathname`, `search`, `hash`, `state` (данные, переданные при
> навигации) и `key` (уникальный идентификатор записи истории).

`location.state` - данные, которые едут вместе с переходом, но не видны в
URL: откуда пришел пользователь ([3.12](auth.md#312-защищенные-маршруты-и-выход)),
позиция прокрутки, черновик. Они хранятся в `history.state`
([3.2](routing.md#32-history-api)) и переживают «назад»/«вперед», но не
прямой заход по адресу.

`useMatch(pattern)` проверяет текущий адрес по шаблону и возвращает
параметры или `null`: например, на `/list/sweden` `useMatch('/list/:country')`
дает `{ params: { country: 'sweden' }, pathname: '/list/sweden', … }`.
🕰️ В версии 5 - `useRouteMatch`.

---

## 3.8 Хлебные крошки и страница 404

### Страница 404

Маршрут `<Route path="*" element={<NotFound />} />` совпадает с любым
адресом, для которого нет более точного маршрута. В `NotFound` адрес
берется из `useLocation().pathname`, чтобы показать, что именно не найдено,
и дать ссылку на главную. В data-режиме той же цели служит `errorElement` -
он же показывает ошибки загрузчиков.

Splat можно вложить: дочерний `<Route path="*">` внутри `<Route path="list">`
перехватит неизвестные адреса только внутри раздела и покажет 404 внутри его
раскладки.

### Хлебные крошки

> 📌 **Хлебные крошки (breadcrumbs)** - навигационная цепочка от корня до
> текущей страницы, повторяющая иерархию маршрутов.

Раз цепочка повторяет иерархию маршрутов, ее нужно **вычислять из
маршрутов**, а не хранить в состоянии и не передавать через `location.state`
от страницы к странице: состояние теряется при прямом заходе по адресу и
расходится с реальным путем.

В data-режиме у каждого маршрута есть поле `handle` для произвольных данных,
а `useMatches()` возвращает все совпавшие маршруты от корня до текущего:

```jsx
import { createBrowserRouter, Link, Outlet, useMatches } from 'react-router';
import { RouterProvider } from 'react-router/dom';

function Crumbs() {
  const matches = useMatches();
  const crumbs = matches.filter((m) => m.handle?.crumb);

  return (
    <nav aria-label="Хлебные крошки">
      {crumbs.map((m, i) => (
        <span key={m.id}>
          {i < crumbs.length - 1 ? <Link to={m.pathname}>{m.handle.crumb(m)}</Link> : m.handle.crumb(m)}
          {i < crumbs.length - 1 ? ' › ' : ''}
        </span>
      ))}
    </nav>
  );
}

function Root() {
  return (
    <>
      <Crumbs />
      <Outlet />
    </>
  );
}

const router = createBrowserRouter([
  {
    path: '/',
    Component: Root,
    handle: { crumb: () => 'Главная' },
    children: [
      { index: true, Component: Home },
      {
        path: 'list',
        handle: { crumb: () => 'Лауреаты' },
        children: [
          { index: true, Component: List },
          // Крошка вычисляется из параметров совпавшего маршрута
          { path: ':country', Component: Country, handle: { crumb: (m) => m.params.country } },
        ],
      },
      { path: '*', Component: NotFound },
    ],
  },
]);

<RouterProvider router={router} />
```

На `/list/sweden` цепочка выглядит так: `Главная › Лауреаты › sweden`.
Последняя крошка - текст, остальные - ссылки на `m.pathname` совпавшего
маршрута.

В declarative-режиме `useMatches` недоступен; крошки собираются из
`useLocation().pathname.split('/')` с таблицей «сегмент → название» - проще,
но для динамических сегментов нужен отдельный запрос названия.

⚠️ Когда у маршрутов есть `loader`, `RouterProvider` при первом рендере
ждет данные и без `HydrateFallback` пишет предупреждение в консоль; для
маршрутов без загрузчиков это не требуется.

---

[← Маршрутизация в SPA и History API](routing.md) · [К содержанию спринта](README.md) ·
[Далее: безопасность →](auth.md)
