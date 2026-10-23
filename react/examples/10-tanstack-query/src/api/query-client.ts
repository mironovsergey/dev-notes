import { QueryClient } from '@tanstack/react-query';

/**
 * Клиент - это и есть кеш, поэтому он создается один раз на приложение.
 *
 * Тесты вызывают фабрику на каждый тест и передают `retry: false`: с
 * повторами проверка ошибки ждала бы три попытки с задержками и падала бы
 * по таймауту, а сама ошибка до интерфейса не дошла бы.
 */
export function createQueryClient(retry: boolean | number = 2): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}
