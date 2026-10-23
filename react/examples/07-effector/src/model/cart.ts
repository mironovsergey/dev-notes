import { combine, createEvent, createStore, sample } from 'effector';
import { countItems, withoutItem, withQty, type CartItem, type Product } from '../domain';

interface CartState {
  items: readonly CartItem[];
  postponed: readonly CartItem[];
}

const EMPTY_CART: CartState = { items: [], postponed: [] };

/**
 * События - только сигналы: они ничего не хранят и ничего не делают сами.
 *
 * Имя события описывает факт, а не команду: компонент сообщает, что
 * произошло, а модель решает, что за этим следует.
 */
export const productAdded = createEvent<Product>();
export const qtyChanged = createEvent<{ product: Product; qty: number }>();
export const itemRemoved = createEvent<string>();
export const itemPostponed = createEvent<string>();
export const itemRestored = createEvent<string>();
export const cartCleared = createEvent();

/** Внутреннее событие: товар прошел проверку остатка. */
const productAccepted = createEvent<Product>();

function quantityOf(items: readonly CartItem[], productId: string): number {
  return items.find((item) => item.productId === productId)?.qty ?? 0;
}

/**
 * Позиции и отложенное лежат в одном сторе.
 *
 * Много сторов вместо одного - не повод атомизировать связанные данные:
 * операции переносят товар между списками, и правила проще выразить в одном
 * обработчике, чем связывать два стора через граф.
 */
export const $cart = createStore<CartState>(EMPTY_CART)
  .on(productAccepted, (cart, product) => {
    const postponedQty = quantityOf(cart.postponed, product.id);

    if (postponedQty > 0) {
      return { ...cart, postponed: withQty(cart.postponed, product.id, postponedQty + 1) };
    }

    const activeQty = quantityOf(cart.items, product.id);

    return {
      ...cart,
      items:
        activeQty === 0
          ? [...cart.items, { productId: product.id, qty: 1 }]
          : withQty(cart.items, product.id, activeQty + 1),
    };
  })
  .on(qtyChanged, (cart, { product, qty }) =>
    qty < 1 || qty > product.stock
      ? cart
      : {
          items: withQty(cart.items, product.id, qty),
          postponed: withQty(cart.postponed, product.id, qty),
        },
  )
  .on(itemRemoved, (cart, productId) => ({
    items: withoutItem(cart.items, productId),
    postponed: withoutItem(cart.postponed, productId),
  }))
  .on(itemPostponed, (cart, productId) => {
    const item = cart.items.find((candidate) => candidate.productId === productId);

    return item === undefined
      ? cart
      : { items: withoutItem(cart.items, productId), postponed: [...cart.postponed, item] };
  })
  .on(itemRestored, (cart, productId) => {
    const item = cart.postponed.find((candidate) => candidate.productId === productId);

    return item === undefined
      ? cart
      : { items: [...cart.items, item], postponed: withoutItem(cart.postponed, productId) };
  })
  .reset(cartCleared);

/** Производные сторы: `map` пересчитывается только при изменении источника. */
export const $items = $cart.map((cart) => cart.items);
export const $postponed = $cart.map((cart) => cart.postponed);
export const $itemCount = $items.map((items) => countItems(items));

export const $inCartByProductId = $cart.map(({ items, postponed }) => {
  const countByProductId = new Map<string, number>();

  for (const item of [...items, ...postponed]) {
    countByProductId.set(item.productId, (countByProductId.get(item.productId) ?? 0) + item.qty);
  }

  return countByProductId;
});

/**
 * Правило «не больше остатка» вынесено в граф: `sample` читает текущее
 * содержимое корзины при срабатывании события и пропускает дальше только то,
 * что проходит `filter`. Стор получает уже проверенный товар.
 */
sample({
  clock: productAdded,
  source: $inCartByProductId,
  filter: (inCartByProductId, product) => (inCartByProductId.get(product.id) ?? 0) < product.stock,
  fn: (_inCartByProductId, product) => product,
  target: productAccepted,
});

export const $isCartEmpty = combine($items, (items) => items.length === 0);
