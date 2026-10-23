import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  /** Название виджета для заглушки, чтобы пользователь понял, что именно сломалось. */
  title: string;
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Единственный компонент варианта, оставшийся классом: хука, заменяющего
 * `getDerivedStateFromError` и `componentDidCatch`, в React нет.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: Readonly<ErrorBoundaryState> = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(`Виджет «${this.props.title}» сломался`, error, info.componentStack);
  }

  handleReset = (): void => {
    this.setState({ error: null });
  };

  override render(): ReactNode {
    const { error } = this.state;

    if (error === null) {
      return this.props.children;
    }

    return (
      <div className="error-fallback" role="alert">
        <h2 className="error-fallback__title">Не удалось показать раздел «{this.props.title}»</h2>
        <p className="error-fallback__details">{error.message}</p>
        <button
          type="button"
          className="button button_ghost button_small"
          onClick={this.handleReset}
        >
          Попробовать снова
        </button>
      </div>
    );
  }
}
