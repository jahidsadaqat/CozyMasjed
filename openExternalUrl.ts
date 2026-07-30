import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { isCachedEntitlementStillValid } from './entitlement';
import {
  addPurchaseListeners,
  connectStore,
  describeStoreError,
  disconnectStore,
  fetchStorePrices,
  finishPurchase,
  isAlreadyOwned,
  isConnectivityProblem,
  isDeferred,
  isIapPlatformSupported,
  isUserCancelled,
  openManageSubscriptions,
  queryEntitlement,
  requestPlanPurchase,
  restoreEntitlement,
  type StorePurchase,
} from './iapClient';
import { readCachedEntitlement, writeCachedEntitlement } from './premiumStorage';
import { findPlanByProductId, getPlan, premiumPlans } from './products';
import {
  emptyEntitlement,
  type PremiumActivity,
  type PremiumEntitlement,
  type PremiumFeedback,
  type PremiumPlan,
  type PremiumPlanId,
  type StoreStatus,
} from './types';

/**
 * A purchase can sit in "Ask to Buy" or a slow network for a while. Rather than
 * spinning forever we hand control back after this long and tell the user the
 * purchase may still land.
 */
const PURCHASE_TIMEOUT_MS = 120_000;

export type PremiumContextValue = {
  /** True whenever the user may use premium content. */
  isPremium: boolean;
  entitlement: PremiumEntitlement;
  activePlan: PremiumPlan | null;

  /** True while any store operation is in flight. */
  loading: boolean;
  activity: PremiumActivity;
  storeStatus: StoreStatus;

  plans: readonly PremiumPlan[];
  /** Localized store price, falling back to the bundled string. */
  priceFor: (planId: PremiumPlanId) => string;
  /** True once real store prices have loaded. */
  pricesLoaded: boolean;

  feedback: PremiumFeedback | null;
  clearFeedback: () => void;

  purchaseWeekly: () => Promise<void>;
  purchaseMonthly: () => Promise<void>;
  purchaseLifetime: () => Promise<void>;
  purchasePlan: (planId: PremiumPlanId) => Promise<void>;
  restorePurchases: () => Promise<void>;
  /** Re-reads entitlements and prices from the store. */
  refresh: () => Promise<void>;
  /** Opens the system subscription management screen. */
  manageSubscription: () => Promise<void>;
};

const PremiumContext = createContext<PremiumContextValue | null>(null);

export function PremiumProvider({ children }: { children: ReactNode }) {
  const [entitlement, setEntitlement] = useState<PremiumEntitlement>(emptyEntitlement);
  const [storeStatus, setStoreStatus] = useState<StoreStatus>(
    isIapPlatformSupported ? 'idle' : 'unavailable',
  );
  const [activity, setActivity] = useState<PremiumActivity>({ type: 'none' });
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [pricesLoaded, setPricesLoaded] = useState(false);
  const [feedback, setFeedback] = useState<PremiumFeedback | null>(null);

  const mountedRef = useRef(true);
  const entitlementRef = useRef(entitlement);
  const activityRef = useRef(activity);
  const purchaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  entitlementRef.current = entitlement;
  activityRef.current = activity;

  const safeSetActivity = useCallback((next: PremiumActivity) => {
    if (mountedRef.current) setActivity(next);
  }, []);

  const clearPurchaseTimer = useCallback(() => {
    if (purchaseTimerRef.current) {
      clearTimeout(purchaseTimerRef.current);
      purchaseTimerRef.current = null;
    }
  }, []);

  /** Single place where entitlement changes are committed and cached. */
  const commitEntitlement = useCallback((next: PremiumEntitlement) => {
    if (!mountedRef.current) return;
    setEntitlement(next);
    void writeCachedEntitlement(next);
  }, []);

  const refreshEntitlement = useCallback(async () => {
    const next = await queryEntitlement();
    commitEntitlement(next);
    return next;
  }, [commitEntitlement]);

  /* ── Purchase events ───────────────────────────────────────────────────── */

  const handlePurchase = useCallback(
    async (purchase: StorePurchase) => {
      const plan = findPlanByProductId(purchase.productId);
      if (!plan) return;

      try {
        // No receipt server yet: StoreKit 2 verifies the transaction natively
        // before it reaches us. See docs/premium-setup.md for the server-side
        // validation hook when you add a backend.
        await finishPurchase(purchase);
      } catch (error) {
        console.warn('[premium] finishTransaction failed.', error);
      }

      clearPurchaseTimer();

      try {
        await refreshEntitlement();
      } catch {
        // The purchase succeeded even if the follow-up query did not, so grant
        // access from the transaction we were just handed.
        commitEntitlement({
          isPremium: true,
          planId: plan.id,
          productId: plan.productId,
          expiresAt: null,
          isLifetime: plan.kind === 'lifetime',
          checkedAt: Date.now(),
          source: 'store',
        });
      }

      if (!mountedRef.current) return;
      safeSetActivity({ type: 'none' });
      setFeedback({
        tone: 'success',
        title: 'Premium unlocked',
        message:
          plan.kind === 'lifetime'
            ? 'Lifetime access is yours. Thank you for supporting Cozy Masjid.'
            : `Your ${plan.title.toLowerCase()} plan is active. Thank you for supporting Cozy Masjid.`,
        planId: plan.id,
      });
    },
    [clearPurchaseTimer, commitEntitlement, refreshEntitlement, safeSetActivity],
  );

  const handlePurchaseError = useCallback(
    async (error: unknown) => {
      clearPurchaseTimer();

      if (isUserCancelled(error)) {
        // Cancelling is a normal choice, not a failure. Say nothing.
        safeSetActivity({ type: 'none' });
        return;
      }

      if (isAlreadyOwned(error)) {
        try {
          const restored = await restoreEntitlement();
          commitEntitlement(restored);
          safeSetActivity({ type: 'none' });
          setFeedback({
            tone: 'info',
            title: 'You already have Premium',
            message: restored.isPremium
              ? 'This Apple Account already owns Premium, so we restored it instead of charging you again.'
              : 'This Apple Account already owns this plan. Try Restore Purchases.',
          });
          return;
        } catch {
          // Fall through to the generic message below.
        }
      }

      if (isDeferred(error)) {
        safeSetActivity({ type: 'none' });
        const deferred = describeStoreError(error);
        setFeedback({ tone: 'info', ...deferred });
        return;
      }

      if (isConnectivityProblem(error)) {
        setStoreStatus('offline');
      }

      safeSetActivity({ type: 'none' });
      setFeedback({ tone: 'error', ...describeStoreError(error) });
    },
    [clearPurchaseTimer, commitEntitlement, safeSetActivity],
  );

  /* ── Boot ──────────────────────────────────────────────────────────────── */

  useEffect(() => {
    mountedRef.current = true;
    let removeListeners: (() => void) | null = null;

    const boot = async () => {
      // 1. Offline-first: trust the cache until the store answers.
      const cached = await readCachedEntitlement();
      if (mountedRef.current && isCachedEntitlementStillValid(cached)) {
        setEntitlement(cached);
      }

      if (!isIapPlatformSupported) {
        if (mountedRef.current) setStoreStatus('unavailable');
        return;
      }

      if (mountedRef.current) setStoreStatus('connecting');

      // 2. Listeners first, so a queued transaction from a previous launch is
      //    picked up as soon as the connection opens.
      removeListeners = await addPurchaseListeners({
        onPurchase: (purchase) => void handlePurchase(purchase),
        onError: (error) => void handlePurchaseError(error),
      });

      try {
        const connected = await connectStore();
        if (!mountedRef.current) return;
        if (!connected) {
          setStoreStatus('unavailable');
          return;
        }
        setStoreStatus('ready');
      } catch (error) {
        if (!mountedRef.current) return;
        setStoreStatus(isConnectivityProblem(error) ? 'offline' : 'unavailable');
        return;
      }

      // 3. Prices and entitlement in parallel — neither blocks the other.
      await Promise.all([
        fetchStorePrices()
          .then((loaded) => {
            if (!mountedRef.current) return;
            setPrices(loaded);
            setPricesLoaded(Object.keys(loaded).length > 0);
          })
          .catch((error: unknown) => {
            console.warn('[premium] Could not load store prices.', error);
            if (mountedRef.current && isConnectivityProblem(error)) setStoreStatus('offline');
          }),
        refreshEntitlement().catch((error: unknown) => {
          console.warn('[premium] Could not read entitlements.', error);
          if (mountedRef.current && isConnectivityProblem(error)) setStoreStatus('offline');
        }),
      ]);
    };

    void boot();

    return () => {
      mountedRef.current = false;
      clearPurchaseTimer();
      removeListeners?.();
      void disconnectStore();
    };
    // Handlers are stable useCallbacks; the store connection is opened once.
  }, [clearPurchaseTimer, handlePurchase, handlePurchaseError, refreshEntitlement]);

  /** A subscription can lapse or renew while the app sits in the background. */
  useEffect(() => {
    if (!isIapPlatformSupported) return;
    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state !== 'active') return;
      if (activityRef.current.type !== 'none') return;
      void refreshEntitlement().catch(() => undefined);
    });
    return () => subscription.remove();
  }, [refreshEntitlement]);

  /* ── Actions ───────────────────────────────────────────────────────────── */

  const purchasePlan = useCallback(
    async (planId: PremiumPlanId) => {
      if (activityRef.current.type !== 'none') return;
      const plan = getPlan(planId);
      setFeedback(null);

      if (!isIapPlatformSupported) {
        setFeedback({
          tone: 'error',
          title: 'Purchases are not available here',
          message: 'Open Cozy Masjid on your iPhone or iPad to unlock Premium.',
        });
        return;
      }

      // Owning lifetime already covers everything.
      if (entitlementRef.current.isLifetime) {
        setFeedback({
          tone: 'info',
          title: 'You already have Lifetime',
          message: 'Every premium room is already unlocked on this Apple Account.',
        });
        return;
      }

      if (entitlementRef.current.isPremium && entitlementRef.current.planId === planId) {
        setFeedback({
          tone: 'info',
          title: 'This plan is already active',
          message: 'Manage or change it any time in your Apple Account settings.',
          planId,
        });
        return;
      }

      safeSetActivity({ type: 'purchasing', planId });

      // Reconnect quietly if the store dropped while the app was idle.
      if (storeStatus !== 'ready') {
        try {
          const connected = await connectStore();
          if (!connected) throw new Error('store-unavailable');
          if (mountedRef.current) setStoreStatus('ready');
        } catch (error) {
          safeSetActivity({ type: 'none' });
          if (mountedRef.current) setStoreStatus(isConnectivityProblem(error) ? 'offline' : 'unavailable');
          setFeedback({
            tone: 'error',
            title: 'No connection to the App Store',
            message: 'Check your internet connection and try again.',
          });
          return;
        }
      }

      clearPurchaseTimer();
      purchaseTimerRef.current = setTimeout(() => {
        if (!mountedRef.current) return;
        if (activityRef.current.type !== 'purchasing') return;
        safeSetActivity({ type: 'none' });
        setFeedback({
          tone: 'info',
          title: 'Still processing',
          message:
            'The App Store is taking longer than usual. Premium unlocks automatically once the purchase completes.',
        });
      }, PURCHASE_TIMEOUT_MS);

      try {
        await requestPlanPurchase(plan);
        // Success and failure both arrive through the listeners.
      } catch (error) {
        await handlePurchaseError(error);
      }
    },
    [clearPurchaseTimer, handlePurchaseError, safeSetActivity, storeStatus],
  );

  const restorePurchases = useCallback(async () => {
    if (activityRef.current.type !== 'none') return;
    setFeedback(null);

    if (!isIapPlatformSupported) {
      setFeedback({
        tone: 'error',
        title: 'Nothing to restore here',
        message: 'Open Cozy Masjid on your iPhone or iPad to restore a purchase.',
      });
      return;
    }

    safeSetActivity({ type: 'restoring' });
    try {
      if (storeStatus !== 'ready') {
        const connected = await connectStore();
        if (!connected) throw new Error('store-unavailable');
        if (mountedRef.current) setStoreStatus('ready');
      }

      const restored = await restoreEntitlement();
      commitEntitlement(restored);
      safeSetActivity({ type: 'none' });

      if (restored.isPremium) {
        const plan = restored.planId ? getPlan(restored.planId) : null;
        setFeedback({
          tone: 'success',
          title: 'Premium restored',
          message: plan
            ? `Your ${plan.title.toLowerCase()} access is active again.`
            : 'Your premium access is active again.',
        });
      } else {
        setFeedback({
          tone: 'info',
          title: 'Nothing to restore',
          message:
            'This Apple Account has no Cozy Masjid purchases. Make sure you are signed in with the account you bought with.',
        });
      }
    } catch (error) {
      safeSetActivity({ type: 'none' });
      if (mountedRef.current && isConnectivityProblem(error)) setStoreStatus('offline');
      setFeedback({ tone: 'error', ...describeStoreError(error) });
    }
  }, [commitEntitlement, safeSetActivity, storeStatus]);

  const refresh = useCallback(async () => {
    if (!isIapPlatformSupported) return;
    try {
      if (storeStatus !== 'ready') {
        const connected = await connectStore();
        if (!connected) {
          if (mountedRef.current) setStoreStatus('unavailable');
          return;
        }
        if (mountedRef.current) setStoreStatus('ready');
      }
      const loaded = await fetchStorePrices();
      if (mountedRef.current && Object.keys(loaded).length > 0) {
        setPrices(loaded);
        setPricesLoaded(true);
      }
      await refreshEntitlement();
    } catch (error) {
      if (mountedRef.current && isConnectivityProblem(error)) setStoreStatus('offline');
    }
  }, [refreshEntitlement, storeStatus]);

  const manageSubscription = useCallback(async () => {
    const productId = entitlementRef.current.productId ?? undefined;
    const opened = await openManageSubscriptions(productId);
    if (!opened) {
      setFeedback({
        tone: 'error',
        title: 'Could not open subscriptions',
        message: 'Manage your plan in Settings › your name › Subscriptions.',
      });
    }
  }, []);

  const priceFor = useCallback(
    (planId: PremiumPlanId) => {
      const plan = getPlan(planId);
      return prices[plan.productId] ?? plan.fallbackPrice;
    },
    [prices],
  );

  const value = useMemo<PremiumContextValue>(() => {
    const activePlan = entitlement.planId ? getPlan(entitlement.planId) : null;
    return {
      isPremium: entitlement.isPremium,
      entitlement,
      activePlan,
      loading: activity.type !== 'none' || storeStatus === 'connecting',
      activity,
      storeStatus,
      plans: premiumPlans,
      priceFor,
      pricesLoaded,
      feedback,
      clearFeedback: () => setFeedback(null),
      purchaseWeekly: () => purchasePlan('weekly'),
      purchaseMonthly: () => purchasePlan('monthly'),
      purchaseLifetime: () => purchasePlan('lifetime'),
      purchasePlan,
      restorePurchases,
      refresh,
      manageSubscription,
    };
  }, [
    activity,
    entitlement,
    feedback,
    manageSubscription,
    priceFor,
    pricesLoaded,
    purchasePlan,
    refresh,
    restorePurchases,
    storeStatus,
  ]);

  return <PremiumContext.Provider value={value}>{children}</PremiumContext.Provider>;
}

export function usePremium(): PremiumContextValue {
  const value = useContext(PremiumContext);
  if (!value) {
    throw new Error('usePremium must be used inside <PremiumProvider>.');
  }
  return value;
}

/** Convenience selector for gating a single piece of content. */
export function useIsPremium() {
  return usePremium().isPremium;
}
