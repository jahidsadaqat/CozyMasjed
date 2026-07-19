import AsyncStorage from '@react-native-async-storage/async-storage';
import { Hand, Move, Palette as PaletteIcon, Plus, ZoomIn } from 'lucide-react-native';
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';
import { palette } from '../../theme/palette';

const TUTORIAL_KEY = 'deen-rooms:tutorial:v1';

function GuideRow({ icon, children }: { icon: ReactNode; children: string }) {
  return (
    <View style={styles.guideRow}>
      <View style={styles.guideIcon}>{icon}</View>
      <Text style={styles.guideText}>{children}</Text>
    </View>
  );
}

export function WelcomeGuide() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(TUTORIAL_KEY)
      .then((value) => {
        if (active && value !== 'seen') setVisible(true);
      })
      .catch(() => {
        if (active) setVisible(true);
      });
    return () => {
      active = false;
    };
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    setVisible(false);
    void AsyncStorage.setItem(TUTORIAL_KEY, 'seen');
  };

  return (
    <Animated.View entering={FadeIn.duration(220)} exiting={FadeOut.duration(180)} style={styles.scrim}>
      <Animated.View entering={FadeInDown.duration(320)} style={styles.card}>
        <View style={styles.badge}>
          <Hand color={palette.gold} size={27} strokeWidth={2.2} />
        </View>
        <Text style={styles.title}>Welcome to your room</Text>
        <Text style={styles.subtitle}>A small, peaceful space made by you</Text>

        <View style={styles.guideList}>
          <GuideRow icon={<Plus color={palette.ink} size={19} />}>Choose Add, then tap the floor or a wall</GuideRow>
          <GuideRow icon={<Move color={palette.ink} size={19} />}>Tap furniture to select it, then drag to move</GuideRow>
          <GuideRow icon={<ZoomIn color={palette.ink} size={19} />}>Pinch the room to zoom in and out</GuideRow>
          <GuideRow icon={<PaletteIcon color={palette.ink} size={19} />}>Use Style to change floors and walls</GuideRow>
        </View>

        <Pressable
          accessibilityLabel="Start decorating"
          accessibilityRole="button"
          onPress={dismiss}
          style={({ pressed }) => [styles.startButton, pressed && styles.startButtonPressed]}
        >
          <Text style={styles.startLabel}>Let&apos;s decorate</Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 26,
    backgroundColor: 'rgba(52, 42, 36, 0.28)',
  },
  card: {
    width: '100%',
    maxWidth: 366,
    alignItems: 'center',
    borderRadius: 30,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 22,
    backgroundColor: 'rgba(246, 244, 239, 0.985)',
    shadowColor: palette.ink,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 25,
    elevation: 12,
  },
  badge: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1E2C8',
  },
  title: {
    marginTop: 14,
    color: palette.ink,
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 22,
  },
  subtitle: {
    marginTop: 1,
    color: palette.inkMuted,
    fontFamily: 'Nunito_700Bold',
    fontSize: 12,
  },
  guideList: {
    width: '100%',
    marginTop: 20,
    gap: 11,
  },
  guideRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  guideIcon: {
    width: 34,
    height: 34,
    marginRight: 11,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EBDFCF',
  },
  guideText: {
    flex: 1,
    color: palette.ink,
    fontFamily: 'Nunito_700Bold',
    fontSize: 13,
    lineHeight: 17,
  },
  startButton: {
    minWidth: 190,
    height: 50,
    marginTop: 23,
    paddingHorizontal: 24,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.ink,
  },
  startButtonPressed: {
    transform: [{ scale: 0.97 }],
    backgroundColor: palette.terracottaDeep,
  },
  startLabel: {
    color: palette.cream,
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 16,
  },
});
