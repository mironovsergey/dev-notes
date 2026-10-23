import { PureComponent, type ReactNode } from 'react';

interface StepperProps {
  value: number;
  max: number;
  label: string;
  onChange: (next: number) => void;
}

export class Stepper extends PureComponent<StepperProps> {
  handleDecrease = (): void => {
    this.props.onChange(this.props.value - 1);
  };

  handleIncrease = (): void => {
    this.props.onChange(this.props.value + 1);
  };

  override render(): ReactNode {
    const { value, max, label } = this.props;

    return (
      <div className="stepper" role="group" aria-label={`Количество: ${label}`}>
        <button
          type="button"
          className="stepper__button"
          aria-label={`Меньше: ${label}`}
          disabled={value <= 1}
          onClick={this.handleDecrease}
        >
          −
        </button>
        <output className="stepper__value" aria-label={`Количество ${label}`}>
          {value}
        </output>
        <button
          type="button"
          className="stepper__button"
          aria-label={`Больше: ${label}`}
          disabled={value >= max}
          onClick={this.handleIncrease}
        >
          +
        </button>
      </div>
    );
  }
}
