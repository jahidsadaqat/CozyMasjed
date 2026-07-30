import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { emitInteractionFeedback } from '../../feedback/interactionFeedbackEvents';
import { palette } from '../../theme/palette';
import { cardShadow, premiumGradients } from '../../theme/premiumTheme';

export type PrimaryButtonTone = 'ink' | 'gold' | 'lifetime';

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  tone?: PrimaryButtonTone;
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  accessibilityHint?: string;
};

const toneGradients: Record<PrimaryButtonTone, readonly [string, string]> = {
  ink: premiumGradients.cta,
  gold: premiumGradients.gold,
  lifetime: premiumGradients.lifetime,
};

const toneLabelColor: Record<PrimaryButtonTone, string> = {
  ink: palette.cream,
  gold: palette.ink,
  lifetime: palette.paper,
};

/** The one loud button on a sheet. Never a bare default button. */
export function PrimaryButton({
  label,
  onPress,
  tone = 'ink',
  disabled = false,
  loading = false,
  icon,
  accessibilityHint,
}: PrimaryButtonProps) {
  const inactive = disabled || loading;
  const labelColor = toneLabelColor[tone];

  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={() => {
        emitInteractionFeedback('ui');
        onPress();
      }}
      style={({ pressed }) => [
        styles.root,
        pressed && !inactive && styles.pressed,
        disabled && !loading && styles.disabled,
      ]}
    >
      <LinearGradient
        colors={toneGradients[tone]}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={styles.surface}
      >
        {loading ? (
          <ActivityIndicator color={labelColor} size="small" />
        ) : (
          <View style={styles.content}>
            {icon ? <View style={styles.icon}>{icon}</View> : null}
            <Text numberOfLines={1} style={[styles.label, { color: labelColor }]}>
              {label}
            </Text>
          </View>
        )}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
    borderRadius: 26,
    overflow: 'hidden',
    ...cardShadow,
  },
  surface: {
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  icon: {
    marginTop: -1,
  },
  label: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 16,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.94,
  },
  disabled: {
    opacity: 0.42,
  },
});
