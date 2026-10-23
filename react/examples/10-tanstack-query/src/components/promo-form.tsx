import { useState, type ChangeEvent, type SubmitEvent } from 'react';
import { formatPrice, isPromoApplicable } from '../domain';
import { useTotals } from '../hooks/use-cart-data';
import { promoErrorMessage, usePromoMutation } from '../hooks/use-promo-mutation';
import { useCartStore } from '../store/cart-store';

/** Состояние мутации - `isPending` и `error` - приходит из самого хука. */
export function PromoForm() {
  const promo = useCartStore((store) => store.promo);
  const setPromo = useCartStore((store) => store.setPromo);
  const { subtotal } = useTotals();
  const { mutate, isPending, error, reset } = usePromoMutation();

  const [code, setCode] = useState('');

  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setCode(event.target.value);
    reset();
  };

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>): void => {
    event.preventDefault();

    if (code.trim() === '') {
      return;
    }

    // `mutate` не возвращает промис: ошибка окажется в `error`,
    // необработанного отклонения не будет.
    mutate(code, {
      onSuccess: () => {
        setCode('');
      },
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
          <button
            type="button"
            className="button button_ghost button_small"
            onClick={() => {
              setPromo(null);
              reset();
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
              disabled={isPending}
              onChange={handleChange}
            />
            <button
              type="submit"
              className="promo-form__button button"
              disabled={isPending || code.trim() === ''}
            >
              {isPending ? 'Проверяем…' : 'Применить'}
            </button>
          </div>
          {promoErrorMessage(error) !== null && (
            <p className="message message_error" role="alert">
              {promoErrorMessage(error)}
            </p>
          )}
        </>
      )}
    </form>
  );
}
