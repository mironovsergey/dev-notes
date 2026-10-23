import type { ChangeEvent } from 'react';
import { DELIVERY_OPTIONS, formatPrice, isDeliveryMethod } from '../domain';
import { useCartStore } from '../store/cart-store';

export function Delivery() {
  const delivery = useCartStore((store) => store.delivery);
  const changeDelivery = useCartStore((store) => store.changeDelivery);

  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    if (isDeliveryMethod(event.target.value)) {
      changeDelivery(event.target.value);
    }
  };

  return (
    <fieldset className="delivery">
      <legend className="delivery__title">Доставка</legend>
      {DELIVERY_OPTIONS.map((option) => (
        <label className="delivery__option" key={option.method}>
          <input
            className="delivery__radio"
            type="radio"
            name="delivery"
            value={option.method}
            checked={delivery === option.method}
            onChange={handleChange}
          />
          <span className="delivery__name">{option.title}</span>
          <span className="delivery__cost">
            {option.cost === 0 ? 'бесплатно' : formatPrice(option.cost)}
            {option.freeFrom !== undefined && `, от ${formatPrice(option.freeFrom)} бесплатно`}
          </span>
        </label>
      ))}
    </fieldset>
  );
}
