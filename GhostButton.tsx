import { ChevronRight } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { emitInteractionFeedback } from '../../feedback/interactionFeedbackEvents';
import { palette } from '../../theme/palette';
import { premiumTheme } from '../../theme/premiumTheme';

type SettingsRowProps = {
  icon: ReactNode;
  label: string;
  /** Right-hand detail, e.g. the plan name or app version. */
  value?: string;
  hint?: string;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  accessibilityHint?: string;
  /** Highlights the row, used for the premium entry point. */
  emphasis?: boolean;
};

export function SettingsRow({
  icon,
  label,
  value,
  hint,
  onPress,
  loading = false,
  disabled = false,
  accessibilityHint,
  emphasis = false,
}: SettingsRowProps) {
  const interactive = Boolean(onPress) && !disabled && !loading;

  const content = (
    <>
      <View style={[styles.icon, emphasis && styles.iconEmphasis]}>{icon}</View>
      <View style={styles.copy}>
        <Text style={[styles.label, emphasis && styles.labelEmphasis]}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      {loading ? <ActivityIndicator color={palette.inkMuted} size="small" /> : null}
      {!loading && value ? <Text style={styles.value}>{value}</Text> : null}
      {!loading && interactive ? (
        <ChevronRight color={palette.inkMuted} size={17} strokeWidth={2.4} />
      ) : null}
    </>
  );

  if (!onPress) {
    return (
      <View accessible accessibilityLabel={`${label}${value ? `, ${value}` : ''}`} style={styles.row}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled: !interactive, busy: loading }}
      disabled={!interactive}
      onPress={() => {
        emitInteractionFeedback('ui');
        onPress();
      }}
      style={({ pressed }) => [
        styles.row,
        emphasis && styles.rowEmphasis,
        pressed && styles.pressed,
        !interactive && styles.disabled,
      ]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 20,
    backgroundColor: premiumTheme.card,
    borderWidth: 1,
    borderColor: premiumTheme.hairline,
  },
  rowEmphasis: {
    borderColor: premiumTheme.goldEdge,
    backgroundColor: premiumTheme.cardSelected,
  },
  pressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.92,
  },
  disabled: {
    opacity: 0.55,
  },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EBDFCF',
  },
  iconEmphasis: {
    backgroundColor: premiumTheme.goldSoft,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    color: palette.ink,
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 14,
  },
  labelEmphasis: {
    fontSize: 15,
  },
  hint: {
    marginTop: 1,
    color: palette.inkMuted,
    fontFamily: 'Nunito_700Bold',
    fontSize: 11,
    lineHeight: 15,
  },
  value: {
    color: palette.inkMuted,
    fontFamily: 'Nunito_700Bold',
    fontSize: 12,
  },
});
