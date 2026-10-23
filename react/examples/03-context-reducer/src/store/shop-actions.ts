import { ApiError, createOrder, errorMessage, validatePromo } from '../domain';
import type { CartItem, Customer, DeliveryMethod, Promo } from '../domain';
import type { ActionDispatch } from 'react';
import type { ShopAction } from './shop-reducer';

type ShopDispatch = ActionDispatch<[action: ShopAction]>;

export type PromoResult = { ok: true; promo: Promo } | { ok: false; message: string };

/**
 * Асинхронные операции вынесены из компонентов и редьюсера в обычные функции,
 * принимающие `dispatch`: редьюсер обязан остаться чистым, а компонент не
 * должен знать, как устроен запрос. В варианте с Redux ту же роль выполнит
 * thunk.
 */
export async function applyPromo(dispatch: ShopDispatch, code: string): Promise<PromoResult> {
  try {
    const appliedPromo = await validatePromo(code);

    dispatch({ type: 'promo/applied', promo: appliedPromo });

    return { ok: true, promo: appliedPromo };
  } catch (error: unknown) {
    const message =
      error instanceof ApiError
        ? error.message
        : errorMessage(error, 'Не удалось проверить промокод');

    return { ok: false, message };
  }
}

interface SubmitOrderPayload {
  items: readonly CartItem[];
  promo: Promo | null;
  delivery: DeliveryMethod;
  customer: Customer;
}

export async function submitOrder(
  dispatch: ShopDispatch,
  { items, promo, delivery, customer }: SubmitOrderPayload,
): Promise<void> {
  dispatch({ type: 'checkout/submitStarted' });

  try {
    const createdOrder = await createOrder({
      items: [...items],
      promoCode: promo?.code ?? null,
      delivery,
      customer,
    });

    dispatch({ type: 'checkout/succeeded', order: createdOrder });
  } catch (error: unknown) {
    dispatch({
      type: 'checkout/submitFailed',
      message: errorMessage(error, 'Не удалось оформить заказ'),
    });
  }
}
