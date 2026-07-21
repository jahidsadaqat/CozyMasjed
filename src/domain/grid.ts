import * as THREE from 'three';
import type { CatalogItem, PlacementSurface } from '../catalog/types';
import type { BuildingId } from './buildings';

export const GRID_SIZE = 8;
export const WALL_ROWS = 4;
export const ROOM_SIZE = 4.4;
export const CELL_SIZE = ROOM_SIZE / GRID_SIZE;
export const FLOOR_TOP = 0.04;
export const WALL_INSET = -2.035;

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
  attachment?: ItemAttachment;
};

export type PlacementSize = { width: number; height: number };

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
  const size = getPlacementSize(item, placed.surface, placed.rotation);
  const rowLimit = placed.surface === 'floor' ? GRID_SIZE : WALL_ROWS;
  return (
    placed.gridX >= 0 &&
    placed.gridY >= 0 &&
    placed.gridX + size.width <= GRID_SIZE &&
    placed.gridY + size.height <= rowLimit
  );
}

export function placementsOverlap(a: PlacedItem, aCatalog: CatalogItem, b: PlacedItem, bCatalog: CatalogItem) {
  if (a.surface !== b.surface) return false;
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
  const size = getPlacementSize(catalogItem, placed.surface, placed.rotation);
  const horizontal = -ROOM_SIZE / 2 + (placed.gridX + size.width / 2) * CELL_SIZE;

  if (placed.surface === 'floor') {
    const depth = -ROOM_SIZE / 2 + (placed.gridY + size.height / 2) * CELL_SIZE;
    return [horizontal, FLOOR_TOP, depth];
  }

  const vertical = FLOOR_TOP + placed.gridY * CELL_SIZE + 0.1;
  if (placed.surface === 'wallL') {
    return [WALL_INSET, vertical, horizontal];
  }
  return [horizontal, vertical, WALL_INSET];
}

export function worldToPlacement(
  point: THREE.Vector3,
  catalogItem: CatalogItem,
  surface: PlacementSurface,
  rotation: QuarterTurn,
  centerWallItemOnPoint = false,
): Pick<PlacedItem, 'gridX' | 'gridY' | 'rotation' | 'surface'> {
  const size = getPlacementSize(catalogItem, surface, rotation);
  const horizontalWorld = surface === 'wallL' ? point.z : point.x;
  const gridX = Math.round((horizontalWorld + ROOM_SIZE / 2) / CELL_SIZE - size.width / 2);
  const gridY =
    surface === 'floor'
      ? Math.round((point.z + ROOM_SIZE / 2) / CELL_SIZE - size.height / 2)
      : Math.round(
          (point.y - FLOOR_TOP - 0.1) / CELL_SIZE - (centerWallItemOnPoint ? size.height / 2 : 0),
        );
  return { gridX, gridY, rotation, surface };
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
