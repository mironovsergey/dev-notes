import { useUnit } from 'effector-react';
import type { CartLine as CartLineData } from '../domain';
import { $cartLines, $isCartEmpty, $postponedLines, checkoutOpened } from '../model';
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

export function Cart() {
  const [lines, postponed, isCartEmpty, openCheckout] = useUnit([
    $cartLines,
    $postponedLines,
    $isCartEmpty,
    checkoutOpened,
  ]);

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
      {postponed.length > 0 && (
        <div className="cart__section">
          <h3 className="cart__subtitle">Отложенные</h3>
          <CartLines lines={postponed} arePostponed />
        </div>
      )}
      <div className="cart__section">
        <PromoForm />
      </div>
      <div className="cart__section">
        <Delivery />
      </div>
      <div className="cart__section">
        <Totals />
      </div>
      <button
        type="button"
        className="button button_wide"
        disabled={isCartEmpty}
        onClick={() => {
          openCheckout();
        }}
      >
        Оформить заказ
      </button>
    </section>
  );
}
