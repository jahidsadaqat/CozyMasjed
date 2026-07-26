import type { CatalogItem } from '../catalog/types';
import {
  DEFAULT_PLACEMENT_LEVEL,
  getDefaultPlacementZoneId,
  type PlacedItem,
} from './grid';
import type { BuildingId } from './buildings';

export const STARTER_LAYOUT_REVISION = 22;

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
  place('peach-sunrise-room', 'terracotta-minbar', 'imported-model-66', 6.5, 0.5, 0, 'floor'),
  place('peach-sunrise-room', 'low-bookshelf', 'imported-model-10', 0.5, 0.5, 90, 'floor'),
  place('peach-sunrise-room', 'warm-floor-lamp', 'imported-model-40', 4.5, 0.5, 0, 'floor'),
  place('peach-sunrise-room', 'terracotta-quran', 'imported-model-93', 5.5, 1.5, 90, 'floor'),
  place('peach-sunrise-room', 'sunrise-rug-left', 'imported-model-76', 1.5, 3.5, 90, 'floor'),
  place('peach-sunrise-room', 'sunrise-rug-right', 'imported-model-76', 3.25, 3.5, 90, 'floor'),
  place('peach-sunrise-room', 'terracotta-pouf', 'imported-model-101', 6.5, 5.5, 0, 'floor'),
  place('peach-sunrise-room', 'iftar-tray', 'imported-model-54', 2.5, 6.5, 0, 'floor'),
  place('peach-sunrise-room', 'olive-tree', 'imported-model-16', 0.5, 6.5, 0, 'floor'),
  place('peach-sunrise-room', 'wall-quran', 'wall-art', 1, 1, 0, 'wallL'),
  place('peach-sunrise-room', 'hanging-ivy', 'imported-model-11', 0, 1, 0, 'wallL'),
  place('peach-sunrise-room', 'prayer-clock', 'imported-model-53', 0, 1, 0, 'wallR'),
  place('peach-sunrise-room', 'wall-sconce', 'imported-model-39', 6, 1, 0, 'wallR'),
]);

const violetDusk = withPlacementDefaults('violet-dusk-room', [
  place('violet-dusk-room', 'scalloped-teal-minbar', 'imported-model-69', 6.5, 0.5, 0, 'floor'),
  place('violet-dusk-room', 'tall-bookcase', 'imported-model-13', 0.5, 0.5, 90, 'floor'),
  place('violet-dusk-room', 'teal-quran-rehal', 'imported-model-96', 1.75, 1.5, 90, 'floor'),
  place('violet-dusk-room', 'teal-rug-left', 'imported-model-82', 1.5, 3.5, 90, 'floor'),
  place('violet-dusk-room', 'teal-rug-center', 'imported-model-82', 3.5, 3.5, 90, 'floor'),
  place('violet-dusk-room', 'teal-rug-right', 'imported-model-82', 5.5, 3.5, 90, 'floor'),
  place('violet-dusk-room', 'teal-pouf-left', 'imported-model-102', 0.5, 6.5, 0, 'floor'),
  place('violet-dusk-room', 'teal-pouf-right', 'imported-model-102', 1.75, 6.5, 0, 'floor'),
  place('violet-dusk-room', 'succulent', 'imported-model-12', 7.25, 7.25, 0, 'floor'),
  place('violet-dusk-room', 'quran-display', 'wall-art', 0, 2, 0, 'wallL'),
  place('violet-dusk-room', 'lantern-string', 'imported-model-49', 3, 3, 0, 'wallL'),
  place('violet-dusk-room', 'mashrabiya', 'imported-model-59', 0, 2, 0, 'wallR'),
  place('violet-dusk-room', 'mihrab-sconce-left', 'imported-model-39', 2, 2, 0, 'wallR'),
  place('violet-dusk-room', 'mihrab-sconce-right', 'imported-model-39', 6, 2, 0, 'wallR'),
]);

export const starterLayouts: Readonly<Record<BuildingId, readonly PlacedItem[]>> = {
  'peach-sunrise-room': peachSunrise,
  'violet-dusk-room': violetDusk,
};
