import type { Action, ThunkAction } from '@reduxjs/toolkit';
import type { createAppStore } from './store';

/**
 * Типы выводятся из хранилища.
 *
 * `configureStore` уже знает про thunk, поэтому `AppDispatch` берется прямо
 * из `store.dispatch` - в отличие от варианта на чистом Redux, где его
 * приходилось собирать через `ThunkDispatch`.
 */
export type AppStore = ReturnType<typeof createAppStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
export type AppThunk<Return = void> = ThunkAction<Return, RootState, undefined, Action>;
