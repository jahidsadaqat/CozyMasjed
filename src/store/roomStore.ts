import { create } from 'zustand';
import { catalogById } from '../catalog/catalog';
import type { PlacementSurface } from '../catalog/types';
import {
  isWithinGrid,
  nearbyAnchors,
  placementsOverlap,
  rotateAroundCenter,
  type PlacedItem,
  type QuarterTurn,
} from '../domain/grid';
import { palette } from '../theme/palette';

export type LightingMode = 'day' | 'warm';

type DragPreview = {
  item: PlacedItem;
  valid: boolean;
};

type RoomState = {
  placedItems: PlacedItem[];
  floorColor: string;
  wallColor: string;
  accentColor: string;
  lighting: LightingMode;
  selectedItemId: string | null;
  placingCatalogId: string | null;
  draggingItemId: string | null;
  dragPreview: DragPreview | null;
  cameraZoom: number;
  setFloorColor: (color: string) => void;
  setWallColor: (color: string) => void;
  setAccentColor: (color: string) => void;
  toggleLighting: () => void;
  startPlacing: (catalogId: string) => void;
  cancelPlacement: () => void;
  selectItem: (id: string | null) => void;
  placeCatalogItem: (catalogId: string, gridX: number, gridY: number, surface: PlacementSurface) => boolean;
  beginDrag: (id: string) => void;
  previewMove: (candidate: PlacedItem) => void;
  invalidateDragPreview: () => void;
  finishDrag: () => boolean;
  cancelDrag: () => void;
  rotateSelected: (direction: 1 | -1) => boolean;
  duplicateSelected: () => boolean;
  deleteSelected: () => void;
  setCameraZoom: (zoom: number) => void;
};

function makePlacedId(catalogId: string) {
  return `${catalogId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function isValid(candidate: PlacedItem, placedItems: PlacedItem[], ignoredItemId?: string) {
  const candidateCatalog = catalogById[candidate.catalogId];
  if (!candidateCatalog || !candidateCatalog.allowedSurfaces.includes(candidate.surface)) return false;
  if (!isWithinGrid(candidate, candidateCatalog)) return false;
  return !placedItems.some((other) => {
    if (other.id === ignoredItemId) return false;
    const otherCatalog = catalogById[other.catalogId];
    return otherCatalog ? placementsOverlap(candidate, candidateCatalog, other, otherCatalog) : false;
  });
}

function nextQuarterTurn(rotation: QuarterTurn, direction: 1 | -1): QuarterTurn {
  return ((rotation + direction * 90 + 360) % 360) as QuarterTurn;
}

export const useRoomStore = create<RoomState>((set, get) => ({
  placedItems: [],
  floorColor: palette.woodLight,
  wallColor: '#F4E6C8',
  accentColor: palette.mutedTeal,
  lighting: 'day',
  selectedItemId: null,
  placingCatalogId: null,
  draggingItemId: null,
  dragPreview: null,
  cameraZoom: 72,
  setFloorColor: (floorColor) => set({ floorColor }),
  setWallColor: (wallColor) => set({ wallColor }),
  setAccentColor: (accentColor) => set({ accentColor }),
  toggleLighting: () => set((state) => ({ lighting: state.lighting === 'day' ? 'warm' : 'day' })),
  startPlacing: (placingCatalogId) => set({ placingCatalogId, selectedItemId: null }),
  cancelPlacement: () => set({ placingCatalogId: null }),
  selectItem: (selectedItemId) => set({ selectedItemId, placingCatalogId: null }),
  placeCatalogItem: (catalogId, gridX, gridY, surface) => {
    const candidate: PlacedItem = {
      id: makePlacedId(catalogId),
      catalogId,
      gridX,
      gridY,
      rotation: 0,
      surface,
    };
    if (!isValid(candidate, get().placedItems)) return false;
    set((state) => ({
      placedItems: [...state.placedItems, candidate],
      selectedItemId: candidate.id,
      placingCatalogId: null,
    }));
    return true;
  },
  beginDrag: (id) => {
    const item = get().placedItems.find((placed) => placed.id === id);
    if (!item) return;
    set({ draggingItemId: id, dragPreview: { item, valid: true }, selectedItemId: id, placingCatalogId: null });
  },
  previewMove: (candidate) => {
    const draggingItemId = get().draggingItemId;
    if (!draggingItemId || candidate.id !== draggingItemId) return;
    set({ dragPreview: { item: candidate, valid: isValid(candidate, get().placedItems, draggingItemId) } });
  },
  invalidateDragPreview: () =>
    set((state) => (state.dragPreview ? { dragPreview: { ...state.dragPreview, valid: false } } : state)),
  finishDrag: () => {
    const { dragPreview, draggingItemId } = get();
    if (!dragPreview || !draggingItemId) return false;
    if (!dragPreview.valid) {
      set({ dragPreview: null, draggingItemId: null });
      return false;
    }
    set((state) => ({
      placedItems: state.placedItems.map((item) => (item.id === draggingItemId ? dragPreview.item : item)),
      dragPreview: null,
      draggingItemId: null,
    }));
    return true;
  },
  cancelDrag: () => set({ dragPreview: null, draggingItemId: null }),
  rotateSelected: (direction) => {
    const state = get();
    const selected = state.placedItems.find((item) => item.id === state.selectedItemId);
    if (!selected) return false;
    const catalogItem = catalogById[selected.catalogId];
    if (!catalogItem || catalogItem.rotatable === false) return false;
    const rotation = nextQuarterTurn(selected.rotation, direction);
    const candidate = rotateAroundCenter(selected, catalogItem, rotation);
    if (!isValid(candidate, state.placedItems, selected.id)) return false;
    set({ placedItems: state.placedItems.map((item) => (item.id === selected.id ? candidate : item)) });
    return true;
  },
  duplicateSelected: () => {
    const state = get();
    const selected = state.placedItems.find((item) => item.id === state.selectedItemId);
    if (!selected) return false;
    const duplicateBase = { ...selected, id: makePlacedId(selected.catalogId) };
    const target = nearbyAnchors(duplicateBase).find((candidate) => isValid(candidate, state.placedItems));
    if (!target) return false;
    set({ placedItems: [...state.placedItems, target], selectedItemId: target.id });
    return true;
  },
  deleteSelected: () => {
    const selectedItemId = get().selectedItemId;
    if (!selectedItemId) return;
    set((state) => ({
      placedItems: state.placedItems.filter((item) => item.id !== selectedItemId),
      selectedItemId: null,
      dragPreview: null,
      draggingItemId: null,
    }));
  },
  setCameraZoom: (cameraZoom) => set({ cameraZoom }),
}));
