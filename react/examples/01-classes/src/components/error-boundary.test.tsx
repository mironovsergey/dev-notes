import { afterEach, describe, expect, test, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorBoundary } from './error-boundary';

afterEach(cleanup);

/** Ломается на первом рендере и чинится, когда `shouldThrow` становится ложным. */
function Boom({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Виджет упал');
  }

  return <p>Виджет работает</p>;
}

describe('граница ошибок', () => {
  test('показывает заглушку вместо упавшего поддерева и восстанавливает его по кнопке', async () => {
    // React печатает пойманную ошибку в консоль - в отчете теста она не нужна.
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const user = userEvent.setup();

    const { rerender } = render(
      <ErrorBoundary title="Каталог">
        <Boom shouldThrow />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Не удалось показать раздел «Каталог»');
    expect(screen.getByText('Виджет упал')).toBeInTheDocument();

    rerender(
      <ErrorBoundary title="Каталог">
        <Boom shouldThrow={false} />
      </ErrorBoundary>,
    );

    await user.click(screen.getByRole('button', { name: 'Попробовать снова' }));

    expect(screen.getByText('Виджет работает')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    consoleError.mockRestore();
  });
});
