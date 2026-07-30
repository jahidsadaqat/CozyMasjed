import { findPlanByProductId, LIFETIME_PRODUCT_ID } from './products';
import { emptyEntitlement, type PremiumEntitlement } from './types';

/**
 * Minimal shapes of what the store hands back. Declared locally so this module
 * has no dependency on the IAP SDK and can be unit tested in isolation.
 */
export type OwnedSubscription = {
  productId: string;
  isActive: boolean;
  expirationDateIOS?: number | null;
  autoRenewingAndroid?: boolean | null;
};

export type OwnedPurchase = {
  productId: string;
  /** Android reports pending purchases that must not unlock anything yet. */
  purchaseState?: string | null;
  isSuspendedAndroid?: boolean | null;
};

/**
 * Order matters: lifetime beats monthly beats weekly. When someone owns more
 * than one thing we always show them the strongest entitlement.
 */
const PLAN_RANK = { lifetime: 3, monthly: 2, weekly: 1 } as const;

function isGrantable(purchase: OwnedPurchase) {
  if (purchase.isSuspendedAndroid) return false;
  // `purchased` on Android, undefined on iOS where StoreKit already filtered.
  return purchase.purchaseState !== 'pending';
}

/**
 * Turns whatever the store reported into the single entitlement the app uses.
 * Never throws: an unreadable entry is simply ignored.
 */
export function deriveEntitlement(input: {
  activeSubscriptions?: readonly OwnedSubscription[];
  availablePurchases?: readonly OwnedPurchase[];
  now?: number;
}): PremiumEntitlement {
  const now = input.now ?? Date.now();
  let best: PremiumEntitlement | null = null;

  const consider = (candidate: PremiumEntitlement) => {
    if (!candidate.planId) return;
    if (
      !best ||
      !best.planId ||
      PLAN_RANK[candidate.planId] > PLAN_RANK[best.planId]
    ) {
      best = candidate;
    }
  };

  for (const purchase of input.availablePurchases ?? []) {
    if (purchase.productId !== LIFETIME_PRODUCT_ID) continue;
    if (!isGrantable(purchase)) continue;
    consider({
      isPremium: true,
      planId: 'lifetime',
      productId: purchase.productId,
      expiresAt: null,
      isLifetime: true,
      checkedAt: now,
      source: 'store',
    });
  }

  for (const subscription of input.activeSubscriptions ?? []) {
    if (!subscription.isActive) continue;
    const plan = findPlanByProductId(subscription.productId);
    if (!plan || plan.kind !== 'subscription') continue;

    const expiresAt = subscription.expirationDateIOS ?? null;
    // StoreKit already excludes expired entitlements, but a stale value here
    // must never keep premium alive.
    if (expiresAt !== null && expiresAt <= now) continue;

    consider({
      isPremium: true,
      planId: plan.id,
      productId: subscription.productId,
      expiresAt,
      isLifetime: false,
      checkedAt: now,
      source: 'store',
    });
  }

  return best ?? { ...emptyEntitlement, checkedAt: now, source: 'store' };
}

/**
 * A cached entitlement is trusted while offline, except for a subscription
 * whose known expiry has already passed.
 */
export function isCachedEntitlementStillValid(
  entitlement: PremiumEntitlement,
  now = Date.now(),
) {
  if (!entitlement.isPremium) return false;
  if (entitlement.isLifetime) return true;
  if (entitlement.expiresAt === null) return true;
  return entitlement.expiresAt > now;
}

export function describeRenewal(
  entitlement: PremiumEntitlement,
  now = Date.now(),
): string | null {
  if (!entitlement.isPremium) return null;
  if (entitlement.isLifetime) return 'Yours forever';
  if (entitlement.expiresAt === null) return 'Active';

  const days = Math.max(
    0,
    Math.ceil((entitlement.expiresAt - now) / (24 * 60 * 60 * 1000)),
  );
  if (days === 0) return 'Renews today';
  if (days === 1) return 'Renews tomorrow';
  return `Renews in ${days} days`;
}
