import { useEffect, useRef, useState, type ChangeEvent, type SubmitEvent } from 'react';
import { formatPrice, isPromoApplicable } from '../domain';
import { promoActions, applyPromo } from '../store/promo-slice';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { selectTotals } from '../store/selectors';
import { selectPromo } from '../store/promo-slice';

/**
 * Ввод и состояние запроса остаются локальными.
 *
 * В хранилище лежит только результат - примененный промокод: держать там
 * каждое нажатие клавиши значит гонять действие на символ и связывать форму
 * с глобальным состоянием без нужды.
 */
export function PromoForm() {
  const promo = useAppSelector(selectPromo);
  const { subtotal } = useAppSelector(selectTotals);
  const dispatch = useAppDispatch();

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

    try {
      // `unwrap` возвращает payload удачного действия и бросает то, что
      // отдал `rejectWithValue`, - иначе пришлось бы разбирать объект действия.
      await dispatch(applyPromo(trimmedCode)).unwrap();

      if (!isMounted.current) {
        return;
      }

      setChecking(false);
      setCode('');
    } catch (rejectedValue: unknown) {
      if (!isMounted.current) {
        return;
      }

      setChecking(false);
      setError(typeof rejectedValue === 'string' ? rejectedValue : 'Не удалось проверить промокод');
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
