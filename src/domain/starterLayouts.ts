import type { CatalogItem } from '../catalog/types';
import {
  DEFAULT_PLACEMENT_LEVEL,
  getDefaultPlacementZoneId,
  type PlacedItem,
} from './grid';
import type { BuildingId } from './buildings';

export const STARTER_LAYOUT_REVISION = 15;

type StarterPlacedItem = Omit<PlacedItem, 'buildingId' | 'level' | 'zoneId'> & {
  level?: PlacedItem['level'];
  zoneId?: PlacedItem['zoneId'];
};

function withPlacementDefaults(
  buildingId: BuildingId,
  items: readonly StarterPlacedItem[],
): readonly PlacedItem[] {
  return items.map((item) => {
    const level = item.level ?? DEFAULT_PLACEMENT_LEVEL;
    const zoneId = item.zoneId ?? getDefaultPlacementZoneId(buildingId, level, item.surface);
    if (!zoneId) throw new Error(`Missing placement zone for starter item ${item.id}.`);
    return { ...item, buildingId, level, zoneId };
  });
}

function place(
  buildingId: BuildingId,
  label: string,
  catalogId: CatalogItem['id'],
  gridX: number,
  gridY: number,
  rotation: PlacedItem['rotation'],
  surface: PlacedItem['surface'],
): StarterPlacedItem {
  return {
    id: `starter-v3-${buildingId}-${label}`,
    catalogId,
    gridX,
    gridY,
    rotation,
    surface,
  };
}

const peachSunrise = withPlacementDefaults('peach-sunrise-room', [
  place('peach-sunrise-room', 'terracotta-minbar', 'imported-model-66', 6, 0, 0, 'floor'),
  place('peach-sunrise-room', 'low-bookshelf', 'imported-model-10', 0, 0, 90, 'floor'),
  place('peach-sunrise-room', 'warm-floor-lamp', 'imported-model-40', 4, 0, 0, 'floor'),
  place('peach-sunrise-room', 'terracotta-quran', 'imported-model-93', 5, 1, 90, 'floor'),
  place('peach-sunrise-room', 'sunrise-rug-left', 'imported-model-76', 1, 3, 90, 'floor'),
  place('peach-sunrise-room', 'sunrise-rug-right', 'imported-model-76', 2.75, 3, 90, 'floor'),
  place('peach-sunrise-room', 'terracotta-pouf', 'imported-model-101', 6, 5, 0, 'floor'),
  place('peach-sunrise-room', 'iftar-tray', 'imported-model-54', 2, 6, 0, 'floor'),
  place('peach-sunrise-room', 'olive-tree', 'imported-model-16', 0, 6, 0, 'floor'),
  place('peach-sunrise-room', 'wall-quran', 'wall-art', 1, 1, 0, 'wallL'),
  place('peach-sunrise-room', 'hanging-ivy', 'imported-model-11', 0, 1, 0, 'wallL'),
  place('peach-sunrise-room', 'prayer-clock', 'imported-model-53', 0, 1, 0, 'wallR'),
  place('peach-sunrise-room', 'wall-sconce', 'imported-model-39', 6, 1, 0, 'wallR'),
]);

const brickNoor = withPlacementDefaults('brick-noor-room', [
  place('brick-noor-room', 'cream-minbar', 'imported-model-67', 6, 0, 0, 'floor'),
  place('brick-noor-room', 'tall-bookcase', 'imported-model-13', 0, 0, 90, 'floor'),
  place('brick-noor-room', 'mosque-lantern', 'imported-model-43', 5, 1, 0, 'wallL'),
  place('brick-noor-room', 'ivory-quran', 'imported-model-95', 5, 1, 90, 'floor'),
  place('brick-noor-room', 'cream-rug-left', 'imported-model-77', 1, 3, 90, 'floor'),
  place('brick-noor-room', 'cream-rug-right', 'imported-model-77', 2.75, 3, 90, 'floor'),
  place('brick-noor-room', 'sand-cushion', 'imported-model-109', 6, 5, 0, 'floor'),
  place('brick-noor-room', 'dates', 'imported-model-51', 3, 6, 0, 'floor'),
  place('brick-noor-room', 'shoe-rack', 'imported-model-38', 0, 6, 180, 'floor'),
  place('brick-noor-room', 'string-lights', 'imported-model-49', 0, 0, 0, 'wallL'),
  place('brick-noor-room', 'prayer-clock', 'imported-model-53', 0, 1, 0, 'wallR'),
  place('brick-noor-room', 'wall-sconce', 'imported-model-39', 6, 1, 0, 'wallR'),
]);

const charcoalNoor = withPlacementDefaults('charcoal-noor-room', [
  place('charcoal-noor-room', 'sand-teal-minbar', 'imported-model-64', 6, 0, 0, 'floor'),
  place('charcoal-noor-room', 'book-cabinet', 'imported-model-18', 0, 0, 90, 'floor'),
  place('charcoal-noor-room', 'warm-floor-lamp', 'imported-model-40', 4, 0, 0, 'floor'),
  place('charcoal-noor-room', 'teal-quran', 'imported-model-96', 5, 1, 90, 'floor'),
  place('charcoal-noor-room', 'medallion-rug-left', 'imported-model-78', 1, 3, 90, 'floor'),
  place('charcoal-noor-room', 'medallion-rug-right', 'imported-model-78', 2.75, 3, 90, 'floor'),
  place('charcoal-noor-room', 'cream-pouf', 'imported-model-103', 6, 5, 0, 'floor'),
  place('charcoal-noor-room', 'tea-table', 'imported-model-26', 2, 6, 0, 'floor'),
  place('charcoal-noor-room', 'date-palm', 'imported-model-17', 0, 6, 0, 'floor'),
  place('charcoal-noor-room', 'quran-display', 'wall-art', 0, 1, 0, 'wallL'),
  place('charcoal-noor-room', 'wall-sconce', 'imported-model-39', 6, 1, 0, 'wallL'),
  place('charcoal-noor-room', 'crescent-wall', 'imported-model-55', 0, 1, 0, 'wallR'),
  place('charcoal-noor-room', 'string-lights', 'imported-model-49', 5, 1, 0, 'wallR'),
]);

const violetDusk = withPlacementDefaults('violet-dusk-room', [
  place('violet-dusk-room', 'scalloped-teal-minbar', 'imported-model-69', 6, 0, 0, 'floor'),
  place('violet-dusk-room', 'tall-bookcase', 'imported-model-13', 0, 0, 90, 'floor'),
  place('violet-dusk-room', 'dome-lantern', 'imported-model-44', 5, 1, 0, 'wallR'),
  place('violet-dusk-room', 'deep-teal-quran', 'imported-model-100', 5, 1, 90, 'floor'),
  place('violet-dusk-room', 'teal-rug-left', 'imported-model-82', 1, 3, 90, 'floor'),
  place('violet-dusk-room', 'teal-rug-right', 'imported-model-82', 2.75, 3, 90, 'floor'),
  place('violet-dusk-room', 'teal-pouf', 'imported-model-102', 6, 5, 0, 'floor'),
  place('violet-dusk-room', 'round-rug', 'imported-model-60', 1, 6, 0, 'floor'),
  place('violet-dusk-room', 'succulent', 'imported-model-12', 5, 6, 0, 'floor'),
  place('violet-dusk-room', 'macrame-planter', 'imported-model-15', 0, 1, 0, 'wallL'),
  place('violet-dusk-room', 'quran-display', 'wall-art', 1, 1, 0, 'wallL'),
  place('violet-dusk-room', 'mashrabiya', 'imported-model-59', 0, 1, 0, 'wallR'),
  place('violet-dusk-room', 'wall-sconce', 'imported-model-39', 6, 1, 0, 'wallR'),
]);

export const starterLayouts: Readonly<Record<BuildingId, readonly PlacedItem[]>> = {
  'peach-sunrise-room': peachSunrise,
  'brick-noor-room': brickNoor,
  'charcoal-noor-room': charcoalNoor,
  'violet-dusk-room': violetDusk,
};
