import { memo } from 'react';
import type { Product } from '../domain';
import { ProductCard } from './product-card';

interface ProductsProps {
  products: readonly Product[];

  /** productId → количество в корзине. */
  inCartByProductId: ReadonlyMap<string, number>;
  onAdd: (product: Product) => void;
}

export const Products = memo(function Products({
  products,
  inCartByProductId,
  onAdd,
}: ProductsProps) {
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
});
