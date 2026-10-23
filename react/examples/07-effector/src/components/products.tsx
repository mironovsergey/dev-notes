import { useUnit } from 'effector-react';
import type { Product } from '../domain';
import { $inCartByProductId } from '../model';
import { ProductCard } from './product-card';

interface ProductsProps {
  products: readonly Product[];
}

export function Products({ products }: ProductsProps) {
  const inCartByProductId = useUnit($inCartByProductId);

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
          <ProductCard product={product} inCartQty={inCartByProductId.get(product.id) ?? 0} />
        </li>
      ))}
    </ul>
  );
}
