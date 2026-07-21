import * as Haptics from 'expo-haptics';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useMemo } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { BUILDING_OPTIONS, type BuildingId } from '../../domain/buildings';
import { useRoomStore } from '../../store/roomStore';
import { palette } from '../../theme/palette';

type BuildingSwitcherProps = {
  disabled?: boolean;
  onBeforeChange?: () => void;
};

const SWIPE_DISTANCE = 44;
const FLING_DISTANCE = 24;
const FLING_VELOCITY = 500;

export function BuildingSwitcher({ disabled = false, onBeforeChange }: BuildingSwitcherProps) {
  const activeBuildingId = useRoomStore((state) => state.activeBuildingId);
  const setActiveBuildingId = useRoomStore((state) => state.setActiveBuildingId);
  const activeIndex = Math.max(
    0,
    BUILDING_OPTIONS.findIndex((building) => building.id === activeBuildingId),
  );

  const changeBuilding = (buildingId: BuildingId) => {
    if (disabled || buildingId === activeBuildingId) return;
    const nextIndex = BUILDING_OPTIONS.findIndex((building) => building.id === buildingId);
    if (nextIndex < 0) return;
    onBeforeChange?.();
    setActiveBuildingId(buildingId);
    void Haptics.selectionAsync();
    const building = BUILDING_OPTIONS[nextIndex];
    void AccessibilityInfo.announceForAccessibility(
      `${building.name}, building ${nextIndex + 1} of ${BUILDING_OPTIONS.length}`,
    );
  };

  const moveBy = (offset: number) => {
    const nextIndex = Math.min(BUILDING_OPTIONS.length - 1, Math.max(0, activeIndex + offset));
    const nextBuilding = BUILDING_OPTIONS[nextIndex];
    if (nextBuilding) changeBuilding(nextBuilding.id);
  };

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .minPointers(1)
        .maxPointers(1)
        .activeOffsetX([-12, 12])
        .failOffsetY([-16, 16])
        .runOnJS(true)
        .onEnd((event) => {
          if (disabled) return;
          const horizontal = Math.abs(event.translationX);
          const vertical = Math.abs(event.translationY);
          const isDistanceSwipe = horizontal >= SWIPE_DISTANCE && horizontal >= vertical * 1.4;
          const isFling =
            horizontal >= FLING_DISTANCE &&
            Math.abs(event.velocityX) >= FLING_VELOCITY &&
            horizontal >= vertical * 1.2;
          if (!isDistanceSwipe && !isFling) return;
          moveBy(event.translationX < 0 ? 1 : -1);
        }),
    [activeBuildingId, disabled, onBeforeChange],
  );

  const cuePointsLeft = activeIndex === 0;
  const hint = cuePointsLeft
    ? 'Swipe left for the next building'
    : 'Swipe right for the previous building';

  const dots = (
    <View accessibilityRole="radiogroup" style={styles.dotCapsule}>
      {BUILDING_OPTIONS.map((building, index) => {
        const active = index === activeIndex;
        return (
          <Pressable
            key={building.id}
            accessibilityHint={`Shows ${building.name}`}
            accessibilityLabel={`Building ${index + 1}: ${building.name}`}
            accessibilityRole="radio"
            accessibilityState={{ checked: active, disabled }}
            aria-checked={active}
            disabled={disabled}
            hitSlop={4}
            onPress={() => changeBuilding(building.id)}
            style={({ pressed }) => [styles.dotTarget, pressed && styles.pressed]}
          >
            <View style={[styles.dot, active && styles.dotActive]} />
          </Pressable>
        );
      })}
    </View>
  );

  const cue = (
    <Pressable
      accessibilityHint={hint}
      accessibilityLabel={hint}
      accessibilityRole="button"
      disabled={disabled}
      onPress={() => moveBy(cuePointsLeft ? 1 : -1)}
      style={({ pressed }) => [styles.cue, pressed && styles.pressed]}
    >
      {cuePointsLeft ? (
        <ChevronLeft color={palette.ink} size={17} strokeWidth={2.6} />
      ) : (
        <ChevronRight color={palette.ink} size={17} strokeWidth={2.6} />
      )}
    </Pressable>
  );

  return (
    <GestureDetector gesture={gesture}>
      <View
        accessible
        accessibilityActions={[
          { name: 'increment', label: 'Next building' },
          { name: 'decrement', label: 'Previous building' },
        ]}
        accessibilityHint="Swipe left or right, or tap a dot, to change building"
        accessibilityLabel={`Building ${activeIndex + 1} of ${BUILDING_OPTIONS.length}, ${BUILDING_OPTIONS[activeIndex]?.name}`}
        accessibilityRole="adjustable"
        accessibilityState={{ disabled }}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === 'increment') moveBy(1);
          if (event.nativeEvent.actionName === 'decrement') moveBy(-1);
        }}
        style={[styles.root, disabled && styles.disabled]}
      >
        {cuePointsLeft ? cue : dots}
        {cuePointsLeft ? dots : cue}
      </View>
    </GestureDetector>
  );
}

const shadow = {
  shadowColor: palette.ink,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.13,
  shadowRadius: 9,
  elevation: 4,
} as const;

const styles = StyleSheet.create({
  root: {
    minWidth: 132,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  dotCapsule: {
    height: 28,
    paddingHorizontal: 7,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(246, 244, 239, 0.94)',
    ...shadow,
  },
  dotTarget: {
    width: 27,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(78, 59, 49, 0.28)',
  },
  dotActive: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: palette.ink,
  },
  cue: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(246, 244, 239, 0.94)',
    ...shadow,
  },
  pressed: {
    transform: [{ scale: 0.92 }],
    opacity: 0.86,
  },
  disabled: {
    opacity: 0.38,
  },
});
