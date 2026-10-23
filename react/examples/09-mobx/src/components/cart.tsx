import { observer } from 'mobx-react-lite';
import type { CartLine as CartLineData } from '../domain';
import { useStores } from '../store/store-context';
import { CartLine } from './cart-line';
import { Delivery } from './delivery';
import { PromoForm } from './promo-form';
import { Totals } from './totals';

interface CartLinesProps {
  lines: readonly CartLineData[];
  arePostponed: boolean;
}

const CartLines = observer(function CartLines({ lines, arePostponed }: CartLinesProps) {
  return (
    <ul className="cart__items" role="list">
      {lines.map((line) => (
        <li className="cart__item" key={line.product.id}>
          <CartLine line={line} postponed={arePostponed} />
        </li>
      ))}
    </ul>
  );
});

export const Cart = observer(function Cart() {
  const { cart, checkout } = useStores();

  return (
    <section className="cart" aria-labelledby="cart-title">
      <h2 className="cart__title" id="cart-title">
        Корзина
      </h2>
      {cart.isEmpty ? (
        <p className="cart__empty">Добавьте товары из каталога</p>
      ) : (
        <CartLines lines={cart.lines} arePostponed={false} />
      )}
      {cart.postponedLines.length > 0 && (
        <div className="cart__section">
          <h3 className="cart__subtitle">Отложенные</h3>
          <CartLines lines={cart.postponedLines} arePostponed />
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
        disabled={cart.isEmpty}
        onClick={checkout.open}
      >
        Оформить заказ
      </button>
    </section>
  );
});
