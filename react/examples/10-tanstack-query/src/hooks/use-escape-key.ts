import { useEffect } from 'react';

/** Вызывает `onEscape`, пока `active`, на нажатие Escape в любом месте документа. */
export function useEscapeKey(active: boolean, onEscape: () => void): void {
  useEffect(() => {
    if (!active) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        onEscape();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [active, onEscape]);
}
