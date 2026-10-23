import { memo } from 'react';

interface StepperProps {
  value: number;
  max: number;
  label: string;
  onChange: (next: number) => void;
}

export const Stepper = memo(function Stepper({ value, max, label, onChange }: StepperProps) {
  return (
    <div className="stepper" role="group" aria-label={`Количество: ${label}`}>
      <button
        type="button"
        className="stepper__button"
        aria-label={`Меньше: ${label}`}
        disabled={value <= 1}
        onClick={() => {
          onChange(value - 1);
        }}
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
        onClick={() => {
          onChange(value + 1);
        }}
      >
        +
      </button>
    </div>
  );
});
