import type { CartLine, DeliveryMethod, DeliveryOption, Discount, Promo, Totals } from './types';

/** Позиция с таким количеством и больше получает скидку за количество. */
export const QUANTITY_DISCOUNT_THRESHOLD = 3;

/** Доля стоимости позиции, которую снимает скидка за количество. */
export const QUANTITY_DISCOUNT_RATE = 0.05;

export const DELIVERY_OPTIONS: readonly DeliveryOption[] = [
  { method: 'pickup', title: 'Самовывоз', cost: 0 },
  { method: 'courier', title: 'Курьер', cost: 300, freeFrom: 3000 },
  { method: 'post', title: 'Почта', cost: 200 },
];

export function getDeliveryOption(method: DeliveryMethod): DeliveryOption {
  const deliveryOption = DELIVERY_OPTIONS.find((candidate) => candidate.method === method);

  if (deliveryOption === undefined) {
    throw new Error(`Неизвестный способ доставки: ${method}`);
  }

  return deliveryOption;
}

/** Сумма позиций до любых скидок. */
export function calculateSubtotal(lines: readonly CartLine[]): number {
  return lines.reduce((sum, line) => sum + line.product.price * line.qty, 0);
}

/** Промокод действует, только когда подытог до скидок достигает его порога. */
export function isPromoApplicable(promo: Promo, subtotal: number): boolean {
  return subtotal >= promo.minSubtotal;
}

function calculateQuantityDiscount(lines: readonly CartLine[]): Discount | null {
  const discountAmount = lines
    .filter((line) => line.qty >= QUANTITY_DISCOUNT_THRESHOLD)
    .reduce(
      (sum, line) => sum + Math.floor(line.product.price * line.qty * QUANTITY_DISCOUNT_RATE),
      0,
    );

  return discountAmount > 0
    ? {
        kind: 'quantity',
        label: `Скидка за количество (от ${QUANTITY_DISCOUNT_THRESHOLD} шт.)`,
        amount: discountAmount,
      }
    : null;
}

function calculatePromoDiscount(promo: Promo, discountedSubtotal: number): Discount | null {
  switch (promo.kind) {
    case 'percent':
      return {
        kind: 'promo',
        label: `Промокод ${promo.code} (−${promo.value} %)`,
        amount: Math.floor((discountedSubtotal * promo.value) / 100),
      };
    case 'fixed':
      return {
        kind: 'promo',
        label: `Промокод ${promo.code}`,
        amount: Math.min(promo.value, discountedSubtotal),
      };
    case 'freeDelivery':
      return null;
  }
}

/**
 * Считает итоги заказа.
 *
 * Порядок применения: скидка за количество по каждой позиции, затем промокод
 * на оставшуюся сумму, затем доставка. Промокод ниже порога здесь игнорируется;
 * причину форма сообщает через `isPromoApplicable`.
 */
export function calculateTotals(
  lines: readonly CartLine[],
  promo: Promo | null,
  delivery: DeliveryMethod,
): Totals {
  const subtotal = calculateSubtotal(lines);
  const discounts: Discount[] = [];

  const quantityDiscount = calculateQuantityDiscount(lines);

  if (quantityDiscount !== null) {
    discounts.push(quantityDiscount);
  }

  const activePromo = promo !== null && isPromoApplicable(promo, subtotal) ? promo : null;
  const subtotalAfterQuantityDiscount = subtotal - (quantityDiscount?.amount ?? 0);

  if (activePromo !== null) {
    const promoDiscount = calculatePromoDiscount(activePromo, subtotalAfterQuantityDiscount);

    if (promoDiscount !== null) {
      discounts.push(promoDiscount);
    }
  }

  const discountedSubtotal = discounts.reduce((sum, discount) => sum - discount.amount, subtotal);
  const deliveryOption = getDeliveryOption(delivery);
  const isDeliveryFree =
    activePromo?.kind === 'freeDelivery' ||
    (deliveryOption.freeFrom !== undefined && discountedSubtotal >= deliveryOption.freeFrom);
  const deliveryCost = lines.length === 0 || isDeliveryFree ? 0 : deliveryOption.cost;

  return { subtotal, discounts, deliveryCost, total: discountedSubtotal + deliveryCost };
}

/** Рубли в формате интерфейса: `1 234 ₽` с неразрывными пробелами между разрядами. */
export function formatPrice(amount: number): string {
  const digits = Math.abs(Math.trunc(amount)).toString();
  const groupedDigits = digits.replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0');

  return `${amount < 0 ? '−' : ''}${groupedDigits}\u00a0₽`;
}
