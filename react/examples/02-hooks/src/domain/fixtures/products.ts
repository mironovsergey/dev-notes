import type { Product } from '../types';

/** Находит картинку в `assets/products`; Vite превращает вызов в URL ресурса и в разработке, и в сборке. */
function productImageUrl(fileName: string): string {
  return new URL(`../../assets/products/${fileName}.svg`, import.meta.url).href;
}

export const PRODUCTS: readonly Product[] = [
  {
    id: 'lollipop',
    title: 'Леденец «Радуга»',
    category: 'candy',
    price: 190,
    stock: 40,
    image: productImageUrl('lollipop'),
  },
  {
    id: 'candy-cane',
    title: 'Карамельные трости, 3 шт.',
    category: 'candy',
    price: 290,
    stock: 0,
    image: productImageUrl('candy-cane'),
  },
  {
    id: 'gummy-bears',
    title: 'Мармеладные мишки, 500 г',
    category: 'candy',
    price: 690,
    stock: 25,
    image: productImageUrl('gummy-bears'),
  },
  {
    id: 'cotton-candy',
    title: 'Сладкая вата «Облако»',
    category: 'candy',
    price: 350,
    stock: 12,
    image: productImageUrl('cotton-candy'),
  },
  {
    id: 'chocolate',
    title: 'Шоколад «Лавка», 100 г',
    category: 'chocolate',
    price: 490,
    stock: 30,
    image: productImageUrl('chocolate'),
  },
  {
    id: 'cake-pops',
    title: 'Кейк-попсы в глазури, 12 шт.',
    category: 'chocolate',
    price: 1490,
    stock: 6,
    image: productImageUrl('cake-pops'),
  },
  {
    id: 'cupcake',
    title: 'Капкейк с клубничным кремом',
    category: 'bakery',
    price: 390,
    stock: 15,
    image: productImageUrl('cupcake'),
  },
  {
    id: 'donut',
    title: 'Пончик с розовой глазурью',
    category: 'bakery',
    price: 250,
    stock: 20,
    image: productImageUrl('donut'),
  },
  {
    id: 'macarons',
    title: 'Набор макарон, 24 шт.',
    category: 'bakery',
    price: 2490,
    stock: 2,
    image: productImageUrl('macarons'),
  },
  {
    id: 'ice-cream',
    title: 'Мороженое «Три шарика», 1 л',
    category: 'frozen',
    price: 790,
    stock: 10,
    image: productImageUrl('ice-cream'),
  },
];
