import { useEffect, useRef, useState, type SubmitEvent } from 'react';
import { formatPrice, type Customer } from '../domain';
import { submitOrder } from '../store/shop-actions';
import { useItemCount, useShopDispatch, useShopState, useTotals } from '../store/shop-context';
import { Modal } from './modal';
import { TextField } from './text-field';

const EMPTY_CUSTOMER: Customer = { name: '', phone: '', address: '' };

/** Окно оформления: данные берет из контекста, отправку делает асинхронное действие. */
export function CheckoutModal() {
  const { items, promo, delivery, checkout } = useShopState();
  const dispatch = useShopDispatch();
  const totals = useTotals();
  const itemCount = useItemCount();

  const [customer, setCustomer] = useState<Customer>(EMPTY_CUSTOMER);
  const nameRef = useRef<HTMLInputElement>(null);
  const doneRef = useRef<HTMLButtonElement>(null);

  const { order, isSubmitting, error } = checkout;

  useEffect(() => {
    if (order === null) {
      nameRef.current?.focus();
    } else {
      doneRef.current?.focus();
    }
  }, [order]);

  const close = (): void => {
    dispatch({ type: 'checkout/closed' });
  };

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>): void => {
    event.preventDefault();
    void submitOrder(dispatch, {
      items,
      promo,
      delivery,
      customer: {
        name: customer.name.trim(),
        phone: customer.phone.trim(),
        address: customer.address.trim(),
      },
    });
  };

  return (
    <Modal title={order === null ? 'Оформление заказа' : 'Спасибо!'} onClose={close}>
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
              onClick={close}
              disabled={isSubmitting}
            >
              Отмена
            </button>
            <button type="submit" className="checkout-form__action button" disabled={isSubmitting}>
              {isSubmitting ? 'Отправляем…' : 'Подтвердить заказ'}
            </button>
          </div>
        </form>
      ) : (
        <div className="order-done" role="status">
          <p>Заказ принят. Номер заказа:</p>
          <p className="order-done__number">{order.id}</p>
          <p>К оплате при получении: {formatPrice(order.total)}</p>
          <button type="button" className="button" ref={doneRef} onClick={close}>
            Вернуться в магазин
          </button>
        </div>
      )}
    </Modal>
  );
}
