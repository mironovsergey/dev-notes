import { observer } from 'mobx-react-lite';
import { Cart } from './components/cart';
import { Catalog } from './components/catalog';
import { CheckoutModal } from './components/checkout-modal';
import { ErrorBoundary } from './components/error-boundary';
import { Header } from './components/header';
import { RootStore } from './store/root-store';
import { StoreProvider, useStores } from './store/store-context';

const Page = observer(function Page() {
  const { checkout } = useStores();

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
});

const defaultStore = new RootStore();

interface AppProps {
  /** Тесты передают свой стор, чтобы состояние не переходило между ними. */
  store?: RootStore;
}

export function App({ store = defaultStore }: AppProps) {
  return (
    <StoreProvider store={store}>
      <Page />
    </StoreProvider>
  );
}
