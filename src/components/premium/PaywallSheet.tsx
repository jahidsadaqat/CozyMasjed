import { RefreshCw } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { appLinks } from '../../config/appLinks';
import { useReducedMotionPreference } from '../../hooks/useReducedMotionPreference';
import { describeRenewal } from '../../premium/entitlement';
import { usePremium } from '../../premium/PremiumProvider';
import { defaultSelectedPlanId } from '../../premium/products';
import type { PremiumPlanId } from '../../premium/types';
import { openExternalUrl } from '../../services/openExternalUrl';
import { useOverlayStore } from '../../store/overlayStore';
import { palette } from '../../theme/palette';
import { premiumTheme } from '../../theme/premiumTheme';
import { GhostButton } from '../ui/GhostButton';
import { InlineNotice } from '../ui/InlineNotice';
import { PrimaryButton } from '../ui/PrimaryButton';
import { SheetScaffold } from '../ui/SheetScaffold';
import { BenefitList } from './BenefitList';
import { PlanCard } from './PlanCard';
import { PurchaseSuccessView } from './PurchaseSuccessView';

/**
 * Honest comparison copy. Weekly still costs more per month than Monthly, and
 * hiding that is the kind of thing App Review reads as a dark pattern.
 */
const planNotes: Partial<Record<PremiumPlanId, string>> = {
  weekly: 'Three weeks of Weekly costs more than a whole month of Monthly.',
};

export function PaywallSheet() {
  const closeSheet = useOverlayStore((state) => state.closeSheet);
  const paywallSource = useOverlayStore((state) => state.paywallSource);
  const reduceMotion = useReducedMotionPreference();

  const {
    activity,
    entitlement,
    feedback,
    clearFeedback,
    isPremium,
    manageSubscription,
    plans,
    priceFor,
    pricesLoaded,
    purchasePlan,
    refresh,
    restorePurchases,
    storeStatus,
  } = usePremium();

  const [selectedPlanId, setSelectedPlanId] = useState<PremiumPlanId>(defaultSelectedPlanId);

  const purchasing = activity.type === 'purchasing';
  const restoring = activity.type === 'restoring';
  const busy = purchasing || restoring;
  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId) ?? plans[0];
  const isCurrentSelection = entitlement.planId === selectedPlan.id;
  const storeUnreachable = storeStatus === 'offline' || storeStatus === 'unavailable';

  const dismiss = () => {
    clearFeedback();
    closeSheet();
  };

  // A completed purchase takes over the whole sheet.
  if (feedback?.tone === 'success' && isPremium) {
    return (
      <SheetScaffold accessibilityLabel="Premium unlocked" onClose={dismiss} scrollable={false}>
        <PurchaseSuccessView
          message={feedback.message}
          onDone={dismiss}
          title={feedback.title}
        />
      </SheetScaffold>
    );
  }

  const headline = isPremium
    ? 'Your Premium is active'
    : paywallSource === 'locked-content'
      ? 'This room is part of Premium'
      : 'Cozy Masjid Premium';

  const subhead = isPremium
    ? describeRenewal(entitlement) ?? 'Active'
    : 'Open every masjid, every lantern, every quiet corner.';

  const ctaLabel = selectedPlan.kind === 'lifetime'
    ? 'Unlock lifetime access'
    : `Start ${selectedPlan.title.toLowerCase()} plan`;

  return (
    <SheetScaffold accessibilityLabel="Cozy Masjid Premium" onClose={dismiss}>
      <View style={styles.header}>
        <Image
          accessible={false}
          resizeMode="contain"
          source={require('../../../assets/premium/paywall-logo.png')}
          style={styles.logo}
        />
        <Animated.View
          entering={reduceMotion ? undefined : FadeInDown.duration(280).delay(60)}
          style={styles.headerCopy}
        >
          <Text style={styles.title}>{headline}</Text>
          <Text style={styles.subtitle}>{subhead}</Text>
        </Animated.View>
      </View>

      <View style={styles.benefits}>
        <BenefitList />
      </View>

      {storeUnreachable ? (
        <View style={styles.noticeSlot}>
          <InlineNotice
            actionLabel="Try again"
            message={
              storeStatus === 'offline'
                ? 'Prices and purchases need a connection. Anything you already bought stays unlocked.'
                : 'In-app purchases are not available on this device right now.'
            }
            onAction={() => void refresh()}
            title={storeStatus === 'offline' ? 'No connection to the App Store' : 'Store unavailable'}
            tone={storeStatus === 'offline' ? 'info' : 'error'}
          />
        </View>
      ) : null}

      {feedback && feedback.tone !== 'success' ? (
        <View style={styles.noticeSlot}>
          <InlineNotice message={feedback.message} title={feedback.title} tone={feedback.tone} />
        </View>
      ) : null}

      {entitlement.isLifetime ? (
        <View style={styles.lifetimePanel}>
          <Text style={styles.lifetimeTitle}>Lifetime access</Text>
          <Text style={styles.lifetimeBody}>
            You own Cozy Masjid Premium outright. There is nothing to renew and nothing to cancel.
          </Text>
        </View>
      ) : (
        <View
          accessibilityLabel="Choose a plan"
          accessibilityRole="radiogroup"
          style={styles.plans}
        >
          {plans.map((plan, index) => (
            <PlanCard
              key={plan.id}
              disabled={busy}
              index={index}
              isCurrent={entitlement.planId === plan.id}
              note={planNotes[plan.id]}
              onSelect={() => setSelectedPlanId(plan.id)}
              plan={plan}
              price={priceFor(plan.id)}
              selected={plan.id === selectedPlanId}
            />
          ))}
        </View>
      )}

      {!pricesLoaded && !storeUnreachable && !entitlement.isLifetime ? (
        <View style={styles.priceLoading}>
          <ActivityIndicator color={palette.inkMuted} size="small" />
          <Text style={styles.priceLoadingLabel}>Checking today&apos;s App Store prices…</Text>
        </View>
      ) : null}

      <View style={styles.cta}>
        {entitlement.isLifetime ? (
          <PrimaryButton label="Back to my room" onPress={dismiss} tone="ink" />
        ) : (
          <PrimaryButton
            accessibilityHint={
              isCurrentSelection
                ? 'This is the plan you are already on'
                : `${priceFor(selectedPlan.id)} ${selectedPlan.periodLabel}. ${selectedPlan.renewalNote}`
            }
            disabled={isCurrentSelection || storeUnreachable}
            label={isCurrentSelection ? 'This is your current plan' : ctaLabel}
            loading={purchasing}
            onPress={() => void purchasePlan(selectedPlan.id)}
            tone={selectedPlan.kind === 'lifetime' ? 'lifetime' : 'ink'}
          />
        )}

        {!entitlement.isLifetime ? (
          <Text style={styles.renewalNote}>{selectedPlan.renewalNote}</Text>
        ) : null}
      </View>

      <View style={styles.secondaryActions}>
        <GhostButton
          accessibilityHint="Brings back a purchase made with this Apple Account"
          icon={<RefreshCw color={palette.inkMuted} size={14} strokeWidth={2.6} />}
          label="Restore purchases"
          loading={restoring}
          onPress={() => void restorePurchases()}
        />
        {isPremium && !entitlement.isLifetime ? (
          <GhostButton label="Manage subscription" onPress={() => void manageSubscription()} />
        ) : null}
      </View>

      <View style={styles.legal}>
        <Text style={styles.legalBody}>
          Payment is charged to your Apple Account at confirmation. Subscriptions renew
          automatically unless auto-renew is turned off at least 24 hours before the end of the
          period. Manage or cancel in Settings › your name › Subscriptions. Lifetime is a one-time
          purchase and does not renew.
        </Text>
        <View style={styles.legalLinks}>
          <Pressable
            accessibilityLabel="Terms of Use"
            accessibilityRole="link"
            hitSlop={8}
            onPress={() => void openExternalUrl(appLinks.termsOfUse)}
          >
            <Text style={styles.legalLink}>Terms of Use</Text>
          </Pressable>
          <Text style={styles.legalDot}>·</Text>
          <Pressable
            accessibilityLabel="Privacy Policy"
            accessibilityRole="link"
            hitSlop={8}
            onPress={() => void openExternalUrl(appLinks.privacyPolicy)}
          >
            <Text style={styles.legalLink}>Privacy Policy</Text>
          </Pressable>
        </View>
      </View>
    </SheetScaffold>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    paddingTop: 4,
  },
  logo: {
    width: 118,
    height: 118,
  },
  headerCopy: {
    alignItems: 'center',
    marginTop: 10,
    paddingHorizontal: 10,
  },
  title: {
    color: palette.ink,
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 23,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 5,
    color: palette.inkMuted,
    fontFamily: 'Nunito_700Bold',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  benefits: {
    marginTop: 20,
  },
  noticeSlot: {
    marginTop: 16,
  },
  plans: {
    marginTop: 20,
    gap: 12,
  },
  lifetimePanel: {
    marginTop: 20,
    padding: 16,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: premiumTheme.goldEdge,
    backgroundColor: premiumTheme.cardSelected,
  },
  lifetimeTitle: {
    color: palette.ink,
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 15,
  },
  lifetimeBody: {
    marginTop: 4,
    color: palette.inkMuted,
    fontFamily: 'Nunito_700Bold',
    fontSize: 12,
    lineHeight: 17,
  },
  priceLoading: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  priceLoadingLabel: {
    color: palette.inkMuted,
    fontFamily: 'Nunito_700Bold',
    fontSize: 11,
  },
  cta: {
    marginTop: 20,
    alignItems: 'center',
  },
  renewalNote: {
    marginTop: 9,
    color: palette.inkMuted,
    fontFamily: 'Nunito_700Bold',
    fontSize: 11,
    textAlign: 'center',
  },
  secondaryActions: {
    marginTop: 6,
    alignItems: 'center',
  },
  legal: {
    marginTop: 10,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: premiumTheme.hairline,
  },
  legalBody: {
    color: palette.inkMuted,
    fontFamily: 'Nunito_700Bold',
    fontSize: 10,
    lineHeight: 14,
    opacity: 0.85,
    textAlign: 'center',
  },
  legalLinks: {
    marginTop: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  legalLink: {
    color: palette.terracottaDeep,
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 11,
  },
  legalDot: {
    color: palette.inkMuted,
    fontFamily: 'Nunito_700Bold',
    fontSize: 11,
  },
});
