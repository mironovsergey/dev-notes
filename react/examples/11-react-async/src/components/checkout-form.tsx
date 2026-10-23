import { useActionState, type RefObject } from 'react';
import { useFormStatus } from 'react-dom';
import { createOrder, errorMessage, formatPrice } from '../domain';
import type { Order, Totals } from '../domain';
import { useCartState } from '../model/cart-context';
import { TextField } from './text-field';

/**
 * Кнопка узнает о ходе отправки сама.
 *
 * `useFormStatus` читает состояние ближайшей формы-предка, поэтому кнопка
 * не принимает пропов. В компоненте, который саму форму рендерит, хук
 * всегда вернул бы `pending: false` - отсюда отдельный компонент.
 */
function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className="checkout-form__action button" disabled={pending}>
      {pending ? 'Отправляем…' : 'Подтвердить заказ'}
    </button>
  );
}

function CancelButton({ onCancel }: { onCancel: () => void }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="button"
      className="checkout-form__action button button_ghost"
      onClick={onCancel}
      disabled={pending}
    >
      Отмена
    </button>
  );
}

interface CheckoutFormProps {
  totals: Totals;
  itemCount: number;
  nameRef: RefObject<HTMLInputElement | null>;
  onClose: () => void;
  onOrderAccepted: (order: Order) => void;
}

export function CheckoutForm({
  totals,
  itemCount,
  nameRef,
  onClose,
  onOrderAccepted,
}: CheckoutFormProps) {
  const { items, promo, delivery } = useCartState();

  /**
   * Действие формы: значения приходят в `FormData`, ошибка становится
   * состоянием. `preventDefault` не нужен - React не отправляет форму
   * браузером.
   */
  const [error, submitOrder] = useActionState<string | null, FormData>(
    async (_previousError, formData) => {
      try {
        const order = await createOrder({
          // Наружу уходит форма запроса API: идентификатор и количество
          items: items.map((line) => ({ productId: line.product.id, qty: line.qty })),
          promoCode: promo?.code ?? null,
          delivery,
          customer: {
            name: String(formData.get('name') ?? '').trim(),
            phone: String(formData.get('phone') ?? '').trim(),
            address: String(formData.get('address') ?? '').trim(),
          },
        });

        onOrderAccepted(order);

        return null;
      } catch (caught: unknown) {
        return errorMessage(caught, 'Не удалось оформить заказ');
      }
    },
    null,
  );

  return (
    <form className="checkout-form" action={submitOrder}>
      <p className="checkout-form__summary">
        Позиций: {itemCount}. К оплате: {formatPrice(totals.total)}
      </p>
      <TextField label="Имя" name="name" autoComplete="name" ref={nameRef} />
      <TextField label="Телефон" name="phone" type="tel" autoComplete="tel" />
      <TextField label="Адрес" name="address" autoComplete="street-address" />
      {error !== null && (
        <p className="message message_error" role="alert">
          {error}
        </p>
      )}
      <div className="checkout-form__actions">
        <CancelButton onCancel={onClose} />
        <SubmitButton />
      </div>
    </form>
  );
}
