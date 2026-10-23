import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CATEGORIES, CATEGORY_TITLES, filterProducts, type Category } from '../domain';
import { productsQuery } from '../api/queries';
import { LoadState } from './load-state';
import { Products } from './products';
import { Select, type SelectOption } from './select';

/** Вариант «все категории» плюс названия из общей модели. */
const CATEGORY_OPTIONS: readonly SelectOption<Category | 'all'>[] = [
  { value: 'all', title: 'Все категории' },
  ...CATEGORIES.map((category) => ({ value: category, title: CATEGORY_TITLES[category] })),
];

/**
 * Запрос живет прямо в компоненте.
 *
 * Ни эффекта, ни действия загрузки, ни статусов в сторе: `useQuery`
 * выполняет запрос при монтировании, отменяет его при размонтировании,
 * повторяет после ошибки и отдает готовый статус.
 */
export function Catalog() {
  const { data, status, error, refetch } = useQuery(productsQuery());
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category | 'all'>('all');

  const visibleProducts = useMemo(
    () => filterProducts(data ?? [], { query, category }),
    [data, query, category],
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
        status={status === 'success' ? 'ready' : status === 'error' ? 'error' : 'loading'}
        error={error?.message ?? null}
        onRetry={() => {
          void refetch();
        }}
      >
        <Products products={visibleProducts} />
      </LoadState>
    </section>
  );
}
