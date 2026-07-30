import { Platform } from 'react-native';
import { deriveEntitlement } from './entitlement';
import {
  ALL_PREMIUM_PRODUCT_IDS,
  LIFETIME_PRODUCT_ID,
  SUBSCRIPTION_PRODUCT_IDS,
} from './products';
import type { PremiumEntitlement, PremiumPlan } from './types';

/**
 * All StoreKit / Play Billing access goes through this module.
 *
 * `expo-iap` is loaded lazily with a dynamic import so the app keeps running
 * anywhere the native module is not present (Expo Go, web preview, a simulator
 * build without the plugin). Everything below degrades to "store unavailable"
 * instead of crashing the room.
 */

type IapModule = typeof import('expo-iap');
type Purchase = Awaited<ReturnType<IapModule['getAvailablePurchases']>>[number];

/** Structural error shape — avoids importing the SDK enum at runtime. */
export type IapErrorLike = {
  code?: string;
  message?: string;
};

/** Canonical OpenIAP error codes we handle explicitly. */
export const IAP_ERROR_CODE = {
  userCancelled: 'user-cancelled',
  alreadyOwned: 'already-owned',
  deferredPayment: 'deferred-payment',
  pending: 'pending',
  networkError: 'network-error',
  serviceError: 'service-error',
  serviceDisconnected: 'service-disconnected',
  serviceTimeout: 'service-timeout',
  billingUnavailable: 'billing-unavailable',
  iapNotAvailable: 'iap-not-available',
  itemUnavailable: 'item-unavailable',
  skuNotFound: 'sku-not-found',
  notPrepared: 'not-prepared',
  initConnection: 'init-connection',
  itemNotOwned: 'item-not-owned',
} as const;

export const isIapPlatformSupported = Platform.OS === 'ios' || Platform.OS === 'android';

let modulePromise: Promise<IapModule | null> | null = null;
let cachedSubscriptionProducts: unknown[] = [];

/** Resolves the SDK once, or null when the native module is unavailable. */
export async function loadIap(): Promise<IapModule | null> {
  if (!isIapPlatformSupported) return null;
  if (!modulePromise) {
    modulePromise = import('expo-iap')
      .then((module) => module)
      .catch((error: unknown) => {
        console.warn('[premium] expo-iap is not available in this build.', error);
        return null;
      });
  }
  return modulePromise;
}

export async function connectStore(): Promise<boolean> {
  const iap = await loadIap();
  if (!iap) return false;
  try {
    await iap.initConnection();
    return true;
  } catch (error) {
    // `already-prepared` simply means another instance connected first.
    if (readErrorCode(error) === 'already-prepared') return true;
    throw error;
  }
}

export async function disconnectStore() {
  const iap = await loadIap();
  if (!iap) return;
  try {
    await iap.endConnection();
  } catch {
    // Nothing useful to do while tearing down.
  }
}

/**
 * Loads localized prices straight from the store. Apple requires the price the
 * user sees to be the store's own price, so this result always wins over the
 * fallback strings in products.ts.
 */
export async function fetchStorePrices(): Promise<Record<string, string>> {
  const iap = await loadIap();
  if (!iap) return {};

  const [subscriptions, products] = await Promise.all([
    iap.fetchProducts({ skus: [...SUBSCRIPTION_PRODUCT_IDS], type: 'subs' }),
    iap.fetchProducts({ skus: [LIFETIME_PRODUCT_ID], type: 'in-app' }),
  ]);

  cachedSubscriptionProducts = Array.isArray(subscriptions) ? subscriptions : [];

  const prices: Record<string, string> = {};
  for (const entry of [...(subscriptions ?? []), ...(products ?? [])]) {
    if (!entry || typeof entry !== 'object') continue;
    const item = entry as { id?: string; displayPrice?: string };
    if (typeof item.id === 'string' && typeof item.displayPrice === 'string') {
      prices[item.id] = item.displayPrice;
    }
  }
  return prices;
}

/** Google Play needs an offer token per base plan; the App Store does not. */
function androidSubscriptionOffers(productId: string) {
  if (Platform.OS !== 'android') return undefined;
  const product = cachedSubscriptionProducts.find(
    (entry) => (entry as { id?: string } | null)?.id === productId,
  ) as { subscriptionOfferDetailsAndroid?: { offerToken?: string }[] | null } | undefined;

  const offers = (product?.subscriptionOfferDetailsAndroid ?? [])
    .map((offer) => offer?.offerToken)
    .filter((token): token is string => typeof token === 'string' && token.length > 0)
    .map((offerToken) => ({ sku: productId, offerToken }));

  return offers.length > 0 ? offers : undefined;
}

/**
 * Starts the native purchase sheet. The outcome arrives asynchronously through
 * the listeners registered in `addPurchaseListeners`, never as a return value.
 */
export async function requestPlanPurchase(plan: PremiumPlan): Promise<void> {
  const iap = await loadIap();
  if (!iap) throw new Error('The store is not available in this build.');

  if (plan.kind === 'lifetime') {
    await iap.requestPurchase({
      request: {
        apple: { sku: plan.productId, quantity: 1 },
        google: { skus: [plan.productId] },
      },
      type: 'in-app',
    });
    return;
  }

  const subscriptionOffers = androidSubscriptionOffers(plan.productId);
  await iap.requestPurchase({
    request: {
      apple: { sku: plan.productId },
      google: {
        skus: [plan.productId],
        ...(subscriptionOffers ? { subscriptionOffers } : {}),
      },
    },
    type: 'subs',
  });
}

/**
 * Marks a transaction as handled. Both premium products are non-consumable
 * (a subscription or a one-time unlock), so `isConsumable` is always false.
 */
export async function finishPurchase(purchase: Purchase) {
  const iap = await loadIap();
  if (!iap) return;
  await iap.finishTransaction({ purchase, isConsumable: false });
}

/** Reads the current entitlement from the store. */
export async function queryEntitlement(): Promise<PremiumEntitlement> {
  const iap = await loadIap();
  if (!iap) throw new Error('The store is not available in this build.');

  const [activeSubscriptions, availablePurchases] = await Promise.all([
    iap.getActiveSubscriptions([...SUBSCRIPTION_PRODUCT_IDS]),
    iap.getAvailablePurchases(),
  ]);

  return deriveEntitlement({
    activeSubscriptions: activeSubscriptions ?? [],
    availablePurchases: (availablePurchases ?? []).filter((purchase) =>
      ALL_PREMIUM_PRODUCT_IDS.includes(purchase.productId),
    ),
  });
}

/**
 * Restore Purchases. On iOS this syncs with the App Store (StoreKit may ask
 * the user to sign in, which is the expected Apple behaviour) and then re-reads
 * every entitlement tied to their Apple Account.
 */
export async function restoreEntitlement(): Promise<PremiumEntitlement> {
  const iap = await loadIap();
  if (!iap) throw new Error('The store is not available in this build.');
  try {
    await iap.restorePurchases();
  } catch (error) {
    // A failed sync is not fatal — the query below still returns what the
    // device already knows about.
    console.warn('[premium] restorePurchases sync failed, querying anyway.', error);
  }
  return queryEntitlement();
}

/** Opens the system subscription management screen. */
export async function openManageSubscriptions(subscriptionSku?: string) {
  const iap = await loadIap();
  if (!iap) return false;
  try {
    await iap.deepLinkToSubscriptions(
      subscriptionSku ? { skuAndroid: subscriptionSku } : undefined,
    );
    return true;
  } catch (error) {
    console.warn('[premium] Could not open subscription management.', error);
    return false;
  }
}

export async function addPurchaseListeners(handlers: {
  onPurchase: (purchase: Purchase) => void;
  onError: (error: IapErrorLike) => void;
}): Promise<() => void> {
  const iap = await loadIap();
  if (!iap) return () => undefined;

  const updated = iap.purchaseUpdatedListener((purchase) => handlers.onPurchase(purchase));
  const failed = iap.purchaseErrorListener((error) => handlers.onError(error));

  return () => {
    updated.remove();
    failed.remove();
  };
}

/* ── Error helpers ───────────────────────────────────────────────────────── */

export function readErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : undefined;
}

function readErrorMessage(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const message = (error as { message?: unknown }).message;
  return typeof message === 'string' && message.trim().length > 0 ? message : undefined;
}

export function isUserCancelled(error: unknown) {
  return readErrorCode(error) === IAP_ERROR_CODE.userCancelled;
}

export function isAlreadyOwned(error: unknown) {
  return readErrorCode(error) === IAP_ERROR_CODE.alreadyOwned;
}

export function isDeferred(error: unknown) {
  const code = readErrorCode(error);
  return code === IAP_ERROR_CODE.deferredPayment || code === IAP_ERROR_CODE.pending;
}

export function isConnectivityProblem(error: unknown) {
  const code = readErrorCode(error);
  return (
    code === IAP_ERROR_CODE.networkError ||
    code === IAP_ERROR_CODE.serviceError ||
    code === IAP_ERROR_CODE.serviceTimeout ||
    code === IAP_ERROR_CODE.serviceDisconnected ||
    code === IAP_ERROR_CODE.initConnection
  );
}

/**
 * Turns a store error into wording a person can act on. Errors state what
 * happened and what to do next — they never apologise.
 */
export function describeStoreError(error: unknown): { title: string; message: string } {
  const code = readErrorCode(error);

  switch (code) {
    case IAP_ERROR_CODE.networkError:
    case IAP_ERROR_CODE.serviceTimeout:
    case IAP_ERROR_CODE.serviceDisconnected:
    case IAP_ERROR_CODE.serviceError:
    case IAP_ERROR_CODE.initConnection:
      return {
        title: 'No connection to the App Store',
        message: 'Check your internet connection and try again.',
      };
    case IAP_ERROR_CODE.deferredPayment:
    case IAP_ERROR_CODE.pending:
      return {
        title: 'Waiting for approval',
        message:
          'This purchase needs approval before it completes. Premium unlocks as soon as it is approved.',
      };
    case IAP_ERROR_CODE.itemUnavailable:
    case IAP_ERROR_CODE.skuNotFound:
      return {
        title: 'Plan unavailable',
        message: 'This plan is not available in your region right now.',
      };
    case IAP_ERROR_CODE.billingUnavailable:
    case IAP_ERROR_CODE.iapNotAvailable:
      return {
        title: 'Purchases are turned off',
        message:
          'In-app purchases are restricted on this device. Check Screen Time restrictions in Settings.',
      };
    case IAP_ERROR_CODE.itemNotOwned:
      return {
        title: 'Nothing to restore',
        message: 'This Apple Account has no Cozy Masjid purchases yet.',
      };
    case IAP_ERROR_CODE.notPrepared:
      return {
        title: 'Store not ready',
        message: 'The App Store connection is still opening. Try again in a moment.',
      };
    default:
      return {
        title: 'Purchase could not be completed',
        message: readErrorMessage(error) ?? 'Try again in a moment.',
      };
  }
}

export type { Purchase as StorePurchase };
