import type { createAppStore } from './store';

/**
 * Типы выводятся из хранилища.
 *
 * `AppThunk` здесь не нужен: thunk отключен, а компоненты отправляют только
 * обычные действия - на них реагируют саги.
 */
export type AppStore = ReturnType<typeof createAppStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
