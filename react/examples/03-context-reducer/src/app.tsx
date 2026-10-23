import { Cart } from './components/cart';
import { Catalog } from './components/catalog';
import { CheckoutModal } from './components/checkout-modal';
import { ErrorBoundary } from './components/error-boundary';
import { Header } from './components/header';
import { CatalogProvider } from './store/catalog-context';
import { ShopProvider, useShopState } from './store/shop-context';

/**
 * Разметка страницы: пропсов нет ни у одного узла - все данные компоненты
 * берут из контекста сами.
 */
function Page() {
  const { checkout } = useShopState();

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
      {checkout.isOpen && <CheckoutModal />}
    </div>
  );
}

/** Провайдеры собраны в одном месте, поэтому вложенность видна целиком. */
export function App() {
  return (
    <CatalogProvider>
      <ShopProvider>
        <Page />
      </ShopProvider>
    </CatalogProvider>
  );
}
