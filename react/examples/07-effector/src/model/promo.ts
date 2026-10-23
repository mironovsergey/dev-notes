import { createEffect, createEvent, createStore, sample } from 'effector';
import { ApiError, errorMessage, validatePromo, type Promo } from '../domain';
import { cartCleared } from './cart';

export const promoSubmitted = createEvent<string>();
export const promoCleared = createEvent();

export const validatePromoFx = createEffect<string, Promo>(async (code) => validatePromo(code));

export const $promo = createStore<Promo | null>(null)
  .on(validatePromoFx.doneData, (_promo, promo) => promo)
  .reset(promoCleared, cartCleared);

export const $promoError = createStore<string | null>(null)
  .on(validatePromoFx.failData, (_error, error) =>
    error instanceof ApiError
      ? error.message
      : errorMessage(error, 'Не удалось проверить промокод'),
  )
  .reset(validatePromoFx, promoCleared, cartCleared);

/**
 * Пустой код до эффекта не доходит: `filter` отсекает его в графе, а не в
 * обработчике формы.
 */
sample({
  clock: promoSubmitted,
  filter: (code: string) => code.trim() !== '',
  fn: (code: string) => code.trim(),
  target: validatePromoFx,
});
