import type { Category, Product } from './types';

/** Условия отбора товаров в каталоге; `all` означает «любая категория». */
export interface CatalogFilter {
  query: string;
  category: Category | 'all';
}

/** Отбирает товары по категории и подстроке в названии; регистр и края строки не учитываются. */
export function filterProducts(
  products: readonly Product[],
  filter: CatalogFilter,
): readonly Product[] {
  const normalizedQuery = filter.query.trim().toLowerCase();

  return products.filter(
    (product) =>
      (filter.category === 'all' || product.category === filter.category) &&
      (normalizedQuery === '' || product.title.toLowerCase().includes(normalizedQuery)),
  );
}
