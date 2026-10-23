import { Component, type ReactNode } from 'react';
import {
  ApiError,
  calculateTotals,
  countItems,
  createOrder,
  errorMessage,
  fetchProducts,
  toCartLines,
  validatePromo,
  withoutItem,
  withQty,
  type CartItem,
  type Customer,
  type DeliveryMethod,
  type LoadStatus,
  type Order,
  type Product,
  type Promo,
} from './domain';
import { Cart } from './components/cart';
import { Catalog } from './components/catalog';
import { CheckoutModal } from './components/checkout-modal';
import { ErrorBoundary } from './components/error-boundary';
import { Header } from './components/header';
import type { PromoResult } from './components/promo-form';

interface AppState {
  products: Product[];
  catalogStatus: LoadStatus;
  catalogError: string | null;
  items: CartItem[];
  postponed: CartItem[];
  promo: Promo | null;
  delivery: DeliveryMethod;
  checkoutOpen: boolean;
  submitting: boolean;
  submitError: string | null;
  order: Order | null;
}

const INITIAL_STATE: AppState = {
  products: [],
  catalogStatus: 'loading',
  catalogError: null,
  items: [],
  postponed: [],
  promo: null,
  delivery: 'pickup',
  checkoutOpen: false,
  submitting: false,
  submitError: null,
  order: null,
};

/**
 * Владелец всего состояния приложения. Дочерние компоненты презентационные
 * и сообщают об изменениях через колбэки, объявленные полями класса.
 */
export class App extends Component<Record<string, never>, AppState> {
  override state: Readonly<AppState> = INITIAL_STATE;

  /** Отменяет запрос каталога, если приложение размонтируется до его завершения. */
  private catalogRequest: AbortController | null = null;

  override componentDidMount(): void {
    this.loadCatalog();
  }

  override componentWillUnmount(): void {
    this.catalogRequest?.abort();
  }

  loadCatalog = (): void => {
    this.catalogRequest?.abort();

    const controller = new AbortController();
    this.catalogRequest = controller;

    this.setState({ catalogStatus: 'loading', catalogError: null });
    fetchProducts(controller.signal)
      .then((products) => {
        this.setState({ products, catalogStatus: 'ready' });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        this.setState({
          catalogStatus: 'error',
          catalogError: errorMessage(error, 'Не удалось загрузить каталог'),
        });
      });
  };

  getProduct(productId: string): Product | undefined {
    return this.state.products.find((product) => product.id === productId);
  }

  handleAdd = (productId: string): void => {
    const product = this.getProduct(productId);

    if (product === undefined) {
      return;
    }

    this.setState((state): Pick<AppState, 'items' | 'postponed'> | null => {
      const activeItem = state.items.find((item) => item.productId === productId);
      const postponedItem = state.postponed.find((item) => item.productId === productId);
      const inCartQty = (activeItem?.qty ?? 0) + (postponedItem?.qty ?? 0);

      if (inCartQty >= product.stock) {
        return null; // остаток исчерпан: состояние не меняется, повторного рендера нет
      }

      if (activeItem !== undefined) {
        return {
          items: withQty(state.items, productId, activeItem.qty + 1),
          postponed: state.postponed,
        };
      }

      if (postponedItem !== undefined) {
        return {
          items: state.items,
          postponed: withQty(state.postponed, productId, postponedItem.qty + 1),
        };
      }

      return { items: [...state.items, { productId, qty: 1 }], postponed: state.postponed };
    });
  };

  handleQtyChange = (productId: string, qty: number): void => {
    const product = this.getProduct(productId);

    if (product === undefined || qty < 1 || qty > product.stock) {
      return;
    }

    this.setState((state) => ({
      items: withQty(state.items, productId, qty),
      postponed: withQty(state.postponed, productId, qty),
    }));
  };

  handleRemove = (productId: string): void => {
    this.setState((state) => ({
      items: withoutItem(state.items, productId),
      postponed: withoutItem(state.postponed, productId),
    }));
  };

  handlePostpone = (productId: string): void => {
    this.setState((state) => {
      const item = state.items.find((candidate) => candidate.productId === productId);

      return item === undefined
        ? null
        : { items: withoutItem(state.items, productId), postponed: [...state.postponed, item] };
    });
  };

  handleRestore = (productId: string): void => {
    this.setState((state) => {
      const item = state.postponed.find((candidate) => candidate.productId === productId);

      return item === undefined
        ? null
        : { postponed: withoutItem(state.postponed, productId), items: [...state.items, item] };
    });
  };

  handleApplyPromo = async (code: string): Promise<PromoResult> => {
    try {
      const appliedPromo = await validatePromo(code);
      this.setState({ promo: appliedPromo });

      return { ok: true, promo: appliedPromo };
    } catch (error: unknown) {
      const message =
        error instanceof ApiError
          ? error.message
          : errorMessage(error, 'Не удалось проверить промокод');

      return { ok: false, message };
    }
  };

  handleClearPromo = (): void => {
    this.setState({ promo: null });
  };

  handleDeliveryChange = (delivery: DeliveryMethod): void => {
    this.setState({ delivery });
  };

  handleOpenCheckout = (): void => {
    this.setState({ checkoutOpen: true, submitError: null, order: null });
  };

  handleCloseCheckout = (): void => {
    // После успешного заказа корзина очищается при закрытии окна
    this.setState(
      (state): Pick<AppState, 'checkoutOpen' | 'order' | 'items' | 'postponed' | 'promo'> =>
        state.order === null
          ? {
              checkoutOpen: false,
              order: null,
              items: state.items,
              postponed: state.postponed,
              promo: state.promo,
            }
          : { checkoutOpen: false, order: null, items: [], postponed: [], promo: null },
    );
  };

  handleSubmitOrder = async (customer: Customer): Promise<void> => {
    const { items, promo, delivery } = this.state;

    this.setState({ submitting: true, submitError: null });

    try {
      const createdOrder = await createOrder({
        items,
        promoCode: promo?.code ?? null,
        delivery,
        customer,
      });
      this.setState({ submitting: false, order: createdOrder });
    } catch (error: unknown) {
      this.setState({
        submitting: false,
        submitError: errorMessage(error, 'Не удалось оформить заказ'),
      });
    }
  };

  override render(): ReactNode {
    const { products, catalogStatus, catalogError, items, postponed, promo, delivery } = this.state;
    const lines = toCartLines(items, products);
    const postponedLines = toCartLines(postponed, products);
    const totals = calculateTotals(lines, promo, delivery);
    const inCartByProductId = new Map<string, number>();

    for (const item of [...items, ...postponed]) {
      inCartByProductId.set(
        item.productId,
        (inCartByProductId.get(item.productId) ?? 0) + item.qty,
      );
    }

    const itemCount = countItems(items);

    return (
      <div className="page">
        <div className="page__header">
          <Header itemCount={itemCount} />
        </div>
        <main className="page__main">
          <div className="page__catalog">
            <ErrorBoundary title="Каталог">
              <Catalog
                products={products}
                status={catalogStatus}
                error={catalogError}
                inCartByProductId={inCartByProductId}
                onAdd={this.handleAdd}
                onRetry={this.loadCatalog}
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
                onQtyChange={this.handleQtyChange}
                onRemove={this.handleRemove}
                onPostpone={this.handlePostpone}
                onRestore={this.handleRestore}
                onApplyPromo={this.handleApplyPromo}
                onClearPromo={this.handleClearPromo}
                onDeliveryChange={this.handleDeliveryChange}
                onCheckout={this.handleOpenCheckout}
              />
            </ErrorBoundary>
          </div>
        </main>
        {this.state.checkoutOpen && (
          <CheckoutModal
            totals={totals}
            itemCount={itemCount}
            submitting={this.state.submitting}
            error={this.state.submitError}
            order={this.state.order}
            onSubmit={this.handleSubmitOrder}
            onClose={this.handleCloseCheckout}
          />
        )}
      </div>
    );
  }
}
