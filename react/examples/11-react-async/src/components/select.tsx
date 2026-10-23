import type { ChangeEvent } from 'react';

export interface SelectOption<Value extends string> {
  value: Value;
  title: string;
}

/**
 * Обобщенный компонент: параметр `Value` связывает список вариантов со
 * значением и обработчиком.
 *
 * Благодаря этому `onChange` получает не `string`, а ровно тот union, который
 * лежит в `options`, - и вызывающий код не проверяет строку повторно. Сужение
 * делается поиском по списку вариантов, без приведения типов.
 */
interface SelectProps<Value extends string> {
  /** Текст для `aria-label`: видимой подписи у фильтров нет. */
  label: string;
  value: Value;
  options: readonly SelectOption<Value>[];
  className?: string;
  onChange: (value: Value) => void;
}

export function Select<Value extends string>({
  label,
  value,
  options,
  className,
  onChange,
}: SelectProps<Value>) {
  const handleChange = (event: ChangeEvent<HTMLSelectElement>): void => {
    const selected = options.find((option) => option.value === event.target.value);

    if (selected !== undefined) {
      onChange(selected.value);
    }
  };

  return (
    <select className={className} aria-label={label} value={value} onChange={handleChange}>
      {options.map((option) => (
        <option value={option.value} key={option.value}>
          {option.title}
        </option>
      ))}
    </select>
  );
}
