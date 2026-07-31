import Constants from 'expo-constants';
import { Crown, FileText, Globe2, Info, Mail, RefreshCw, ShieldCheck } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { appLinks } from '../../config/appLinks';
import { describeRenewal } from '../../premium/entitlement';
import { usePremium } from '../../premium/PremiumProvider';
import { openExternalUrl } from '../../services/openExternalUrl';
import { useOverlayStore } from '../../store/overlayStore';
import { palette } from '../../theme/palette';
import { premiumTheme } from '../../theme/premiumTheme';
import { InlineNotice } from '../ui/InlineNotice';
import { SheetScaffold } from '../ui/SheetScaffold';
import { SettingsRow } from './SettingsRow';

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';
const BUILD_NUMBER =
  Constants.expoConfig?.ios?.buildNumber ??
  String(Constants.expoConfig?.android?.versionCode ?? '1');

export function SettingsSheet() {
  const closeSheet = useOverlayStore((state) => state.closeSheet);
  const openPaywall = useOverlayStore((state) => state.openPaywall);

  const {
    activity,
    activePlan,
    clearFeedback,
    entitlement,
    feedback,
    isPremium,
    manageSubscription,
    restorePurchases,
  } = usePremium();

  const restoring = activity.type === 'restoring';

  const dismiss = () => {
    clearFeedback();
    closeSheet();
  };

  const premiumHint = isPremium
    ? [activePlan?.title, describeRenewal(entitlement)].filter(Boolean).join(' · ')
    : 'Unlock every masjid and support the app';

  return (
    <SheetScaffold accessibilityLabel="Settings" onClose={dismiss}>
      <Text style={styles.title}>Settings</Text>

      <Text style={styles.sectionLabel}>Premium</Text>
      <View style={styles.section}>
        <SettingsRow
          accessibilityHint={
            isPremium ? 'Opens your subscription details' : 'Opens the Premium plans'
          }
          emphasis
          hint={premiumHint}
          icon={
            <Crown
              color={isPremium ? palette.gold : palette.terracottaDeep}
              fill={isPremium ? palette.gold : 'transparent'}
              size={18}
              strokeWidth={2.2}
            />
          }
          label={isPremium ? 'Your Premium' : 'Get Cozy Masjid Premium'}
          onPress={() => {
            clearFeedback();
            openPaywall('settings');
          }}
        />

        {isPremium && !entitlement.isLifetime ? (
          <SettingsRow
            accessibilityHint="Opens Apple subscription settings"
            hint="Change or cancel in your Apple Account"
            icon={<Crown color={palette.ink} size={18} strokeWidth={2.2} />}
            label="Manage subscription"
            onPress={() => void manageSubscription()}
          />
        ) : null}

        <SettingsRow
          accessibilityHint="Brings back a purchase made with this Apple Account"
          hint="Already bought Premium? Bring it back here."
          icon={<RefreshCw color={palette.ink} size={18} strokeWidth={2.2} />}
          label="Restore purchases"
          loading={restoring}
          onPress={() => void restorePurchases()}
        />
      </View>

      {feedback ? (
        <View style={styles.notice}>
          <InlineNotice message={feedback.message} title={feedback.title} tone={feedback.tone} />
        </View>
      ) : null}

      <Text style={styles.sectionLabel}>About</Text>
      <View style={styles.section}>
        <SettingsRow
          accessibilityHint="Opens the Cozy Masjid website in your browser"
          hint="App information and updates"
          icon={<Globe2 color={palette.ink} size={18} strokeWidth={2.2} />}
          label="Cozy Masjid website"
          onPress={() => void openExternalUrl(appLinks.marketing)}
        />
        <SettingsRow
          accessibilityHint="Opens the privacy policy in your browser"
          icon={<ShieldCheck color={palette.ink} size={18} strokeWidth={2.2} />}
          label="Privacy Policy"
          onPress={() => void openExternalUrl(appLinks.privacyPolicy)}
        />
        <SettingsRow
          accessibilityHint="Opens the terms of use in your browser"
          icon={<FileText color={palette.ink} size={18} strokeWidth={2.2} />}
          label="Terms of Use"
          onPress={() => void openExternalUrl(appLinks.termsOfUse)}
        />
        <SettingsRow
          accessibilityHint="Opens Cozy Masjid support in your browser"
          hint="Help and contact"
          icon={<Mail color={palette.ink} size={18} strokeWidth={2.2} />}
          label="Contact support"
          onPress={() => void openExternalUrl(appLinks.support)}
        />
        <SettingsRow
          icon={<Info color={palette.ink} size={18} strokeWidth={2.2} />}
          label="App version"
          value={`${APP_VERSION} (${BUILD_NUMBER})`}
        />
      </View>

      <Text style={styles.footer}>Made with care for quiet rooms.</Text>
    </SheetScaffold>
  );
}

const styles = StyleSheet.create({
  title: {
    color: palette.ink,
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 24,
    marginBottom: 4,
  },
  sectionLabel: {
    marginTop: 18,
    marginBottom: 8,
    marginLeft: 4,
    color: palette.inkMuted,
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  section: {
    gap: 8,
  },
  notice: {
    marginTop: 14,
  },
  footer: {
    marginTop: 22,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: premiumTheme.hairline,
    color: palette.inkMuted,
    fontFamily: 'Nunito_700Bold',
    fontSize: 11,
    textAlign: 'center',
    opacity: 0.8,
  },
});
