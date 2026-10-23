import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest';
import { act, cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay as mswDelay, http, HttpResponse } from 'msw';
import { PROMOS } from '../domain';
import { server } from '../mocks/node';
import { App } from '../app';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  cleanup();
});
afterAll(() => server.close());

async function renderApp() {
  const user = userEvent.setup();

  await act(async () => {
    render(<App />);
  });

  await screen.findByRole('button', { name: 'В корзину: Мармеладные мишки, 500 г' });

  return user;
}

describe('действия форм', () => {
  test('useOptimistic показывает промокод применяемым до ответа сервера', async () => {
    server.use(
      http.post('/api/promo/validate', async () => {
        await mswDelay(80);

        return HttpResponse.json(PROMOS.find((promo) => promo.code === 'SALE10'));
      }),
    );

    const user = await renderApp();

    await user.type(screen.getByLabelText('Введите промокод'), 'sale10');
    await user.click(screen.getByRole('button', { name: 'Применить' }));

    // Пока действие не завершилось, на экране оптимистичное состояние
    expect(screen.getByText('Применяем промокод SALE10…')).toBeInTheDocument();

    // По завершении действия React вернул настоящее состояние
    expect(await screen.findByText('Промокод SALE10 применен')).toBeInTheDocument();
    expect(screen.queryByText('Применяем промокод SALE10…')).not.toBeInTheDocument();
  });

  test('оптимистичное состояние откатывается само, если сервер отказал', async () => {
    server.use(
      http.post('/api/promo/validate', async () => {
        await mswDelay(80);

        return HttpResponse.json({ message: 'Такого промокода нет' }, { status: 404 });
      }),
    );

    const user = await renderApp();

    await user.type(screen.getByLabelText('Введите промокод'), 'НЕТ-ТАКОГО');
    await user.click(screen.getByRole('button', { name: 'Применить' }));

    expect(screen.getByText('Применяем промокод НЕТ-ТАКОГО…')).toBeInTheDocument();
    expect(await screen.findByRole('alert')).toHaveTextContent('Такого промокода нет');

    // Отката писать не пришлось: React сам вернул состояние до действия
    expect(screen.queryByText(/Применяем промокод/)).not.toBeInTheDocument();
    expect(screen.getByLabelText('Введите промокод')).toBeInTheDocument();
  });

  test('useFormStatus сообщает кнопке о ходе отправки формы', async () => {
    server.use(
      http.post('/api/orders', async () => {
        await mswDelay(80);

        return HttpResponse.json(
          { id: 'L-1234', total: 690, createdAt: '2026-09-25T10:00:00.000Z' },
          { status: 201 },
        );
      }),
    );

    const user = await renderApp();

    await user.click(screen.getByRole('button', { name: 'В корзину: Мармеладные мишки, 500 г' }));
    await user.click(screen.getByRole('button', { name: 'Оформить заказ' }));

    const dialog = await screen.findByRole('dialog');

    await user.type(within(dialog).getByLabelText('Имя'), 'Анна');
    await user.type(within(dialog).getByLabelText('Телефон'), '+7 900 000-00-00');
    await user.type(within(dialog).getByLabelText('Адрес'), 'Москва, Тверская, 1');
    await user.click(within(dialog).getByRole('button', { name: 'Подтвердить заказ' }));

    // Кнопка узнала о ходе отправки от ближайшей формы, без единого пропа
    expect(within(dialog).getByRole('button', { name: 'Отправляем…' })).toBeDisabled();
    expect(within(dialog).getByRole('button', { name: 'Отмена' })).toBeDisabled();

    expect(await within(dialog).findByText('L-1234')).toBeInTheDocument();
  });
});
