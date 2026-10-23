# MobX

## 2.32 Наблюдаемое состояние

> 📌 **MobX** - библиотека управления состоянием, построенная на прозрачном
> функциональном реактивном программировании: состояние объявляется
> наблюдаемым, производные значения вычисляются из него автоматически, а
> побочные эффекты - перерисовка компонента, запись в журнал, запрос -
> выполняются реакциями, когда изменилось то, что они читают.

Три понятия, на которых держится вся библиотека:

| Понятие | Что это | Чем создается |
| --- | --- | --- |
| Наблюдаемое (observable) | Значение, за изменениями которого следит MobX | `makeAutoObservable`, `observable` |
| Вычисляемое (computed) | Значение, выведенное из наблюдаемых; кешируется | Геттер класса, `computed` |
| Реакция (reaction) | Побочный эффект, который запускается при изменении прочитанного | `observer`, `autorun`, `reaction`, `when` |

Действия (action) стоят особняком: это функции, изменяющие наблюдаемое.

```ts
import { makeAutoObservable } from 'mobx';

export class CounterStore {
  count = 0;
  history: string[] = [];

  constructor() {
    // Поля становятся observable, геттеры - computed, методы - action;
    // autoBind привязывает методы к экземпляру
    makeAutoObservable(this, {}, { autoBind: true });
  }

  get isEven(): boolean {
    return this.count % 2 === 0;
  }

  increment(): void {
    // Обычное присваивание: MobX сам разошлет уведомления подписчикам
    this.count += 1;
    this.history.push('inc');
  }

  reset(): void {
    this.count = 0;
    this.history = [];
  }
}
```

`makeAutoObservable` выводит аннотации сам: поле - `observable`, геттер -
`computed`, метод - `action`. Когда нужно иначе, аннотация указывается
вторым аргументом:

```ts
import { makeAutoObservable, observableRef, computedStruct } from 'mobx';

makeAutoObservable(this, {
  // Следить только за заменой ссылки, не погружаясь внутрь объекта
  rawResponse: observableRef,
  // Сравнивать результат структурно, а не по ссылке
  filters: computedStruct,
});
```

🕰️ В шестой версии эти же аннотации писались через пространства имен -
`observable.ref`, `computed.struct`, `action.bound`, `flow.bound`,
`comparer.shallow`. В седьмой они стали именованными экспортами:
`observableRef`, `computedStruct`, `actionBound`, `flowBound`,
`compareShallow` - так из сборки выбрасывается неиспользованное.

Третий аргумент задает настройки, из которых чаще всего нужен `autoBind`:
он привязывает методы к экземпляру, и действие можно передавать как
колбэк - `onClick={store.increment}`.

### Прокси и строгий режим

MobX 7 всегда оборачивает наблюдаемые объекты и массивы в `Proxy`: режим
без прокси и настройка `useProxies` удалены. Практическое следствие -
добавление новых полей и элементов массива отслеживается само собой.

По умолчанию действует `enforceActions: "observed"`: изменение
наблюдаемого, у которого **есть подписчики**, вне действия печатает
предупреждение в консоль. В большом проекте режим ужесточают:

```ts
import { configure } from 'mobx';

// Любое изменение вне действия - предупреждение, даже без подписчиков
configure({ enforceActions: 'always' });
```

---

## 2.33 MobX и React

> 📌 **`observer`** - функция из `mobx-react-lite`, оборачивающая компонент
> в реакцию: MobX запоминает, какие наблюдаемые были прочитаны во время
> рендера, и перерисовывает компонент, когда изменилось **именно
> прочитанное**.

```tsx
import { observer } from 'mobx-react-lite';

export const Counter = observer(function Counter({ store }: { store: CounterStore }) {
  return (
    <button onClick={store.increment}>
      {store.count} {store.isEven ? '(четное)' : ''}
    </button>
  );
});
```

Селекторов нет: подписка определяется тем, что компонент прочитал. Это
одновременно главное удобство MobX и его главная ловушка.

### Наблюдаемость теряется при чтении заранее

Значение нужно читать **внутри** рендера компонента, обернутого в
`observer`. Прочитанное снаружи превращается в обычное число или строку, и
подписки не возникает:

```tsx
// ⚠️ значение читает родитель: без observer у родителя Total не обновится,
// а с ним при каждом изменении перерисовывается весь родитель
<Total value={store.total} />;

// ❌ значение прочитано один раз вне рендера: дальше это обычное число
const { count } = store;

// ✅ дочерний компонент сам обернут в observer и читает стор
<Total store={store} />;
```

⚠️ Компонент без `observer` не перерисуется, даже если читает наблюдаемое.
Забытый `observer` - самая частая причина «состояние меняется, а интерфейс
нет».

Для точечной подписки внутри большого компонента есть `<Observer>`:

```tsx
import { Observer } from 'mobx-react-lite';

<li>
  <span>{product.title}</span>
  <Observer>{() => <b>{cart.quantityOf(product.id)}</b>}</Observer>
</li>;
```

### Локальное наблюдаемое состояние

```tsx
import { useLocalObservable } from 'mobx-react-lite';

const form = useLocalObservable(() => ({
  query: '',
  setQuery(value: string) {
    this.query = value;
  },
}));
```

Инициализатор вызывается только при первом рендере; объект живет столько
же, сколько компонент.

### Реакции вне React

| Реакция | Когда запускается |
| --- | --- |
| `autorun(fn)` | Сразу и затем при каждом изменении прочитанного внутри |
| `reaction(() => data, (data) => …)` | Только при изменении значения из первой функции |
| `when(() => condition, () => …)` | Один раз, когда условие стало истинным; без эффекта возвращает промис |

Каждая возвращает функцию удаления - в компоненте ее вызывают в очистке
эффекта:

```tsx
useEffect(() => reaction(() => cart.total, (total) => analytics.send(total)), [cart]);
```

🕰️ Из `mobx-react-lite` 5 и `mobx-react` 10 удалены `Provider`, `inject`,
`useObserver`, `useLocalStore`, `useAsObservableSource`, `disposeOnUnmount`
и помощники батчинга: React 18 и новее батчит обновления сам, а для
передачи стора по дереву используется обычный `createContext`.

---

## 2.34 Асинхронность, структура и тесты

### После `await` нужен `runInAction`

Действие охватывает только синхронную часть функции: все, что идет после
`await`, выполняется уже вне его.

```ts
import { runInAction } from 'mobx';

class CatalogStore {
  products: Product[] = [];
  status: 'loading' | 'ready' | 'error' = 'loading';

  async load(): Promise<void> {
    this.status = 'loading'; // до await - внутри действия

    try {
      const products = await fetchProducts();

      // ✅ изменения после await собираются в одно действие
      runInAction(() => {
        this.products = products;
        this.status = 'ready';
      });
    } catch {
      runInAction(() => {
        this.status = 'error';
      });
    }
  }
}
```

Альтернатива - `flow`: генератор, в котором `yield` заменяет `await`, а
действие продолжается после каждого шага. Тип результата вызова
разворачивается помощником `flowResult`.

```ts
import { flow, flowResult } from 'mobx';

class CatalogStore {
  load = flow(function* (this: CatalogStore) {
    this.status = 'loading';
    this.products = yield fetchProducts(); // runInAction не нужен
    this.status = 'ready';
  });
}

await flowResult(store.load());
```

### Корневой стор и контекст

Приложение обычно делят на несколько сторов и собирают в корневой:

```tsx
class RootStore {
  cart: CartStore;
  catalog: CatalogStore;

  constructor() {
    this.catalog = new CatalogStore();
    this.cart = new CartStore(this.catalog); // стор может ссылаться на соседний
  }
}

const StoreContext = createContext<RootStore | null>(null);

export function useStores(): RootStore {
  const store = useContext(StoreContext);

  if (store === null) {
    throw new Error('useStores вызван вне StoreProvider');
  }

  return store;
}
```

✅ Стор создается **экземпляром**, а не модулем-синглтоном: тогда каждый
тест и каждый серверный запрос получают свое состояние, а сторы могут
ссылаться друг на друга через конструктор.

### Тесты

Наблюдаемое состояние проверяется без React: создать стор, вызвать
действия, прочитать поля и вычисляемые значения.

```ts
test('скидка пересчитывается при изменении корзины', () => {
  const store = new RootStore();

  store.cart.add(product);

  expect(store.cart.total).toBe(690);
});
```

Без подписчиков `computed` не кеширует результат и вычисляется заново при
каждом чтении, поэтому в таком тесте значение всегда актуально. Кеширование
включается, когда вычисляемое читает реакция: `autorun`, `reaction` или
компонент-`observer`.

---

[← Zustand](zustand.md) · [К содержанию спринта](README.md) · [Далее: TanStack Query →](tanstack-query.md)
