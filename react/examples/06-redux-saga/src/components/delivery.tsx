import type { ChangeEvent } from 'react';
import { DELIVERY_OPTIONS, formatPrice, isDeliveryMethod } from '../domain';
import { deliveryActions } from '../store/delivery-slice';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { selectDelivery } from '../store/delivery-slice';

export function Delivery() {
  const delivery = useAppSelector(selectDelivery);
  const dispatch = useAppDispatch();

  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    if (isDeliveryMethod(event.target.value)) {
      dispatch(deliveryActions.changed(event.target.value));
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
