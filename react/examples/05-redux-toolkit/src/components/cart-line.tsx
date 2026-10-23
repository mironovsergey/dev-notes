import { memo } from 'react';
import { formatPrice, type CartLine as CartLineData } from '../domain';
import { cartActions } from '../store/cart-slice';
import { useAppDispatch } from '../store/hooks';
import { Stepper } from './stepper';

interface CartLineProps {
  line: CartLineData;
  postponed: boolean;
}

export const CartLine = memo(function CartLine({ line, postponed }: CartLineProps) {
  const dispatch = useAppDispatch();
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
            dispatch(cartActions.qtyChanged(product, next));
          }}
        />
        <button
          type="button"
          className="button button_ghost button_small"
          onClick={() => {
            dispatch(
              postponed ? cartActions.restored(product.id) : cartActions.postponed(product.id),
            );
          }}
        >
          {postponed ? 'Вернуть' : 'Отложить'}
        </button>
        <button
          type="button"
          className="button button_ghost button_small"
          aria-label={`Удалить: ${product.title}`}
          onClick={() => {
            dispatch(cartActions.removed(product.id));
          }}
        >
          Удалить
        </button>
      </div>
    </div>
  );
});
