import type { ThunkAction, ThunkDispatch } from 'redux-thunk';
import type { UnknownAction } from 'redux';
import type { rootReducer } from './reducers';

/** Состояние выводится из корневого редьюсера: новый срез появляется в типе сам. */
export type RootState = ReturnType<typeof rootReducer>;

/** `typeof store.dispatch` не знает о thunk - расширитель не меняет тип, поэтому он задан явно. */
export type AppDispatch = ThunkDispatch<RootState, undefined, UnknownAction>;

/** Тип thunk приложения: результат, состояние, extraArgument, допустимые действия. */
export type AppThunk<Return = void> = ThunkAction<Return, RootState, undefined, UnknownAction>;
