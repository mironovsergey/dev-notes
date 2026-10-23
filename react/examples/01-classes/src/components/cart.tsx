import { Component, type ReactNode } from 'react';
import type {
  CartLine as CartLineData,
  DeliveryMethod,
  Promo,
  Totals as TotalsData,
} from '../domain';
import { CartLine } from './cart-line';
import { Delivery } from './delivery';
import { PromoForm, type PromoResult } from './promo-form';
import { Totals } from './totals';

interface CartProps {
  lines: readonly CartLineData[];
  postponed: readonly CartLineData[];
  promo: Promo | null;
  delivery: DeliveryMethod;
  totals: TotalsData;
  onQtyChange: (productId: string, qty: number) => void;
  onRemove: (productId: string) => void;
  onPostpone: (productId: string) => void;
  onRestore: (productId: string) => void;
  onApplyPromo: (code: string) => Promise<PromoResult>;
  onClearPromo: () => void;
  onDeliveryChange: (method: DeliveryMethod) => void;
  onCheckout: () => void;
}

/** Презентационный компонент: все приходит через пропсы, все изменения уходят наверх через колбэки. */
export class Cart extends Component<CartProps> {
  renderLines(lines: readonly CartLineData[], postponed: boolean): ReactNode {
    return (
      <ul className="cart__items" role="list">
        {lines.map((line) => (
          <li className="cart__item" key={line.product.id}>
            <CartLine
              line={line}
              postponed={postponed}
              onQtyChange={this.props.onQtyChange}
              onRemove={this.props.onRemove}
              onToggle={postponed ? this.props.onRestore : this.props.onPostpone}
            />
          </li>
        ))}
      </ul>
    );
  }

  override render(): ReactNode {
    const { lines, postponed, promo, delivery, totals } = this.props;
    const isCartEmpty = lines.length === 0;

    return (
      <section className="cart" aria-labelledby="cart-title">
        <h2 className="cart__title" id="cart-title">
          Корзина
        </h2>
        {isCartEmpty ? (
          <p className="cart__empty">Добавьте товары из каталога</p>
        ) : (
          this.renderLines(lines, false)
        )}
        {postponed.length > 0 && (
          <div className="cart__section">
            <h3 className="cart__subtitle">Отложенные</h3>
            {this.renderLines(postponed, true)}
          </div>
        )}
        <div className="cart__section">
          <PromoForm
            promo={promo}
            subtotal={totals.subtotal}
            onApply={this.props.onApplyPromo}
            onClear={this.props.onClearPromo}
          />
        </div>
        <div className="cart__section">
          <Delivery value={delivery} onChange={this.props.onDeliveryChange} />
        </div>
        <div className="cart__section">
          <Totals totals={totals} />
        </div>
        <button
          type="button"
          className="button button_wide"
          disabled={isCartEmpty}
          onClick={this.props.onCheckout}
        >
          Оформить заказ
        </button>
      </section>
    );
  }
}
