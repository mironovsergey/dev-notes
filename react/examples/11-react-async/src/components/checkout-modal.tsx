import { useEffect, useRef } from 'react';
import { formatPrice, type Order } from '../domain';
import { useItemCount, useTotals } from '../model/cart-context';
import { CheckoutForm } from './checkout-form';
import { Modal } from './modal';

interface CheckoutModalProps {
  order: Order | null;
  onClose: () => void;
  onOrderAccepted: (order: Order) => void;
}

export function CheckoutModal({ order, onClose, onOrderAccepted }: CheckoutModalProps) {
  const totals = useTotals();
  const itemCount = useItemCount();
  const nameRef = useRef<HTMLInputElement>(null);
  const doneRef = useRef<HTMLButtonElement>(null);

  /**
   * Фокус переводится здесь, а не внутри формы.
   *
   * Эффекты выполняются от потомков к предкам: эффект внутри формы сработал
   * бы раньше, чем `Modal` добавит контейнер портала в документ, и фокус
   * ушел бы в никуда.
   */
  useEffect(() => {
    if (order === null) {
      nameRef.current?.focus();
    } else {
      doneRef.current?.focus();
    }
  }, [order]);

  return (
    <Modal title={order === null ? 'Оформление заказа' : 'Спасибо!'} onClose={onClose}>
      {order === null ? (
        <CheckoutForm
          totals={totals}
          itemCount={itemCount}
          nameRef={nameRef}
          onClose={onClose}
          onOrderAccepted={onOrderAccepted}
        />
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
