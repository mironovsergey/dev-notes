import { useState, type ChangeEvent, type SubmitEvent } from 'react';
import { observer } from 'mobx-react-lite';
import { formatPrice, isPromoApplicable } from '../domain';
import { useStores } from '../store/store-context';

export const PromoForm = observer(function PromoForm() {
  const { cart, promo } = useStores();
  const [code, setCode] = useState('');

  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setCode(event.target.value);
  };

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>): void => {
    event.preventDefault();
    void promo.apply(code).then(() => {
      setCode('');
    });
  };

  return (
    <form className="promo-form" aria-labelledby="promo-title" onSubmit={handleSubmit}>
      <h3 className="promo-form__title" id="promo-title">
        Промокод
      </h3>
      {cart.promo !== null ? (
        <>
          <p
            className={
              isPromoApplicable(cart.promo, cart.totals.subtotal)
                ? 'message message_success'
                : 'message'
            }
            role="status"
          >
            {isPromoApplicable(cart.promo, cart.totals.subtotal)
              ? `Промокод ${cart.promo.code} применен`
              : `Промокод ${cart.promo.code} действует от ${formatPrice(cart.promo.minSubtotal)}`}
          </p>
          <button type="button" className="button button_ghost button_small" onClick={promo.clear}>
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
              disabled={promo.isChecking}
              onChange={handleChange}
            />
            <button
              type="submit"
              className="promo-form__button button"
              disabled={promo.isChecking || code.trim() === ''}
            >
              {promo.isChecking ? 'Проверяем…' : 'Применить'}
            </button>
          </div>
          {promo.error !== null && (
            <p className="message message_error" role="alert">
              {promo.error}
            </p>
          )}
        </>
      )}
    </form>
  );
});
