import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest';
import { QueryClientProvider, useMutation, useQuery } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { PRODUCTS, validatePromo } from '../domain';
import { server } from '../mocks/node';
import { productsQuery, queryKeys } from './queries';
import { createQueryClient } from './query-client';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

/** Свой клиент на тест: он же кеш, делить его между тестами нельзя. */
function createWrapper() {
  const queryClient = createQueryClient(false);

  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  return { queryClient, Wrapper };
}

describe('запросы и кеш', () => {
  test('запрос проходит pending и success, данные попадают в кеш', async () => {
    const { queryClient, Wrapper } = createWrapper();
    const { result } = renderHook(() => useQuery(productsQuery()), { wrapper: Wrapper });

    expect(result.current.status).toBe('pending');
    expect(result.current.isFetching).toBe(true);

    await waitFor(() => expect(result.current.status).toBe('success'));

    expect(result.current.data).toHaveLength(PRODUCTS.length);
    expect(queryClient.getQueryData(queryKeys.products)).toHaveLength(PRODUCTS.length);
  });

  test('второй запрос с тем же ключом берет данные из кеша, пока они свежие', async () => {
    let requests = 0;

    server.use(
      http.get('/api/products', () => {
        requests += 1;

        return HttpResponse.json(PRODUCTS);
      }),
    );

    const { Wrapper } = createWrapper();
    const first = renderHook(() => useQuery(productsQuery()), { wrapper: Wrapper });

    await waitFor(() => expect(first.result.current.status).toBe('success'));

    const second = renderHook(() => useQuery(productsQuery()), { wrapper: Wrapper });

    await waitFor(() => expect(second.result.current.status).toBe('success'));

    // staleTime у запроса пять минут: повторный запрос не уходит
    expect(requests).toBe(1);
  });

  test('инвалидация помечает данные устаревшими и запускает новый запрос', async () => {
    let requests = 0;

    server.use(
      http.get('/api/products', () => {
        requests += 1;

        return HttpResponse.json(PRODUCTS);
      }),
    );

    const { queryClient, Wrapper } = createWrapper();
    const { result } = renderHook(() => useQuery(productsQuery()), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.status).toBe('success'));
    await queryClient.invalidateQueries({ queryKey: queryKeys.products });
    await waitFor(() => expect(requests).toBe(2));

    // Данные все это время оставались на экране: статус success, обновление фоновое
    expect(result.current.status).toBe('success');
  });

  test('ошибка приходит в error, а retry: false не откладывает ее', async () => {
    server.use(
      http.get('/api/products', () =>
        HttpResponse.json({ message: 'Сервер недоступен' }, { status: 503 }),
      ),
    );

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useQuery(productsQuery()), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.status).toBe('error'));

    expect(result.current.error?.message).toBe('Сервер недоступен');
  });

  test('размонтирование отменяет запрос: signal переходит в aborted', async () => {
    let receivedSignal: AbortSignal | undefined;

    const { Wrapper } = createWrapper();
    const { unmount } = renderHook(
      () =>
        useQuery({
          queryKey: ['долгий-запрос'],
          queryFn: ({ signal }) =>
            new Promise<string>((resolve) => {
              receivedSignal = signal;
              setTimeout(() => resolve('готово'), 5000);
            }),
        }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(receivedSignal).toBeDefined());

    unmount();

    // `signal` библиотека создает сама: отдельный AbortController не нужен
    await waitFor(() => expect(receivedSignal?.aborted).toBe(true));
  });
});

describe('мутации', () => {
  test('mutate не бросает исключение: ошибка попадает в error', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => useMutation({ mutationFn: (code: string) => validatePromo(code) }),
      { wrapper: Wrapper },
    );

    result.current.mutate('НЕТ-ТАКОГО');

    await waitFor(() => expect(result.current.status).toBe('error'));

    expect(result.current.error?.message).toBe('Такого промокода нет');

    result.current.mutate('sale10');

    await waitFor(() => expect(result.current.status).toBe('success'));

    expect(result.current.data?.code).toBe('SALE10');
  });
});
