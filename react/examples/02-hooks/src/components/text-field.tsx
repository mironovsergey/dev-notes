import { useId, type ChangeEvent, type ComponentProps } from 'react';

/**
 * Пропсы нативного элемента переиспользуются, а не переписываются вручную.
 *
 * `ComponentProps<'input'>` дает весь набор атрибутов `<input>` вместе с `ref`
 * (React 19 отдает его обычным пропом) и обработчиками. Свои `id` и `onChange`
 * исключены: идентификатор компонент выдает сам, а наружу отдает значение,
 * а не событие.
 */
interface TextFieldProps extends Omit<ComponentProps<'input'>, 'id' | 'onChange'> {
  label: string;

  /** Не обязателен: поле бывает и неуправляемым - тогда значение читает `FormData`. */
  onChange?: (value: string) => void;
}

/** Поле формы с подписью; идентификатор для `htmlFor` дает `useId`, а не строка в разметке. */
export function TextField({ label, onChange, ...inputProps }: TextFieldProps) {
  const fieldId = useId();

  const handleChange =
    onChange === undefined
      ? undefined
      : (event: ChangeEvent<HTMLInputElement>): void => {
          onChange(event.target.value);
        };

  return (
    <div className="field">
      <label className="field__label" htmlFor={fieldId}>
        {label}
      </label>
      <input
        className="input"
        id={fieldId}
        type="text"
        required
        {...inputProps}
        onChange={handleChange}
      />
    </div>
  );
}
