import { memo } from 'react';
import { CATEGORY_TITLES, formatPrice, type Product } from '../domain';
import { useCartStore } from '../store/cart-store';

interface ProductCardProps {
  product: Product;

  /** Сколько единиц товара уже в корзине (включая отложенные). */
  inCartQty: number;
}

export const ProductCard = memo(function ProductCard({ product, inCartQty }: ProductCardProps) {
  const addProduct = useCartStore((store) => store.addProduct);
  const leftInStock = product.stock - inCartQty;
  const isSoldOut = product.stock === 0;

  return (
    <article className={isSoldOut ? 'product-card product-card_unavailable' : 'product-card'}>
      <div className={`product-card__picture product-card__picture_${product.category}`}>
        <img
          className="product-card__image"
          src={product.image}
          alt=""
          width="160"
          height="160"
          loading="lazy"
        />
      </div>
      <p className="product-card__category">{CATEGORY_TITLES[product.category]}</p>
      <h3 className="product-card__title">{product.title}</h3>
      <p className="product-card__price">{formatPrice(product.price)}</p>
      <p
        className={
          isSoldOut ? 'product-card__stock product-card__stock_empty' : 'product-card__stock'
        }
      >
        {isSoldOut ? 'Нет в наличии' : `В наличии: ${product.stock}`}
      </p>
      <button
        type="button"
        className="button button_small"
        disabled={leftInStock <= 0}
        aria-label={`В корзину: ${product.title}`}
        onClick={() => {
          addProduct(product);
        }}
      >
        {inCartQty > 0 ? `В корзине: ${inCartQty}` : 'В корзину'}
      </button>
    </article>
  );
});
