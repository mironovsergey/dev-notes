import { useState, type ChangeEvent, type SubmitEvent } from 'react';
import { formatPrice, isPromoApplicable } from '../domain';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  promoActions,
  selectPromo,
  selectPromoChecking,
  selectPromoError,
} from '../store/promo-slice';
import { selectTotals } from '../store/selectors';

/**
 * Форма без промисов.
 *
 * Компонент отправляет обычное действие `promo/requested` и не знает, что за
 * ним стоит запрос; ход проверки и текст ошибки он читает из хранилища.
 * Локальным остался только ввод - у него нет причин быть глобальным.
 */
export function PromoForm() {
  const promo = useAppSelector(selectPromo);
  const isChecking = useAppSelector(selectPromoChecking);
  const error = useAppSelector(selectPromoError);
  const { subtotal } = useAppSelector(selectTotals);
  const dispatch = useAppDispatch();

  const [code, setCode] = useState('');

  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setCode(event.target.value);
  };

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>): void => {
    event.preventDefault();

    const trimmedCode = code.trim();

    if (trimmedCode === '') {
      return;
    }

    dispatch(promoActions.requested(trimmedCode));
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
              dispatch(promoActions.cleared());
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
