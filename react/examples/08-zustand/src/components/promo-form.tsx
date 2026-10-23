import { useState, type ChangeEvent, type SubmitEvent } from 'react';
import { formatPrice, isPromoApplicable } from '../domain';
import { useTotals } from '../store/hooks';
import { useShopStore } from '../store/store';

/** Ход проверки хранится в сторе: асинхронное действие расставляет флаги само. */
export function PromoForm() {
  const promo = useShopStore((store) => store.promo);
  const isChecking = useShopStore((store) => store.isPromoChecking);
  const error = useShopStore((store) => store.promoError);
  const applyPromo = useShopStore((store) => store.applyPromo);
  const clearPromo = useShopStore((store) => store.clearPromo);
  const { subtotal } = useTotals();

  const [code, setCode] = useState('');

  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setCode(event.target.value);
  };

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>): void => {
    event.preventDefault();
    void applyPromo(code).then(() => {
      setCode('');
    });
  };

  return (
    <form className="promo-form" aria-labelledby="promo-title" onSubmit={handleSubmit}>
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
          <button type="button" className="button button_ghost button_small" onClick={clearPromo}>
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
              disabled={isChecking}
              onChange={handleChange}
            />
            <button
              type="submit"
              className="promo-form__button button"
              disabled={isChecking || code.trim() === ''}
            >
              {isChecking ? 'Проверяем…' : 'Применить'}
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
