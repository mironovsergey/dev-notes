import { CATEGORIES } from './types';
import type { Category, DeliveryMethod, Order, Product, Promo, PromoKind } from './types';

/** Проверки во время выполнения для данных с сетевой границы; единственное место, где неизвестным данным присваиваются типы. */

const PROMO_KINDS: readonly PromoKind[] = ['percent', 'fixed', 'freeDelivery'];
const DELIVERY_METHODS: readonly DeliveryMethod[] = ['pickup', 'courier', 'post'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isOneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === 'string' && allowed.some((candidate) => candidate === value);
}

export function isCategory(value: unknown): value is Category {
  return isOneOf(value, CATEGORIES);
}

export function isDeliveryMethod(value: unknown): value is DeliveryMethod {
  return isOneOf(value, DELIVERY_METHODS);
}

export function isProduct(value: unknown): value is Product {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    isCategory(value.category) &&
    typeof value.price === 'number' &&
    typeof value.stock === 'number' &&
    typeof value.image === 'string'
  );
}

export function isProductList(value: unknown): value is Product[] {
  return Array.isArray(value) && value.every(isProduct);
}

export function isPromo(value: unknown): value is Promo {
  return (
    isRecord(value) &&
    typeof value.code === 'string' &&
    isOneOf(value.kind, PROMO_KINDS) &&
    typeof value.value === 'number' &&
    typeof value.minSubtotal === 'number'
  );
}

export function isOrder(value: unknown): value is Order {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.total === 'number' &&
    typeof value.createdAt === 'string'
  );
}
