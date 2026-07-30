import { Check } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useReducedMotionPreference } from '../../hooks/useReducedMotionPreference';
import { palette } from '../../theme/palette';

export const premiumBenefits: readonly string[] = [
  'Every premium masjid and prayer room',
  'New rooms and decor as they arrive',
  'Keep the app growing, with no ads — ever',
  'One purchase covers all your devices',
];

export function BenefitList({ items = premiumBenefits }: { items?: readonly string[] }) {
  const reduceMotion = useReducedMotionPreference();

  return (
    <View style={styles.root}>
      {items.map((item, index) => (
        <Animated.View
          key={item}
          entering={reduceMotion ? undefined : FadeInDown.duration(260).delay(90 + index * 55)}
          style={styles.row}
        >
          <View style={styles.check}>
            <Check color={palette.paper} size={12} strokeWidth={3.2} />
          </View>
          <Text style={styles.label}>{item}</Text>
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  check: {
    width: 21,
    height: 21,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.gold,
  },
  label: {
    flex: 1,
    color: palette.ink,
    fontFamily: 'Nunito_700Bold',
    fontSize: 13,
    lineHeight: 18,
  },
});
