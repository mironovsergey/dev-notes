import { memo } from 'react';
import { formatPrice, type CartLine as CartLineData } from '../domain';
import { useShopDispatch } from '../store/shop-context';
import { Stepper } from './stepper';

interface CartLineProps {
  line: CartLineData;
  postponed: boolean;
}

/** Действия уходят прямо в `dispatch`: колбэки через пропсы больше не нужны. */
export const CartLine = memo(function CartLine({ line, postponed }: CartLineProps) {
  const dispatch = useShopDispatch();
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
            dispatch({ type: 'cart/qtyChanged', product, qty: next });
          }}
        />
        <button
          type="button"
          className="button button_ghost button_small"
          onClick={() => {
            dispatch({
              type: postponed ? 'cart/restored' : 'cart/postponed',
              productId: product.id,
            });
          }}
        >
          {postponed ? 'Вернуть' : 'Отложить'}
        </button>
        <button
          type="button"
          className="button button_ghost button_small"
          aria-label={`Удалить: ${product.title}`}
          onClick={() => {
            dispatch({ type: 'cart/removed', productId: product.id });
          }}
        >
          Удалить
        </button>
      </div>
    </div>
  );
});
