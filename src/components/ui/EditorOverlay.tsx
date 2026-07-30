import {
  Armchair,
  BookOpen,
  Camera,
  ChevronLeft,
  Cloud,
  CloudRain,
  CopyPlus,
  Crown,
  Frame,
  Lamp,
  Landmark,
  Lock,
  Maximize2,
  Minimize2,
  MoonStar,
  Palette as PaletteIcon,
  Plus,
  RotateCcw,
  RotateCw,
  Settings,
  Sparkles,
  Sun,
  Trash2,
  Undo2,
  Redo2,
  Volume2,
  VolumeX,
  Wind,
  X,
} from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  AccessibilityInfo,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { catalog, catalogById } from '../../catalog/catalog';
import { catalogThumbnails } from '../../catalog/thumbnails';
import type { CatalogCategory, CatalogItem } from '../../catalog/types';
import { getAttachmentSlot } from '../../domain/attachments';
import { weatherModes, weatherVisualProfiles, type WeatherMode } from '../../domain/weather';
import {
  emitInteractionFeedback,
  type InteractionFeedbackEvent,
  type InteractionFeedbackOptions,
} from '../../feedback/interactionFeedbackEvents';
import { isContentLocked, isPremiumCatalogItem } from '../../premium/premiumContent';
import { usePremium } from '../../premium/PremiumProvider';
import { captureSaveAndShareRoom } from '../../services/roomSnapshot';
import { useOverlayStore } from '../../store/overlayStore';
import { useRoomStore } from '../../store/roomStore';
import { backgroundOptions, type BackgroundId } from '../../theme/backgrounds';
import { palette } from '../../theme/palette';
import {
  getSurfaceStyleOptions,
  ORIGINAL_SURFACE_TINT,
  type SurfaceStyleOption,
} from '../../theme/surfaceStyles';
import { BuildingSwitcher } from './BuildingSwitcher';

type OpenPanel = 'catalog' | 'style' | 'weather' | null;
type FilterCategory = CatalogCategory | 'All';
type StyleSection = 'background' | 'floor' | 'walls';

const catalogCategoryOrder: readonly CatalogCategory[] = [
  'Minbar',
  'Prayer Rugs',
  'Quran',
  'Tasbih',
  'Characters',
  'Pets',
  'Seating',
  'Tables',
  'Storage',
  'Plants',
  'Lights',
  'Serving',
  'Rugs',
  'Decor',
  'Wall',
  'Buildings',
];
const categories: readonly FilterCategory[] = [
  'All',
  ...catalogCategoryOrder.filter((category) => catalog.some((item) => item.category === category)),
];

function interleaveCatalogCategories(items: readonly CatalogItem[]) {
  const categoryBuckets = catalogCategoryOrder
    .map((category) => items.filter((item) => item.category === category))
    .filter((bucket) => bucket.length > 0);
  const showcase: CatalogItem[] = [];
  const includedIds = new Set<string>();
  const longestCategory = Math.max(...categoryBuckets.map((bucket) => bucket.length), 0);

  for (let itemIndex = 0; itemIndex < longestCategory; itemIndex += 1) {
    for (const bucket of categoryBuckets) {
      const item = bucket[itemIndex];
      if (!item) continue;
      showcase.push(item);
      includedIds.add(item.id);
    }
  }

  // Keep future categories visible even if they have not yet been added to
  // the preferred chip order.
  for (const item of items) {
    if (!includedIds.has(item.id)) showcase.push(item);
  }

  return showcase;
}

const allCategoryShowcase = interleaveCatalogCategories(catalog);

const styleSections: readonly { id: StyleSection; label: string }[] = [
  { id: 'background', label: 'Background' },
  { id: 'floor', label: 'Floor' },
  { id: 'walls', label: 'Walls' },
];
function WeatherGlyph({ weather, color, size = 20 }: { weather: WeatherMode; color: string; size?: number }) {
  if (weather === 'cloudy') return <Cloud color={color} size={size} />;
  if (weather === 'rainy') return <CloudRain color={color} size={size} />;
  if (weather === 'windy') return <Wind color={color} size={size} />;
  if (weather === 'night') return <MoonStar color={color} size={size} />;
  return <Sun color={color} size={size} />;
}

function tapFeedback(
  feedback: InteractionFeedbackEvent = 'ui',
  options?: InteractionFeedbackOptions,
) {
  emitInteractionFeedback(feedback, options);
}

function rejectedActionFeedback() {
  emitInteractionFeedback('ui', { haptic: false });
  emitInteractionFeedback('reject', { sound: false });
}

function RoundButton({
  label,
  icon,
  onPress,
  disabled = false,
  active = false,
  accessibilityHint,
  expanded,
  feedback = 'ui',
  triggerOnPressIn = false,
}: {
  label: string;
  icon: ReactNode;
  onPress: () => void;
  disabled?: boolean;
  active?: boolean;
  accessibilityHint?: string;
  expanded?: boolean;
  feedback?: InteractionFeedbackEvent | false;
  triggerOnPressIn?: boolean;
}) {
  const triggeredOnPressInRef = useRef(false);
  const runAction = () => {
    if (feedback) tapFeedback(feedback);
    onPress();
  };

  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled, expanded }}
      aria-expanded={expanded}
      disabled={disabled}
      onPress={() => {
        if (triggerOnPressIn && triggeredOnPressInRef.current) {
          triggeredOnPressInRef.current = false;
          return;
        }
        runAction();
      }}
      onPressIn={
        triggerOnPressIn
          ? () => {
              triggeredOnPressInRef.current = true;
              runAction();
            }
          : undefined
      }
      style={({ pressed }) => [
        styles.roundButton,
        active && styles.roundButtonActive,
        pressed && styles.buttonPressed,
        disabled && styles.disabled,
      ]}
    >
      {icon}
    </Pressable>
  );
}

function WeatherPopover({
  selected,
  soundOn,
  onSelect,
  onToggleSound,
}: {
  selected: WeatherMode;
  soundOn: boolean;
  onSelect: (weather: WeatherMode) => void;
  onToggleSound: () => void;
}) {
  return (
    <Animated.View entering={FadeInDown.duration(170)} exiting={FadeOutDown.duration(130)} style={styles.weatherPopover}>
      <View accessibilityLabel="Weather choices" accessibilityRole="radiogroup" style={styles.weatherOptions}>
        {weatherModes.map((weather) => {
          const active = weather === selected;
          const label = weatherVisualProfiles[weather].label;
          return (
            <Pressable
              key={weather}
              accessibilityHint="Changes the room atmosphere"
              accessibilityLabel={`${label} weather`}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              aria-checked={active}
              hitSlop={4}
              onPress={() => {
                if (active) {
                  tapFeedback('selection', { haptic: false });
                  return;
                }
                tapFeedback('selection');
                onSelect(weather);
                void AccessibilityInfo.announceForAccessibility(`${label} weather selected`);
              }}
              style={({ pressed }) => [
                styles.weatherOption,
                active && styles.weatherOptionActive,
                pressed && styles.buttonPressed,
              ]}
            >
              <WeatherGlyph color={active ? palette.cream : palette.ink} size={20} weather={weather} />
            </Pressable>
          );
        })}
      </View>
      <Pressable
        accessibilityHint="Toggles the weather ambience"
        accessibilityLabel={soundOn ? 'Turn weather ambience off' : 'Turn weather ambience on'}
        accessibilityRole="switch"
        accessibilityState={{ checked: soundOn }}
        aria-checked={soundOn}
        hitSlop={4}
        onPress={() => {
          tapFeedback();
          onToggleSound();
          void AccessibilityInfo.announceForAccessibility(
            soundOn ? 'Weather ambience off' : 'Weather ambience on',
          );
        }}
        style={({ pressed }) => [
          styles.weatherSoundButton,
          soundOn && styles.weatherSoundButtonActive,
          pressed && styles.buttonPressed,
        ]}
      >
        {soundOn ? (
          <Volume2 color={palette.cream} size={19} />
        ) : (
          <VolumeX color={palette.ink} size={19} />
        )}
      </Pressable>
    </Animated.View>
  );
}

function PillButton({
  label,
  icon,
  active = false,
  disabled = false,
  accessibilityHint,
  accessibilityLabel,
  expanded,
  onPress,
  feedback = 'ui',
}: {
  label: string;
  icon: ReactNode;
  active?: boolean;
  disabled?: boolean;
  accessibilityHint?: string;
  accessibilityLabel?: string;
  expanded?: boolean;
  onPress: () => void;
  feedback?: InteractionFeedbackEvent | false;
}) {
  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{ disabled, expanded }}
      aria-expanded={expanded}
      disabled={disabled}
      onPress={() => {
        if (feedback) tapFeedback(feedback);
        onPress();
      }}
      style={({ pressed }) => [
        styles.pillButton,
        active && styles.pillButtonActive,
        disabled && styles.disabled,
        pressed && styles.buttonPressed,
      ]}
    >
      {icon}
      <Text style={[styles.pillLabel, active && styles.pillLabelActive]}>{label}</Text>
    </Pressable>
  );
}

function CategoryGlyph({ item }: { item: CatalogItem }) {
  const glyphColor = '#FFF9EE';
  const common = { color: glyphColor, size: 31, strokeWidth: 1.9 };
  if (item.category === 'Quran') return <BookOpen {...common} />;
  if (item.category === 'Minbar') return <Landmark {...common} />;
  if (item.category === 'Lights') return <Lamp {...common} />;
  if (item.category === 'Seating') return <Armchair {...common} />;
  if (item.category === 'Wall') return <Frame {...common} />;
  if (item.category === 'Buildings') return <Landmark {...common} />;
  return <Sparkles {...common} />;
}

function CatalogTray({ onClose }: { onClose: () => void }) {
  const [category, setCategory] = useState<FilterCategory>('All');
  const startPlacing = useRoomStore((state) => state.startPlacing);
  const isPremium = usePremium().isPremium;
  const openPaywall = useOverlayStore((state) => state.openPaywall);
  const visibleItems = useMemo(
    () => (
      category === 'All'
        ? allCategoryShowcase
        : catalog.filter((item) => item.category === category)
    ),
    [category],
  );

  return (
    <Animated.View entering={FadeInDown.duration(190)} exiting={FadeOutDown.duration(140)} style={styles.catalogTray}>
      <ScrollView
        horizontal
        contentContainerStyle={styles.categoryRow}
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroller}
      >
        {categories.map((value) => {
          const active = value === category;
          return (
            <Pressable
              key={value}
              accessibilityLabel={`${value} category`}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              hitSlop={8}
              onPress={() => {
                if (active) {
                  tapFeedback('selection', { haptic: false });
                  return;
                }
                tapFeedback('selection');
                setCategory(value);
              }}
              style={[styles.categoryChip, active && styles.categoryChipActive]}
            >
              <Text style={[styles.categoryText, active && styles.categoryTextActive]}>{value}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <FlatList
        data={visibleItems}
        horizontal
        contentContainerStyle={styles.itemRow}
        initialNumToRender={6}
        keyExtractor={(item) => item.id}
        maxToRenderPerBatch={6}
        removeClippedSubviews
        renderItem={({ item }) => {
          const locked = isContentLocked(isPremiumCatalogItem(item.id), isPremium);

          return (
            <Pressable
              accessibilityHint={
                locked ? 'Opens the Premium plans' : 'Places this in your room'
              }
              accessibilityLabel={locked ? `${item.name}, Premium` : `Add ${item.name}`}
              accessibilityRole="button"
              onPress={() => {
                if (locked) {
                  tapFeedback('ui');
                  openPaywall('locked-content');
                  return;
                }
                tapFeedback('assetSelect');
                startPlacing(item.id);
                onClose();
                AccessibilityInfo.announceForAccessibility(`${item.name} ready to move. Tap or drag to place it.`);
              }}
              style={({ pressed }) => [styles.itemCard, pressed && styles.itemCardPressed]}
            >
              {catalogThumbnails[item.id] ? (
                <Image
                  resizeMode="contain"
                  source={catalogThumbnails[item.id]}
                  style={[styles.itemThumbnail, locked && styles.itemArtLocked]}
                />
              ) : (
                <View
                  style={[
                    styles.itemPlaceholder,
                    { backgroundColor: item.placeholderColor },
                    locked && styles.itemArtLocked,
                  ]}
                >
                  <CategoryGlyph item={item} />
                </View>
              )}
              <Text numberOfLines={2} style={[styles.itemName, locked && styles.itemNameLocked]}>
                {item.name}
              </Text>
              {locked ? (
                <View pointerEvents="none" style={styles.itemLockBadge}>
                  <Lock color={palette.paper} size={11} strokeWidth={2.9} />
                </View>
              ) : null}
            </Pressable>
          );
        }}
        showsHorizontalScrollIndicator={false}
        style={styles.itemScroller}
        windowSize={3}
      />
    </Animated.View>
  );
}

function ColorPicker({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: readonly SurfaceStyleOption[];
  selected: string;
  onSelect: (color: string) => void;
}) {
  return (
    <View accessibilityLabel={`${label} colors`} accessibilityRole="radiogroup" style={styles.styleColorRow}>
      {options.map((option) => {
        const active = option.value.toLowerCase() === selected.toLowerCase();
        const isOriginal = option.value === ORIGINAL_SURFACE_TINT;
        return (
          <Pressable
            key={option.value}
            accessibilityHint={`Changes the room ${label.toLowerCase()} color`}
            accessibilityLabel={`${option.name} ${label.toLowerCase()}`}
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
            aria-checked={active}
            hitSlop={4}
            onPress={() => {
              if (active) {
                tapFeedback('selection', { haptic: false });
                return;
              }
              tapFeedback('selection');
              onSelect(option.value);
            }}
            style={({ pressed }) => [
              styles.styleSwatchOuter,
              active && styles.styleSwatchOuterActive,
              pressed && styles.buttonPressed,
            ]}
          >
            <View style={[styles.styleSwatch, { backgroundColor: option.preview }]}>
              {isOriginal ? (
                <View style={styles.originalSwatchBadge}>
                  <RotateCcw color={palette.paper} size={12} strokeWidth={2.7} />
                </View>
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

function BackgroundPicker({
  selected,
  onSelect,
}: {
  selected: BackgroundId;
  onSelect: (backgroundId: BackgroundId) => void;
}) {
  return (
    <ScrollView
      horizontal
      accessibilityLabel="Room background"
      accessibilityRole="radiogroup"
      contentContainerStyle={styles.styleBackgroundRow}
      showsHorizontalScrollIndicator={false}
      style={styles.styleBackgroundScroller}
    >
      {backgroundOptions.map((option) => {
        const active = option.id === selected;
        return (
          <Pressable
            key={option.id}
            accessibilityHint="Changes the illustrated background"
            accessibilityLabel={`${option.name} background`}
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
            aria-checked={active}
            hitSlop={3}
            onPress={() => {
              if (active) {
                tapFeedback('selection', { haptic: false });
                return;
              }
              tapFeedback('selection');
              onSelect(option.id);
            }}
            style={({ pressed }) => [
              styles.styleBackgroundOption,
              active && styles.styleBackgroundOptionActive,
              pressed && styles.buttonPressed,
            ]}
          >
            <Image
              accessible={false}
              resizeMode="cover"
              source={option.thumbnailSource}
              style={styles.styleBackgroundImage}
            />
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function StylePanel() {
  const [section, setSection] = useState<StyleSection>('background');
  const activeBuildingId = useRoomStore((state) => state.activeBuildingId);
  const floorColor = useRoomStore(
    (state) => state.surfaceStyles[state.activeBuildingId].floorColor,
  );
  const wallColor = useRoomStore(
    (state) => state.surfaceStyles[state.activeBuildingId].wallColor,
  );
  const backgroundId = useRoomStore((state) => state.backgroundId);
  const setFloorColor = useRoomStore((state) => state.setFloorColor);
  const setWallColor = useRoomStore((state) => state.setWallColor);
  const setBackgroundId = useRoomStore((state) => state.setBackgroundId);

  return (
    <Animated.View entering={FadeInDown.duration(190)} exiting={FadeOutDown.duration(140)} style={styles.styleTray}>
      <View accessibilityLabel="Style section" accessibilityRole="radiogroup" style={styles.styleSectionRow}>
        {styleSections.map((option) => {
          const active = option.id === section;
          return (
            <Pressable
              key={option.id}
              accessibilityHint={`Shows ${option.label.toLowerCase()} choices`}
              accessibilityLabel={`${option.label} styles`}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              aria-checked={active}
              onPress={() => {
                if (active) {
                  tapFeedback('selection', { haptic: false });
                  return;
                }
                tapFeedback('selection');
                setSection(option.id);
              }}
              style={({ pressed }) => [
                styles.styleSectionChip,
                pressed && styles.buttonPressed,
              ]}
            >
              <View style={[styles.styleSectionChipVisual, active && styles.styleSectionChipActive]}>
                <Text style={[styles.styleSectionText, active && styles.styleSectionTextActive]}>{option.label}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      <Animated.View key={section} entering={FadeInDown.duration(130)} style={styles.styleChoiceRail}>
        {section === 'background' ? <BackgroundPicker selected={backgroundId} onSelect={setBackgroundId} /> : null}
        {section === 'floor' ? (
          <ColorPicker
            label="Floor"
            options={getSurfaceStyleOptions(activeBuildingId, 'floor')}
            selected={floorColor}
            onSelect={setFloorColor}
          />
        ) : null}
        {section === 'walls' ? (
          <ColorPicker
            label="Walls"
            options={getSurfaceStyleOptions(activeBuildingId, 'walls')}
            selected={wallColor}
            onSelect={setWallColor}
          />
        ) : null}
      </Animated.View>
    </Animated.View>
  );
}

/**
 * Premium and Settings live together in a quiet rail under the Back button, so
 * the room itself and the existing controls are untouched.
 */
function ChromeRail() {
  const isPremium = usePremium().isPremium;
  const openPaywall = useOverlayStore((state) => state.openPaywall);
  const openSettings = useOverlayStore((state) => state.openSettings);

  return (
    <View style={styles.chromeRail}>
      <Pressable
        accessibilityHint={
          isPremium ? 'Opens your Premium details' : 'Opens the Cozy Masjid Premium plans'
        }
        accessibilityLabel={isPremium ? 'Your Premium' : 'Get Premium'}
        accessibilityRole="button"
        onPress={() => {
          tapFeedback();
          openPaywall('chrome');
        }}
        style={({ pressed }) => [
          styles.roundButton,
          styles.premiumButton,
          isPremium && styles.premiumButtonOwned,
          pressed && styles.buttonPressed,
        ]}
      >
        <Crown
          color={isPremium ? palette.paper : palette.terracottaDeep}
          fill={isPremium ? palette.paper : 'transparent'}
          size={21}
          strokeWidth={2.2}
        />
      </Pressable>

      <Pressable
        accessibilityHint="Opens settings, legal links and Restore Purchases"
        accessibilityLabel="Settings"
        accessibilityRole="button"
        onPress={() => {
          tapFeedback();
          openSettings();
        }}
        style={({ pressed }) => [styles.roundButton, pressed && styles.buttonPressed]}
      >
        <Settings color={palette.ink} size={20} strokeWidth={2.2} />
      </Pressable>
    </View>
  );
}

function SelectedItemActions() {
  const selectedItemId = useRoomStore((state) => state.selectedItemId);
  const placedItems = useRoomStore((state) => state.placedItems);
  const rotateSelected = useRoomStore((state) => state.rotateSelected);
  const duplicateSelected = useRoomStore((state) => state.duplicateSelected);
  const deleteSelected = useRoomStore((state) => state.deleteSelected);
  const selectedItem = placedItems.find((item) => item.id === selectedItemId);
  if (!selectedItem) return null;
  const attachmentHost = selectedItem.attachment
    ? placedItems.find((item) => item.id === selectedItem.attachment?.hostItemId)
    : null;
  const attachmentSlot = attachmentHost && selectedItem.attachment
    ? getAttachmentSlot(attachmentHost, selectedItem.attachment.slotId)
    : null;
  const canRotate =
    catalogById[selectedItem.catalogId]?.rotatable !== false && attachmentSlot?.lockRotation !== true;

  return (
    <View style={styles.actionPill}>
      <RoundButton
        label="Rotate left"
        disabled={!canRotate}
        feedback={false}
        icon={<RotateCcw color={palette.ink} size={20} />}
        onPress={() => {
          if (rotateSelected(-1)) tapFeedback();
          else rejectedActionFeedback();
        }}
      />
      <RoundButton
        label="Rotate right"
        disabled={!canRotate}
        feedback={false}
        icon={<RotateCw color={palette.ink} size={20} />}
        onPress={() => {
          if (rotateSelected(1)) tapFeedback();
          else rejectedActionFeedback();
        }}
      />
      <RoundButton
        label="Duplicate item"
        feedback={false}
        icon={<CopyPlus color={palette.ink} size={20} />}
        onPress={() => {
          if (!duplicateSelected()) rejectedActionFeedback();
        }}
      />
      <View style={styles.actionDivider} />
      <RoundButton
        label="Delete item"
        feedback={false}
        icon={<Trash2 color="#B85C4C" size={20} />}
        onPress={deleteSelected}
        triggerOnPressIn
      />
    </View>
  );
}

export function EditorOverlay({ soundOn, onToggleSound }: { soundOn: boolean; onToggleSound: () => void }) {
  const [panel, setPanel] = useState<OpenPanel>(null);
  const [immersive, setImmersive] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [deleteAllArmed, setDeleteAllArmed] = useState(false);
  const [notice, setNotice] = useState<{ title: string; message: string } | null>(null);
  const deleteAllTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedItemId = useRoomStore((state) => state.selectedItemId);
  const placingCatalogId = useRoomStore((state) => state.placingCatalogId);
  const hasPlacementPreview = useRoomStore((state) => Boolean(state.placementPreview));
  const placedItems = useRoomStore((state) => state.placedItems);
  const activeBuildingId = useRoomStore((state) => state.activeBuildingId);
  const draggingItemId = useRoomStore((state) => state.draggingItemId);
  const readyModelItemIds = useRoomStore((state) => state.readyModelItemIds);
  const backgroundId = useRoomStore((state) => state.backgroundId);
  const readyBackgroundId = useRoomStore((state) => state.readyBackgroundId);
  const weather = useRoomStore((state) => state.weather);
  const canUndo = useRoomStore((state) => state.past.length > 0);
  const canRedo = useRoomStore((state) => state.future.length > 0);
  const selectItem = useRoomStore((state) => state.selectItem);
  const cancelPlacement = useRoomStore((state) => state.cancelPlacement);
  const setWeather = useRoomStore((state) => state.setWeather);
  const undo = useRoomStore((state) => state.undo);
  const redo = useRoomStore((state) => state.redo);
  const cancelDrag = useRoomStore((state) => state.cancelDrag);
  const setCaptureClean = useRoomStore((state) => state.setCaptureClean);
  const deleteAllInActiveBuilding = useRoomStore((state) => state.deleteAllInActiveBuilding);
  const activePlacedItems = useMemo(
    () => placedItems.filter((item) => item.buildingId === activeBuildingId),
    [activeBuildingId, placedItems],
  );
  const modelsReady = activePlacedItems.every((item) => readyModelItemIds.includes(item.id));
  const backgroundReady = readyBackgroundId === backgroundId;
  const canGoBack = Boolean(panel || placingCatalogId || selectedItemId);

  useEffect(() => {
    setDeleteAllArmed(false);
    if (deleteAllTimerRef.current) {
      clearTimeout(deleteAllTimerRef.current);
      deleteAllTimerRef.current = null;
    }
    return () => {
      if (deleteAllTimerRef.current) clearTimeout(deleteAllTimerRef.current);
    };
  }, [activeBuildingId]);

  const closePanel = () => setPanel(null);
  const handleDeleteAll = () => {
    if (activePlacedItems.length === 0) return;
    if (!deleteAllArmed) {
      setDeleteAllArmed(true);
      if (deleteAllTimerRef.current) clearTimeout(deleteAllTimerRef.current);
      deleteAllTimerRef.current = setTimeout(() => {
        setDeleteAllArmed(false);
        deleteAllTimerRef.current = null;
      }, 3_000);
      return;
    }
    if (deleteAllTimerRef.current) clearTimeout(deleteAllTimerRef.current);
    deleteAllTimerRef.current = null;
    setDeleteAllArmed(false);
    deleteAllInActiveBuilding();
  };
  const handleBack = () => {
    if (panel) return closePanel();
    if (placingCatalogId) return cancelPlacement();
    if (selectedItemId) return selectItem(null);
  };

  const handleSnap = async () => {
    if (isCapturing || !modelsReady || !backgroundReady || hasPlacementPreview) return;
    emitInteractionFeedback('camera');
    setPanel(null);
    cancelDrag();
    setCaptureClean(true);
    setIsCapturing(true);

    let successMessage: string | null = null;
    let failureMessage: string | null = null;
    try {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const result = await captureSaveAndShareRoom();
      if (result.downloaded) {
        successMessage = 'Your room image was downloaded.';
      } else if (result.savedToLibrary && result.shared) {
        successMessage = 'Saved to Photos and opened the share sheet.';
      } else if (result.saveFailed && result.shared) {
        successMessage = 'The share sheet opened, but the image could not be saved to Photos.';
      } else if (result.saveFailed) {
        failureMessage = 'The image was created, but it could not be saved to Photos.';
      } else if (result.shared && result.permissionDenied) {
        successMessage = 'The share sheet opened. Photos access was not granted, so the image was not saved.';
      } else if (result.shared) {
        successMessage = 'The share sheet opened with your room image.';
      } else if (result.savedToLibrary) {
        successMessage = 'Your Deen Room was saved to Photos.';
      }
    } catch (error) {
      failureMessage = error instanceof Error ? error.message : 'The room image could not be created.';
    } finally {
      setCaptureClean(false);
      setIsCapturing(false);
    }

    if (failureMessage) {
      emitInteractionFeedback('captureError');
      setNotice({ title: 'Could not capture the room', message: failureMessage });
    } else if (successMessage) {
      emitInteractionFeedback('captureSuccess');
      setNotice({ title: 'Room captured', message: successMessage });
    }
    setTimeout(() => setNotice(null), 3_200);
  };

  if (isCapturing) return null;

  if (immersive) {
    return (
      <SafeAreaView pointerEvents="box-none" style={styles.overlay}>
        <View style={styles.immersiveRestore}>
          <RoundButton
            label="Exit fullscreen"
            icon={<Minimize2 color={palette.ink} size={21} />}
            onPress={() => setImmersive(false)}
          />
        </View>
        {!placingCatalogId && !draggingItemId ? (
          <View style={styles.buildingSwitcherContainer}>
            <BuildingSwitcher />
          </View>
        ) : null}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView pointerEvents="box-none" style={styles.overlay}>
      <View pointerEvents="box-none" style={styles.topControls}>
        <View style={styles.topRow}>
          <RoundButton
            label={placingCatalogId ? 'Cancel placement' : panel === 'weather' ? 'Close weather menu' : panel ? 'Close panel' : 'Back'}
            icon={<ChevronLeft color={palette.ink} size={24} />}
            onPress={handleBack}
            feedback={canGoBack ? 'ui' : false}
          />
          <View style={styles.topActions}>
            <RoundButton
              accessibilityHint={panel === 'weather' ? 'Closes the weather choices' : 'Opens five weather choices'}
              active={panel === 'weather'}
              expanded={panel === 'weather'}
              label={`Weather: ${weatherVisualProfiles[weather].label}. ${panel === 'weather' ? 'Close' : 'Open'} weather menu`}
              icon={
                <WeatherGlyph
                  color={panel === 'weather' ? palette.cream : palette.ink}
                  size={21}
                  weather={weather}
                />
              }
              onPress={() => {
                setPanel((current) => (current === 'weather' ? null : 'weather'));
              }}
            />
            <RoundButton
              label="Undo"
              disabled={!canUndo}
              icon={<Undo2 color={palette.ink} size={21} />}
              onPress={() => {
                undo();
              }}
            />
            <RoundButton
              label="Redo"
              disabled={!canRedo}
              icon={<Redo2 color={palette.ink} size={21} />}
              onPress={() => {
                redo();
              }}
            />
            <RoundButton
              label="Enter fullscreen"
              icon={<Maximize2 color={palette.ink} size={20} />}
              onPress={() => {
                setPanel(null);
                setImmersive(true);
              }}
            />
          </View>
        </View>

        {!panel && !placingCatalogId && !draggingItemId && !selectedItemId ? <ChromeRail /> : null}

        {__DEV__ && !panel && !placingCatalogId && !draggingItemId ? (
          <Pressable
            accessibilityHint="Development tool. Press twice to remove every asset from the current room"
            accessibilityLabel={`Delete all ${activePlacedItems.length} assets in this room`}
            accessibilityRole="button"
            disabled={activePlacedItems.length === 0}
            onPress={handleDeleteAll}
            style={({ pressed }) => [
              styles.devDeleteAllButton,
              deleteAllArmed && styles.devDeleteAllButtonArmed,
              activePlacedItems.length === 0 && styles.disabled,
              pressed && styles.buttonPressed,
            ]}
          >
            <Trash2 color={deleteAllArmed ? '#FFF7F1' : '#A84E42'} size={18} />
            <View style={[styles.devDeleteAllBadge, deleteAllArmed && styles.devDeleteAllBadgeArmed]}>
              <Text style={[styles.devDeleteAllBadgeText, deleteAllArmed && styles.devDeleteAllBadgeTextArmed]}>
                {deleteAllArmed ? '!' : activePlacedItems.length}
              </Text>
            </View>
          </Pressable>
        ) : null}

        {panel === 'weather' ? (
          <WeatherPopover
            selected={weather}
            soundOn={soundOn}
            onSelect={setWeather}
            onToggleSound={onToggleSound}
          />
        ) : null}

        <View style={styles.mainPills}>
          <PillButton
            label={panel === 'catalog' ? 'Close' : 'Add'}
            accessibilityHint={panel === 'catalog' ? 'Closes the furniture choices' : 'Opens the furniture choices'}
            accessibilityLabel={panel === 'catalog' ? 'Close Add menu' : 'Open Add menu'}
            active={panel === 'catalog'}
            expanded={panel === 'catalog'}
            icon={panel === 'catalog' ? <X color={palette.cream} size={21} /> : <Plus color={palette.ink} size={22} />}
            onPress={() => setPanel((current) => (current === 'catalog' ? null : 'catalog'))}
          />
          <PillButton
            label={panel === 'style' ? 'Close' : 'Style'}
            accessibilityHint={panel === 'style' ? 'Closes the style choices' : 'Opens room style choices'}
            accessibilityLabel={panel === 'style' ? 'Close Style menu' : 'Open Style menu'}
            active={panel === 'style'}
            expanded={panel === 'style'}
            icon={panel === 'style' ? <X color={palette.cream} size={21} /> : <PaletteIcon color={palette.ink} size={20} />}
            onPress={() => setPanel((current) => (current === 'style' ? null : 'style'))}
          />
          <PillButton
            label="Snap"
            disabled={!modelsReady || !backgroundReady || hasPlacementPreview}
            feedback={false}
            icon={<Camera color={palette.ink} size={20} />}
            onPress={() => void handleSnap()}
          />
        </View>

        {panel === 'catalog' ? <CatalogTray onClose={closePanel} /> : null}
        {panel === 'style' ? <StylePanel /> : null}

        {!modelsReady || !backgroundReady ? (
          <View style={styles.modelLoadingHint}>
            <Text style={styles.modelLoadingText}>
              {!backgroundReady ? 'Painting your background…' : 'Preparing your 3D items…'}
            </Text>
          </View>
        ) : null}

        {!panel ? <SelectedItemActions /> : null}
      </View>

      {!placingCatalogId && !draggingItemId && !notice ? (
        <View style={styles.buildingSwitcherContainer}>
          <BuildingSwitcher onBeforeChange={() => setPanel(null)} />
        </View>
      ) : null}

      {notice ? (
        <Animated.View entering={FadeInDown.duration(180)} exiting={FadeOutDown.duration(150)} pointerEvents="none" style={styles.notice}>
          <Camera color={palette.gold} size={22} />
          <View style={styles.noticeCopy}>
            <Text style={styles.noticeTitle}>{notice.title}</Text>
            <Text style={styles.noticeMessage}>{notice.message}</Text>
          </View>
        </Animated.View>
      ) : null}
    </SafeAreaView>
  );
}

const softShadow = {
  shadowColor: palette.ink,
  shadowOffset: { width: 0, height: 5 },
  shadowOpacity: 0.14,
  shadowRadius: 12,
  elevation: 5,
} as const;

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 10,
    justifyContent: 'space-between',
  },
  topControls: {
    paddingHorizontal: 16,
    paddingTop: 6,
    alignItems: 'center',
  },
  topRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topActions: {
    flexDirection: 'row',
    gap: 8,
  },
  roundButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(246, 244, 239, 0.96)',
    ...softShadow,
  },
  roundButtonActive: {
    backgroundColor: palette.ink,
  },
  buttonPressed: {
    transform: [{ scale: 0.94 }],
    opacity: 0.9,
  },
  disabled: {
    opacity: 0.38,
  },
  weatherPopover: {
    alignSelf: 'flex-end',
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  weatherSoundButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(246, 244, 239, 0.96)',
    ...softShadow,
  },
  weatherSoundButtonActive: {
    backgroundColor: palette.ink,
  },
  weatherOptions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  weatherOption: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(246, 244, 239, 0.96)',
    ...softShadow,
  },
  weatherOptionActive: {
    backgroundColor: palette.ink,
  },
  mainPills: {
    width: '100%',
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  pillButton: {
    flex: 1,
    minWidth: 0,
    maxWidth: 112,
    height: 48,
    paddingHorizontal: 10,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(246, 244, 239, 0.96)',
    ...softShadow,
  },
  pillButtonActive: {
    backgroundColor: palette.ink,
  },
  pillLabel: {
    color: palette.ink,
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 16,
  },
  pillLabelActive: {
    color: palette.cream,
  },
  actionPill: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 4,
    padding: 5,
    borderRadius: 28,
    alignItems: 'center',
    backgroundColor: 'rgba(246, 244, 239, 0.97)',
    ...softShadow,
  },
  actionDivider: {
    width: 1,
    height: 25,
    backgroundColor: 'rgba(78,59,49,0.16)',
  },
  modelLoadingHint: {
    marginTop: 9,
    borderRadius: 14,
    paddingHorizontal: 13,
    paddingVertical: 6,
    backgroundColor: 'rgba(246, 244, 239, 0.9)',
  },
  modelLoadingText: {
    color: palette.inkMuted,
    fontFamily: 'Nunito_700Bold',
    fontSize: 11,
  },
  devDeleteAllButton: {
    position: 'absolute',
    top: 162,
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 244, 239, 0.96)',
    borderWidth: 1,
    borderColor: 'rgba(168, 78, 66, 0.28)',
    ...softShadow,
  },
  devDeleteAllBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 19,
    height: 19,
    paddingHorizontal: 4,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#A84E42',
    borderWidth: 2,
    borderColor: '#FFF7F1',
  },
  devDeleteAllBadgeText: {
    color: '#FFF7F1',
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 10,
  },
  devDeleteAllButtonArmed: {
    backgroundColor: '#A84E42',
    borderColor: '#A84E42',
  },
  devDeleteAllBadgeArmed: {
    backgroundColor: '#FFF7F1',
    borderColor: '#A84E42',
  },
  devDeleteAllBadgeTextArmed: {
    color: '#A84E42',
  },
  chromeRail: {
    position: 'absolute',
    top: 58,
    left: 16,
    gap: 8,
  },
  premiumButton: {
    backgroundColor: '#FBEFD8',
    borderWidth: 1.5,
    borderColor: 'rgba(212, 169, 70, 0.55)',
  },
  premiumButtonOwned: {
    backgroundColor: palette.gold,
    borderColor: palette.gold,
  },
  immersiveRestore: {
    alignSelf: 'flex-end',
    marginTop: 6,
    marginRight: 16,
  },
  buildingSwitcherContainer: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: 18,
  },
  styleTray: {
    width: '100%',
    marginTop: 8,
    gap: 7,
  },
  styleSectionRow: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  styleSectionChip: {
    height: 44,
    minWidth: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  styleSectionChipVisual: {
    width: '100%',
    height: 32,
    paddingHorizontal: 13,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(246, 244, 239, 0.94)',
    borderWidth: 1,
    borderColor: 'rgba(78,59,49,0.08)',
  },
  styleSectionChipActive: {
    backgroundColor: palette.ink,
    borderColor: palette.ink,
  },
  styleSectionText: {
    color: palette.ink,
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 11,
  },
  styleSectionTextActive: {
    color: palette.cream,
  },
  styleChoiceRail: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 340,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: 'rgba(246, 244, 239, 0.96)',
    ...softShadow,
  },
  catalogTray: {
    width: '100%',
    marginTop: 8,
  },
  categoryScroller: {
    flexGrow: 0,
  },
  categoryRow: {
    paddingHorizontal: 2,
    gap: 7,
  },
  categoryChip: {
    height: 29,
    paddingHorizontal: 13,
    borderRadius: 15,
    justifyContent: 'center',
    backgroundColor: 'rgba(246, 244, 239, 0.94)',
    borderWidth: 1,
    borderColor: 'rgba(78,59,49,0.08)',
  },
  categoryChipActive: {
    backgroundColor: palette.ink,
  },
  categoryText: {
    color: palette.ink,
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 12,
  },
  categoryTextActive: {
    color: palette.cream,
  },
  itemScroller: {
    flexGrow: 0,
    marginTop: 9,
  },
  itemRow: {
    paddingHorizontal: 2,
    paddingBottom: 8,
    gap: 10,
  },
  itemCard: {
    width: 104,
    minHeight: 132,
    padding: 7,
    borderRadius: 17,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 251, 244, 0.98)',
    borderWidth: 1,
    borderColor: 'rgba(78,59,49,0.07)',
  },
  itemArtLocked: {
    opacity: 0.42,
  },
  itemNameLocked: {
    opacity: 0.62,
  },
  itemLockBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 21,
    height: 21,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.gold,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 251, 244, 0.92)',
  },
  itemCardPressed: {
    transform: [{ scale: 0.96 }],
    backgroundColor: '#F3E7D4',
  },
  itemPlaceholder: {
    width: 82,
    height: 82,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemThumbnail: {
    width: 82,
    height: 82,
    borderRadius: 14,
  },
  itemName: {
    minHeight: 27,
    marginTop: 5,
    color: palette.ink,
    textAlign: 'center',
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 11,
    lineHeight: 13,
  },
  styleColorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  styleSwatchOuter: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  styleSwatchOuterActive: {
    borderColor: palette.ink,
  },
  styleSwatch: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(78,59,49,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  originalSwatchBadge: {
    width: 19,
    height: 19,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(78,59,49,0.74)',
  },
  styleBackgroundScroller: {
    flexGrow: 0,
    width: '100%',
  },
  styleBackgroundRow: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  styleBackgroundOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: palette.paper,
  },
  styleBackgroundOptionActive: {
    borderColor: palette.ink,
  },
  styleBackgroundImage: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: 'rgba(78,59,49,0.1)',
  },
  notice: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 22,
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 17,
    paddingVertical: 12,
    borderRadius: 22,
    backgroundColor: 'rgba(78, 59, 49, 0.96)',
    ...softShadow,
  },
  noticeCopy: {
    flex: 1,
  },
  noticeTitle: {
    color: palette.cream,
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 14,
  },
  noticeMessage: {
    color: '#E8DCCB',
    fontFamily: 'Nunito_700Bold',
    fontSize: 11,
    lineHeight: 14,
  },
});
