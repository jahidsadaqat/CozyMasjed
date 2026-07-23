import { Building2, ChevronLeft, ChevronRight, House } from 'lucide-react-native';
import { AccessibilityInfo, Pressable, StyleSheet, View } from 'react-native';
import { BUILDING_OPTIONS, type BuildingId } from '../../domain/buildings';
import { emitInteractionFeedback } from '../../feedback/interactionFeedbackEvents';
import { useRoomStore } from '../../store/roomStore';
import { palette } from '../../theme/palette';

type BuildingSwitcherProps = {
  disabled?: boolean;
  onBeforeChange?: () => void;
};

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
    emitInteractionFeedback('buildingSwitch');
    setActiveBuildingId(buildingId);
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

  const hasPrevious = activeIndex > 0;
  const hasNext = activeIndex < BUILDING_OPTIONS.length - 1;

  return (
    <View
      accessibilityLabel={`Choose a building. ${BUILDING_OPTIONS[activeIndex]?.name} is selected.`}
      accessibilityRole="radiogroup"
      style={[styles.root, disabled && styles.disabled]}
    >
      <Pressable
        accessibilityLabel="Previous building"
        accessibilityRole="button"
        accessibilityState={{ disabled: disabled || !hasPrevious }}
        disabled={disabled || !hasPrevious}
        hitSlop={5}
        onPress={() => moveBy(-1)}
        style={({ pressed }) => [
          styles.arrowButton,
          !hasPrevious && styles.controlUnavailable,
          pressed && styles.pressed,
        ]}
      >
        <ChevronLeft color={palette.ink} size={19} strokeWidth={2.7} />
      </Pressable>

      <View style={styles.buildingChoices}>
        {BUILDING_OPTIONS.map((building, index) => {
          const active = index === activeIndex;
          const Icon = building.id === 'cozy-masjid' ? House : Building2;
          return (
            <Pressable
              key={building.id}
              accessibilityHint={`Opens ${building.name}`}
              accessibilityLabel={`Building ${index + 1}: ${building.name}`}
              accessibilityRole="radio"
              accessibilityState={{ checked: active, disabled }}
              aria-checked={active}
              disabled={disabled}
              hitSlop={4}
              onPress={() => changeBuilding(building.id)}
              style={({ pressed }) => [
                styles.buildingButton,
                active && styles.buildingButtonActive,
                pressed && styles.pressed,
              ]}
            >
              <Icon
                color={active ? palette.cream : palette.inkMuted}
                size={active ? 21 : 19}
                strokeWidth={active ? 2.5 : 2.2}
              />
              <View style={[styles.indexDot, active && styles.indexDotActive]} />
            </Pressable>
          );
        })}
      </View>

      <Pressable
        accessibilityLabel="Next building"
        accessibilityRole="button"
        accessibilityState={{ disabled: disabled || !hasNext }}
        disabled={disabled || !hasNext}
        hitSlop={5}
        onPress={() => moveBy(1)}
        style={({ pressed }) => [
          styles.arrowButton,
          !hasNext && styles.controlUnavailable,
          pressed && styles.pressed,
        ]}
      >
        <ChevronRight color={palette.ink} size={19} strokeWidth={2.7} />
      </Pressable>
    </View>
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
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buildingChoices: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  buildingButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(246, 244, 239, 0.94)',
    borderWidth: 1.5,
    borderColor: 'rgba(78, 59, 49, 0.12)',
    ...shadow,
  },
  buildingButtonActive: {
    backgroundColor: palette.ink,
    borderColor: palette.ink,
    transform: [{ scale: 1.06 }],
  },
  indexDot: {
    position: 'absolute',
    bottom: 5,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(78, 59, 49, 0.28)',
  },
  indexDotActive: {
    backgroundColor: palette.gold,
  },
  arrowButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(246, 244, 239, 0.94)',
    ...shadow,
  },
  controlUnavailable: {
    opacity: 0.34,
  },
  pressed: {
    transform: [{ scale: 0.92 }],
    opacity: 0.86,
  },
  disabled: {
    opacity: 0.38,
  },
});
