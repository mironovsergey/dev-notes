import { fork, type Scope } from 'effector';
import { Provider, useUnit } from 'effector-react';
import { Cart } from './components/cart';
import { Catalog } from './components/catalog';
import { CheckoutModal } from './components/checkout-modal';
import { ErrorBoundary } from './components/error-boundary';
import { Header } from './components/header';
import { $isCheckoutOpen } from './model';

function Page() {
  const isCheckoutOpen = useUnit($isCheckoutOpen);

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

const defaultScope = fork();

interface AppProps {
  /** Тесты передают свой scope, чтобы состояние не переходило между ними. */
  scope?: Scope;
}

/**
 * `fork` создает изолированную копию всех юнитов - область видимости.
 *
 * `Provider` кладет ее в контекст, и `useUnit` читает сторы и вызывает
 * события именно в ней. Так модель, объявленная модулями, не превращается в
 * глобальное состояние, общее для всех тестов и серверных запросов.
 */
export function App({ scope = defaultScope }: AppProps) {
  return (
    <Provider value={scope}>
      <Page />
    </Provider>
  );
}
