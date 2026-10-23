import { useEffect, useMemo, useState } from 'react';
import { CATEGORIES, CATEGORY_TITLES, filterProducts, type Category } from '../domain';
import { useShopStore } from '../store/store';
import { LoadState } from './load-state';
import { Products } from './products';
import { Select, type SelectOption } from './select';

/** Вариант «все категории» плюс названия из общей модели. */
const CATEGORY_OPTIONS: readonly SelectOption<Category | 'all'>[] = [
  { value: 'all', title: 'Все категории' },
  ...CATEGORIES.map((category) => ({ value: category, title: CATEGORY_TITLES[category] })),
];

/** Фильтры остаются локальным состоянием: в стор кладут то, что нужно нескольким компонентам. */
export function Catalog() {
  const products = useShopStore((store) => store.products);
  const status = useShopStore((store) => store.catalogStatus);
  const error = useShopStore((store) => store.catalogError);
  const loadCatalog = useShopStore((store) => store.loadCatalog);

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category | 'all'>('all');

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

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
      <LoadState
        status={status}
        error={error}
        onRetry={() => {
          void loadCatalog();
        }}
      >
        <Products products={visibleProducts} />
      </LoadState>
    </section>
  );
}
