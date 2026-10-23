import type { LoadStatus, Product } from '../../domain';
import type { UnknownAction } from 'redux';
import { parseShopAction } from '../actions';

export interface CatalogState {
  readonly products: readonly Product[];
  readonly status: LoadStatus;
  readonly error: string | null;
}

const INITIAL_STATE: CatalogState = { products: [], status: 'loading', error: null };

/** `readonly` в типе состояния делает мутацию ошибкой компиляции, а не незаметным багом. */
export function catalogReducer(
  state: CatalogState = INITIAL_STATE,
  action: UnknownAction,
): CatalogState {
  const shopAction = parseShopAction(action);

  if (shopAction === null) {
    return state;
  }

  switch (shopAction.type) {
    case 'catalog/requested':
      return INITIAL_STATE;

    case 'catalog/loaded':
      return { products: shopAction.products, status: 'ready', error: null };

    case 'catalog/failed':
      return { products: [], status: 'error', error: shopAction.message };

    default:
      return state;
  }
}
