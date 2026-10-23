import { attach, createEffect, createEvent, createStore, sample } from 'effector';
import { createOrder, errorMessage, type Customer, type Order, type OrderRequest } from '../domain';
import { $cart, cartCleared } from './cart';
import { $delivery } from './delivery';
import { $promo } from './promo';

export const checkoutOpened = createEvent();
export const checkoutClosed = createEvent();
export const orderSubmitted = createEvent<Customer>();

const createOrderFx = createEffect<OrderRequest, Order>(async (request) => createOrder(request));

/**
 * `attach` строит новый эффект поверх существующего, добавляя к параметрам
 * данные из сторов: компонент передает только покупателя, а состав заказа
 * модель собирает сама.
 */
export const submitOrderFx = attach({
  effect: createOrderFx,
  source: { cart: $cart, promo: $promo, delivery: $delivery },
  mapParams: (customer: Customer, { cart, promo, delivery }): OrderRequest => ({
    items: [...cart.items],
    promoCode: promo?.code ?? null,
    delivery,
    customer,
  }),
});

export const $isCheckoutOpen = createStore(false)
  .on(checkoutOpened, () => true)
  .reset(checkoutClosed);

/**
 * Заказ сбрасывается при **открытии** окна, а не при закрытии.
 *
 * Иначе связь ниже не сработала бы: граф обновляет сторы раньше, чем
 * `sample` их читает, и на `checkoutClosed` заказ был бы уже пустым.
 */
export const $order = createStore<Order | null>(null)
  .on(submitOrderFx.doneData, (_order, order) => order)
  .reset(checkoutOpened);

export const $checkoutError = createStore<string | null>(null)
  .on(submitOrderFx.failData, (_error, error) => errorMessage(error, 'Не удалось оформить заказ'))
  .reset(checkoutOpened, submitOrderFx);

sample({ clock: orderSubmitted, target: submitOrderFx });

/** Корзина очищается при закрытии окна и только если заказ был принят. */
sample({
  clock: checkoutClosed,
  source: $order,
  filter: (order: Order | null) => order !== null,
  target: cartCleared,
});
