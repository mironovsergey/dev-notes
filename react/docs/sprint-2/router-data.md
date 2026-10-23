# Данные в маршрутах

## 2.43 Маршрут как источник данных

> 📌 **Data-режим** - способ описания маршрутов объектами
> (`createBrowserRouter`), при котором у маршрута есть функции работы с
> данными: `loader` вызывается перед показом страницы, `action` - при
> отправке формы, а результаты доступны компоненту хуками.

```tsx
import { createBrowserRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';

const router = createBrowserRouter([
  {
    path: '/',
    Component: Layout,
    children: [
      { index: true, loader: productsLoader, Component: CatalogPage },
      { path: 'product/:productId', loader: productLoader, Component: ProductPage },
    ],
  },
]);

createRoot(container).render(<RouterProvider router={router} />);
```

⚠️ `RouterProvider` для браузера импортируется из `react-router/dom`: в
основном входе лежит общий вариант, который не зависит от `react-dom` и не
поддерживает `flushSync`. Пакета `react-router-dom` в версии 8 больше нет.

### `loader`

```tsx
import { data, type LoaderFunctionArgs } from 'react-router';

export async function productLoader({ params, request }: LoaderFunctionArgs) {
  const products = await fetchProducts(request.signal);
  const product = products.find((candidate) => candidate.id === params.productId);

  if (product === undefined) {
    // Брошенный ответ попадает в границу ошибок маршрута, а не в компонент
    throw data({ message: 'Товар не найден' }, { status: 404 });
  }

  return product;
}

function ProductPage() {
  const product = useLoaderData<typeof productLoader>();

  return <h1>{product.title}</h1>;
}
```

Три следствия, которых нет у загрузки в эффекте:

- **Загрузка начинается раньше рендера.** Роутер вызывает `loader` при
  переходе; компонент рисуется, когда данные уже есть, - ветвление по
  «идет загрузка» внутри страницы не нужно.
- **Запрос отменяется сам.** В `loader` приходит `request.signal`: новый
  переход до окончания загрузки прерывает запрос.
- **Ошибка - это тоже маршрут.** `throw` из `loader` обрабатывает
  ближайшая граница ошибок маршрута (`ErrorBoundary` или `errorElement`).

### Ошибки маршрута

```tsx
import { isRouteErrorResponse, useRouteError } from 'react-router';

function RouteError() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    return <p>{error.status === 404 ? 'Страница не найдена' : 'Ошибка сервера'}</p>;
  }

  return <p>{error instanceof Error ? error.message : 'Неизвестная ошибка'}</p>;
}

const route = { path: 'product/:productId', loader, Component: ProductPage, ErrorBoundary: RouteError };
```

`isRouteErrorResponse` отличает брошенный `Response` (или результат
`data(...)` с кодом) от обычного исключения: у первого есть `status` и
`statusText`.

---

## 2.44 Изменения: `action`, `Form` и состояние перехода

> 📌 **`action`** - функция маршрута, которая выполняет изменение: получает
> `Request` с телом формы, что-то делает и возвращает результат или
> перенаправление. После нее роутер перезапрашивает `loader` всех активных
> маршрутов, поэтому экран сам показывает новые данные.

```tsx
import { Form, redirect, useActionData, useNavigation, type ActionFunctionArgs } from 'react-router';

export async function checkoutAction({ request }: ActionFunctionArgs) {
  const formData = await request.formData();

  try {
    const order = await createOrder({
      name: String(formData.get('name') ?? ''),
      // …
    });

    // Переход после успешного изменения задается прямо здесь
    return redirect(`/orders/${order.id}`);
  } catch {
    return { error: 'Не удалось оформить заказ' };
  }
}

function CheckoutPage() {
  const actionData = useActionData<typeof checkoutAction>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  return (
    <Form method="post">
      <input name="name" />
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Отправляем…' : 'Подтвердить'}
      </button>
      {actionData?.error !== undefined && <p role="alert">{actionData.error}</p>}
    </Form>
  );
}
```

`<Form method="post">` отправляет данные не браузером, а роутером: он
собирает `FormData`, вызывает `action` нужного маршрута и обновляет
страницу без перезагрузки.

| Хук | Что дает |
| --- | --- |
| `useNavigation()` | `state`: `'idle'`, `'loading'` (идет переход), `'submitting'` (идет `action`); `formData` отправляемой формы |
| `useActionData<typeof action>()` | То, что вернул `action`, - обычно ошибка валидации |
| `useFetcher()` | Вызов `loader`/`action` **без** перехода: лайк, добавление в корзину, подгрузка списка |
| `useRevalidator()` | Ручной перезапрос всех активных `loader` |

✅ `useFetcher` - ответ на вопрос «как изменить данные, не уходя со
страницы»: у него свои `state`, `data` и компонент `fetcher.Form`.

---

## 2.45 Отложенные данные и тесты

Если часть данных медленная, `loader` возвращает промис, а страница
показывает готовое сразу:

```tsx
export async function pageLoader() {
  return {
    product: await fetchProduct(),      // нужен сразу
    reviews: fetchReviews(),            // промис: подождет внутри Suspense
  };
}

function ProductPage() {
  const { product, reviews } = useLoaderData<typeof pageLoader>();

  return (
    <>
      <h1>{product.title}</h1>
      <Suspense fallback={<p>Загружаем отзывы…</p>}>
        <Await resolve={reviews}>{(list) => <Reviews items={list} />}</Await>
      </Suspense>
    </>
  );
}
```

🕰️ В версии 6 для этого был помощник `defer({ reviews })`. В версиях 7 и 8
он не нужен: достаточно вернуть промис полем объекта.

### Тесты

Маршруты проверяются без браузера: `createMemoryRouter` принимает ту же
конфигурацию и стартовый адрес.

```tsx
import { createMemoryRouter, RouterProvider } from 'react-router';

function renderRoute(initialPath: string) {
  const router = createMemoryRouter(routes, { initialEntries: [initialPath] });

  return render(<RouterProvider router={router} />);
}

test('глубокая ссылка открывает товар', async () => {
  renderRoute('/product/gummy-bears');

  expect(await screen.findByRole('heading', { name: 'Мармеладные мишки, 500 г' })).toBeInTheDocument();
});
```

`RouterProvider` из основного входа не зависит от `react-dom`, поэтому
подходит и для тестов, и для сред без DOM; в jsdom работает и вариант из
`react-router/dom`.

Так же проверяются `action` и редирект: отправить форму и убедиться, что
показался экран нужного адреса; и граница ошибок: подсунуть mock-API
ответ 404 и убедиться, что показалась страница ошибки.

---

[← React 19](react-async.md) · [К содержанию спринта](README.md)
