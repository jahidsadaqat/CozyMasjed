import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { emitInteractionFeedback } from '../../feedback/interactionFeedbackEvents';
import { palette } from '../../theme/palette';

type GhostButtonProps = {
  label: string;
  onPress: () => void;
  icon?: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  accessibilityHint?: string;
};

/** Quiet secondary action — Restore Purchases, Maybe later. */
export function GhostButton({
  label,
  onPress,
  icon,
  loading = false,
  disabled = false,
  accessibilityHint,
}: GhostButtonProps) {
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      hitSlop={6}
      onPress={() => {
        emitInteractionFeedback('ui');
        onPress();
      }}
      style={({ pressed }) => [styles.root, pressed && styles.pressed, inactive && styles.disabled]}
    >
      {loading ? (
        <ActivityIndicator color={palette.inkMuted} size="small" />
      ) : (
        <View style={styles.content}>
          {icon ? <View>{icon}</View> : null}
          <Text style={styles.label}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  label: {
    color: palette.inkMuted,
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 13,
  },
  pressed: {
    opacity: 0.6,
  },
  disabled: {
    opacity: 0.5,
  },
});
