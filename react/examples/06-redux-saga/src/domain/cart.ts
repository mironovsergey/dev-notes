import type { CartItem, CartLine, Product } from './types';

// Операции над списком позиций корзины неизменяемые: каждая возвращает новый массив.

/** Соединяет позиции корзины с товарами; позиции с неизвестным товаром отбрасываются. */
export function toCartLines(items: readonly CartItem[], products: readonly Product[]): CartLine[] {
  return items.flatMap((item) => {
    const product = products.find((candidate) => candidate.id === item.productId);

    return product === undefined ? [] : [{ product, qty: item.qty }];
  });
}

/** Задает количество указанной позиции; остальные позиции и их порядок сохраняются. */
export function withQty(items: readonly CartItem[], productId: string, qty: number): CartItem[] {
  return items.map((item) => (item.productId === productId ? { ...item, qty } : item));
}

/** Убирает позицию с указанным товаром; отсутствие такой позиции не считается ошибкой. */
export function withoutItem(items: readonly CartItem[], productId: string): CartItem[] {
  return items.filter((item) => item.productId !== productId);
}

/** Суммарное количество единиц товара во всех позициях списка. */
export function countItems(items: readonly CartItem[]): number {
  return items.reduce((sum, item) => sum + item.qty, 0);
}
