import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useReducedMotionPreference } from '../../hooks/useReducedMotionPreference';
import { palette } from '../../theme/palette';
import { PrimaryButton } from '../ui/PrimaryButton';
import { MihrabCrest } from './MihrabCrest';

export function PurchaseSuccessView({
  title,
  message,
  onDone,
}: {
  title: string;
  message: string;
  onDone: () => void;
}) {
  const reduceMotion = useReducedMotionPreference();

  return (
    <Animated.View
      entering={reduceMotion ? undefined : FadeIn.duration(240)}
      style={styles.root}
    >
      <MihrabCrest isPremium />
      <Animated.View
        entering={reduceMotion ? undefined : FadeInDown.duration(280).delay(80)}
        style={styles.copy}
      >
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
      </Animated.View>
      <View style={styles.action}>
        <PrimaryButton label="Back to my room" onPress={onDone} tone="ink" />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
  },
  copy: {
    alignItems: 'center',
    marginTop: 14,
    paddingHorizontal: 6,
  },
  title: {
    color: palette.ink,
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 22,
    textAlign: 'center',
  },
  message: {
    marginTop: 6,
    color: palette.inkMuted,
    fontFamily: 'Nunito_700Bold',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  action: {
    width: '100%',
    marginTop: 24,
  },
});
