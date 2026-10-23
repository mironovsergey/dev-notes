import { connect } from 'react-redux';
import { pluralize } from '../domain';
import { selectItemCount } from '../store/selectors';
import type { RootState } from '../store/types';

interface HeaderProps {
  itemCount: number;
}

/** Презентационный компонент: о Redux не знает, получает готовое число через props. */
export function HeaderView({ itemCount }: HeaderProps) {
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

/**
 * Единственный компонент варианта, подключенный через `connect`, - для
 * сравнения с хуками.
 *
 * `connect` строит HOC: `mapStateToProps` превращает срез хранилища в props,
 * компонент остается презентационным и тестируется без хранилища. Так писали
 * до хуков и так выглядит код, который приходится поддерживать; в новом коде
 * используют `useSelector` - остальные компоненты здесь сделаны через него.
 */
const mapStateToProps = (state: RootState): HeaderProps => ({
  itemCount: selectItemCount(state),
});

export const Header = connect(mapStateToProps)(HeaderView);
