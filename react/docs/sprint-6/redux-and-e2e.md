# Тестирование Redux и сквозные тесты

## 6.9 Тестирование Redux

### Редьюсер и селекторы

> 📌 **Тест редьюсера** - вызов чистой функции `reducer(state, action)` с
> подготовленным состоянием и сравнение результата с ожидаемым объектом;
> хранилище, компоненты и заглушки не нужны.

```ts
import { describe, test, expect } from 'vitest';
import { cartSlice, initialState, increase, decrease, remove, applyPromo, selectTotal, type Item } from './cart-slice';

const items: Item[] = [
  { id: 'a', text: 'Кофе', price: 300, qty: 1 },
  { id: 'b', text: 'Чай', price: 100, qty: 2 },
];

describe('cart reducer', () => {
  const { reducer } = cartSlice;

  test('returns the initial state for an unknown action', () => {
    expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  test('increase / decrease change qty and never go below 1', () => {
    const state = { ...initialState, items };
    const afterIncrease = reducer(state, increase('a'));
    expect(afterIncrease.items[0]?.qty).toBe(2);
    expect(state.items[0]?.qty).toBe(1); // исходное состояние не изменено

    const afterDecrease = reducer(reducer(afterIncrease, decrease('a')), decrease('a'));
    expect(afterDecrease.items[0]?.qty).toBe(1);
  });

  test('remove drops the item', () => {
    const next = reducer({ ...initialState, items }, remove('a'));
    expect(next.items.map((i) => i.id)).toEqual(['b']);
  });

  test('selectTotal applies the promo discount', () => {
    const state = reducer({ ...initialState, items }, applyPromo(10));
    expect(selectTotal({ cart: state })).toBe(450); // (300 + 200) * 0.9
  });
});
```

Что здесь проверяется помимо результата: **исходное состояние не
мутировано** (`state.items[0]?.qty` остался `1`) - Immer гарантирует это
для `createSlice`, а для ручного редьюсера такая проверка ловит `push` и
присваивания ([2.8](../sprint-2/redux.md#28-редьюсеры-и-combinereducers)).
`toEqual` сравнивает объекты по содержимому; `toBe` - по ссылке, для
объектов почти всегда не то, что нужно.

Генераторы экшенов из `createSlice` тестировать не нужно: их порождает
библиотека. 🕰️ Тест вида `expect(setPrice(100)).toEqual({ type:
'SET_PRICE', price: 100 })` имел смысл для рукописных генераторов.

### Thunk с настоящим хранилищем

> 📌 **Тест thunk** - отправка thunk в настоящее хранилище с подмененным
> API (через `extraArgument`) и проверка итогового состояния или
> последовательности действий.

```ts
test('success: pending → fulfilled, items in the store', async () => {
  const store = makeStore({ fetchItems: async () => items });
  const seen: string[] = [];
  store.subscribe(() => seen.push(store.getState().cart.status));

  const result = await store.dispatch(fetchItems());

  expect(fetchItems.fulfilled.match(result)).toBe(true);
  expect(seen).toEqual(['loading', 'succeeded']);
  expect(store.getState().cart.items).toEqual(items);
});

test('failure: rejected with the error message', async () => {
  const store = makeStore({ fetchItems: async () => { throw new Error('Нет сети'); } });
  const result = await store.dispatch(fetchItems());
  expect(fetchItems.rejected.match(result) && result.payload).toBe('Нет сети');
  expect(store.getState().cart.status).toBe('failed');
});
```

Фабрика `makeStore(api)` из [4.18](../sprint-4/redux.md#418-redux-toolkit)
здесь окупается: каждый тест получает чистое хранилище и свою заглушку API
без `vi.mock`. Проверять можно двумя способами: **итоговое состояние**
(предпочтительно: важно, что получилось) или **последовательность
действий** через `subscribe` или логирующее middleware (когда важен
порядок, например `loading` до `succeeded`).

🕰️ `redux-mock-store` создавал «хранилище», которое **не выполняет
редьюсеры**, а только записывает действия: проверить можно было лишь
список `getActions()`, но не состояние. С `configureStore` настоящее
хранилище создается одной строкой, и подделка не нужна; документация
Redux рекомендует именно это.

### Интеграция: компонент + хранилище

```tsx
test('loads items and updates the total through the real store', async () => {
  const user = userEvent.setup();
  const store = makeStore({ fetchItems: async () => items });
  render(
    <Provider store={store}>
      <Cart />
    </Provider>
  );

  expect(screen.getByRole('status')).toHaveTextContent('Загрузка…');
  const cart = await screen.findByRole('region', { name: 'Корзина' });
  expect(within(cart).getByLabelText('Итого')).toHaveTextContent('500');

  await user.click(screen.getByRole('button', { name: 'Больше Кофе' }));
  expect(screen.getByLabelText('Количество Кофе')).toHaveTextContent('2');
  expect(screen.getByLabelText('Итого')).toHaveTextContent('800');

  await user.click(screen.getByRole('button', { name: 'Удалить Чай' }));
  expect(screen.queryByLabelText('Чай')).toBeNull();
  expect(screen.getByLabelText('Итого')).toHaveTextContent('600');
});
```

Один тест проверяет цепочку целиком: монтирование отправляет thunk,
заглушка API отвечает, редьюсер кладет данные, селектор считает итог,
компонент показывает, клик отправляет действие, итог пересчитывается.
Ничего из этого не заменено заглушкой, кроме сети. Такой тест дает больше
уверенности, чем набор модульных тестов тех же частей по отдельности, и
не зависит от их внутреннего устройства.

Для тестов, где загрузка не интересна, хранилище создается с
`preloadedState`: `makeStore(api, { cart: { ...initialState, items, status:
'succeeded' } })`. Если `condition` в thunk пропускает загрузку уже
полученных данных, компонент сразу показывает итог `500`.

---

## 6.10 Cypress

> 📌 **Cypress** - фреймворк сквозного тестирования, который выполняет
> тесты внутри настоящего браузера рядом с приложением: команды
> `cy.visit`, `cy.get`, `.click()` управляют страницей, а утверждения
> `should` автоматически повторяются до выполнения или таймаута.

### Установка и структура

```sh
npm install --save-dev cypress @testing-library/cypress
npx cypress open        # интерактивный режим: выбор браузера и тестов
npx cypress run         # без интерфейса, для CI
```

```
   cypress.config.ts
   cypress/
     e2e/
       cart.cy.ts             тесты: *.cy.ts
     fixtures/
       items.json             данные для подмены ответов
     support/
       e2e.ts                 выполняется перед каждым файлом; подключение команд
       commands.ts            собственные команды: cy.login(…)
```

```ts
// cypress.config.ts
import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5173', // cy.visit('/') вместо полного адреса
  },
});
```

```ts
// cypress/support/e2e.ts
import '@testing-library/cypress/add-commands'; // cy.findByRole и другие запросы Testing Library
```

Приложение должно быть запущено (`npm run dev`) до запуска тестов; в CI
это делает `start-server-and-test` или встроенный запуск сервера.
🕰️ Каталог `cypress/integration` и файлы `*.spec.js` - структура до
Cypress 10; с версии 10 - `cypress/e2e` и `*.cy.ts`, а конфигурация -
`cypress.config.ts` вместо `cypress.json`.

### Тест

```ts
// cypress/e2e/cart.cy.ts
describe('корзина', () => {
  beforeEach(() => {
    // Ответ сервера подменяется фикстурой: тест не зависит от реального API
    cy.intercept('GET', '/api/items', { fixture: 'items.json' }).as('getItems');
    cy.visit('/');
    cy.wait('@getItems');
  });

  it('увеличивает количество и пересчитывает итог', () => {
    cy.findByRole('button', { name: 'Больше Кофе' }).click();
    cy.findByLabelText('Количество Кофе').should('have.text', '2');
    cy.findByLabelText('Итого').should('have.text', '800');
  });

  it('переходит к оформлению доставки', () => {
    cy.findByRole('button', { name: 'Продолжить оформление' }).click();
    cy.location('pathname').should('eq', '/delivery');
    cy.findByRole('heading', { name: 'Доставка' }).should('be.visible');
  });
});
```

| Команда | Что делает |
| --- | --- |
| `cy.visit(url)` | Открыть страницу; относительный путь - от `baseUrl` |
| `cy.get(selector)` | Найти по CSS-селектору |
| `cy.contains(text)` | Найти по тексту |
| `cy.findByRole`, `cy.findByLabelText` | Запросы Testing Library - те же приоритеты, что в [6.5](components.md#65-testing-library-рендер-и-запросы) |
| `.click()`, `.type('текст{enter}')`, `.select()`, `.check()` | Действия |
| `.should('have.text', …)`, `.should('be.visible')`, `.should('have.css', …)` | Утверждения; повторяются до успеха или таймаута (4 с) |
| `.as('name')` и `cy.get('@name')` | Псевдоним для элемента или перехвата |
| `cy.intercept(method, url, response)` | Подмена или наблюдение сетевого запроса |
| `cy.wait('@alias')` | Дождаться перехваченного запроса; `.its('request.body')` - проверить, что ушло |
| `cy.location('pathname')` | Проверка адреса после перехода |

### Почему команды не возвращают значения

Команды Cypress ставятся в очередь и выполняются асинхронно; `const el =
cy.get('button')` не дает элемент. Данные передаются по цепочке (`.then`),
псевдонимами (`.as`) и утверждениями. Утверждение `should` **повторяет
запрос** до выполнения условия - поэтому ожидания вручную не нужны, а
`cy.wait(1000)` с числом - признак проблемы.

### Изоляция тестов

С Cypress 12 включена **изоляция тестов**: перед каждым `it` страница
очищается. ❌ `before(() => cy.visit('/'))` с несколькими `it` в одном
`describe` работал в старых версиях и не работает теперь: второй тест
начнется с пустой страницы. ✅ `beforeEach` с `cy.visit`; состояние входа
переиспользуется через `cy.session`.

### Селекторы

❌ `cy.get('[class^=product_product__]')` - привязка к хешированным именам
CSS-модулей: меняется при правке стилей или конфигурации сборки. ✅ Роли и
подписи через `@testing-library/cypress`; там, где семантики нет, -
`data-testid`, и он же используется в модульных тестах. Проверка стилей
(`should('have.css', 'background-color', …)`) допустима для состояния,
которое пользователь различает только визуально (выбранный вариант
доставки), но лучше выразить его атрибутом `aria-checked` или `aria-selected`
и проверять его.

### Сеть в сквозных тестах

| Режим | Как | Когда |
| --- | --- | --- |
| Настоящий бэкенд | Без `intercept` | Смоук-проверка ключевых сценариев на тестовом стенде |
| Подмена `cy.intercept` с фикстурами | Ответы из `cypress/fixtures` | Основная масса: детерминированно, быстро, покрывает ошибки сервера (`{ statusCode: 500 }`) |
| Наблюдение | `cy.intercept(...).as('x')` без ответа, `cy.wait('@x').its('request.body')` | Проверить, что приложение отправило, не подменяя сервер |

Пример входа с проверкой тела запроса:

```ts
it('отправляет учетные данные и показывает имя пользователя', () => {
  cy.intercept('POST', '/signin', { fixture: 'login.json' }).as('postLogin');
  cy.intercept('GET', '/me', { fixture: 'me.json' });
  cy.visit('/login');
  cy.findByLabelText('E-mail').type('1@1.com');
  cy.findByLabelText('Пароль').type('123{enter}');
  cy.wait('@postLogin').its('request.body').should('deep.equal', { email: '1@1.com', password: '123' });
  cy.findByText('1@1.com').should('be.visible');
});
```

### Cypress и Playwright

| | Cypress | Playwright |
| --- | --- | --- |
| Где выполняется тест | Внутри браузера, рядом с приложением | Снаружи, управляет браузером по протоколу |
| Браузеры | Chrome, Firefox, WebKit (экспериментально) | Chromium, Firefox, WebKit - все штатно |
| Несколько вкладок, домены | Ограничены | Свободно |
| Параллельный запуск | Платный сервис или собственная оркестрация | Встроен |
| API | Цепочки команд, автоповтор `should` | `async/await`, автоожидание в `expect` и действиях |
| Отладка | Интерактивный интерфейс с «путешествием во времени» | Trace viewer, UI mode |
| Запросы Testing Library | Через плагин | Встроены: `getByRole`, `getByLabel` |

Оба решают одну задачу; Playwright сегодня чаще выбирают для новых
проектов из-за параллельности и WebKit, Cypress - за интерактивный режим
и низкий порог входа.

---

## 6.11 Стратегия: что каким слоем покрывать

| Слой | Инструмент | Что покрывать | Сколько |
| --- | --- | --- | --- |
| Статический | TypeScript, ESLint | Все | Всегда включен |
| Модульный | Vitest | Редьюсеры, селекторы, утилиты, хуки с самостоятельной логикой | Каждую ветку логики |
| Интеграционный | Vitest + Testing Library + MSW | Компоненты с хранилищем и маршрутизатором: экран целиком, включая загрузку и ошибки | Каждый экран и каждое состояние |
| Сквозной | Cypress / Playwright | Ключевые сценарии: вход, основная транзакция, критичные переходы | Единицы на приложение |

Признаки хорошего теста, независимо от слоя: падает **только** при
изменении поведения; сообщение об ошибке говорит, что сломалось;
выполняется независимо от других; не содержит ожиданий по времени;
читается как описание требования.

Покрытие (`vitest run --coverage`) показывает, какие строки **не**
выполнялись, - список кандидатов на тесты. Оно не показывает, что
выполненные строки проверены: тест без `expect` дает 100 % покрытия и ноль
уверенности.

---

[← Тестирование компонентов](components.md) · [К содержанию спринта](README.md)
