import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { createQueryClient } from './api/query-client';
import { Cart } from './components/cart';
import { Catalog } from './components/catalog';
import { CheckoutModal } from './components/checkout-modal';
import { ErrorBoundary } from './components/error-boundary';
import { Header } from './components/header';
import { useCartStore } from './store/cart-store';

function Page() {
  const isCheckoutOpen = useCartStore((store) => store.isCheckoutOpen);

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

const defaultQueryClient = createQueryClient();

interface AppProps {
  /** Тесты передают свой клиент: он же кеш, и делить его между тестами нельзя. */
  queryClient?: QueryClient;
}

/**
 * `QueryClientProvider` дает доступ к кешу, а `ReactQueryDevtools`
 * показывает содержимое кеша, статусы запросов и их устаревание.
 */
export function App({ queryClient = defaultQueryClient }: AppProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <Page />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
