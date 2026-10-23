import { PureComponent, type ReactNode } from 'react';
import type { Product } from '../domain';
import { ProductCard } from './product-card';

interface ProductsProps {
  products: readonly Product[];

  /** productId → количество в корзине. */
  inCartByProductId: ReadonlyMap<string, number>;
  onAdd: (productId: string) => void;
}

export class Products extends PureComponent<ProductsProps> {
  override render(): ReactNode {
    const { products, inCartByProductId, onAdd } = this.props;

    if (products.length === 0) {
      return (
        <ul className="products" role="list">
          <li className="products__empty">Ничего не найдено</li>
        </ul>
      );
    }

    return (
      <ul className="products" role="list">
        {products.map((product) => (
          <li className="products__item" key={product.id}>
            <ProductCard
              product={product}
              inCartQty={inCartByProductId.get(product.id) ?? 0}
              onAdd={onAdd}
            />
          </li>
        ))}
      </ul>
    );
  }
}
