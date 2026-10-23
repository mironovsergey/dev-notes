import type { Product } from '../domain';
import { useAppSelector } from '../store/hooks';
import { selectInCartByProductId } from '../store/selectors';
import { ProductCard } from './product-card';

interface ProductsProps {
  products: readonly Product[];
}

/**
 * Подписка точечная: список читает только карту «товар → количество».
 *
 * В отличие от контекста, изменение других срезов (промокод, доставка,
 * оформление) этот компонент не затрагивает - `useSelector` сравнивает
 * результат селектора и не рендерит, если он тот же.
 */
export function Products({ products }: ProductsProps) {
  const inCartByProductId = useAppSelector(selectInCartByProductId);

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
