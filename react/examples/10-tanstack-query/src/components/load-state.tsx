import type { ReactNode } from 'react';
import type { LoadStatus } from '../domain';

interface LoadStateProps {
  status: LoadStatus;
  error: string | null;
  onRetry: () => void;
  children: ReactNode;
}

/**
 * Замена HOC `withLoading` из варианта на классах: обертка с `children`.
 *
 * Оборачиваемый компонент остается обычным элементом в разметке, поэтому
 * не нужны ни проброс лишних пропсов, ни `displayName`, ни создание нового
 * типа компонента на каждый вызов.
 */
export function LoadState({ status, error, onRetry, children }: LoadStateProps) {
  if (status === 'loading') {
    return (
      <p className="catalog__status" role="status">
        Загружаем каталог…
      </p>
    );
  }

  if (status === 'error') {
    return (
      <div className="catalog__status" role="alert">
        <p className="message message_error">{error ?? 'Не удалось загрузить каталог'}</p>
        <button type="button" className="button button_ghost button_small" onClick={onRetry}>
          Повторить
        </button>
      </div>
    );
  }

  return children;
}
