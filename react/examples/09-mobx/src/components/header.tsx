import { observer } from 'mobx-react-lite';
import { pluralize } from '../domain';
import { useStores } from '../store/store-context';

/** `observer` подписывает компонент на то, что он прочитал во время рендера. */
export const Header = observer(function Header() {
  const { cart } = useStores();

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
          {cart.itemCount === 0
            ? 'Корзина пуста'
            : `В корзине ${cart.itemCount} ${pluralize(cart.itemCount, ['товар', 'товара', 'товаров'])}`}
        </p>
      </div>
    </header>
  );
});
