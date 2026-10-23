import { ApiError, errorMessage, validatePromo, type Promo } from '../../domain';
import type { PayloadAction } from '@reduxjs/toolkit';
import { call, put, takeLatest } from 'redux-saga/effects';
import { promoActions } from '../promo-slice';

/** Воркер получает действие последним аргументом - оттуда берется `payload`. */
export function* applyPromoWorker(action: PayloadAction<string>) {
  try {
    const promo: Promo = yield call(validatePromo, action.payload);

    yield put(promoActions.applied(promo));
  } catch (error: unknown) {
    const message =
      error instanceof ApiError
        ? error.message
        : errorMessage(error, 'Не удалось проверить промокод');

    yield put(promoActions.failed(message));
  }
}

export function* promoWatcher() {
  yield takeLatest(promoActions.requested.type, applyPromoWorker);
}
