import { Component, createRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Диалог рендерится через портал в контейнер, созданный для него внутри `document.body`.
 * Контейнер создается при монтировании и удаляется при размонтировании - пара методов жизненного цикла, а не эффект.
 */
export class Modal extends Component<ModalProps> {
  private readonly container = document.createElement('div');

  private readonly closeButtonRef = createRef<HTMLButtonElement>();

  override componentDidMount(): void {
    document.body.appendChild(this.container);
    document.addEventListener('keydown', this.handleKeyDown);
    this.closeButtonRef.current?.focus();
  }

  override componentWillUnmount(): void {
    document.removeEventListener('keydown', this.handleKeyDown);
    this.container.remove();
  }

  handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      this.props.onClose();
    }
  };

  handleBackdropClick = (): void => {
    this.props.onClose();
  };

  /** Клики внутри окна не должны доходить до обработчика подложки. */
  stopPropagation = (event: React.MouseEvent<HTMLDivElement>): void => {
    event.stopPropagation();
  };

  override render(): ReactNode {
    return createPortal(
      <div className="modal" onClick={this.handleBackdropClick}>
        <div
          className="modal__window"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          onClick={this.stopPropagation}
        >
          <div className="modal__header">
            <h2 className="modal__title" id="modal-title">
              {this.props.title}
            </h2>
            <button
              type="button"
              className="modal__close"
              aria-label="Закрыть"
              ref={this.closeButtonRef}
              onClick={this.props.onClose}
            >
              ×
            </button>
          </div>
          {this.props.children}
        </div>
      </div>,
      this.container,
    );
  }
}
