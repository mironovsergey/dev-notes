# React 19: `use`, Suspense и действия

## 2.39 `use` и Suspense

> 📌 **`use`** - функция React, которая разворачивает «пригодное к
> использованию» значение: промис или контекст. Для промиса в состоянии
> ожидания она приостанавливает рендер компонента, для выполненного -
> возвращает результат, для отклоненного - бросает ошибку.

```tsx
import { use, Suspense } from 'react';

function ProductList({ productsPromise }: { productsPromise: Promise<Product[]> }) {
  // Компонент пишется так, будто данные уже есть
  const products = use(productsPromise);

  return <ul>{products.map((product) => <li key={product.id}>{product.title}</li>)}</ul>;
}

function Catalog({ productsPromise }: { productsPromise: Promise<Product[]> }) {
  return (
    <Suspense fallback={<p>Загружаем каталог…</p>}>
      <ProductList productsPromise={productsPromise} />
    </Suspense>
  );
}
```

Ветвления по статусу нет: пока промис не выполнен, разметку дает ближайший
`<Suspense>`, а отклоненный промис ловит ближайшая граница ошибок
([1.28](../sprint-1/advanced.md#128-границы-ошибок)).

`use` - не совсем хук: его **можно** вызывать внутри условия и цикла.
Правило про верхний уровень на него не распространяется, остальные правила
хуков - да: вызывать только из компонента или хука.

⚠️ Главное ограничение: промис должен быть **стабильным**. Промис,
созданный прямо в рендере, на каждой попытке будет новым, и компонент
станет приостанавливаться бесконечно:

```tsx
// ❌ новый промис на каждый рендер
const products = use(fetchProducts());

// ✅ промис создан выше границы Suspense и передан пропом
function CatalogPage() {
  const [productsPromise] = useState(() => fetchProducts());

  return <Catalog productsPromise={productsPromise} />;
}
```

Промис в клиентском приложении создают в состоянии компонента выше границы
`<Suspense>`, в кеше вне компонентов или получают пропом сверху; в
приложениях с серверными компонентами его передают из серверного
компонента в клиентский. Состояние самого приостановленного компонента не
подходит: компонент, приостановленный до первого монтирования, React
рендерит заново с нуля, и инициализатор создаст новый промис.

---

## 2.40 Действия и `useActionState`

> 📌 **Действие (action)** - асинхронная функция, переданная в `startTransition`
> или в атрибут `action` формы. React сам отслеживает ее выполнение:
> отмечает переход как незавершенный, дожидается промиса и обновляет
> состояние по завершении.

Форма принимает функцию прямо в `action`, и браузерная отправка не
происходит - `event.preventDefault()` не нужен:

```tsx
<form action={async (formData: FormData) => { await savePromo(formData.get('code')); }}>
  <input name="code" />
  <button type="submit">Применить</button>
</form>
```

> 📌 **`useActionState(action, initialState)`** - хук, который хранит
> результат последнего выполнения действия и отдает признак выполнения:
> возвращает `[state, formAction, isPending]`, где `formAction`
> подставляется в `action` формы, а `action` получает предыдущее состояние
> первым аргументом.

```tsx
import { useActionState } from 'react';

interface PromoState {
  promo: Promo | null;
  error: string | null;
}

function PromoForm() {
  const [state, submitPromo, isPending] = useActionState<PromoState, FormData>(
    async (_previous, formData) => {
      const code = String(formData.get('code') ?? '').trim();

      try {
        return { promo: await validatePromo(code), error: null };
      } catch (error) {
        // Ошибка - это обычный результат действия, а не исключение
        return { promo: null, error: errorMessage(error, 'Не удалось проверить промокод') };
      }
    },
    { promo: null, error: null },
  );

  return (
    <form action={submitPromo}>
      <input name="code" disabled={isPending} />
      <button type="submit" disabled={isPending}>
        {isPending ? 'Проверяем…' : 'Применить'}
      </button>
      {state.error !== null && <p role="alert">{state.error}</p>}
    </form>
  );
}
```

Форма с неуправляемыми полями после успешного действия **очищается сама** -
React сбрасывает ее, как это делает браузер.

> 📌 **`useFormStatus`** - хук из `react-dom`, который сообщает состояние
> ближайшей формы-предка: `pending`, отправляемые `data`, `method` и
> `action`.

```tsx
import { useFormStatus } from 'react-dom';

// Компонент обязан быть внутри <form>, иначе pending всегда false
function SubmitButton() {
  const { pending } = useFormStatus();

  return <button type="submit" disabled={pending}>{pending ? 'Отправляем…' : 'Отправить'}</button>;
}
```

Так кнопка узнает о ходе отправки, не принимая пропов и не зная, что за
действие выполняет форма.

🕰️ До React 19 хук был доступен только в Canary-сборках под именем
`useFormState` и импортировался из `react-dom`. В 19 он переехал в `react`
под именем `useActionState`; старое имя еще экспортируется, но помечено
устаревшим.

---

## 2.41 `useOptimistic` и `useTransition`

> 📌 **`useOptimistic(state, reducer)`** - хук, который на время действия
> показывает предполагаемый результат: возвращает `[optimisticState,
> addOptimistic]`. Обновление живет только до конца действия, после чего
> React возвращает настоящее состояние - откат при ошибке писать не нужно.

```tsx
const [state, submitPromo] = useActionState(async (_previous: PromoState, formData: FormData) => {
  const code = String(formData.get('code') ?? '');

  applyOptimisticPromo(code); // интерфейс меняется сразу

  return { promo: await validatePromo(code), error: null };
}, initialState);

// Базовое значение - настоящее состояние, поэтому хук объявлен после useActionState
const [optimisticPromo, applyOptimisticPromo] = useOptimistic(
  state.promo,
  (_current: Promo | null, code: string) => ({ code, pending: true }),
);
```

⚠️ Оптимистичное обновление вызывается **внутри** действия или перехода.
Вне их React предупредит в консоли, а оптимистичное значение откатится
сразу, не дожидаясь результата.

> 📌 **Переход (transition)** - обновление состояния, помеченное как
> необязательно срочное: React сначала дорисовывает срочные обновления
> (ввод в поле), а результат перехода показывает, когда он готов.

```tsx
const [isPending, startTransition] = useTransition();

startTransition(() => {
  setProductsPromise(fetchProducts()); // новый запрос - не срочное обновление
});
```

Два практических следствия:

- **Интерфейс не мигает.** Если во время перехода компонент
  приостанавливается, React оставляет на экране прежнюю разметку, а не
  подменяет ее заглушкой `<Suspense>`. Признак `isPending` позволяет
  показать ненавязчивый индикатор.
- **Асинхронные функции разрешены.** `startTransition(async () => …)` -
  это и есть действие: переход остается незавершенным до конца промиса.

Рядом стоит `useDeferredValue(value)`: он откладывает не обновление, а
значение - удобно для тяжелой фильтрации по мере ввода.

### Тесты

Компонент, приостановленный на `use`, требует **дожидаемой** области `act`:
React ставит продолжение в ту область, внутри которой произошла
приостановка, и без ожидания оно не выполнится - на экране навсегда
останется заглушка.

```tsx
// ✅ рендер, который приостанавливается
await act(async () => {
  render(<App />);
});

// ✅ клик, после которого создается новый промис
await act(async () => {
  await user.click(screen.getByRole('button', { name: 'Повторить' }));
});
```

⚠️ React предупреждает об этом в консоли: «A component suspended inside an
`act` scope, but the `act` call was not awaited». Предупреждение легко
пропустить и долго искать, почему тест видит только заглушку.

---

## 2.42 Что это заменяет, а что нет

Средствами React закрываются: состояние загрузки и ошибки, сохранение
прежней разметки на время обновления, состояние формы и ее отправки,
оптимистичный интерфейс. Этого достаточно для экрана, который грузит свои данные и
показывает их.

Не закрывается то, ради чего и существует слой серверного состояния:

| Задача | React 19 | Библиотека данных |
| --- | --- | --- |
| Приостановка до готовности данных | `use` + `<Suspense>` | Suspense-режим поверх кеша |
| Состояние формы и отправки | `useActionState`, `useFormStatus` | - |
| Оптимистичный интерфейс | `useOptimistic` | Ручной откат через контекст мутации |
| Кеш между экранами | нет | Кеш по ключу |
| Дедупликация одинаковых запросов | нет | Встроена |
| Повтор после ошибки, фоновое обновление | нет | `retry`, `staleTime` |
| Инвалидация после изменения данных | нет | `invalidateQueries` |

✅ Практический вывод: `use`, действия и `useOptimistic` - это про **один
экран и одно действие**. Когда данные нужны нескольким экранам, должны
переживать переходы и обновляться после мутаций, поверх React нужен кеш -
[TanStack Query](tanstack-query.md) или его аналог.

---

[← TanStack Query](tanstack-query.md) · [К содержанию спринта](README.md) · [Далее: Данные в маршрутах →](router-data.md)
