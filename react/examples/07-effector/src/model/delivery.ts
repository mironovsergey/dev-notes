import { createEvent, createStore } from 'effector';
import type { DeliveryMethod } from '../domain';

export const deliveryChanged = createEvent<DeliveryMethod>();

/** Отдельный стор на независимое значение: его изменение не касается других. */
export const $delivery = createStore<DeliveryMethod>('pickup').on(
  deliveryChanged,
  (_delivery, method) => method,
);
