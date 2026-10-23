import { useUnit } from 'effector-react';
import { pluralize } from '../domain';
import { $itemCount } from '../model';

/** `useUnit` подписывает компонент на стор: перерисовка только при его изменении. */
export function Header() {
  const itemCount = useUnit($itemCount);

  return (
    <header className="header">
      <div className="header__ribbon" aria-hidden="true" />
      <div className="header__inner">
        <div className="header__brand">
          <span className="header__mark" aria-hidden="true" />
          <div>
            <p className="header__logo">Лавка</p>
            <p className="header__subtitle">Кондитерская</p>
          </div>
        </div>
        <p className="header__counter" aria-live="polite">
          {itemCount === 0
            ? 'Корзина пуста'
            : `В корзине ${itemCount} ${pluralize(itemCount, ['товар', 'товара', 'товаров'])}`}
        </p>
      </div>
    </header>
  );
}
