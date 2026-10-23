import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from './mocks/node';
import { App } from './app';
import { createAppStore } from './store/store';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  cleanup();
});
afterAll(() => server.close());

async function renderApp() {
  const user = userEvent.setup();

  // Свое хранилище на тест: иначе состояние предыдущего теста утекает в следующий.
  render(<App store={createAppStore()} />);
  await screen.findByRole('button', { name: 'В корзину: Мармеладные мишки, 500 г' });

  return user;
}

describe('«Лавка» на Redux Saga', () => {
  test('загружает каталог и фильтрует его', async () => {
    const user = await renderApp();

    expect(screen.getAllByRole('article')).toHaveLength(10);
    expect(
      screen.getByRole('button', { name: 'В корзину: Карамельные трости, 3 шт.' }),
    ).toBeDisabled();
    await user.selectOptions(screen.getByLabelText('Категория'), 'bakery');
    expect(screen.getAllByRole('article')).toHaveLength(3);
    await user.type(screen.getByLabelText('Поиск по названию'), 'пон');
    expect(screen.getAllByRole('article')).toHaveLength(1);
  });

  test('добавляет товары, учитывает остаток, применяет скидки и доставку', async () => {
    const user = await renderApp();
    const addBearsButton = screen.getByRole('button', {
      name: 'В корзину: Мармеладные мишки, 500 г',
    });

    await user.click(addBearsButton);
    await user.click(addBearsButton);
    await user.click(addBearsButton);
    expect(addBearsButton).toHaveTextContent('В корзине: 3');
    expect(screen.getByLabelText('Количество Мармеладные мишки, 500 г')).toHaveTextContent('3');

    // 3 × 690 = 2070, скидка за количество 103
    const totalsPanel = screen.getByLabelText('Итоги');

    expect(within(totalsPanel).getByText('Скидка за количество (от 3 шт.)')).toBeInTheDocument();
    expect(screen.getByLabelText('Итого')).toHaveTextContent(`1 967 ₽`);

    // остаток макарон - 2: третий клик игнорируется
    const addMacaronsButton = screen.getByRole('button', {
      name: 'В корзину: Набор макарон, 24 шт.',
    });

    await user.click(addMacaronsButton);
    await user.click(addMacaronsButton);
    expect(addMacaronsButton).toBeDisabled();
    expect(screen.getByLabelText('Количество Набор макарон, 24 шт.')).toHaveTextContent('2');
    expect(screen.getByRole('button', { name: 'Больше: Набор макарон, 24 шт.' })).toBeDisabled();

    // промокод: 2070 + 4980 = 7050, −103 = 6947, −10 % = 694 → 6253
    await user.type(screen.getByLabelText('Введите промокод'), 'sale10');
    await user.click(screen.getByRole('button', { name: 'Применить' }));
    expect(await screen.findByText('Промокод SALE10 применен')).toBeInTheDocument();
    expect(screen.getByLabelText('Итого')).toHaveTextContent(`6 253 ₽`);

    // курьер бесплатен от 3000, почта - нет
    await user.click(screen.getByLabelText(/Почта/));
    expect(screen.getByLabelText('Итого')).toHaveTextContent(`6 453 ₽`);
    await user.click(screen.getByLabelText(/Курьер/));
    expect(screen.getByLabelText('Итого')).toHaveTextContent(`6 253 ₽`);
    expect(screen.getByText('В корзине 5 товаров')).toBeInTheDocument();
  });

  test('отклоняет неизвестные и истекшие промокоды', async () => {
    const user = await renderApp();

    await user.click(
      screen.getByRole('button', { name: 'В корзину: Мороженое «Три шарика», 1 л' }),
    );
    await user.type(screen.getByLabelText('Введите промокод'), 'NOPE');
    await user.click(screen.getByRole('button', { name: 'Применить' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Такого промокода нет');
    await user.clear(screen.getByLabelText('Введите промокод'));
    await user.type(screen.getByLabelText('Введите промокод'), 'SUMMER2022');
    await user.click(screen.getByRole('button', { name: 'Применить' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Срок действия промокода истек');
  });

  test('промокод ниже порога сохраняется, но помечается неактивным', async () => {
    const user = await renderApp();

    await user.click(screen.getByRole('button', { name: 'В корзину: Мармеладные мишки, 500 г' })); // 690 < 2000
    await user.type(screen.getByLabelText('Введите промокод'), 'MINUS500');
    await user.click(screen.getByRole('button', { name: 'Применить' }));
    expect(await screen.findByText(/действует от 2 000 ₽/)).toBeInTheDocument();
    expect(screen.getByLabelText('Итого')).toHaveTextContent(`690 ₽`);
    await user.click(
      screen.getByRole('button', { name: 'В корзину: Кейк-попсы в глазури, 12 шт.' }),
    ); // +1490 → 2180
    expect(screen.getByText('Промокод MINUS500 применен')).toBeInTheDocument();
    expect(screen.getByLabelText('Итого')).toHaveTextContent(`1 680 ₽`);
  });

  test('откладывает и возвращает позиции; отложенные не участвуют в расчете', async () => {
    const user = await renderApp();

    await user.click(
      screen.getByRole('button', { name: 'В корзину: Мороженое «Три шарика», 1 л' }),
    );
    await user.click(screen.getByRole('button', { name: 'В корзину: Мармеладные мишки, 500 г' }));
    await user.click(
      within(screen.getByLabelText('Мороженое «Три шарика», 1 л')).getByRole('button', {
        name: 'Отложить',
      }),
    );
    expect(screen.getByRole('heading', { name: 'Отложенные' })).toBeInTheDocument();
    expect(screen.getByLabelText('Итого')).toHaveTextContent(`690 ₽`);
    expect(
      screen.getByRole('button', { name: 'В корзину: Мороженое «Три шарика», 1 л' }),
    ).toHaveTextContent('В корзине: 1');
    await user.click(
      within(screen.getByLabelText('Мороженое «Три шарика», 1 л')).getByRole('button', {
        name: 'Вернуть',
      }),
    );
    expect(screen.queryByRole('heading', { name: 'Отложенные' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Итого')).toHaveTextContent(`1 480 ₽`);
    await user.click(screen.getByRole('button', { name: 'Удалить: Мармеладные мишки, 500 г' }));
    expect(screen.getByLabelText('Итого')).toHaveTextContent(`790 ₽`);
  });

  test('оформляет заказ через модальное окно и очищает корзину', async () => {
    const user = await renderApp();

    expect(screen.getByRole('button', { name: 'Оформить заказ' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'В корзину: Набор макарон, 24 шт.' }));
    await user.click(screen.getByRole('button', { name: 'Оформить заказ' }));
    const dialog = await screen.findByRole('dialog');

    expect(dialog).toHaveAccessibleName('Оформление заказа');
    await user.type(within(dialog).getByLabelText('Имя'), 'Анна');
    await user.type(within(dialog).getByLabelText('Телефон'), '+7 900 000-00-00');
    await user.type(within(dialog).getByLabelText('Адрес'), 'Москва, Тверская, 1');
    await user.click(within(dialog).getByRole('button', { name: 'Подтвердить заказ' }));
    expect(await within(dialog).findByText(/^L-\d+$/)).toBeInTheDocument();
    expect(within(dialog).getByText(`К оплате при получении: 2 490 ₽`)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Вернуться в магазин' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('Добавьте товары из каталога')).toBeInTheDocument();
    expect(screen.getByText('Корзина пуста')).toBeInTheDocument();
  });

  test('показывает ошибку загрузки и повторяет запрос по кнопке', async () => {
    server.use(
      http.get(
        '/api/products',
        () => HttpResponse.json({ message: 'Сервер недоступен' }, { status: 503 }),
        {
          once: true,
        },
      ),
    );

    const user = userEvent.setup();

    render(<App store={createAppStore()} />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Сервер недоступен');

    await user.click(screen.getByRole('button', { name: 'Повторить' }));

    expect(
      await screen.findByRole('button', { name: 'В корзину: Мармеладные мишки, 500 г' }),
    ).toBeInTheDocument();
  });

  test('Escape закрывает модальное окно', async () => {
    const user = await renderApp();

    await user.click(screen.getByRole('button', { name: 'В корзину: Мармеладные мишки, 500 г' }));
    await user.click(screen.getByRole('button', { name: 'Оформить заказ' }));
    await screen.findByRole('dialog');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
