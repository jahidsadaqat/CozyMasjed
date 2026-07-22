import * as THREE from 'three';
import type { CatalogItem, PlacementSurface } from '../catalog/types';
import type { BuildingId } from './buildings';

export const GRID_SIZE = 8;
export const WALL_ROWS = 4;
export const ROOM_SIZE = 4.4;
export const CELL_SIZE = ROOM_SIZE / GRID_SIZE;
export const FLOOR_TOP = 0.04;
export const WALL_INSET = -2.035;
export const UPPER_FLOOR_TOP = 2.071;

export const PLACEMENT_LEVELS = ['ground', 'upper'] as const;
export type PlacementLevel = (typeof PLACEMENT_LEVELS)[number];
export const DEFAULT_PLACEMENT_LEVEL: PlacementLevel = 'ground';

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

type BuildingPlacementGrids = Readonly<
  Partial<Record<PlacementLevel, Readonly<Partial<Record<PlacementSurface, PlacementGrid>>>>>
>;

const groundFloor: PlacementGrid = {
  columns: GRID_SIZE,
  rows: GRID_SIZE,
  cellSize: CELL_SIZE,
  originX: -ROOM_SIZE / 2,
  originY: FLOOR_TOP,
  originZ: -ROOM_SIZE / 2,
};

const groundWallL: PlacementGrid = {
  columns: GRID_SIZE,
  rows: WALL_ROWS,
  cellSize: CELL_SIZE,
  originX: WALL_INSET,
  originY: FLOOR_TOP,
  originZ: -ROOM_SIZE / 2,
};

const groundWallR: PlacementGrid = {
  columns: GRID_SIZE,
  rows: WALL_ROWS,
  cellSize: CELL_SIZE,
  originX: -ROOM_SIZE / 2,
  originY: FLOOR_TOP,
  originZ: WALL_INSET,
};

const groundGrids = {
  floor: groundFloor,
  wallL: groundWallL,
  wallR: groundWallR,
} as const;

const upperWallRWindowCells = new Set(
  [0, 1, 2].flatMap((gridY) => [0, 1, 2, 3].map((gridX) => `${gridX}:${gridY}`)),
);

const placementGrids: Readonly<Record<BuildingId, BuildingPlacementGrids>> = {
  'cozy-masjid': {
    ground: groundGrids,
  },
  'arched-atrium': {
    ground: groundGrids,
    upper: {
      // Measured from the normalized two-level GLB. The inset keeps furniture
      // inside the terrace rail and away from the irregular stair opening.
      floor: {
        columns: 6,
        rows: 2,
        cellSize: CELL_SIZE,
        originX: -1.65,
        originY: UPPER_FLOOR_TOP,
        originZ: -1.65,
      },
      wallL: {
        columns: 2,
        rows: 3,
        cellSize: CELL_SIZE,
        rowSize: 0.5,
        originX: -1.869,
        originY: UPPER_FLOOR_TOP,
        originZ: -1.65,
      },
      wallR: {
        columns: 6,
        rows: 3,
        cellSize: CELL_SIZE,
        rowSize: 0.5,
        originX: -1.65,
        originY: UPPER_FLOOR_TOP,
        originZ: -1.869,
        // The GLB has two real upper-storey window openings. Those grid cells
        // stay unavailable so wall décor cannot float across the glass.
        blockedCells: upperWallRWindowCells,
      },
    },
  },
};

export function isPlacementLevel(value: unknown): value is PlacementLevel {
  return typeof value === 'string' && PLACEMENT_LEVELS.includes(value as PlacementLevel);
}

export function getPlacementGrid(
  buildingId: BuildingId,
  level: PlacementLevel,
  surface: PlacementSurface,
): PlacementGrid | null {
  return placementGrids[buildingId]?.[level]?.[surface] ?? null;
}

export function getPlacementLevels(buildingId: BuildingId): readonly PlacementLevel[] {
  return PLACEMENT_LEVELS.filter((level) => Boolean(placementGrids[buildingId]?.[level]));
}

export function getPlacementSize(item: CatalogItem, surface: PlacementSurface, rotation: QuarterTurn): PlacementSize {
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
  const grid = getPlacementGrid(placed.buildingId, placed.level, placed.surface);
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

export function placementsOverlap(a: PlacedItem, aCatalog: CatalogItem, b: PlacedItem, bCatalog: CatalogItem) {
  if (a.surface !== b.surface || a.level !== b.level) return false;
  const aSize = getPlacementSize(aCatalog, a.surface, a.rotation);
  const bSize = getPlacementSize(bCatalog, b.surface, b.rotation);
  return !(
    a.gridX + aSize.width <= b.gridX ||
    b.gridX + bSize.width <= a.gridX ||
    a.gridY + aSize.height <= b.gridY ||
    b.gridY + bSize.height <= a.gridY
  );
}

export function placementToWorld(placed: PlacedItem, catalogItem: CatalogItem): [number, number, number] {
  const grid = getPlacementGrid(placed.buildingId, placed.level, placed.surface);
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
    return [grid.originX, vertical, wallHorizontal];
  }
  return [horizontal, vertical, grid.originZ];
}

export function worldToPlacement(
  point: THREE.Vector3,
  catalogItem: CatalogItem,
  buildingId: BuildingId,
  level: PlacementLevel,
  surface: PlacementSurface,
  rotation: QuarterTurn,
  centerWallItemOnPoint = false,
): Pick<PlacedItem, 'gridX' | 'gridY' | 'rotation' | 'surface' | 'level'> {
  const grid = getPlacementGrid(buildingId, level, surface);
  if (!grid) return { gridX: -1, gridY: -1, rotation, surface, level };

  const size = getPlacementSize(catalogItem, surface, rotation);
  const rowSize = grid.rowSize ?? grid.cellSize;
  const horizontalWorld = surface === 'wallL' ? point.z : point.x;
  const horizontalOrigin = surface === 'wallL' ? grid.originZ : grid.originX;
  const gridX = Math.round((horizontalWorld - horizontalOrigin) / grid.cellSize - size.width / 2);
  const gridY =
    surface === 'floor'
      ? Math.round((point.z - grid.originZ) / rowSize - size.height / 2)
      : Math.round(
          (point.y - grid.originY - 0.1) / rowSize - (centerWallItemOnPoint ? size.height / 2 : 0),
        );
  return { gridX, gridY, rotation, surface, level };
}

export function rotateAroundCenter(placed: PlacedItem, catalogItem: CatalogItem, rotation: QuarterTurn): PlacedItem {
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
      if (dy !== 0) candidates.push({ ...origin, gridX: origin.gridX + dx, gridY: origin.gridY - dy });
    }
  }
  return candidates;
}
