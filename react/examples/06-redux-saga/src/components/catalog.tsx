import { useEffect, useMemo, useState } from 'react';
import { CATEGORIES, CATEGORY_TITLES, filterProducts, type Category } from '../domain';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  catalogActions,
  selectCatalogError,
  selectCatalogStatus,
  selectProducts,
} from '../store/catalog-slice';
import { LoadState } from './load-state';
import { Select, type SelectOption } from './select';
import { Products } from './products';

/** Фильтры остаются локальным состоянием: в хранилище кладут то, что нужно нескольким компонентам. */
/** Вариант «все категории» плюс названия из общей модели. */
const CATEGORY_OPTIONS: readonly SelectOption<Category | 'all'>[] = [
  { value: 'all', title: 'Все категории' },
  ...CATEGORIES.map((category) => ({ value: category, title: CATEGORY_TITLES[category] })),
];

export function Catalog() {
  const dispatch = useAppDispatch();
  const products = useAppSelector(selectProducts);
  const status = useAppSelector(selectCatalogStatus);
  const error = useAppSelector(selectCatalogError);

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category | 'all'>('all');
  const [reloadAttempt, setReloadAttempt] = useState(0);

  useEffect(() => {
    // Отправляется обычное действие: запрос запустит сага, а повторный
    // `requested` отменит предыдущий запуск через `takeLatest`.
    dispatch(catalogActions.requested());
  }, [dispatch, reloadAttempt]);

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
          setReloadAttempt((current) => current + 1);
        }}
      >
        <Products products={visibleProducts} />
      </LoadState>
    </section>
  );
}
