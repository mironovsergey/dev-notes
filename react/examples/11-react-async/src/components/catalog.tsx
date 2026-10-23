import { Suspense, use, useMemo, useState, useTransition } from 'react';
import { CATEGORIES, CATEGORY_TITLES, fetchProducts, filterProducts } from '../domain';
import type { Category, Product } from '../domain';
import { CatalogBoundary } from './catalog-boundary';
import { Products } from './products';
import { Select, type SelectOption } from './select';

/** Вариант «все категории» плюс названия из общей модели. */
const CATEGORY_OPTIONS: readonly SelectOption<Category | 'all'>[] = [
  { value: 'all', title: 'Все категории' },
  ...CATEGORIES.map((category) => ({ value: category, title: CATEGORY_TITLES[category] })),
];

interface ProductListProps {
  productsPromise: Promise<readonly Product[]>;
  query: string;
  category: Category | 'all';
}

/**
 * Компонент написан так, будто данные уже есть.
 *
 * `use` разворачивает промис: пока он не выполнен, React приостанавливает
 * рендер и показывает заглушку ближайшего `Suspense`, а отклоненный промис
 * бросается как ошибка и попадает в границу ошибок. Ветвления по статусу
 * здесь нет.
 */
function ProductList({ productsPromise, query, category }: ProductListProps) {
  const products = use(productsPromise);
  const visibleProducts = useMemo(
    () => filterProducts(products, { query, category }),
    [products, query, category],
  );

  return <Products products={visibleProducts} />;
}

export function Catalog() {
  /**
   * Промис хранится в состоянии.
   *
   * Созданный прямо в рендере, он был бы новым на каждой попытке, и
   * компонент приостанавливался бы бесконечно.
   */
  const [productsPromise, setProductsPromise] = useState(() => fetchProducts());
  const [isReloading, startTransition] = useTransition();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category | 'all'>('all');

  const reload = (): void => {
    // Переход: если на экране уже есть каталог, React оставит его вместо
    // заглушки Suspense, а `isReloading` покажет ненавязчивый индикатор.
    startTransition(() => {
      setProductsPromise(fetchProducts());
    });
  };

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
      {isReloading && (
        <p className="catalog__status" role="status">
          Обновляем каталог…
        </p>
      )}
      <CatalogBoundary onRetry={reload}>
        <Suspense
          fallback={
            <p className="catalog__status" role="status">
              Загружаем каталог…
            </p>
          }
        >
          <ProductList productsPromise={productsPromise} query={query} category={category} />
        </Suspense>
      </CatalogBoundary>
    </section>
  );
}
