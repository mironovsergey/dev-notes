import { memo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { formatPrice, type CartLine as CartLineData } from '../domain';
import { useCartStore } from '../store/cart-store';
import { Stepper } from './stepper';

interface CartLineProps {
  line: CartLineData;
  postponed: boolean;
}

export const CartLine = memo(function CartLine({ line, postponed }: CartLineProps) {
  /**
   * Несколько действий за один вызов хука.
   *
   * Селектор собирает объект, поэтому без `useShallow` он возвращал бы новую
   * ссылку на каждом вызове и компонент перерисовывался бы на любое
   * изменение стора.
   */
  const { changeQty, removeItem, postponeItem, restoreItem } = useCartStore(
    useShallow((store) => ({
      changeQty: store.changeQty,
      removeItem: store.removeItem,
      postponeItem: store.postponeItem,
      restoreItem: store.restoreItem,
    })),
  );
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
            changeQty(product, next);
          }}
        />
        <button
          type="button"
          className="button button_ghost button_small"
          onClick={() => {
            if (postponed) {
              restoreItem(product.id);
            } else {
              postponeItem(product.id);
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
            removeItem(product.id);
          }}
        >
          Удалить
        </button>
      </div>
    </div>
  );
});
