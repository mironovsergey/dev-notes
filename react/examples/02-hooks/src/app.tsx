import { useCallback, useMemo, useState } from 'react';
import {
  ApiError,
  calculateTotals,
  createOrder,
  errorMessage,
  toCartLines,
  validatePromo,
  type Customer,
  type DeliveryMethod,
  type Order,
  type Promo,
} from './domain';
import { Cart } from './components/cart';
import { Catalog } from './components/catalog';
import { CheckoutModal } from './components/checkout-modal';
import { ErrorBoundary } from './components/error-boundary';
import { Header } from './components/header';
import type { PromoResult } from './components/promo-form';
import { useCart } from './hooks/use-cart';
import { useCatalog } from './hooks/use-catalog';

/**
 * Состояние разложено по хукам: каталог и корзина живут в своих пользовательских
 * хуках, здесь остается только то, что связывает их вместе, - промокод, доставка
 * и оформление заказа.
 */
export function App() {
  const catalog = useCatalog();
  const cart = useCart();

  const [promo, setPromo] = useState<Promo | null>(null);
  const [delivery, setDelivery] = useState<DeliveryMethod>('pickup');
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [order, setOrder] = useState<Order | null>(null);

  const lines = useMemo(
    () => toCartLines(cart.items, catalog.products),
    [cart.items, catalog.products],
  );
  const postponedLines = useMemo(
    () => toCartLines(cart.postponed, catalog.products),
    [cart.postponed, catalog.products],
  );
  const totals = useMemo(() => calculateTotals(lines, promo, delivery), [lines, promo, delivery]);

  const applyPromo = useCallback(async (code: string): Promise<PromoResult> => {
    try {
      const appliedPromo = await validatePromo(code);

      setPromo(appliedPromo);

      return { ok: true, promo: appliedPromo };
    } catch (error: unknown) {
      const message =
        error instanceof ApiError
          ? error.message
          : errorMessage(error, 'Не удалось проверить промокод');

      return { ok: false, message };
    }
  }, []);

  const clearPromo = useCallback(() => {
    setPromo(null);
  }, []);

  const openCheckout = useCallback(() => {
    setCheckoutOpen(true);
    setSubmitError(null);
    setOrder(null);
  }, []);

  const clearCart = cart.clear;

  const closeCheckout = useCallback(() => {
    setCheckoutOpen(false);

    // Корзина очищается только после успешного заказа, а не при отмене.
    // Проверка стоит здесь, а не в апдейтере: апдейтер обязан быть чистым,
    // а StrictMode вызывает его дважды.
    if (order !== null) {
      clearCart();
      setPromo(null);
      setOrder(null);
    }
  }, [order, clearCart]);

  const submitOrder = useCallback(
    async (customer: Customer): Promise<void> => {
      setSubmitting(true);
      setSubmitError(null);

      try {
        const createdOrder = await createOrder({
          items: [...cart.items],
          promoCode: promo?.code ?? null,
          delivery,
          customer,
        });

        setSubmitting(false);
        setOrder(createdOrder);
      } catch (error: unknown) {
        setSubmitting(false);
        setSubmitError(errorMessage(error, 'Не удалось оформить заказ'));
      }
    },
    [cart.items, promo, delivery],
  );

  return (
    <div className="page">
      <div className="page__header">
        <Header itemCount={cart.itemCount} />
      </div>
      <main className="page__main">
        <div className="page__catalog">
          <ErrorBoundary title="Каталог">
            <Catalog
              products={catalog.products}
              status={catalog.status}
              error={catalog.error}
              inCartByProductId={cart.inCartByProductId}
              onAdd={cart.add}
              onRetry={catalog.reload}
            />
          </ErrorBoundary>
        </div>
        <div className="page__cart">
          <ErrorBoundary title="Корзина">
            <Cart
              lines={lines}
              postponed={postponedLines}
              promo={promo}
              delivery={delivery}
              totals={totals}
              onQtyChange={cart.changeQty}
              onRemove={cart.remove}
              onPostpone={cart.postpone}
              onRestore={cart.restore}
              onApplyPromo={applyPromo}
              onClearPromo={clearPromo}
              onDeliveryChange={setDelivery}
              onCheckout={openCheckout}
            />
          </ErrorBoundary>
        </div>
      </main>
      {checkoutOpen && (
        <CheckoutModal
          totals={totals}
          itemCount={cart.itemCount}
          submitting={submitting}
          error={submitError}
          order={order}
          onSubmit={(customer) => {
            void submitOrder(customer);
          }}
          onClose={closeCheckout}
        />
      )}
    </div>
  );
}
