import { PureComponent, type ChangeEvent, type ReactNode } from 'react';
import { DELIVERY_OPTIONS, formatPrice, isDeliveryMethod, type DeliveryMethod } from '../domain';

interface DeliveryProps {
  value: DeliveryMethod;
  onChange: (method: DeliveryMethod) => void;
}

export class Delivery extends PureComponent<DeliveryProps> {
  handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const { value } = event.target;

    if (isDeliveryMethod(value)) {
      this.props.onChange(value);
    }
  };

  override render(): ReactNode {
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
              checked={this.props.value === option.method}
              onChange={this.handleChange}
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
}
