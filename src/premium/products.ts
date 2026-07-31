import type { PremiumPlan, PremiumPlanId } from './types';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  THE ONLY PLACE STORE PRODUCT IDENTIFIERS LIVE.
 *
 *  Replace these three strings with the identifiers you create in
 *  App Store Connect (and Google Play Console). Nothing else in the app needs
 *  to change — prices, titles and periods are read from the store at runtime.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const PREMIUM_PRODUCT_IDS = {
  weekly: 'com.cozymasjid.premium.weekly',
  monthly: 'com.cozymasjid.premium.monthly',
  lifetime: 'com.cozymasjid.lifetime',
} as const satisfies Record<PremiumPlanId, string>;

/** Auto-renewable subscriptions — queried with type `subs`. */
export const SUBSCRIPTION_PRODUCT_IDS: readonly string[] = [
  PREMIUM_PRODUCT_IDS.weekly,
  PREMIUM_PRODUCT_IDS.monthly,
];

/** Non-consumable one-time purchase — queried with type `in-app`. */
export const LIFETIME_PRODUCT_ID: string = PREMIUM_PRODUCT_IDS.lifetime;

export const ALL_PREMIUM_PRODUCT_IDS: readonly string[] = [
  ...SUBSCRIPTION_PRODUCT_IDS,
  LIFETIME_PRODUCT_ID,
];

/**
 * Presentation data for the paywall.
 *
 * `fallbackPrice` is shown only while the real localized price is loading, or
 * if the store cannot be reached. Apple requires the displayed price to come
 * from StoreKit whenever it is available, which is what `usePremium().priceFor`
 * returns.
 */
export const premiumPlans: readonly PremiumPlan[] = [
  {
    id: 'weekly',
    productId: PREMIUM_PRODUCT_IDS.weekly,
    kind: 'subscription',
    title: 'Weekly',
    tagline: 'Try everything for a week',
    periodLabel: 'per week',
    fallbackPrice: '$7.99',
    renewalNote: 'Renews every week until you cancel.',
  },
  {
    id: 'monthly',
    productId: PREMIUM_PRODUCT_IDS.monthly,
    kind: 'subscription',
    title: 'Monthly',
    tagline: 'Best value for a cozy habit',
    periodLabel: 'per month',
    fallbackPrice: '$19.99',
    renewalNote: 'Renews every month until you cancel.',
    badge: 'Most popular',
  },
  {
    id: 'lifetime',
    productId: PREMIUM_PRODUCT_IDS.lifetime,
    kind: 'lifetime',
    title: 'Lifetime',
    tagline: 'Pay once, keep it forever',
    periodLabel: 'one-time',
    fallbackPrice: '$59.99',
    renewalNote: 'One payment. No subscription, nothing to cancel.',
  },
];

export const defaultSelectedPlanId: PremiumPlanId = 'monthly';

const planIndex = new Map<PremiumPlanId, PremiumPlan>(
  premiumPlans.map((plan) => [plan.id, plan]),
);

const planByProductId = new Map<string, PremiumPlan>(
  premiumPlans.map((plan) => [plan.productId, plan]),
);

export function getPlan(planId: PremiumPlanId): PremiumPlan {
  const plan = planIndex.get(planId);
  if (!plan) throw new Error(`Unknown premium plan: ${planId}`);
  return plan;
}

export function findPlanByProductId(productId: string | null | undefined) {
  if (!productId) return null;
  return planByProductId.get(productId) ?? null;
}

export function isPremiumProductId(productId: string | null | undefined) {
  return Boolean(productId && planByProductId.has(productId));
}
