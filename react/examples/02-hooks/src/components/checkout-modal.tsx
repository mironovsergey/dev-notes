import { useEffect, useRef, useState, type SubmitEvent } from 'react';
import { formatPrice, type Customer, type Order, type Totals } from '../domain';
import { Modal } from './modal';
import { TextField } from './text-field';

interface CheckoutModalProps {
  totals: Totals;
  itemCount: number;
  submitting: boolean;
  error: string | null;
  order: Order | null;
  onSubmit: (customer: Customer) => void;
  onClose: () => void;
}

const EMPTY_CUSTOMER: Customer = { name: '', phone: '', address: '' };

/**
 * Управляемая форма: значения живут в состоянии, а не в DOM.
 *
 * Отличие от варианта на классах, где та же форма была неуправляемой и читалась
 * через `FormData`; здесь видно, как хранить ввод в состоянии и переводить фокус
 * эффектом.
 */
export function CheckoutModal({
  totals,
  itemCount,
  submitting,
  error,
  order,
  onSubmit,
  onClose,
}: CheckoutModalProps) {
  const [customer, setCustomer] = useState<Customer>(EMPTY_CUSTOMER);
  const nameRef = useRef<HTMLInputElement>(null);
  const doneRef = useRef<HTMLButtonElement>(null);

  // Фокус переводится в окно после монтирования: сначала на первое поле,
  // а когда заказ принят - на кнопку возврата.
  useEffect(() => {
    if (order === null) {
      nameRef.current?.focus();
    } else {
      doneRef.current?.focus();
    }
  }, [order]);

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>): void => {
    event.preventDefault();
    onSubmit({
      name: customer.name.trim(),
      phone: customer.phone.trim(),
      address: customer.address.trim(),
    });
  };

  return (
    <Modal title={order === null ? 'Оформление заказа' : 'Спасибо!'} onClose={onClose}>
      {order === null ? (
        <form className="checkout-form" onSubmit={handleSubmit}>
          <p className="checkout-form__summary">
            Позиций: {itemCount}. К оплате: {formatPrice(totals.total)}
          </p>
          <TextField
            label="Имя"
            name="name"
            value={customer.name}
            autoComplete="name"
            ref={nameRef}
            onChange={(name) => {
              setCustomer((current) => ({ ...current, name }));
            }}
          />
          <TextField
            label="Телефон"
            name="phone"
            type="tel"
            value={customer.phone}
            autoComplete="tel"
            onChange={(phone) => {
              setCustomer((current) => ({ ...current, phone }));
            }}
          />
          <TextField
            label="Адрес"
            name="address"
            value={customer.address}
            autoComplete="street-address"
            onChange={(address) => {
              setCustomer((current) => ({ ...current, address }));
            }}
          />
          {error !== null && (
            <p className="message message_error" role="alert">
              {error}
            </p>
          )}
          <div className="checkout-form__actions">
            <button
              type="button"
              className="checkout-form__action button button_ghost"
              onClick={onClose}
              disabled={submitting}
            >
              Отмена
            </button>
            <button type="submit" className="checkout-form__action button" disabled={submitting}>
              {submitting ? 'Отправляем…' : 'Подтвердить заказ'}
            </button>
          </div>
        </form>
      ) : (
        <div className="order-done" role="status">
          <p>Заказ принят. Номер заказа:</p>
          <p className="order-done__number">{order.id}</p>
          <p>К оплате при получении: {formatPrice(order.total)}</p>
          <button type="button" className="button" ref={doneRef} onClick={onClose}>
            Вернуться в магазин
          </button>
        </div>
      )}
    </Modal>
  );
}
