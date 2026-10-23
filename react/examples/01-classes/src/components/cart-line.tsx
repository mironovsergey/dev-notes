import { PureComponent, type ReactNode } from 'react';
import { formatPrice, type CartLine as CartLineData } from '../domain';
import { Stepper } from './stepper';

interface CartLineProps {
  line: CartLineData;
  postponed: boolean;
  onQtyChange: (productId: string, qty: number) => void;
  onRemove: (productId: string) => void;

  /** Отложить активную позицию или вернуть отложенную. */
  onToggle: (productId: string) => void;
}

export class CartLine extends PureComponent<CartLineProps> {
  handleQtyChange = (qty: number): void => {
    this.props.onQtyChange(this.props.line.product.id, qty);
  };

  handleRemove = (): void => {
    this.props.onRemove(this.props.line.product.id);
  };

  handleToggle = (): void => {
    this.props.onToggle(this.props.line.product.id);
  };

  override render(): ReactNode {
    const { line, postponed } = this.props;
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
            onChange={this.handleQtyChange}
          />
          <button
            type="button"
            className="button button_ghost button_small"
            onClick={this.handleToggle}
          >
            {postponed ? 'Вернуть' : 'Отложить'}
          </button>
          <button
            type="button"
            className="button button_ghost button_small"
            aria-label={`Удалить: ${product.title}`}
            onClick={this.handleRemove}
          >
            Удалить
          </button>
        </div>
      </div>
    );
  }
}
