import type {
  CartLine as CartLineData,
  DeliveryMethod,
  Product,
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
  onQtyChange: (product: Product, qty: number) => void;
  onRemove: (productId: string) => void;
  onPostpone: (productId: string) => void;
  onRestore: (productId: string) => void;
  onApplyPromo: (code: string) => Promise<PromoResult>;
  onClearPromo: () => void;
  onDeliveryChange: (method: DeliveryMethod) => void;
  onCheckout: () => void;
}

/** Презентационный компонент: все приходит через пропсы, все изменения уходят наверх через колбэки. */
export function Cart({
  lines,
  postponed,
  promo,
  delivery,
  totals,
  onQtyChange,
  onRemove,
  onPostpone,
  onRestore,
  onApplyPromo,
  onClearPromo,
  onDeliveryChange,
  onCheckout,
}: CartProps) {
  const isCartEmpty = lines.length === 0;

  const renderLines = (cartLines: readonly CartLineData[], arePostponed: boolean) => (
    <ul className="cart__items" role="list">
      {cartLines.map((line) => (
        <li className="cart__item" key={line.product.id}>
          <CartLine
            line={line}
            postponed={arePostponed}
            onQtyChange={onQtyChange}
            onRemove={onRemove}
            onToggle={arePostponed ? onRestore : onPostpone}
          />
        </li>
      ))}
    </ul>
  );

  return (
    <section className="cart" aria-labelledby="cart-title">
      <h2 className="cart__title" id="cart-title">
        Корзина
      </h2>
      {isCartEmpty ? (
        <p className="cart__empty">Добавьте товары из каталога</p>
      ) : (
        renderLines(lines, false)
      )}
      {postponed.length > 0 && (
        <div className="cart__section">
          <h3 className="cart__subtitle">Отложенные</h3>
          {renderLines(postponed, true)}
        </div>
      )}
      <div className="cart__section">
        <PromoForm
          promo={promo}
          subtotal={totals.subtotal}
          onApply={onApplyPromo}
          onClear={onClearPromo}
        />
      </div>
      <div className="cart__section">
        <Delivery value={delivery} onChange={onDeliveryChange} />
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
