import type { CartLine as CartLineData } from '../domain';
import { useCartLines, useShopDispatch } from '../store/shop-context';
import { CartLine } from './cart-line';
import { Delivery } from './delivery';
import { PromoForm } from './promo-form';
import { Totals } from './totals';

function CartLines({
  lines,
  arePostponed,
}: {
  lines: readonly CartLineData[];
  arePostponed: boolean;
}) {
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

/** Данные приходят из контекста, поэтому у секции корзины не осталось пропсов. */
export function Cart() {
  const { lines, postponed } = useCartLines();
  const dispatch = useShopDispatch();
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
          dispatch({ type: 'checkout/opened' });
        }}
      >
        Оформить заказ
      </button>
    </section>
  );
}
