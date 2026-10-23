import { useEffect, useRef, useState, type ChangeEvent, type SubmitEvent } from 'react';
import { formatPrice, isPromoApplicable } from '../domain';
import { applyPromo } from '../store/shop-actions';
import { useShopDispatch, useShopState, useTotals } from '../store/shop-context';

/** Ввод и состояние запроса локальные; примененный промокод - в состоянии магазина. */
export function PromoForm() {
  const { promo } = useShopState();
  const { subtotal } = useTotals();
  const dispatch = useShopDispatch();

  const [code, setCode] = useState('');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

    const applyResult = await applyPromo(dispatch, trimmedCode);

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
          <button
            type="button"
            className="button button_ghost button_small"
            onClick={() => {
              dispatch({ type: 'promo/cleared' });
            }}
          >
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
}
