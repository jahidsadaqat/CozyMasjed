/**
 * Shared premium types.
 *
 * Kept free of any store SDK imports so the domain stays testable and the
 * StoreKit binding can be swapped without touching the UI.
 */

export type PremiumPlanId = 'weekly' | 'monthly' | 'lifetime';

export type PremiumPlanKind = 'subscription' | 'lifetime';

export type PremiumPlan = {
  id: PremiumPlanId;
  /** App Store / Play Store product identifier. */
  productId: string;
  kind: PremiumPlanKind;
  /** Card heading, e.g. "Monthly". */
  title: string;
  /** Short line under the heading. */
  tagline: string;
  /** Billing unit shown next to the price, e.g. "per week". */
  periodLabel: string;
  /** Shown only until the real store price has loaded. */
  fallbackPrice: string;
  /** Renewal wording required by App Review. */
  renewalNote: string;
  /** Gold badge on the recommended plan. */
  badge?: string;
};

/**
 * What the user currently owns. Derived from StoreKit, cached locally so the
 * app still behaves correctly while offline.
 */
export type PremiumEntitlement = {
  isPremium: boolean;
  planId: PremiumPlanId | null;
  productId: string | null;
  /** Epoch ms. Null for lifetime or when the store does not report one. */
  expiresAt: number | null;
  isLifetime: boolean;
  /** Epoch ms of the last time this snapshot was produced. */
  checkedAt: number;
  /** Where this snapshot came from — the store, or the offline cache. */
  source: 'store' | 'cache' | 'none';
};

/** Connection state of the underlying store. */
export type StoreStatus =
  | 'idle'
  | 'connecting'
  | 'ready'
  | 'unavailable'
  | 'offline';

/** What the premium context is currently doing. */
export type PremiumActivity =
  | { type: 'none' }
  | { type: 'connecting' }
  | { type: 'purchasing'; planId: PremiumPlanId }
  | { type: 'restoring' };

export type PremiumFeedbackTone = 'success' | 'error' | 'info';

/** A single user-facing message, rendered by the paywall and settings sheet. */
export type PremiumFeedback = {
  tone: PremiumFeedbackTone;
  title: string;
  message: string;
  /** Set when the message is about one specific plan. */
  planId?: PremiumPlanId;
};

export const emptyEntitlement: PremiumEntitlement = {
  isPremium: false,
  planId: null,
  productId: null,
  expiresAt: null,
  isLifetime: false,
  checkedAt: 0,
  source: 'none',
};
