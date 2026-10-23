import { queryOptions } from '@tanstack/react-query';
import { fetchProducts } from '../domain';

/**
 * Ключи собраны в одном месте.
 *
 * Инвалидация тогда не зависит от того, как ключ написан в конкретном
 * компоненте: достаточно сослаться на фабрику.
 */
export const queryKeys = {
  products: ['products'] as const,
  order: (orderId: string) => ['orders', orderId] as const,
};

/**
 * `queryOptions` держит ключ и функцию запроса вместе и сохраняет вывод
 * типов: `useQuery(productsQuery())` знает, что в `data` лежат товары.
 *
 * `signal` приходит от библиотеки - свой `AbortController` не нужен, отмена
 * при размонтировании и при новом запросе с тем же ключом уже встроена.
 */
export const productsQuery = () =>
  queryOptions({
    queryKey: queryKeys.products,
    queryFn: ({ signal }) => fetchProducts(signal),

    // Каталог меняется редко: пять минут данные считаются свежими и
    // повторные запросы не уходят.
    staleTime: 5 * 60 * 1000,
  });
