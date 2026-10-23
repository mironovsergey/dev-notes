import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createOrder, type Customer, type Order } from '../domain';
import { queryKeys } from '../api/queries';
import { useCartStore } from '../store/cart-store';

/**
 * Оформление заказа меняет и серверные данные, и клиентские.
 *
 * После успеха каталог помечается устаревшим: остатки на складе
 * изменились, и следующий показ каталога возьмет свежие. Сам заказ
 * кладется в кеш под своим ключом - отдельный запрос за ним не нужен.
 */
export function useOrderMutation() {
  const queryClient = useQueryClient();

  return useMutation<Order, Error, Customer>({
    mutationFn: (customer) => {
      const cart = useCartStore.getState();

      return createOrder({
        items: [...cart.items],
        promoCode: cart.promo?.code ?? null,
        delivery: cart.delivery,
        customer,
      });
    },
    onSuccess: async (order) => {
      queryClient.setQueryData(queryKeys.order(order.id), order);
      await queryClient.invalidateQueries({ queryKey: queryKeys.products });
    },
  });
}
