import { observer } from 'mobx-react-lite';
import type { Product } from '../domain';
import { ProductCard } from './product-card';

interface ProductsProps {
  products: readonly Product[];
}

export const Products = observer(function Products({ products }: ProductsProps) {
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
          <ProductCard product={product} />
        </li>
      ))}
    </ul>
  );
});
