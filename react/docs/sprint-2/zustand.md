# Zustand

## 2.29 Стор как хук

> 📌 **Zustand** - библиотека управления состоянием, в которой хранилище
> создается функцией `create` и возвращается в виде хука: вызов хука в
> компоненте одновременно читает состояние и подписывает компонент на его
> изменения.

```tsx
import { create } from 'zustand';

interface CounterStore {
  count: number;
  increment: () => void;
  add: (by: number) => void;
  reset: () => void;
}

// create<T>()(...) - каррированная форма: тип состояния задан явно, типы middleware выводятся сами
export const useCounterStore = create<CounterStore>()((set) => ({
  count: 0,
  increment: () => {
    set((state) => ({ count: state.count + 1 }));
  },
  add: (by) => {
    set((state) => ({ count: state.count + by }));
  },
  reset: () => {
    set({ count: 0 });
  },
}));

function Counter() {
  const count = useCounterStore((store) => store.count);
  const increment = useCounterStore((store) => store.increment);

  return <button onClick={increment}>{count}</button>;
}
```

Три отличия от Redux и контекста видны сразу:

- **Провайдера нет.** Стор - обычный модуль; компонент импортирует хук и
  подписывается. Дерево компонентов о сторе не знает.
- **Действия лежат в самом сторе,** рядом с данными, и вызываются как
  обычные методы. Отдельных объектов-действий и редьюсеров нет.
- **Подписка задается селектором** прямо в компоненте: без селектора хук
  вернет состояние целиком и компонент будет перерисовываться на любое
  изменение.

Под капотом - `useSyncExternalStore` из React 18: стор хранит значение и
список подписчиков, React читает снимок и сравнивает результат селектора.

### `set` сливает, а не заменяет

`set` объединяет переданный объект с текущим состоянием **на верхнем
уровне** - в отличие от `useState`, который значение заменяет:

```ts
set({ count: 5 });                       // остальные поля сохранятся
set((state) => ({ count: state.count + 1 })); // функция получает текущее состояние
set({ count: 0, user: null }, true);     // true - заменить состояние целиком
```

⚠️ Слияние поверхностное: вложенный объект придется собрать самому.

```ts
// ❌ потеряет остальные поля filters
set({ filters: { query } });

// ✅
set((state) => ({ filters: { ...state.filters, query } }));
```

### Стор вне React

Хук, который вернул `create`, одновременно является объектом стора:

| Метод | Что делает |
| --- | --- |
| `useStore.getState()` | Текущее состояние; подписки не создает |
| `useStore.setState(partial, replace?)` | Изменить состояние снаружи компонентов |
| `useStore.subscribe(listener)` | Подписка; возвращает функцию отписки |
| `useStore.getInitialState()` | Состояние, с которого стор начинал |

```ts
// Обработчик события браузера, таймер, тест - React для этого не нужен
const unsubscribe = useCounterStore.subscribe((state) => {
  document.title = `Счет: ${state.count}`;
});
```

⚠️ `getState()` в теле компонента читает значение, но **не подписывает** -
компонент не обновится. В разметке - только хук с селектором.

---

## 2.30 Селекторы и перерисовки

> 📌 **Селектор** - функция, которая выбирает из состояния нужную часть;
> компонент перерисовывается, только когда результат селектора изменился.

Результаты сравниваются `Object.is`. Для примитивов это работает само
собой, а селектор, **создающий** объект или массив, дает новую ссылку на
каждом вызове:

```tsx
// ❌ новый объект на каждом вызове: бесконечный цикл перерисовок
// (Maximum update depth exceeded)
const { items, total } = useCartStore((store) => ({
  items: store.items,
  total: store.total,
}));

// ✅ два отдельных вызова - каждый со своим примитивом или ссылкой
const items = useCartStore((store) => store.items);
const total = useCartStore((store) => store.total);

// ✅ либо поверхностное сравнение результата
import { useShallow } from 'zustand/react/shallow';

const { items, total } = useCartStore(
  useShallow((store) => ({ items: store.items, total: store.total })),
);
```

`useShallow` возвращает обернутый селектор, который сравнивает результат
поверхностно и отдает прежнюю ссылку, если значения не изменились.

🕰️ В версии 4 у хука был второй аргумент - функция сравнения
(`useStore(selector, shallow)`). В версии 5 его нет; для постепенного
перехода оставлен отдельный вход `zustand/traditional` с
`createWithEqualityFn` и `useStoreWithEqualityFn`.

### Производные данные

Считать их в селекторе можно, но результат не должен быть новым объектом
без необходимости:

```ts
// ✅ примитив - сравнение по значению
const itemCount = useCartStore((store) => store.items.length);

// ✅ вычисление вынесено в чистую функцию, вызывается на уже выбранных данных
const items = useCartStore((store) => store.items);
const totals = useMemo(() => calculateTotals(items), [items]);
```

✅ Действия стабильны: функции создаются один раз при создании стора,
поэтому `useCartStore((store) => store.add)` не меняется между рендерами
и не ломает `memo` у дочерних компонентов.

---

## 2.31 Срезы, middleware и стор на экземпляр

### Срезы

Когда стор растет, его делят на срезы - функции, каждая из которых
описывает свою часть состояния и свои действия:

> 📌 **Срез (slice)** - часть стора: функция вида `StateCreator`, которая
> возвращает свой кусок состояния вместе с действиями; срезы объединяются
> в один стор при создании.

```ts
import { create, type StateCreator } from 'zustand';

interface CartSlice {
  items: CartItem[];
  addItem: (product: Product) => void;
}

interface PromoSlice {
  promo: Promo | null;
  applyPromo: (promo: Promo) => void;
}

type ShopStore = CartSlice & PromoSlice;

const createCartSlice: StateCreator<ShopStore, [], [], CartSlice> = (set) => ({
  items: [],
  addItem: (product) => {
    set((state) => ({ items: [...state.items, { productId: product.id, qty: 1 }] }));
  },
});

const createPromoSlice: StateCreator<ShopStore, [], [], PromoSlice> = (set) => ({
  promo: null,
  applyPromo: (promo) => {
    set({ promo });
  },
});

export const useShopStore = create<ShopStore>()((...args) => ({
  ...createCartSlice(...args),
  ...createPromoSlice(...args),
}));
```

Срез видит весь стор целиком (первый параметр `StateCreator`), поэтому
действие одного среза может читать и менять данные другого - общего
`combineReducers` с изоляцией здесь нет.

### Middleware

> 📌 **Middleware** в Zustand - функция, оборачивающая создатель стора и
> добавляющая ему поведение: запись в хранилище браузера, связь с
> расширением, другой способ обновления состояния.

| Middleware | Импорт | Зачем |
| --- | --- | --- |
| `devtools` | `zustand/middleware` | История действий в Redux DevTools |
| `persist` | `zustand/middleware` | Сохранение состояния в `localStorage` и другие хранилища |
| `immer` | `zustand/middleware/immer` | Обновление через «мутацию» черновика |
| `subscribeWithSelector` | `zustand/middleware` | `subscribe` с селектором и опциями |
| `combine` | `zustand/middleware` | Вывод типа состояния из начального значения |
| `redux` | `zustand/middleware` | Редьюсер и `dispatch` поверх стора |

```ts
import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

export const useShopStore = create<ShopStore>()(
  devtools(
    persist(
      immer((set) => ({
        items: [],
        addItem: (product) => {
          // immer: правится черновик, наружу уходит новое неизменяемое состояние
          set((state) => {
            state.items.push({ productId: product.id, qty: 1 });
          });
        },
      })),
      {
        name: 'lavka-cart',
        storage: createJSONStorage(() => localStorage),
        // В хранилище попадает только то, что нужно восстанавливать
        partialize: (state) => ({ items: state.items }),
        version: 1,
      },
    ),
    { name: 'shop' },
  ),
);
```

⚠️ Порядок обертки важен: `devtools` идет снаружи, `persist` - следующим,
`immer` - ближе всего к создателю стора. При другом порядке расширение
показывает состояние до восстановления из хранилища, а типы обновлений
теряют черновик Immer.

`immer` требует установленного пакета `immer` - он объявлен необязательной
одноранговой зависимостью.

### Стор на экземпляр

Стор-модуль - глобальное значение: он общий для всех тестов и, при
серверном рендере, для всех запросов. Когда нужна изоляция, стор создают
фабрикой и передают через контекст:

```tsx
import { createStore, useStore } from 'zustand';
import { createContext, useContext, useRef, type ReactNode } from 'react';

type ShopStoreApi = ReturnType<typeof createShopStore>;

function createShopStore() {
  return createStore<ShopStore>()((set) => ({ /* … */ }));
}

const ShopStoreContext = createContext<ShopStoreApi | null>(null);

export function ShopStoreProvider({ children }: { children: ReactNode }) {
  const storeRef = useRef<ShopStoreApi | null>(null);

  storeRef.current ??= createShopStore();

  return <ShopStoreContext value={storeRef.current}>{children}</ShopStoreContext>;
}

export function useShopStore<T>(selector: (store: ShopStore) => T): T {
  const store = useContext(ShopStoreContext);

  if (store === null) {
    throw new Error('useShopStore вызван вне ShopStoreProvider');
  }

  return useStore(store, selector);
}
```

Здесь `createStore` дает обычный объект стора без хука, а `useStore`
подписывает компонент на него. Тот же прием нужен для тестов: каждый тест
получает свой стор и не зависит от предыдущего.

Если стор оставлен глобальным, состояние между тестами сбрасывают вручную:

```ts
const initialState = useShopStore.getState();

afterEach(() => {
  useShopStore.setState(initialState, true);
});
```

---

[← Effector](effector.md) · [К содержанию спринта](README.md) · [Далее: MobX →](mobx.md)
