import type { BuildingId } from './buildings';
import {
  DEFAULT_PLACEMENT_LEVEL,
  getDefaultPlacementZoneId,
  type PlacedItem,
} from './grid';

export const STARTER_LAYOUT_REVISION = 5;

type StarterPlacedItem = Omit<PlacedItem, 'level' | 'zoneId'> & {
  level?: PlacedItem['level'];
  zoneId?: PlacedItem['zoneId'];
};

function withPlacementDefaults(items: readonly StarterPlacedItem[]): readonly PlacedItem[] {
  return items.map((item) => {
    const level = item.level ?? DEFAULT_PLACEMENT_LEVEL;
    const zoneId = item.zoneId ?? getDefaultPlacementZoneId(item.buildingId, level, item.surface);
    if (!zoneId) throw new Error(`Missing placement zone for starter item ${item.id}.`);
    return { ...item, level, zoneId };
  });
}

const cozyMasjid: readonly StarterPlacedItem[] = [
  { id: 'starter-v1-cozy-floor-lamp', buildingId: 'cozy-masjid', catalogId: 'imported-model-40', gridX: 0, gridY: 3, rotation: 0, surface: 'floor' },
  { id: 'starter-v1-cozy-sconce', buildingId: 'cozy-masjid', catalogId: 'imported-model-39', gridX: 2, gridY: 1, rotation: 0, surface: 'wallL' },
  { id: 'starter-v1-cozy-fanous', buildingId: 'cozy-masjid', catalogId: 'fanous-lantern', gridX: 7, gridY: 4, rotation: 0, surface: 'floor' },
  { id: 'starter-v1-cozy-bookcase', buildingId: 'cozy-masjid', catalogId: 'imported-model-13', gridX: 0, gridY: 0, rotation: 90, surface: 'floor' },
  { id: 'starter-v1-cozy-minbar', buildingId: 'cozy-masjid', catalogId: 'minbar', gridX: 6, gridY: 0, rotation: 0, surface: 'floor' },
  { id: 'starter-v1-cozy-rug-back-left', buildingId: 'cozy-masjid', catalogId: 'imported-model-81', gridX: 1, gridY: 2, rotation: 90, surface: 'floor' },
  { id: 'starter-v1-cozy-rug-back-right', buildingId: 'cozy-masjid', catalogId: 'imported-model-81', gridX: 3, gridY: 2, rotation: 90, surface: 'floor' },
  { id: 'starter-v1-cozy-rug-front-left', buildingId: 'cozy-masjid', catalogId: 'imported-model-81', gridX: 1, gridY: 4, rotation: 90, surface: 'floor' },
  { id: 'starter-v1-cozy-rug-front-right', buildingId: 'cozy-masjid', catalogId: 'imported-model-81', gridX: 3, gridY: 4, rotation: 90, surface: 'floor' },
  { id: 'starter-v1-cozy-quran', buildingId: 'cozy-masjid', catalogId: 'imported-model-96', gridX: 5, gridY: 4, rotation: 90, surface: 'floor' },
  { id: 'starter-v1-cozy-reading-cushion', buildingId: 'cozy-masjid', catalogId: 'imported-model-103', gridX: 6, gridY: 4, rotation: 0, surface: 'floor' },
  { id: 'starter-v1-cozy-shoe-rack', buildingId: 'cozy-masjid', catalogId: 'imported-model-38', gridX: 0, gridY: 7, rotation: 180, surface: 'floor' },
  { id: 'starter-v1-cozy-succulent', buildingId: 'cozy-masjid', catalogId: 'imported-model-12', gridX: 7, gridY: 7, rotation: 0, surface: 'floor' },
  { id: 'starter-v1-cozy-wall-quran', buildingId: 'cozy-masjid', catalogId: 'wall-art', gridX: 0, gridY: 1, rotation: 0, surface: 'wallL' },
  { id: 'starter-v1-cozy-prayer-clock', buildingId: 'cozy-masjid', catalogId: 'imported-model-53', gridX: 0, gridY: 1, rotation: 0, surface: 'wallR' },
  {
    id: 'starter-v1-cozy-sujud-figure',
    buildingId: 'cozy-masjid',
    catalogId: 'imported-model-09',
    gridX: 1,
    gridY: 4,
    rotation: 0,
    surface: 'floor',
    attachment: { hostItemId: 'starter-v1-cozy-rug-front-left', slotId: 'prayer-end' },
  },
  {
    id: 'starter-v1-cozy-reading-cat',
    buildingId: 'cozy-masjid',
    catalogId: 'imported-model-22',
    gridX: 6,
    gridY: 4,
    rotation: 90,
    surface: 'floor',
    attachment: { hostItemId: 'starter-v1-cozy-reading-cushion', slotId: 'cushion-center' },
  },
];

const archedAtrium: readonly StarterPlacedItem[] = [
  { id: 'starter-v1-atrium-floor-lamp', buildingId: 'arched-atrium', catalogId: 'imported-model-40', gridX: 7, gridY: 3, rotation: 0, surface: 'floor' },
  { id: 'starter-v1-atrium-sconce', buildingId: 'arched-atrium', catalogId: 'imported-model-39', gridX: 5, gridY: 1, rotation: 0, surface: 'wallR' },
  { id: 'starter-v1-atrium-fanous', buildingId: 'arched-atrium', catalogId: 'fanous-lantern', gridX: 2, gridY: 3, rotation: 0, surface: 'floor' },
  { id: 'starter-v1-atrium-prayer-rug', buildingId: 'arched-atrium', catalogId: 'imported-model-78', gridX: 3, gridY: 1, rotation: 90, surface: 'floor' },
  { id: 'starter-v1-atrium-quran', buildingId: 'arched-atrium', catalogId: 'imported-model-98', gridX: 5, gridY: 2, rotation: 90, surface: 'floor' },
  { id: 'starter-v1-atrium-majlis-table', buildingId: 'arched-atrium', catalogId: 'imported-model-27', gridX: 3, gridY: 5, rotation: 0, surface: 'floor' },
  { id: 'starter-v1-atrium-pouf-left', buildingId: 'arched-atrium', catalogId: 'imported-model-108', gridX: 2, gridY: 5, rotation: 90, surface: 'floor' },
  { id: 'starter-v1-atrium-pouf-right', buildingId: 'arched-atrium', catalogId: 'imported-model-103', gridX: 5, gridY: 5, rotation: 270, surface: 'floor' },
  { id: 'starter-v1-atrium-dallah-tray', buildingId: 'arched-atrium', catalogId: 'imported-model-45', gridX: 4, gridY: 6, rotation: 0, surface: 'floor' },
  { id: 'starter-v1-atrium-shoe-rack', buildingId: 'arched-atrium', catalogId: 'imported-model-38', gridX: 0, gridY: 7, rotation: 180, surface: 'floor' },
  { id: 'starter-v1-atrium-succulent', buildingId: 'arched-atrium', catalogId: 'imported-model-12', gridX: 7, gridY: 7, rotation: 0, surface: 'floor' },
  {
    id: 'starter-v1-atrium-dua-figure',
    buildingId: 'arched-atrium',
    catalogId: 'imported-model-08',
    gridX: 3,
    gridY: 1,
    rotation: 0,
    surface: 'floor',
    attachment: { hostItemId: 'starter-v1-atrium-prayer-rug', slotId: 'prayer-end' },
  },
];

export const starterLayouts: Readonly<Record<BuildingId, readonly PlacedItem[]>> = {
  'cozy-masjid': withPlacementDefaults(cozyMasjid),
  'arched-atrium': withPlacementDefaults(archedAtrium),
};
