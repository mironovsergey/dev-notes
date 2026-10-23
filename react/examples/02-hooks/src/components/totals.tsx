import { memo } from 'react';
import { formatPrice, type Totals as TotalsData } from '../domain';

interface TotalsProps {
  totals: TotalsData;
}

export const Totals = memo(function Totals({ totals }: TotalsProps) {
  const { subtotal, discounts, deliveryCost, total } = totals;

  return (
    <dl className="totals" aria-label="Итоги">
      <div className="totals__row">
        <dt className="totals__label">Товары</dt>
        <dd className="totals__value">{formatPrice(subtotal)}</dd>
      </div>
      {discounts.map((discount) => (
        <div className="totals__row totals__row_discount" key={discount.kind}>
          <dt className="totals__label">{discount.label}</dt>
          <dd className="totals__value">−{formatPrice(discount.amount)}</dd>
        </div>
      ))}
      <div className="totals__row">
        <dt className="totals__label">Доставка</dt>
        <dd className="totals__value">
          {deliveryCost === 0 ? 'бесплатно' : formatPrice(deliveryCost)}
        </dd>
      </div>
      <div className="totals__row totals__row_total">
        <dt className="totals__label">Итого</dt>
        <dd className="totals__value" aria-label="Итого">
          {formatPrice(total)}
        </dd>
      </div>
    </dl>
  );
});
