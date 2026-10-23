import { Component, type ErrorInfo, type ReactNode } from 'react';

interface CatalogBoundaryProps {
  /** Создает новый промис: прежний уже отклонен и повторить его нельзя. */
  onRetry: () => void;
  children: ReactNode;
}

interface CatalogBoundaryState {
  error: Error | null;
}

/**
 * Граница ошибок для данных, которые разворачивает `use`.
 *
 * Отклоненный промис `use` бросает как обычную ошибку, поэтому состояние
 * «не удалось загрузить» показывает граница, а не ветвление по статусу.
 * Повтор сбрасывает и границу, и сам промис.
 */
export class CatalogBoundary extends Component<CatalogBoundaryProps, CatalogBoundaryState> {
  override state: Readonly<CatalogBoundaryState> = { error: null };

  static getDerivedStateFromError(error: Error): CatalogBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Каталог не загрузился', error, info.componentStack);
  }

  handleRetry = (): void => {
    this.setState({ error: null });
    this.props.onRetry();
  };

  override render(): ReactNode {
    const { error } = this.state;

    if (error === null) {
      return this.props.children;
    }

    return (
      <div className="catalog__status" role="alert">
        <p className="message message_error">{error.message}</p>
        <button
          type="button"
          className="button button_ghost button_small"
          onClick={this.handleRetry}
        >
          Повторить
        </button>
      </div>
    );
  }
}
