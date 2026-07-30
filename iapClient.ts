import { X } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut, FadeOutDown } from 'react-native-reanimated';
import { useReducedMotionPreference } from '../../hooks/useReducedMotionPreference';
import { emitInteractionFeedback } from '../../feedback/interactionFeedbackEvents';
import { palette } from '../../theme/palette';
import { premiumShadow, premiumTheme } from '../../theme/premiumTheme';

type SheetScaffoldProps = {
  accessibilityLabel: string;
  onClose: () => void;
  children: ReactNode;
  /** Set false for short sheets that should not scroll. */
  scrollable?: boolean;
};

/**
 * The shared shell for full-screen sheets: dimmed backdrop, rounded card,
 * close button. Rendered in-tree rather than in a native Modal, matching the
 * rest of the app so nothing ever stacks on top of the GL canvas.
 */
export function SheetScaffold({
  accessibilityLabel,
  onClose,
  children,
  scrollable = true,
}: SheetScaffoldProps) {
  const reduceMotion = useReducedMotionPreference();

  const dismiss = () => {
    emitInteractionFeedback('ui');
    onClose();
  };

  const body = scrollable ? (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      style={styles.scroll}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={styles.scrollContent}>{children}</View>
  );

  return (
    <Animated.View
      accessibilityViewIsModal
      entering={reduceMotion ? undefined : FadeIn.duration(200)}
      exiting={reduceMotion ? undefined : FadeOut.duration(160)}
      style={styles.scrim}
    >
      <Pressable
        accessibilityLabel="Close"
        accessibilityRole="button"
        onPress={dismiss}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View
        accessibilityLabel={accessibilityLabel}
        entering={reduceMotion ? undefined : FadeInDown.duration(300)}
        exiting={reduceMotion ? undefined : FadeOutDown.duration(200)}
        style={styles.card}
      >
        {body}

        <Pressable
          accessibilityHint="Closes this screen"
          accessibilityLabel="Close"
          accessibilityRole="button"
          hitSlop={8}
          onPress={dismiss}
          style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
        >
          <X color={palette.ink} size={19} strokeWidth={2.6} />
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    position: 'absolute',
    zIndex: 30,
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 44,
    backgroundColor: premiumTheme.scrim,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '100%',
    borderRadius: 32,
    overflow: 'hidden',
    backgroundColor: premiumTheme.sheet,
    borderWidth: 1,
    borderColor: premiumTheme.hairline,
    ...premiumShadow,
  },
  scroll: {
    width: '100%',
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 24,
  },
  closeButton: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(232, 224, 211, 0.9)',
  },
  pressed: {
    transform: [{ scale: 0.93 }],
    opacity: 0.85,
  },
});
