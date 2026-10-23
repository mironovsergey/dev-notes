import { memo, useCallback } from 'react';
import { formatPrice, type CartLine as CartLineData, type Product } from '../domain';
import { Stepper } from './stepper';

interface CartLineProps {
  line: CartLineData;
  postponed: boolean;
  onQtyChange: (product: Product, qty: number) => void;
  onRemove: (productId: string) => void;

  /** Отложить активную позицию или вернуть отложенную. */
  onToggle: (productId: string) => void;
}

export const CartLine = memo(function CartLine({
  line,
  postponed,
  onQtyChange,
  onRemove,
  onToggle,
}: CartLineProps) {
  const { product, qty } = line;

  // Stepper под `memo`, поэтому обработчик стабилизируется: иначе новая функция
  // на каждом рендере строки обесценивала бы мемоизацию.
  const handleQtyChange = useCallback(
    (next: number) => {
      onQtyChange(product, next);
    },
    [onQtyChange, product],
  );

  return (
    <div
      className={postponed ? 'cart-line cart-line_postponed' : 'cart-line'}
      aria-label={product.title}
    >
      <img className="cart-line__thumb" src={product.image} alt="" width="56" height="56" />
      <h3 className="cart-line__title">{product.title}</h3>
      <p className="cart-line__price">{formatPrice(product.price * qty)}</p>
      <div className="cart-line__controls">
        <Stepper value={qty} max={product.stock} label={product.title} onChange={handleQtyChange} />
        <button
          type="button"
          className="button button_ghost button_small"
          onClick={() => {
            onToggle(product.id);
          }}
        >
          {postponed ? 'Вернуть' : 'Отложить'}
        </button>
        <button
          type="button"
          className="button button_ghost button_small"
          aria-label={`Удалить: ${product.title}`}
          onClick={() => {
            onRemove(product.id);
          }}
        >
          Удалить
        </button>
      </div>
    </div>
  );
});
