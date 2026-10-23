import { Component, createRef, type ReactNode, type SubmitEvent } from 'react';
import { formatPrice, type Customer, type Order, type Totals } from '../domain';
import { Modal } from './modal';

interface CheckoutModalProps {
  totals: Totals;
  itemCount: number;
  submitting: boolean;
  error: string | null;
  order: Order | null;
  onSubmit: (customer: Customer) => void;
  onClose: () => void;
}

/** Неуправляемая форма: значения нужны один раз, при отправке, поэтому живут в DOM и читаются через ref. */
export class CheckoutModal extends Component<CheckoutModalProps> {
  private readonly formRef = createRef<HTMLFormElement>();

  handleSubmit = (event: SubmitEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const form = this.formRef.current;

    if (form === null) {
      return;
    }

    const formData = new FormData(form);
    this.props.onSubmit({
      name: String(formData.get('name') ?? '').trim(),
      phone: String(formData.get('phone') ?? '').trim(),
      address: String(formData.get('address') ?? '').trim(),
    });
  };

  renderDone(order: Order): ReactNode {
    return (
      <div className="order-done" role="status">
        <p>Заказ принят. Номер заказа:</p>
        <p className="order-done__number">{order.id}</p>
        <p>К оплате при получении: {formatPrice(order.total)}</p>
        <button type="button" className="button" onClick={this.props.onClose}>
          Вернуться в магазин
        </button>
      </div>
    );
  }

  renderForm(): ReactNode {
    const { totals, itemCount, submitting, error, onClose } = this.props;

    return (
      <form className="checkout-form" ref={this.formRef} onSubmit={this.handleSubmit}>
        <p className="checkout-form__summary">
          Позиций: {itemCount}. К оплате: {formatPrice(totals.total)}
        </p>
        <div className="field">
          <label className="field__label" htmlFor="checkout-name">
            Имя
          </label>
          <input className="input" id="checkout-name" name="name" required autoComplete="name" />
        </div>
        <div className="field">
          <label className="field__label" htmlFor="checkout-phone">
            Телефон
          </label>
          <input
            className="input"
            id="checkout-phone"
            name="phone"
            type="tel"
            required
            autoComplete="tel"
          />
        </div>
        <div className="field">
          <label className="field__label" htmlFor="checkout-address">
            Адрес
          </label>
          <input
            className="input"
            id="checkout-address"
            name="address"
            required
            autoComplete="street-address"
          />
        </div>
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
    );
  }

  override render(): ReactNode {
    const { order, onClose } = this.props;

    return (
      <Modal title={order === null ? 'Оформление заказа' : 'Спасибо!'} onClose={onClose}>
        {order === null ? this.renderForm() : this.renderDone(order)}
      </Modal>
    );
  }
}
