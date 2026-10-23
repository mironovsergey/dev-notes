import { useState } from 'react';
import type { Order } from './domain';
import { Cart } from './components/cart';
import { Catalog } from './components/catalog';
import { CheckoutModal } from './components/checkout-modal';
import { ErrorBoundary } from './components/error-boundary';
import { Header } from './components/header';
import { CartProvider, useCartDispatch } from './model/cart-context';

function Page() {
  const dispatch = useCartDispatch();
  const [isCheckoutOpen, setCheckoutOpen] = useState(false);
  const [acceptedOrder, setAcceptedOrder] = useState<Order | null>(null);

  const closeCheckout = (): void => {
    setCheckoutOpen(false);

    if (acceptedOrder !== null) {
      dispatch({ type: 'cart/cleared' });
      setAcceptedOrder(null);
    }
  };

  return (
    <div className="page">
      <div className="page__header">
        <Header />
      </div>
      <main className="page__main">
        <div className="page__catalog">
          <ErrorBoundary title="Каталог">
            <Catalog />
          </ErrorBoundary>
        </div>
        <div className="page__cart">
          <ErrorBoundary title="Корзина">
            <Cart
              onCheckout={() => {
                setAcceptedOrder(null);
                setCheckoutOpen(true);
              }}
            />
          </ErrorBoundary>
        </div>
      </main>
      {isCheckoutOpen && (
        <CheckoutModal
          order={acceptedOrder}
          onOrderAccepted={setAcceptedOrder}
          onClose={closeCheckout}
        />
      )}
    </div>
  );
}

/**
 * Ни одной библиотеки состояния: корзина - редьюсер с контекстом, каталог -
 * промис и `use`, формы - действия.
 */
export function App() {
  return (
    <CartProvider>
      <Page />
    </CartProvider>
  );
}
