import { useActionState, useOptimistic } from 'react';
import { ApiError, errorMessage, formatPrice, isPromoApplicable, validatePromo } from '../domain';
import type { Promo } from '../domain';
import { useCartDispatch, useCartState } from '../model/cart-context';

interface PromoFormProps {
  subtotal: number;
}

/**
 * Форма на действии.
 *
 * `useActionState` хранит результат последнего действия и сам дает признак
 * выполнения; ошибка - это обычное возвращаемое значение, а не исключение.
 * Поле и кнопка не знают ни про промисы, ни про `preventDefault`.
 */
export function PromoForm({ subtotal }: PromoFormProps) {
  const { promo } = useCartState();
  const dispatch = useCartDispatch();

  /**
   * Оптимистичное значение: код показывается применяемым сразу.
   *
   * Откат писать не нужно - по завершении действия React возвращает
   * настоящее состояние, и при ошибке сообщение исчезает само.
   */
  const [optimisticCode, showOptimisticCode] = useOptimistic<string | null, string>(
    null,
    (_current, code) => code,
  );

  const [error, submitPromo, isPending] = useActionState<string | null, FormData>(
    async (_previousError, formData) => {
      const code = String(formData.get('code') ?? '').trim();

      if (code === '') {
        return null;
      }

      showOptimisticCode(code.toUpperCase());

      try {
        dispatch({ type: 'promo/applied', promo: await validatePromo(code) });

        return null;
      } catch (caught: unknown) {
        return caught instanceof ApiError
          ? caught.message
          : errorMessage(caught, 'Не удалось проверить промокод');
      }
    },
    null,
  );

  if (promo !== null) {
    return <AppliedPromo promo={promo} subtotal={subtotal} />;
  }

  return (
    <form className="promo-form" action={submitPromo} aria-labelledby="promo-title">
      <h3 className="promo-form__title" id="promo-title">
        Промокод
      </h3>
      {optimisticCode !== null && isPending ? (
        <p className="message" role="status">
          Применяем промокод {optimisticCode}…
        </p>
      ) : (
        <div className="promo-form__row">
          <input
            type="text"
            name="code"
            className="promo-form__input input"
            placeholder="Например, SALE10"
            aria-label="Введите промокод"
            disabled={isPending}
          />
          <button type="submit" className="promo-form__button button" disabled={isPending}>
            Применить
          </button>
        </div>
      )}
      {error !== null && (
        <p className="message message_error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

function AppliedPromo({ promo, subtotal }: { promo: Promo; subtotal: number }) {
  const dispatch = useCartDispatch();
  const isApplicable = isPromoApplicable(promo, subtotal);

  return (
    <div className="promo-form">
      <h3 className="promo-form__title" id="promo-title">
        Промокод
      </h3>
      <p className={isApplicable ? 'message message_success' : 'message'} role="status">
        {isApplicable
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
    </div>
  );
}
