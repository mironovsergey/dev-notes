import { useEffect, useRef, useState, type SubmitEvent } from 'react';
import { formatPrice, type Customer } from '../domain';
import { useItemCount, useTotals } from '../hooks/use-cart-data';
import { useOrderMutation } from '../hooks/use-order-mutation';
import { useCartStore } from '../store/cart-store';
import { Modal } from './modal';
import { TextField } from './text-field';

const EMPTY_CUSTOMER: Customer = { name: '', phone: '', address: '' };

export function CheckoutModal() {
  const closeCheckout = useCartStore((store) => store.closeCheckout);
  const clearCart = useCartStore((store) => store.clearCart);
  const totals = useTotals();
  const itemCount = useItemCount();

  // Заказ и состояние отправки - в самой мутации; в сторе их нет.
  const { mutate, isPending, error, data: order } = useOrderMutation();

  const [customer, setCustomer] = useState<Customer>(EMPTY_CUSTOMER);
  const nameRef = useRef<HTMLInputElement>(null);
  const doneRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (order === undefined) {
      nameRef.current?.focus();
    } else {
      doneRef.current?.focus();
    }
  }, [order]);

  const close = (): void => {
    if (order !== undefined) {
      clearCart();
    }

    closeCheckout();
  };

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>): void => {
    event.preventDefault();
    mutate({
      name: customer.name.trim(),
      phone: customer.phone.trim(),
      address: customer.address.trim(),
    });
  };

  return (
    <Modal title={order === undefined ? 'Оформление заказа' : 'Спасибо!'} onClose={close}>
      {order === undefined ? (
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
              {error.message}
            </p>
          )}
          <div className="checkout-form__actions">
            <button
              type="button"
              className="checkout-form__action button button_ghost"
              onClick={close}
              disabled={isPending}
            >
              Отмена
            </button>
            <button type="submit" className="checkout-form__action button" disabled={isPending}>
              {isPending ? 'Отправляем…' : 'Подтвердить заказ'}
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
