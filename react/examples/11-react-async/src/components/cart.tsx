import type { CartLine as CartLineData } from '../domain';
import { useCartState, useTotals } from '../model/cart-context';
import { CartLine } from './cart-line';
import { Delivery } from './delivery';
import { PromoForm } from './promo-form';
import { Totals } from './totals';

interface CartLinesProps {
  lines: readonly CartLineData[];
  arePostponed: boolean;
}

function CartLines({ lines, arePostponed }: CartLinesProps) {
  return (
    <ul className="cart__items" role="list">
      {lines.map((line) => (
        <li className="cart__item" key={line.product.id}>
          <CartLine line={line} postponed={arePostponed} />
        </li>
      ))}
    </ul>
  );
}

export function Cart({ onCheckout }: { onCheckout: () => void }) {
  const { items: lines, postponed: postponedLines } = useCartState();
  const totals = useTotals();
  const isCartEmpty = lines.length === 0;

  return (
    <section className="cart" aria-labelledby="cart-title">
      <h2 className="cart__title" id="cart-title">
        Корзина
      </h2>
      {isCartEmpty ? (
        <p className="cart__empty">Добавьте товары из каталога</p>
      ) : (
        <CartLines lines={lines} arePostponed={false} />
      )}
      {postponedLines.length > 0 && (
        <div className="cart__section">
          <h3 className="cart__subtitle">Отложенные</h3>
          <CartLines lines={postponedLines} arePostponed />
        </div>
      )}
      <div className="cart__section">
        <PromoForm subtotal={totals.subtotal} />
      </div>
      <div className="cart__section">
        <Delivery />
      </div>
      <div className="cart__section">
        <Totals totals={totals} />
      </div>
      <button
        type="button"
        className="button button_wide"
        disabled={isCartEmpty}
        onClick={onCheckout}
      >
        Оформить заказ
      </button>
    </section>
  );
}
