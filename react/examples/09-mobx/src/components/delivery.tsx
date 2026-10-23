import type { ChangeEvent } from 'react';
import { observer } from 'mobx-react-lite';
import { DELIVERY_OPTIONS, formatPrice, isDeliveryMethod } from '../domain';
import { useStores } from '../store/store-context';

export const Delivery = observer(function Delivery() {
  const { cart } = useStores();

  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    if (isDeliveryMethod(event.target.value)) {
      cart.setDelivery(event.target.value);
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
            checked={cart.delivery === option.method}
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
});
