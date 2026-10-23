import { Component, type ComponentType, type ReactNode } from 'react';
import type { LoadStatus } from '../domain';

interface WithLoadingProps {
  status: LoadStatus;
  error: string | null;
  onRetry: () => void;
}

/**
 * Компонент высшего порядка: показывает состояния загрузки и ошибки вокруг виджета
 * и рендерит обернутый компонент, только когда данные готовы.
 */
export function withLoading<P extends object>(
  Wrapped: ComponentType<P>,
): ComponentType<P & WithLoadingProps> {
  class WithLoading extends Component<P & WithLoadingProps> {
    static displayName = `withLoading(${Wrapped.displayName ?? Wrapped.name})`;

    override render(): ReactNode {
      const { status, error, onRetry } = this.props;

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

      // Пропсы загрузки тоже передаются дальше: удаление их из обобщенного rest-объекта
      // потребовало бы приведения типа, а обернутый компонент просто игнорирует необъявленные пропсы.
      return <Wrapped {...this.props} />;
    }
  }

  return WithLoading;
}
