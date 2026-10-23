import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from './types';

/**
 * Типизированные хуки создаются один раз.
 *
 * `useDispatch` и `useSelector` из `react-redux` ничего не знают о конкретном
 * хранилище; `.withTypes<…>()` связывает их с типами приложения, и аннотации
 * в компонентах становятся не нужны. `AppDispatch` включает thunk, поэтому
 * `dispatch(loadCatalog())` проходит проверку типов.
 */
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
