import { observer } from 'mobx-react-lite';
import { formatPrice, type CartLine as CartLineData } from '../domain';
import { useStores } from '../store/store-context';
import { Stepper } from './stepper';

interface CartLineProps {
  line: CartLineData;
  postponed: boolean;
}

export const CartLine = observer(function CartLine({ line, postponed }: CartLineProps) {
  const { cart } = useStores();
  const { product, qty } = line;

  return (
    <div
      className={postponed ? 'cart-line cart-line_postponed' : 'cart-line'}
      aria-label={product.title}
    >
      <img className="cart-line__thumb" src={product.image} alt="" width="56" height="56" />
      <h3 className="cart-line__title">{product.title}</h3>
      <p className="cart-line__price">{formatPrice(product.price * qty)}</p>
      <div className="cart-line__controls">
        <Stepper
          value={qty}
          max={product.stock}
          label={product.title}
          onChange={(next) => {
            cart.changeQty(product, next);
          }}
        />
        <button
          type="button"
          className="button button_ghost button_small"
          onClick={() => {
            if (postponed) {
              cart.restore(product.id);
            } else {
              cart.postpone(product.id);
            }
          }}
        >
          {postponed ? 'Вернуть' : 'Отложить'}
        </button>
        <button
          type="button"
          className="button button_ghost button_small"
          aria-label={`Удалить: ${product.title}`}
          onClick={() => {
            cart.remove(product.id);
          }}
        >
          Удалить
        </button>
      </div>
    </div>
  );
});
