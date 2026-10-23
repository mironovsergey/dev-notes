import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useEscapeKey } from '../hooks/use-escape-key';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Диалог рендерится через портал в контейнер, созданный для него внутри `document.body`.
 *
 * Узел создается ленивым инициализатором `useState`: он нужен уже на первом
 * рендере, а создавать его в эффекте значило бы вызвать там `setState` и
 * получить лишний каскадный рендер. Эффект только добавляет узел в документ
 * и убирает его при размонтировании.
 */
export function Modal({ title, onClose, children }: ModalProps) {
  const [container] = useState(() => document.createElement('div'));

  useEffect(() => {
    document.body.appendChild(container);

    return () => {
      container.remove();
    };
  }, [container]);

  useEscapeKey(true, onClose);

  return createPortal(
    <div className="modal" onClick={onClose}>
      <div
        className="modal__window"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(event) => {
          // Клики внутри окна не должны доходить до обработчика подложки.
          event.stopPropagation();
        }}
      >
        <div className="modal__header">
          <h2 className="modal__title" id="modal-title">
            {title}
          </h2>
          <button type="button" className="modal__close" aria-label="Закрыть" onClick={onClose}>
            ×
          </button>
        </div>
        {children}
      </div>
    </div>,
    container,
  );
}
