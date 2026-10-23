import { Component, type ChangeEvent, type ReactNode } from 'react';
import {
  CATEGORY_TITLES,
  filterProducts,
  isCategory,
  type Category,
  type LoadStatus,
  type Product,
} from '../domain';
import { Products } from './products';
import { withLoading } from './with-loading';

interface CatalogProps {
  products: readonly Product[];
  status: LoadStatus;
  error: string | null;
  inCartByProductId: ReadonlyMap<string, number>;
  onAdd: (productId: string) => void;
  onRetry: () => void;
}

interface CatalogState {
  query: string;
  category: Category | 'all';
}

const ProductsWithLoading = withLoading(Products);

/** Состояние фильтров локальное: за пределами каталога оно никому не нужно. */
export class Catalog extends Component<CatalogProps, CatalogState> {
  override state: Readonly<CatalogState> = { query: '', category: 'all' };

  handleQueryChange = (event: ChangeEvent<HTMLInputElement>): void => {
    this.setState({ query: event.target.value });
  };

  handleCategoryChange = (event: ChangeEvent<HTMLSelectElement>): void => {
    const { value } = event.target;
    this.setState({ category: isCategory(value) ? value : 'all' });
  };

  getVisibleProducts(): readonly Product[] {
    return filterProducts(this.props.products, this.state);
  }

  override render(): ReactNode {
    const { status, error, inCartByProductId, onAdd, onRetry } = this.props;

    return (
      <section className="catalog" aria-labelledby="catalog-title">
        <h2 className="catalog__title" id="catalog-title">
          Каталог
        </h2>
        <div className="toolbar">
          <input
            type="search"
            className="toolbar__control input"
            placeholder="Поиск по названию"
            aria-label="Поиск по названию"
            value={this.state.query}
            onChange={this.handleQueryChange}
          />
          <select
            className="toolbar__control select"
            aria-label="Категория"
            value={this.state.category}
            onChange={this.handleCategoryChange}
          >
            <option value="all">Все категории</option>
            {Object.entries(CATEGORY_TITLES).map(([value, title]) => (
              <option value={value} key={value}>
                {title}
              </option>
            ))}
          </select>
        </div>
        <ProductsWithLoading
          status={status}
          error={error}
          onRetry={onRetry}
          products={this.getVisibleProducts()}
          inCartByProductId={inCartByProductId}
          onAdd={onAdd}
        />
      </section>
    );
  }
}
