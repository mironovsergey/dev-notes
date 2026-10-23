import { Provider } from 'react-redux';
import { Cart } from './components/cart';
import { Catalog } from './components/catalog';
import { CheckoutModal } from './components/checkout-modal';
import { ErrorBoundary } from './components/error-boundary';
import { Header } from './components/header';
import { useAppSelector } from './store/hooks';
import { selectIsCheckoutOpen } from './store/checkout-slice';
import { createAppStore, store as defaultStore } from './store/store';

function Page() {
  const isOpen = useAppSelector(selectIsCheckoutOpen);

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
      {isOpen && <CheckoutModal />}
    </div>
  );
}

interface AppProps {
  /** Тесты передают свое хранилище, чтобы состояние не переходило между ними. */
  store?: ReturnType<typeof createAppStore>;
}

/** `Provider` кладет хранилище в контекст: хуки `react-redux` берут его оттуда. */
export function App({ store = defaultStore }: AppProps) {
  return (
    <Provider store={store}>
      <Page />
    </Provider>
  );
}
