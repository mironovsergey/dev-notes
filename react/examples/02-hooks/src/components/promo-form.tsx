import { memo, useEffect, useRef, useState, type ChangeEvent, type SubmitEvent } from 'react';
import { formatPrice, isPromoApplicable, type Promo } from '../domain';

export type PromoResult = { ok: true; promo: Promo } | { ok: false; message: string };

interface PromoFormProps {
  promo: Promo | null;
  subtotal: number;
  onApply: (code: string) => Promise<PromoResult>;
  onClear: () => void;
}

/** Управляемое поле плюс состояние запроса; сам примененный промокод живет в состоянии приложения. */
export const PromoForm = memo(function PromoForm({
  promo,
  subtotal,
  onApply,
  onClear,
}: PromoFormProps) {
  const [code, setCode] = useState('');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // useRef как изменяемая ячейка, а не ссылка на DOM: ответ может прийти,
  // когда форма уже размонтирована, и обновлять состояние тогда нельзя.
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
    };
  }, []);

  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setCode(event.target.value);
    setError(null);
  };

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    const trimmedCode = code.trim();

    if (trimmedCode === '') {
      return;
    }

    setChecking(true);
    setError(null);

    const applyResult = await onApply(trimmedCode);

    if (!isMounted.current) {
      return;
    }

    setChecking(false);

    if (applyResult.ok) {
      setCode('');
    } else {
      setError(applyResult.message);
    }
  };

  return (
    <form
      className="promo-form"
      aria-labelledby="promo-title"
      onSubmit={(event) => {
        void handleSubmit(event);
      }}
    >
      <h3 className="promo-form__title" id="promo-title">
        Промокод
      </h3>
      {promo !== null ? (
        <>
          <p
            className={isPromoApplicable(promo, subtotal) ? 'message message_success' : 'message'}
            role="status"
          >
            {isPromoApplicable(promo, subtotal)
              ? `Промокод ${promo.code} применен`
              : `Промокод ${promo.code} действует от ${formatPrice(promo.minSubtotal)}`}
          </p>
          <button type="button" className="button button_ghost button_small" onClick={onClear}>
            Убрать промокод
          </button>
        </>
      ) : (
        <>
          <div className="promo-form__row">
            <input
              type="text"
              className="promo-form__input input"
              placeholder="Например, SALE10"
              aria-label="Введите промокод"
              value={code}
              disabled={checking}
              onChange={handleChange}
            />
            <button
              type="submit"
              className="promo-form__button button"
              disabled={checking || code.trim() === ''}
            >
              {checking ? 'Проверяем…' : 'Применить'}
            </button>
          </div>
          {error !== null && (
            <p className="message message_error" role="alert">
              {error}
            </p>
          )}
        </>
      )}
    </form>
  );
});
