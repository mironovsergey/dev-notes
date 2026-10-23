import { useMutation } from '@tanstack/react-query';
import { ApiError, errorMessage, validatePromo, type Promo } from '../domain';
import { useCartStore } from '../store/cart-store';

/**
 * Проверка промокода - мутация, а не запрос.
 *
 * Кешировать ее нечего: это разовое действие по нажатию кнопки, а не
 * данные, которые нужно держать свежими. Результат уходит в клиентское
 * состояние - промокод участвует в расчете корзины.
 */
export function usePromoMutation() {
  const setPromo = useCartStore((store) => store.setPromo);

  return useMutation<Promo, Error, string>({
    mutationFn: (code) => validatePromo(code.trim()),
    onSuccess: (promo) => {
      setPromo(promo);
    },
  });
}

/** Текст ошибки для интерфейса: у `ApiError` он уже готов. */
export function promoErrorMessage(error: Error | null): string | null {
  if (error === null) {
    return null;
  }

  return error instanceof ApiError
    ? error.message
    : errorMessage(error, 'Не удалось проверить промокод');
}
