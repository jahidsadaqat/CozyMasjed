import AsyncStorage from '@react-native-async-storage/async-storage';
import { emptyEntitlement, type PremiumEntitlement, type PremiumPlanId } from './types';

const STORAGE_KEY = 'deen-rooms:premium:v1';

const PLAN_IDS: readonly PremiumPlanId[] = ['weekly', 'monthly', 'lifetime'];

function isPlanId(value: unknown): value is PremiumPlanId {
  return typeof value === 'string' && PLAN_IDS.includes(value as PremiumPlanId);
}

function parse(raw: string | null): PremiumEntitlement | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as unknown;
    if (!value || typeof value !== 'object') return null;
    const record = value as Record<string, unknown>;
    if (typeof record.isPremium !== 'boolean') return null;

    return {
      isPremium: record.isPremium,
      planId: isPlanId(record.planId) ? record.planId : null,
      productId: typeof record.productId === 'string' ? record.productId : null,
      expiresAt: typeof record.expiresAt === 'number' ? record.expiresAt : null,
      isLifetime: record.isLifetime === true,
      checkedAt: typeof record.checkedAt === 'number' ? record.checkedAt : 0,
      source: 'cache',
    };
  } catch {
    return null;
  }
}

/**
 * The cache exists so the room does not flicker back to "not premium" on a
 * cold launch or in airplane mode. StoreKit stays the source of truth and
 * overwrites this as soon as it answers.
 */
export async function readCachedEntitlement(): Promise<PremiumEntitlement> {
  try {
    return parse(await AsyncStorage.getItem(STORAGE_KEY)) ?? emptyEntitlement;
  } catch {
    return emptyEntitlement;
  }
}

export async function writeCachedEntitlement(entitlement: PremiumEntitlement) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entitlement));
  } catch {
    // A failed cache write must never break a purchase.
  }
}

export async function clearCachedEntitlement() {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignored on purpose.
  }
}
