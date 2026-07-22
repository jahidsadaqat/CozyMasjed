import * as THREE from 'three';
import type { CatalogItem, PlacementSurface } from '../catalog/types';
import type { BuildingId } from './buildings';

export const GRID_SIZE = 8;
export const WALL_ROWS = 4;
export const ROOM_SIZE = 4.4;
export const CELL_SIZE = ROOM_SIZE / GRID_SIZE;
export const FLOOR_TOP = 0.04;
export const WALL_INSET = -2.035;
export const UPPER_FLOOR_TOP = 2.095;
export const WALL_MOUNT_CLEARANCE = 0.018;

export const PLACEMENT_LEVELS = ['ground', 'upper'] as const;
export type PlacementLevel = (typeof PLACEMENT_LEVELS)[number];
export const DEFAULT_PLACEMENT_LEVEL: PlacementLevel = 'ground';

export const PLACEMENT_ZONE_IDS = [
  'cozy-ground-floor',
  'cozy-ground-left',
  'cozy-ground-back',
  'atrium-ground-floor',
  'atrium-ground-back',
  'atrium-ground-stair',
  'atrium-ground-outer-left',
  'atrium-upper-floor',
  'atrium-upper-back',
  'atrium-upper-back-center',
  'atrium-upper-left',
] as const;

export type PlacementZoneId = (typeof PLACEMENT_ZONE_IDS)[number];
export type QuarterTurn = 0 | 90 | 180 | 270;

export type ItemAttachment = {
  hostItemId: string;
  slotId: string;
};

export type PlacedItem = {
  id: string;
  buildingId: BuildingId;
  catalogId: string;
  gridX: number;
  gridY: number;
  rotation: QuarterTurn;
  surface: PlacementSurface;
  level: PlacementLevel;
  zoneId: PlacementZoneId;
  attachment?: ItemAttachment;
};

export type PlacementSize = { width: number; height: number };

export type PlacementGrid = {
  columns: number;
  rows: number;
  cellSize: number;
  rowSize?: number;
  originX: number;
  originY: number;
  originZ: number;
  blockedCells?: ReadonlySet<string>;
};

export type PlacementZone = PlacementGrid & {
  id: PlacementZoneId;
  buildingId: BuildingId;
  level: PlacementLevel;
  surface: PlacementSurface;
  // Opening blockers stop a ray from travelling through a window or niche and
  // accidentally mounting an item on a farther wall. Cells blocked only by a
  // sloped wall outline are intentionally omitted so the real wall behind can
  // still be selected.
  occluderCells?: ReadonlySet<string>;
};

function cellSet(cells: readonly (readonly [number, number])[]) {
  return new Set(cells.map(([gridX, gridY]) => `${gridX}:${gridY}`));
}

function rectangularCells(columns: readonly number[], rows: readonly number[]) {
  return cellSet(rows.flatMap((gridY) => columns.map((gridX) => [gridX, gridY] as const)));
}

const cozyLeftOpening = rectangularCells([4, 5], [1, 2]);
const cozyBackNiche = rectangularCells([4, 5], [0, 1, 2]);
const atriumGroundBackOpening = rectangularCells([1, 2], [0, 1]);
const atriumGroundStairOutside = cellSet([
  [4, 0],
  [3, 1], [4, 1],
  [2, 2], [3, 2], [4, 2],
]);
const atriumGroundOuterLeftOutside = cellSet([
  [0, 0], [1, 0], [2, 0],
  [0, 1], [1, 1],
  [0, 2],
  [0, 3],
]);
const atriumUpperLeftOpening = rectangularCells([3, 4], [0, 1, 2]);
const atriumUpperBackOpenings = rectangularCells([0, 1, 2, 3], [0, 1, 2]);

const placementZones: readonly PlacementZone[] = [
  {
    id: 'cozy-ground-floor',
    buildingId: 'cozy-masjid',
    level: 'ground',
    surface: 'floor',
    columns: GRID_SIZE,
    rows: GRID_SIZE,
    cellSize: CELL_SIZE,
    originX: -ROOM_SIZE / 2,
    originY: FLOOR_TOP,
    originZ: -ROOM_SIZE / 2,
  },
  {
    id: 'cozy-ground-left',
    buildingId: 'cozy-masjid',
    level: 'ground',
    surface: 'wallL',
    columns: GRID_SIZE,
    rows: WALL_ROWS,
    cellSize: CELL_SIZE,
    originX: WALL_INSET,
    originY: FLOOR_TOP,
    originZ: -ROOM_SIZE / 2,
    blockedCells: cozyLeftOpening,
    occluderCells: cozyLeftOpening,
  },
  {
    id: 'cozy-ground-back',
    buildingId: 'cozy-masjid',
    level: 'ground',
    surface: 'wallR',
    columns: GRID_SIZE,
    rows: WALL_ROWS,
    cellSize: CELL_SIZE,
    originX: -ROOM_SIZE / 2,
    originY: FLOOR_TOP,
    originZ: WALL_INSET,
    blockedCells: cozyBackNiche,
    occluderCells: cozyBackNiche,
  },
  {
    id: 'atrium-ground-floor',
    buildingId: 'arched-atrium',
    level: 'ground',
    surface: 'floor',
    columns: GRID_SIZE,
    rows: GRID_SIZE,
    cellSize: CELL_SIZE,
    originX: -ROOM_SIZE / 2,
    originY: FLOOR_TOP,
    originZ: -ROOM_SIZE / 2,
  },
  {
    // Downstairs back-wall proxy aligned to the measured inner face. The
    // mount clearance is applied later by placementToWorld().
    id: 'atrium-ground-back',
    buildingId: 'arched-atrium',
    level: 'ground',
    surface: 'wallR',
    columns: 6,
    rows: 3,
    cellSize: CELL_SIZE,
    rowSize: CELL_SIZE,
    originX: -1.35,
    originY: FLOOR_TOP,
    originZ: -1.34,
    blockedCells: atriumGroundBackOpening,
    occluderCells: atriumGroundBackOpening,
  },
  {
    // Triangular wall below the stairs. Its blocked cells follow the descending
    // stair profile; they are not occluders because the outer-left wall remains
    // legitimately visible through the open area above it.
    id: 'atrium-ground-stair',
    buildingId: 'arched-atrium',
    level: 'ground',
    surface: 'wallL',
    columns: 5,
    rows: 3,
    cellSize: CELL_SIZE,
    rowSize: CELL_SIZE,
    originX: -1.36,
    originY: FLOOR_TOP,
    originZ: -1.4,
    blockedCells: atriumGroundStairOutside,
  },
  {
    // Stepped exposed section of the outer-left wall beside the staircase.
    // Invalid cells also occlude rays so openings cannot target geometry
    // behind the visible wall outline.
    id: 'atrium-ground-outer-left',
    buildingId: 'arched-atrium',
    level: 'ground',
    surface: 'wallL',
    columns: 3,
    rows: 4,
    cellSize: CELL_SIZE,
    rowSize: 0.5,
    originX: -1.84,
    originY: FLOOR_TOP,
    originZ: 0.1,
    blockedCells: atriumGroundOuterLeftOutside,
    occluderCells: atriumGroundOuterLeftOutside,
  },
  {
    id: 'atrium-upper-floor',
    buildingId: 'arched-atrium',
    level: 'upper',
    surface: 'floor',
    columns: 6,
    rows: 2,
    cellSize: CELL_SIZE,
    originX: -1.65,
    originY: UPPER_FLOOR_TOP,
    originZ: -1.65,
  },
  {
    id: 'atrium-upper-back',
    buildingId: 'arched-atrium',
    level: 'upper',
    surface: 'wallR',
    columns: 6,
    rows: 3,
    cellSize: CELL_SIZE,
    rowSize: 0.5,
    originX: -1.65,
    originY: UPPER_FLOOR_TOP,
    originZ: -1.83,
    blockedCells: atriumUpperBackOpenings,
    occluderCells: atriumUpperBackOpenings,
  },
  {
    // A narrow solid island between the two upper arches. It is a separate
    // zone so slim sconces can use it while wider decor remains excluded. Its
    // proxy remains in front of the adjacent upper-back occluder proxies.
    id: 'atrium-upper-back-center',
    buildingId: 'arched-atrium',
    level: 'upper',
    surface: 'wallR',
    columns: 1,
    rows: 3,
    cellSize: CELL_SIZE,
    rowSize: 0.5,
    originX: -0.875,
    originY: UPPER_FLOOR_TOP,
    originZ: -1.81,
  },
  {
    id: 'atrium-upper-left',
    buildingId: 'arched-atrium',
    level: 'upper',
    surface: 'wallL',
    columns: 6,
    rows: 3,
    cellSize: CELL_SIZE,
    rowSize: 0.5,
    originX: -1.84,
    originY: UPPER_FLOOR_TOP,
    originZ: -1.65,
    blockedCells: atriumUpperLeftOpening,
    occluderCells: atriumUpperLeftOpening,
  },
] as const;

const placementZoneById = Object.fromEntries(
  placementZones.map((zone) => [zone.id, zone]),
) as Record<PlacementZoneId, PlacementZone>;

export function isPlacementLevel(value: unknown): value is PlacementLevel {
  return typeof value === 'string' && PLACEMENT_LEVELS.includes(value as PlacementLevel);
}

export function isPlacementZoneId(value: unknown): value is PlacementZoneId {
  return typeof value === 'string' && PLACEMENT_ZONE_IDS.includes(value as PlacementZoneId);
}

export function getPlacementZone(zoneId: PlacementZoneId): PlacementZone {
  return placementZoneById[zoneId];
}

export function getPlacementZones(
  buildingId: BuildingId,
  level?: PlacementLevel,
  surface?: PlacementSurface,
): readonly PlacementZone[] {
  return placementZones.filter(
    (zone) =>
      zone.buildingId === buildingId &&
      (!level || zone.level === level) &&
      (!surface || zone.surface === surface),
  );
}

export function getDefaultPlacementZoneId(
  buildingId: BuildingId,
  level: PlacementLevel,
  surface: PlacementSurface,
): PlacementZoneId | null {
  return getPlacementZones(buildingId, level, surface)[0]?.id ?? null;
}

export function getPlacementGrid(
  buildingId: BuildingId,
  level: PlacementLevel,
  surface: PlacementSurface,
  zoneId?: PlacementZoneId,
): PlacementGrid | null {
  const resolvedZoneId = zoneId ?? getDefaultPlacementZoneId(buildingId, level, surface);
  if (!resolvedZoneId) return null;
  const zone = getPlacementZone(resolvedZoneId);
  return zone.buildingId === buildingId && zone.level === level && zone.surface === surface
    ? zone
    : null;
}

export function getPlacementLevels(buildingId: BuildingId): readonly PlacementLevel[] {
  return PLACEMENT_LEVELS.filter((level) => getPlacementZones(buildingId, level).length > 0);
}

export function getPlacementSize(
  item: CatalogItem,
  surface: PlacementSurface,
  rotation: QuarterTurn,
): PlacementSize {
  if (surface !== 'floor') {
    return item.wallFootprint ?? { width: item.footprint.width, height: item.footprint.depth };
  }

  const isSideways = rotation === 90 || rotation === 270;
  return {
    width: isSideways ? item.footprint.depth : item.footprint.width,
    height: isSideways ? item.footprint.width : item.footprint.depth,
  };
}

export function isWithinGrid(placed: PlacedItem, item: CatalogItem) {
  const grid = getPlacementGrid(
    placed.buildingId,
    placed.level,
    placed.surface,
    placed.zoneId,
  );
  if (!grid) return false;

  const size = getPlacementSize(item, placed.surface, placed.rotation);
  if (
    placed.gridX < 0 ||
    placed.gridY < 0 ||
    placed.gridX + size.width > grid.columns ||
    placed.gridY + size.height > grid.rows
  ) {
    return false;
  }

  if (grid.blockedCells) {
    for (let gridY = placed.gridY; gridY < placed.gridY + size.height; gridY += 1) {
      for (let gridX = placed.gridX; gridX < placed.gridX + size.width; gridX += 1) {
        if (grid.blockedCells.has(`${gridX}:${gridY}`)) return false;
      }
    }
  }

  return true;
}

export function findNearestWithinGridPlacement(
  origin: PlacedItem,
  catalogItem: CatalogItem,
): PlacedItem | null {
  if (isWithinGrid(origin, catalogItem)) return origin;
  const grid = getPlacementGrid(origin.buildingId, origin.level, origin.surface, origin.zoneId);
  if (!grid) return null;
  const size = getPlacementSize(catalogItem, origin.surface, origin.rotation);
  const candidates: PlacedItem[] = [];

  for (let gridY = 0; gridY <= grid.rows - size.height; gridY += 1) {
    for (let gridX = 0; gridX <= grid.columns - size.width; gridX += 1) {
      const candidate = { ...origin, gridX, gridY };
      if (isWithinGrid(candidate, catalogItem)) candidates.push(candidate);
    }
  }

  candidates.sort((a, b) => {
    const distanceA = (a.gridX - origin.gridX) ** 2 + (a.gridY - origin.gridY) ** 2;
    const distanceB = (b.gridX - origin.gridX) ** 2 + (b.gridY - origin.gridY) ** 2;
    return distanceA - distanceB;
  });
  return candidates[0] ?? null;
}

export function placementsOverlap(
  a: PlacedItem,
  aCatalog: CatalogItem,
  b: PlacedItem,
  bCatalog: CatalogItem,
) {
  if (a.zoneId !== b.zoneId) return false;
  const aSize = getPlacementSize(aCatalog, a.surface, a.rotation);
  const bSize = getPlacementSize(bCatalog, b.surface, b.rotation);
  return !(
    a.gridX + aSize.width <= b.gridX ||
    b.gridX + bSize.width <= a.gridX ||
    a.gridY + aSize.height <= b.gridY ||
    b.gridY + bSize.height <= a.gridY
  );
}

export function placementToWorld(
  placed: PlacedItem,
  catalogItem: CatalogItem,
): [number, number, number] {
  const grid = getPlacementGrid(
    placed.buildingId,
    placed.level,
    placed.surface,
    placed.zoneId,
  );
  if (!grid) return [0, FLOOR_TOP, 0];

  const size = getPlacementSize(catalogItem, placed.surface, placed.rotation);
  const rowSize = grid.rowSize ?? grid.cellSize;
  const horizontal = grid.originX + (placed.gridX + size.width / 2) * grid.cellSize;

  if (placed.surface === 'floor') {
    const depth = grid.originZ + (placed.gridY + size.height / 2) * rowSize;
    return [horizontal, grid.originY, depth];
  }

  const vertical = grid.originY + placed.gridY * rowSize + 0.1;
  if (placed.surface === 'wallL') {
    const wallHorizontal = grid.originZ + (placed.gridX + size.width / 2) * grid.cellSize;
    return [grid.originX + WALL_MOUNT_CLEARANCE, vertical, wallHorizontal];
  }
  return [horizontal, vertical, grid.originZ + WALL_MOUNT_CLEARANCE];
}

export function worldToPlacement(
  point: THREE.Vector3,
  catalogItem: CatalogItem,
  zoneId: PlacementZoneId,
  rotation: QuarterTurn,
  centerWallItemOnPoint = false,
): Pick<PlacedItem, 'gridX' | 'gridY' | 'rotation' | 'surface' | 'level' | 'zoneId'> {
  const zone = getPlacementZone(zoneId);
  const size = getPlacementSize(catalogItem, zone.surface, rotation);
  const rowSize = zone.rowSize ?? zone.cellSize;
  const horizontalWorld = zone.surface === 'wallL' ? point.z : point.x;
  const horizontalOrigin = zone.surface === 'wallL' ? zone.originZ : zone.originX;
  const gridX = Math.round(
    (horizontalWorld - horizontalOrigin) / zone.cellSize - size.width / 2,
  );
  const gridY =
    zone.surface === 'floor'
      ? Math.round((point.z - zone.originZ) / rowSize - size.height / 2)
      : Math.round(
          (point.y - zone.originY - 0.1) / rowSize -
            (centerWallItemOnPoint ? size.height / 2 : 0),
        );
  return {
    gridX,
    gridY,
    rotation,
    surface: zone.surface,
    level: zone.level,
    zoneId,
  };
}

export function rotateAroundCenter(
  placed: PlacedItem,
  catalogItem: CatalogItem,
  rotation: QuarterTurn,
): PlacedItem {
  if (placed.surface !== 'floor') return { ...placed, rotation };
  const oldSize = getPlacementSize(catalogItem, placed.surface, placed.rotation);
  const nextSize = getPlacementSize(catalogItem, placed.surface, rotation);
  const centerX = placed.gridX + oldSize.width / 2;
  const centerY = placed.gridY + oldSize.height / 2;
  return {
    ...placed,
    rotation,
    gridX: Math.round(centerX - nextSize.width / 2),
    gridY: Math.round(centerY - nextSize.height / 2),
  };
}

export function nearbyAnchors(origin: PlacedItem, radius = (GRID_SIZE - 1) * 2): PlacedItem[] {
  const candidates: PlacedItem[] = [];
  for (let distance = 1; distance <= radius; distance += 1) {
    for (let dx = -distance; dx <= distance; dx += 1) {
      const dy = distance - Math.abs(dx);
      candidates.push({ ...origin, gridX: origin.gridX + dx, gridY: origin.gridY + dy });
      if (dy !== 0) {
        candidates.push({ ...origin, gridX: origin.gridX + dx, gridY: origin.gridY - dy });
      }
    }
  }
  return candidates;
}
