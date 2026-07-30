import { Check } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { emitInteractionFeedback } from '../../feedback/interactionFeedbackEvents';
import { useReducedMotionPreference } from '../../hooks/useReducedMotionPreference';
import { palette } from '../../theme/palette';
import { cardShadow, premiumTheme } from '../../theme/premiumTheme';
import type { PremiumPlan } from '../../premium/types';

type PlanCardProps = {
  plan: PremiumPlan;
  price: string;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
  /** Extra honesty line, e.g. how weekly compares to monthly. */
  note?: string;
  /** The plan this person is already on. */
  isCurrent?: boolean;
  index?: number;
};

export function PlanCard({
  plan,
  price,
  selected,
  onSelect,
  disabled = false,
  note,
  isCurrent = false,
  index = 0,
}: PlanCardProps) {
  const reduceMotion = useReducedMotionPreference();

  return (
    <Animated.View
      entering={reduceMotion ? undefined : FadeInDown.duration(280).delay(140 + index * 70)}
      style={styles.wrapper}
    >
      <Pressable
        accessibilityHint={`${price} ${plan.periodLabel}. ${plan.renewalNote}`}
        accessibilityLabel={`${plan.title} plan${plan.badge ? `, ${plan.badge}` : ''}`}
        accessibilityRole="radio"
        accessibilityState={{ checked: selected, disabled }}
        aria-checked={selected}
        disabled={disabled}
        onPress={() => {
          if (selected) {
            emitInteractionFeedback('selection', { haptic: false });
            return;
          }
          emitInteractionFeedback('selection');
          onSelect();
        }}
        style={({ pressed }) => [
          styles.card,
          selected && styles.cardSelected,
          pressed && styles.pressed,
          disabled && styles.disabled,
        ]}
      >
        <View style={[styles.radio, selected && styles.radioSelected]}>
          {selected ? <Check color={palette.paper} size={13} strokeWidth={3.2} /> : null}
        </View>

        <View style={styles.copy}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{plan.title}</Text>
            {isCurrent ? (
              <View style={styles.currentPill}>
                <Text style={styles.currentLabel}>Current</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.tagline}>{plan.tagline}</Text>
          {note ? <Text style={styles.note}>{note}</Text> : null}
        </View>

        <View style={styles.priceBlock}>
          <Text style={styles.price}>{price}</Text>
          <Text style={styles.period}>{plan.periodLabel}</Text>
        </View>
      </Pressable>

      {plan.badge ? (
        <View pointerEvents="none" style={styles.badge}>
          <Text style={styles.badgeLabel}>{plan.badge}</Text>
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  card: {
    width: '100%',
    minHeight: 74,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: premiumTheme.hairline,
    backgroundColor: premiumTheme.card,
  },
  cardSelected: {
    borderColor: premiumTheme.goldEdge,
    backgroundColor: premiumTheme.cardSelected,
    ...cardShadow,
  },
  pressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.94,
  },
  disabled: {
    opacity: 0.45,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.8,
    borderColor: premiumTheme.hairlineStrong,
    backgroundColor: 'transparent',
  },
  radioSelected: {
    borderColor: palette.gold,
    backgroundColor: palette.gold,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    color: palette.ink,
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 16,
  },
  currentPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 9,
    backgroundColor: premiumTheme.successSoft,
  },
  currentLabel: {
    color: premiumTheme.success,
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 9,
  },
  tagline: {
    marginTop: 1,
    color: palette.inkMuted,
    fontFamily: 'Nunito_700Bold',
    fontSize: 11,
  },
  note: {
    marginTop: 4,
    color: palette.terracottaDeep,
    fontFamily: 'Nunito_700Bold',
    fontSize: 10,
    lineHeight: 13,
  },
  priceBlock: {
    alignItems: 'flex-end',
  },
  price: {
    color: palette.ink,
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 17,
  },
  period: {
    marginTop: 1,
    color: palette.inkMuted,
    fontFamily: 'Nunito_700Bold',
    fontSize: 10,
  },
  badge: {
    position: 'absolute',
    top: -9,
    right: 16,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: palette.gold,
  },
  badgeLabel: {
    color: palette.paper,
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 9.5,
    letterSpacing: 0.3,
  },
});
