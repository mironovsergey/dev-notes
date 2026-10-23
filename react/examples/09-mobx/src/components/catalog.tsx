import { useEffect, useMemo, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { CATEGORIES, CATEGORY_TITLES, filterProducts, type Category } from '../domain';
import { useStores } from '../store/store-context';
import { LoadState } from './load-state';
import { Products } from './products';
import { Select, type SelectOption } from './select';

/** Вариант «все категории» плюс названия из общей модели. */
const CATEGORY_OPTIONS: readonly SelectOption<Category | 'all'>[] = [
  { value: 'all', title: 'Все категории' },
  ...CATEGORIES.map((category) => ({ value: category, title: CATEGORY_TITLES[category] })),
];

/** Фильтры - локальное состояние компонента: стор о них знать не должен. */
export const Catalog = observer(function Catalog() {
  const { catalog } = useStores();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category | 'all'>('all');

  useEffect(() => {
    void catalog.load();
  }, [catalog]);

  const visibleProducts = useMemo(
    () => filterProducts(catalog.products, { query, category }),
    [catalog.products, query, category],
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
        status={catalog.status}
        error={catalog.error}
        onRetry={() => {
          void catalog.load();
        }}
      >
        <Products products={visibleProducts} />
      </LoadState>
    </section>
  );
});
