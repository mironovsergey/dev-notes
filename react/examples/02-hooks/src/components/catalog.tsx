import { useMemo, useState } from 'react';
import {
  CATEGORIES,
  CATEGORY_TITLES,
  filterProducts,
  type Category,
  type LoadStatus,
  type Product,
} from '../domain';
import { LoadState } from './load-state';
import { Select, type SelectOption } from './select';
import { Products } from './products';

/** Вариант «все категории» плюс названия из общей модели. */
const CATEGORY_OPTIONS: readonly SelectOption<Category | 'all'>[] = [
  { value: 'all', title: 'Все категории' },
  ...CATEGORIES.map((category) => ({ value: category, title: CATEGORY_TITLES[category] })),
];

interface CatalogProps {
  products: readonly Product[];
  status: LoadStatus;
  error: string | null;
  inCartByProductId: ReadonlyMap<string, number>;
  onAdd: (product: Product) => void;
  onRetry: () => void;
}

/** Состояние фильтров локальное: за пределами каталога оно никому не нужно. */
export function Catalog({
  products,
  status,
  error,
  inCartByProductId,
  onAdd,
  onRetry,
}: CatalogProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category | 'all'>('all');

  // Фильтрация пересчитывается только при смене условий или каталога, а не на
  // каждый рендер приложения - иначе `memo` на списке товаров не спасал бы.
  const visibleProducts = useMemo(
    () => filterProducts(products, { query, category }),
    [products, query, category],
  );

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
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
          }}
        />
        <Select
          className="toolbar__control select"
          label="Категория"
          value={category}
          options={CATEGORY_OPTIONS}
          onChange={setCategory}
        />
      </div>
      <LoadState status={status} error={error} onRetry={onRetry}>
        <Products products={visibleProducts} inCartByProductId={inCartByProductId} onAdd={onAdd} />
      </LoadState>
    </section>
  );
}
