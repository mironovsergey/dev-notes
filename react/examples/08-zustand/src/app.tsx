import { Cart } from './components/cart';
import { Catalog } from './components/catalog';
import { CheckoutModal } from './components/checkout-modal';
import { ErrorBoundary } from './components/error-boundary';
import { Header } from './components/header';
import { useShopStore } from './store/store';

/**
 * Провайдера нет: компоненты импортируют хук стора напрямую.
 *
 * Дерево компонентов о сторе ничего не знает, и обернуть приложение нечем -
 * это главное отличие от вариантов на контексте, Redux и Effector.
 */
export function App() {
  const isCheckoutOpen = useShopStore((store) => store.isCheckoutOpen);

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
            <Cart />
          </ErrorBoundary>
        </div>
      </main>
      {isCheckoutOpen && <CheckoutModal />}
    </div>
  );
}
