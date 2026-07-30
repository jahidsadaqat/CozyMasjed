import { Check, Info, TriangleAlert } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useReducedMotionPreference } from '../../hooks/useReducedMotionPreference';
import { palette } from '../../theme/palette';
import { premiumTheme } from '../../theme/premiumTheme';

export type NoticeTone = 'success' | 'error' | 'info';

type InlineNoticeProps = {
  tone: NoticeTone;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

const toneStyles: Record<NoticeTone, { background: string; accent: string }> = {
  success: { background: premiumTheme.successSoft, accent: premiumTheme.success },
  error: { background: premiumTheme.dangerSoft, accent: premiumTheme.danger },
  info: { background: premiumTheme.infoSoft, accent: palette.inkMuted },
};

/** Purchase result, offline warning, restore outcome — all live here. */
export function InlineNotice({ tone, title, message, actionLabel, onAction }: InlineNoticeProps) {
  const reduceMotion = useReducedMotionPreference();
  const { background, accent } = toneStyles[tone];

  const Glyph = tone === 'success' ? Check : tone === 'error' ? TriangleAlert : Info;

  return (
    <Animated.View
      accessibilityLiveRegion="polite"
      entering={reduceMotion ? undefined : FadeIn.duration(200)}
      exiting={reduceMotion ? undefined : FadeOut.duration(160)}
      style={[styles.root, { backgroundColor: background }]}
    >
      <View style={[styles.glyph, { backgroundColor: accent }]}>
        <Glyph color={palette.paper} size={13} strokeWidth={2.8} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
        {actionLabel && onAction ? (
          <Pressable
            accessibilityLabel={actionLabel}
            accessibilityRole="button"
            hitSlop={8}
            onPress={onAction}
            style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
          >
            <Text style={[styles.actionLabel, { color: accent }]}>{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
    padding: 13,
    borderRadius: 18,
  },
  glyph: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  copy: {
    flex: 1,
  },
  title: {
    color: palette.ink,
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 13,
  },
  message: {
    marginTop: 2,
    color: palette.inkMuted,
    fontFamily: 'Nunito_700Bold',
    fontSize: 12,
    lineHeight: 16,
  },
  action: {
    marginTop: 7,
    alignSelf: 'flex-start',
  },
  actionPressed: {
    opacity: 0.6,
  },
  actionLabel: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 12,
  },
});
