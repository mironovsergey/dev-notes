import { useEffect, useMemo, useState } from 'react';
import { useUnit } from 'effector-react';
import { CATEGORIES, CATEGORY_TITLES, filterProducts, type Category } from '../domain';
import { $catalogError, $catalogStatus, $products, catalogRequested } from '../model';
import { LoadState } from './load-state';
import { Products } from './products';
import { Select, type SelectOption } from './select';

/** Вариант «все категории» плюс названия из общей модели. */
const CATEGORY_OPTIONS: readonly SelectOption<Category | 'all'>[] = [
  { value: 'all', title: 'Все категории' },
  ...CATEGORIES.map((category) => ({ value: category, title: CATEGORY_TITLES[category] })),
];

/** Фильтры остаются локальным состоянием: в модель выносят то, что нужно нескольким компонентам. */
export function Catalog() {
  const [products, status, error, requestCatalog] = useUnit([
    $products,
    $catalogStatus,
    $catalogError,
    catalogRequested,
  ]);

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category | 'all'>('all');

  useEffect(() => {
    requestCatalog();
  }, [requestCatalog]);

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
          requestCatalog();
        }}
      >
        <Products products={visibleProducts} />
      </LoadState>
    </section>
  );
}
