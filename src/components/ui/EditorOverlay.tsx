import * as Haptics from 'expo-haptics';
import {
  Armchair,
  BookOpen,
  Camera,
  ChevronLeft,
  CopyPlus,
  Frame,
  Lamp,
  Landmark,
  Maximize2,
  Minimize2,
  MoonStar,
  Palette as PaletteIcon,
  Plus,
  RotateCcw,
  RotateCw,
  Sparkles,
  Sun,
  Trash2,
  Undo2,
  Redo2,
  X,
} from 'lucide-react-native';
import { useMemo, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { catalog, catalogById } from '../../catalog/catalog';
import { catalogThumbnails } from '../../catalog/thumbnails';
import type { CatalogCategory, CatalogItem } from '../../catalog/types';
import { captureSaveAndShareRoom } from '../../services/roomSnapshot';
import { useRoomStore } from '../../store/roomStore';
import { backgroundSwatches, floorSwatches, palette, wallSwatches } from '../../theme/palette';

type OpenPanel = 'catalog' | 'style' | null;
type FilterCategory = CatalogCategory | 'All';

const categories: readonly FilterCategory[] = ['All', 'Prayer', 'Lights', 'Seating', 'Decor', 'Wall'];

function tapFeedback() {
  void Haptics.selectionAsync();
}

function RoundButton({
  label,
  icon,
  onPress,
  disabled = false,
}: {
  label: string;
  icon: ReactNode;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.roundButton, pressed && styles.buttonPressed, disabled && styles.disabled]}
    >
      {icon}
    </Pressable>
  );
}

function PillButton({
  label,
  icon,
  active = false,
  disabled = false,
  onPress,
}: {
  label: string;
  icon: ReactNode;
  active?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
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
  if (item.category === 'Prayer') return <BookOpen {...common} />;
  if (item.category === 'Lights') return <Lamp {...common} />;
  if (item.category === 'Seating') return <Armchair {...common} />;
  if (item.category === 'Wall') return <Frame {...common} />;
  if (item.category === 'Buildings') return <Landmark {...common} />;
  return <Sparkles {...common} />;
}

function CatalogTray({ onClose }: { onClose: () => void }) {
  const [category, setCategory] = useState<FilterCategory>('All');
  const startPlacing = useRoomStore((state) => state.startPlacing);
  const visibleItems = useMemo(
    () => (category === 'All' ? catalog : catalog.filter((item) => item.category === category)),
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
                tapFeedback();
                setCategory(value);
              }}
              style={[styles.categoryChip, active && styles.categoryChipActive]}
            >
              <Text style={[styles.categoryText, active && styles.categoryTextActive]}>{value}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <ScrollView
        horizontal
        contentContainerStyle={styles.itemRow}
        showsHorizontalScrollIndicator={false}
        style={styles.itemScroller}
      >
        {visibleItems.map((item) => (
          <Pressable
            key={item.id}
            accessibilityLabel={`Add ${item.name}`}
            accessibilityRole="button"
            onPress={() => {
              tapFeedback();
              startPlacing(item.id);
              onClose();
              AccessibilityInfo.announceForAccessibility(`${item.name} ready to move. Tap or drag to place it.`);
            }}
            style={({ pressed }) => [styles.itemCard, pressed && styles.itemCardPressed]}
          >
            {catalogThumbnails[item.id] ? (
              <Image resizeMode="contain" source={catalogThumbnails[item.id]} style={styles.itemThumbnail} />
            ) : (
              <View style={[styles.itemPlaceholder, { backgroundColor: item.placeholderColor }]}>
                <CategoryGlyph item={item} />
              </View>
            )}
            <Text numberOfLines={2} style={styles.itemName}>
              {item.name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </Animated.View>
  );
}

function SwatchRow({
  label,
  colors,
  selected,
  onSelect,
}: {
  label: string;
  colors: readonly string[];
  selected: string;
  onSelect: (color: string) => void;
}) {
  return (
    <View style={styles.swatchSection}>
      <Text style={styles.swatchLabel}>{label}</Text>
      <View style={styles.swatchRow}>
        {colors.map((color) => {
          const active = color.toLowerCase() === selected.toLowerCase();
          return (
            <Pressable
              key={color}
              accessibilityLabel={`${label} color ${color}`}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => {
                tapFeedback();
                onSelect(color);
              }}
              style={[styles.swatchOuter, active && styles.swatchOuterActive]}
            >
              <View style={[styles.swatch, { backgroundColor: color }]} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function StylePanel({ onClose }: { onClose: () => void }) {
  const floorColor = useRoomStore((state) => state.floorColor);
  const wallColor = useRoomStore((state) => state.wallColor);
  const backgroundColor = useRoomStore((state) => state.backgroundColor);
  const setFloorColor = useRoomStore((state) => state.setFloorColor);
  const setWallColor = useRoomStore((state) => state.setWallColor);
  const setBackgroundColor = useRoomStore((state) => state.setBackgroundColor);

  return (
    <Animated.View entering={FadeInDown.duration(220)} exiting={FadeOutDown.duration(160)} style={[styles.sheet, styles.styleSheet]}>
      <View style={styles.sheetHandle} />
      <View style={styles.sheetHeadingRow}>
        <View>
          <Text style={styles.sheetTitle}>Set the mood</Text>
          <Text style={styles.sheetSubtitle}>Warm finishes for a peaceful room</Text>
        </View>
        <RoundButton label="Close style panel" icon={<X color={palette.ink} size={20} />} onPress={onClose} />
      </View>
      <SwatchRow label="Floor" colors={floorSwatches} selected={floorColor} onSelect={setFloorColor} />
      <SwatchRow label="Walls" colors={wallSwatches} selected={wallColor} onSelect={setWallColor} />
      <SwatchRow
        label="Background"
        colors={backgroundSwatches}
        selected={backgroundColor}
        onSelect={setBackgroundColor}
      />
    </Animated.View>
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
  const canRotate = catalogById[selectedItem.catalogId]?.rotatable !== false;

  return (
    <View style={styles.actionPill}>
      <RoundButton
        label="Rotate left"
        disabled={!canRotate}
        icon={<RotateCcw color={palette.ink} size={20} />}
        onPress={() => rotateSelected(-1)}
      />
      <RoundButton
        label="Rotate right"
        disabled={!canRotate}
        icon={<RotateCw color={palette.ink} size={20} />}
        onPress={() => rotateSelected(1)}
      />
      <RoundButton label="Duplicate item" icon={<CopyPlus color={palette.ink} size={20} />} onPress={duplicateSelected} />
      <View style={styles.actionDivider} />
      <RoundButton label="Delete item" icon={<Trash2 color="#B85C4C" size={20} />} onPress={deleteSelected} />
    </View>
  );
}

export function EditorOverlay() {
  const [panel, setPanel] = useState<OpenPanel>(null);
  const [immersive, setImmersive] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [notice, setNotice] = useState<{ title: string; message: string } | null>(null);
  const selectedItemId = useRoomStore((state) => state.selectedItemId);
  const placingCatalogId = useRoomStore((state) => state.placingCatalogId);
  const hasPlacementPreview = useRoomStore((state) => Boolean(state.placementPreview));
  const placedItems = useRoomStore((state) => state.placedItems);
  const readyModelItemIds = useRoomStore((state) => state.readyModelItemIds);
  const lighting = useRoomStore((state) => state.lighting);
  const canUndo = useRoomStore((state) => state.past.length > 0);
  const canRedo = useRoomStore((state) => state.future.length > 0);
  const selectItem = useRoomStore((state) => state.selectItem);
  const cancelPlacement = useRoomStore((state) => state.cancelPlacement);
  const toggleLighting = useRoomStore((state) => state.toggleLighting);
  const undo = useRoomStore((state) => state.undo);
  const redo = useRoomStore((state) => state.redo);
  const cancelDrag = useRoomStore((state) => state.cancelDrag);
  const setCaptureClean = useRoomStore((state) => state.setCaptureClean);
  const modelsReady = placedItems.every((item) => readyModelItemIds.includes(item.id));

  const closePanel = () => setPanel(null);
  const handleBack = () => {
    if (panel) return closePanel();
    if (placingCatalogId) return cancelPlacement();
    if (selectedItemId) return selectItem(null);
  };

  const handleSnap = async () => {
    if (isCapturing || !modelsReady || hasPlacementPreview) return;
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

    if (failureMessage) setNotice({ title: 'Could not capture the room', message: failureMessage });
    else if (successMessage) setNotice({ title: 'Room captured', message: successMessage });
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
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView pointerEvents="box-none" style={styles.overlay}>
      <View pointerEvents="box-none" style={styles.topControls}>
        <View style={styles.topRow}>
          <RoundButton
            label={placingCatalogId ? 'Cancel placement' : panel ? 'Close panel' : 'Back'}
            icon={<ChevronLeft color={palette.ink} size={24} />}
            onPress={handleBack}
          />
          <View style={styles.topActions}>
            <RoundButton
              label={lighting === 'day' ? 'Use warm lighting' : 'Use daylight'}
              icon={lighting === 'day' ? <Sun color={palette.ink} size={21} /> : <MoonStar color={palette.ink} size={21} />}
              onPress={() => {
                tapFeedback();
                toggleLighting();
              }}
            />
            <RoundButton
              label="Undo"
              disabled={!canUndo}
              icon={<Undo2 color={palette.ink} size={21} />}
              onPress={() => {
                tapFeedback();
                undo();
              }}
            />
            <RoundButton
              label="Redo"
              disabled={!canRedo}
              icon={<Redo2 color={palette.ink} size={21} />}
              onPress={() => {
                tapFeedback();
                redo();
              }}
            />
            <RoundButton
              label="Enter fullscreen"
              icon={<Maximize2 color={palette.ink} size={20} />}
              onPress={() => setImmersive(true)}
            />
          </View>
        </View>

        <View style={styles.mainPills}>
          <PillButton
            label={panel === 'catalog' ? 'Close' : 'Add'}
            active={panel === 'catalog'}
            icon={panel === 'catalog' ? <X color={palette.cream} size={21} /> : <Plus color={palette.ink} size={22} />}
            onPress={() => setPanel((current) => (current === 'catalog' ? null : 'catalog'))}
          />
          <PillButton
            label="Style"
            active={panel === 'style'}
            icon={<PaletteIcon color={panel === 'style' ? palette.cream : palette.ink} size={20} />}
            onPress={() => setPanel((current) => (current === 'style' ? null : 'style'))}
          />
          <PillButton
            label="Snap"
            disabled={!modelsReady || hasPlacementPreview}
            icon={<Camera color={palette.ink} size={20} />}
            onPress={() => void handleSnap()}
          />
        </View>

        {panel === 'catalog' ? <CatalogTray onClose={closePanel} /> : null}

        {!modelsReady ? (
          <View style={styles.modelLoadingHint}>
            <Text style={styles.modelLoadingText}>Preparing your 3D items…</Text>
          </View>
        ) : null}

        {!panel ? <SelectedItemActions /> : null}
      </View>

      {panel === 'style' ? <StylePanel onClose={closePanel} /> : null}
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
  buttonPressed: {
    transform: [{ scale: 0.94 }],
    opacity: 0.9,
  },
  disabled: {
    opacity: 0.38,
  },
  mainPills: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pillButton: {
    minWidth: 96,
    height: 48,
    paddingHorizontal: 17,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
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
  immersiveRestore: {
    alignSelf: 'flex-end',
    marginTop: 6,
    marginRight: 16,
  },
  sheet: {
    alignSelf: 'center',
    width: '94%',
    minHeight: 292,
    maxHeight: 330,
    marginBottom: 8,
    paddingTop: 8,
    paddingBottom: 13,
    borderRadius: 30,
    overflow: 'hidden',
    backgroundColor: 'rgba(246, 244, 239, 0.985)',
    ...softShadow,
  },
  styleSheet: {
    minHeight: 245,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    marginBottom: 8,
    borderRadius: 2,
    backgroundColor: 'rgba(78,59,49,0.2)',
  },
  sheetHeadingRow: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetTitle: {
    color: palette.ink,
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 18,
  },
  sheetSubtitle: {
    color: palette.inkMuted,
    fontFamily: 'Nunito_700Bold',
    fontSize: 11,
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
  swatchSection: {
    paddingHorizontal: 18,
    marginTop: 13,
  },
  swatchLabel: {
    marginBottom: 7,
    color: palette.ink,
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 13,
  },
  swatchRow: {
    flexDirection: 'row',
    gap: 11,
  },
  swatchOuter: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchOuterActive: {
    borderColor: palette.ink,
  },
  swatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(78,59,49,0.12)',
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
