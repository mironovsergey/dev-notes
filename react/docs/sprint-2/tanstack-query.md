# TanStack Query

## 2.35 Серверное состояние

> 📌 **Серверное состояние (server state)** - данные, которыми владеет
> сервер, а приложение хранит лишь копию: она устаревает без участия
> приложения, может быть нужна нескольким экранам сразу и в любой момент
> отличается от источника.

Клиентское состояние (что лежит в корзине, открыто ли окно) приложение
создает само и знает о нем все. Серверное - каталог, профиль, заказы -
приходит извне. Хранить его в общем сторе можно, но тогда приходится
вручную писать то, что для него всегда одинаково:

- статусы «идет загрузка», «ошибка», «данные есть»;
- защиту от гонок, когда ответы приходят не в том порядке;
- повторные запросы после ошибки;
- обновление после действий пользователя;
- признак «данные устарели» и фоновое обновление;
- дедупликацию: два компонента запросили одно и то же.

> 📌 **TanStack Query** - библиотека для работы с серверным состоянием:
> она выполняет запросы, кеширует ответы по ключу, отдает статус запроса,
> сама повторяет неудачные попытки и обновляет устаревшие данные в фоне.

```tsx
import { useQuery } from '@tanstack/react-query';

function Catalog() {
  const { data, status, error, isFetching, refetch } = useQuery({
    queryKey: ['products'],
    queryFn: ({ signal }) => fetchProducts(signal),
  });

  if (status === 'pending') {
    return <p>Загружаем каталог…</p>;
  }

  if (status === 'error') {
    return <button onClick={() => refetch()}>{error.message} · Повторить</button>;
  }

  return <ProductList products={data} isRefreshing={isFetching} />;
}
```

`queryFn` получает `signal`: когда результат запроса становится не нужен
(компонент размонтирован, ключ сменился, тот же запрос запущен заново),
библиотека прерывает его через этот сигнал - свой `AbortController`
заводить не нужно.

### Статусы

| Поле | Значение |
| --- | --- |
| `status` | `'pending'` - данных еще нет, `'error'` - запрос упал, `'success'` - данные есть |
| `fetchStatus` | `'fetching'` - запрос идет прямо сейчас, `'paused'` - сети нет, `'idle'` - нет запроса |
| `isPending` | Сокращение для `status === 'pending'` |
| `isFetching` | Идет запрос, в том числе фоновое обновление уже показанных данных |
| `isRefetching` | Фоновое обновление: `isFetching && !isPending` |

⚠️ Два независимых статуса - не дублирование. Данные могут быть показаны
(`success`) и одновременно обновляться (`fetching`): это и есть фоновое
обновление, из-за которого интерфейс не мигает заглушкой.

🕰️ В версии 4 статус ожидания назывался `loading`, а его флаг - `isLoading`.
В пятой они переименованы в `pending` и `isPending`, а `isLoading` теперь
означает первую загрузку (`isPending && isFetching`); в четвертой это
значение называлось `isInitialLoading`.

### Устаревание и сборка мусора

| Настройка | Что задает | По умолчанию |
| --- | --- | --- |
| `staleTime` | Сколько данные считаются свежими; пока свежи - повторных запросов нет | `0` |
| `gcTime` | Сколько ответ живет в кеше без подписчиков, прежде чем будет удален | 5 минут |

```ts
useQuery({
  queryKey: ['products'],
  queryFn: fetchProducts,
  staleTime: 5 * 60 * 1000, // каталог меняется редко
});
```

🕰️ В версии 4 `gcTime` назывался `cacheTime`.

---

## 2.36 Ключи, кеш и инвалидация

> 📌 **Ключ запроса (query key)** - массив, по которому библиотека
> различает записи кеша; он же список зависимостей: изменился ключ -
> выполняется новый запрос.

Ключ строится от общего к частному, а все переменные, от которых зависит
ответ, входят в него:

```ts
['products']                          // весь каталог
['products', { category: 'bakery' }]  // отфильтрованный
['orders', orderId]                   // один заказ
```

Чтобы ключ и функция запроса не разъезжались по файлам, их держат вместе.
Помощник `queryOptions` связывает их и сохраняет вывод типов:

```ts
import { queryOptions } from '@tanstack/react-query';

export const productsQuery = () =>
  queryOptions({
    queryKey: ['products'],
    queryFn: ({ signal }) => fetchProducts(signal),
    staleTime: 5 * 60 * 1000,
  });

// в компоненте
const { data } = useQuery(productsQuery());
```

> 📌 **Инвалидация** - пометка записей кеша устаревшими: записи, на которые
> подписаны компоненты, запрашиваются заново сразу, остальные - при
> следующем обращении.

```ts
const queryClient = useQueryClient();

// Все запросы, чей ключ начинается с 'products'
await queryClient.invalidateQueries({ queryKey: ['products'] });

// Точное совпадение ключа
await queryClient.invalidateQueries({ queryKey: ['products'], exact: true });
```

| Метод клиента | Зачем |
| --- | --- |
| `invalidateQueries(filters)` | Пометить устаревшим и перезапросить |
| `setQueryData(key, updater)` | Записать данные в кеш руками (после мутации, оптимистично) |
| `getQueryData(key)` | Прочитать текущее значение без подписки |
| `cancelQueries(filters)` | Отменить идущие запросы - нужно перед оптимистичным обновлением |
| `prefetchQuery(options)` | Загрузить заранее: наведение на ссылку, соседняя страница |

✅ Ключи удобно собирать в одном месте - объектом-фабрикой
(`productKeys.all`, `productKeys.detail(id)`): тогда инвалидация не
зависит от того, как ключ написан в конкретном компоненте.

---

## 2.37 Мутации

> 📌 **Мутация (mutation)** - изменяющий запрос (создать, обновить,
> удалить). В отличие от запроса, она не кешируется и не выполняется сама:
> ее вызывают явно.

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query';

function CheckoutForm() {
  const queryClient = useQueryClient();

  const { mutate, isPending, error } = useMutation({
    mutationFn: (order: OrderRequest) => createOrder(order),
    onSuccess: async (createdOrder) => {
      // Остатки на складе изменились - каталог устарел
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.setQueryData(['orders', createdOrder.id], createdOrder);
    },
  });

  return (
    <form onSubmit={(event) => { event.preventDefault(); mutate(order); }}>
      <button disabled={isPending}>{isPending ? 'Отправляем…' : 'Подтвердить'}</button>
      {error !== null && <p role="alert">{error.message}</p>}
    </form>
  );
}
```

| Что вызвать | Поведение |
| --- | --- |
| `mutate(variables)` | Запускает мутацию; ошибка попадает в `error`, исключения не будет |
| `mutateAsync(variables)` | То же, но возвращает промис - и его нужно обработать, иначе будет необработанное отклонение |

Порядок колбэков: `onMutate` → запрос → `onSuccess` или `onError` →
`onSettled`. Колбэки, переданные в сам `mutate`, выполняются после
одноименных колбэков из `useMutation`.

### Оптимистичное обновление

Интерфейс меняется до ответа сервера, а при ошибке откатывается:

```ts
useMutation({
  mutationFn: updateQty,
  onMutate: async (next) => {
    // Идущий запрос перезаписал бы оптимистичный результат, поэтому он отменяется
    await queryClient.cancelQueries({ queryKey: ['cart'] });

    const previous = queryClient.getQueryData<CartItem[]>(['cart']);

    queryClient.setQueryData<CartItem[]>(['cart'], (items = []) =>
      items.map((item) => (item.productId === next.productId ? { ...item, qty: next.qty } : item)),
    );

    return { previous }; // контекст для отката
  },
  onError: (_error, _next, context) => {
    queryClient.setQueryData(['cart'], context?.previous);
  },
  onSettled: () => {
    // В любом случае данные сверяются с сервером
    void queryClient.invalidateQueries({ queryKey: ['cart'] });
  },
});
```

---

## 2.38 Клиент, настройки и тесты

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(container).render(
  <QueryClientProvider client={queryClient}>
    <App />
    <ReactQueryDevtools initialIsOpen={false} />
  </QueryClientProvider>,
);
```

Клиент создается **один раз** на приложение: он и есть кеш. Пересоздание
на каждом рендере стирает все данные.

| Настройка | Зачем менять |
| --- | --- |
| `retry` | По умолчанию три повтора; в тестах ставят `false`, иначе падение ждет секунды |
| `refetchOnWindowFocus` | Обновление при возврате на вкладку; для редко меняющихся данных лишнее |
| `throwOnError` | Отдать ошибку ближайшей границе ошибок вместо поля `error` |
| `placeholderData: keepPreviousData` | Показывать прошлый ответ, пока грузится новый ключ - список не мигает при смене фильтра |

### Suspense

`useSuspenseQuery` не возвращает `pending`: пока данных нет, компонент
приостанавливается, и заглушку показывает ближайший `<Suspense>`, а ошибку -
граница ошибок. Взамен исчезает ветвление по статусу.

### Тесты

Свой клиент на каждый тест - иначе кеш переходит из теста в тест:

```tsx
function renderWithQuery(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}
```

⚠️ `retry: false` в тестах обязателен: с повторами тест на ошибку ждет
несколько секунд и может упасть по таймауту.

---

[← MobX](mobx.md) · [К содержанию спринта](README.md) · [Далее: React 19 →](react-async.md)
