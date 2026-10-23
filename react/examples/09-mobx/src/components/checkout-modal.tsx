import { useEffect, useRef, useState, type SubmitEvent } from 'react';
import { observer } from 'mobx-react-lite';
import { formatPrice, type Customer } from '../domain';
import { useStores } from '../store/store-context';
import { Modal } from './modal';
import { TextField } from './text-field';

const EMPTY_CUSTOMER: Customer = { name: '', phone: '', address: '' };

export const CheckoutModal = observer(function CheckoutModal() {
  const { cart, checkout } = useStores();
  const [customer, setCustomer] = useState<Customer>(EMPTY_CUSTOMER);
  const nameRef = useRef<HTMLInputElement>(null);
  const doneRef = useRef<HTMLButtonElement>(null);

  const { order } = checkout;

  useEffect(() => {
    if (order === null) {
      nameRef.current?.focus();
    } else {
      doneRef.current?.focus();
    }
  }, [order]);

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>): void => {
    event.preventDefault();
    void checkout.submit({
      name: customer.name.trim(),
      phone: customer.phone.trim(),
      address: customer.address.trim(),
    });
  };

  return (
    <Modal title={order === null ? 'Оформление заказа' : 'Спасибо!'} onClose={checkout.close}>
      {order === null ? (
        <form className="checkout-form" onSubmit={handleSubmit}>
          <p className="checkout-form__summary">
            Позиций: {cart.itemCount}. К оплате: {formatPrice(cart.totals.total)}
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
          {checkout.error !== null && (
            <p className="message message_error" role="alert">
              {checkout.error}
            </p>
          )}
          <div className="checkout-form__actions">
            <button
              type="button"
              className="checkout-form__action button button_ghost"
              onClick={checkout.close}
              disabled={checkout.isSubmitting}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="checkout-form__action button"
              disabled={checkout.isSubmitting}
            >
              {checkout.isSubmitting ? 'Отправляем…' : 'Подтвердить заказ'}
            </button>
          </div>
        </form>
      ) : (
        <div className="order-done" role="status">
          <p>Заказ принят. Номер заказа:</p>
          <p className="order-done__number">{order.id}</p>
          <p>К оплате при получении: {formatPrice(order.total)}</p>
          <button type="button" className="button" ref={doneRef} onClick={checkout.close}>
            Вернуться в магазин
          </button>
        </div>
      )}
    </Modal>
  );
});
