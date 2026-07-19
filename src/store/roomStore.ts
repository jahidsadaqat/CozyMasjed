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

export type RoomSnapshot = {
  placedItems: PlacedItem[];
  floorColor: string;
  wallColor: string;
  accentColor: string;
  lighting: LightingMode;
};

type DragPreview = {
  item: PlacedItem;
  valid: boolean;
};

type TransientPatch = Partial<
  Pick<
    RoomState,
    | 'selectedItemId'
    | 'placingCatalogId'
    | 'draggingItemId'
    | 'dragPreview'
    | 'cameraZoom'
    | 'isCaptureClean'
    | 'readyModelItemIds'
  >
>;

export type RoomState = RoomSnapshot & {
  past: RoomSnapshot[];
  future: RoomSnapshot[];
  isHydrated: boolean;
  selectedItemId: string | null;
  placingCatalogId: string | null;
  draggingItemId: string | null;
  dragPreview: DragPreview | null;
  cameraZoom: number;
  isCaptureClean: boolean;
  readyModelItemIds: string[];
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
  undo: () => boolean;
  redo: () => boolean;
  hydrateRoom: (snapshot: RoomSnapshot) => void;
  finishHydration: () => void;
  setCameraZoom: (zoom: number) => void;
  setCaptureClean: (clean: boolean) => void;
  markModelReady: (placedItemId: string) => void;
};

const HISTORY_LIMIT = 50;

const initialRoom: RoomSnapshot = {
  placedItems: [],
  floorColor: palette.woodLight,
  wallColor: '#F4E6C8',
  accentColor: palette.mutedTeal,
  lighting: 'day',
};

function clonePlacedItems(items: readonly PlacedItem[]) {
  return items.map((item) => ({ ...item }));
}

export function cloneRoomSnapshot(snapshot: RoomSnapshot): RoomSnapshot {
  return {
    placedItems: clonePlacedItems(snapshot.placedItems),
    floorColor: snapshot.floorColor,
    wallColor: snapshot.wallColor,
    accentColor: snapshot.accentColor,
    lighting: snapshot.lighting,
  };
}

export function getInitialRoomSnapshot() {
  return cloneRoomSnapshot(initialRoom);
}

export function readRoomSnapshot(state: RoomSnapshot): RoomSnapshot {
  return cloneRoomSnapshot(state);
}

export function roomSnapshotsEqual(a: RoomSnapshot, b: RoomSnapshot) {
  if (
    a.floorColor !== b.floorColor ||
    a.wallColor !== b.wallColor ||
    a.accentColor !== b.accentColor ||
    a.lighting !== b.lighting ||
    a.placedItems.length !== b.placedItems.length
  ) {
    return false;
  }

  return a.placedItems.every((item, index) => {
    const other = b.placedItems[index];
    return (
      item.id === other.id &&
      item.catalogId === other.catalogId &&
      item.gridX === other.gridX &&
      item.gridY === other.gridY &&
      item.rotation === other.rotation &&
      item.surface === other.surface
    );
  });
}

function makePlacedId(catalogId: string) {
  return `${catalogId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function isValidPlacement(candidate: PlacedItem, placedItems: readonly PlacedItem[], ignoredItemId?: string) {
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

const clearEditorPatch: TransientPatch = {
  selectedItemId: null,
  placingCatalogId: null,
  draggingItemId: null,
  dragPreview: null,
  isCaptureClean: false,
};

export const useRoomStore = create<RoomState>((set, get) => {
  function commitRoom(nextRoom: RoomSnapshot, transientPatch: TransientPatch = {}) {
    const before = readRoomSnapshot(get());
    const next = cloneRoomSnapshot(nextRoom);
    if (roomSnapshotsEqual(before, next)) {
      if (Object.keys(transientPatch).length > 0) set(transientPatch);
      return false;
    }

    set((state) => ({
      ...next,
      ...transientPatch,
      past: [...state.past, before].slice(-HISTORY_LIMIT),
      future: [],
    }));
    return true;
  }

  return {
    ...getInitialRoomSnapshot(),
    past: [],
    future: [],
    isHydrated: false,
    selectedItemId: null,
    placingCatalogId: null,
    draggingItemId: null,
    dragPreview: null,
    cameraZoom: 72,
    isCaptureClean: false,
    readyModelItemIds: [],
    setFloorColor: (floorColor) => commitRoom({ ...readRoomSnapshot(get()), floorColor }),
    setWallColor: (wallColor) => commitRoom({ ...readRoomSnapshot(get()), wallColor }),
    setAccentColor: (accentColor) => commitRoom({ ...readRoomSnapshot(get()), accentColor }),
    toggleLighting: () => {
      const room = readRoomSnapshot(get());
      commitRoom({ ...room, lighting: room.lighting === 'day' ? 'warm' : 'day' });
    },
    startPlacing: (placingCatalogId) => {
      if (!catalogById[placingCatalogId]) return;
      set({ placingCatalogId, selectedItemId: null, draggingItemId: null, dragPreview: null });
    },
    cancelPlacement: () => set({ placingCatalogId: null }),
    selectItem: (selectedItemId) => {
      if (selectedItemId && !get().placedItems.some((item) => item.id === selectedItemId)) return;
      set({ selectedItemId, placingCatalogId: null, draggingItemId: null, dragPreview: null });
    },
    placeCatalogItem: (catalogId, gridX, gridY, surface) => {
      const state = get();
      const candidate: PlacedItem = {
        id: makePlacedId(catalogId),
        catalogId,
        gridX,
        gridY,
        rotation: 0,
        surface,
      };
      if (!isValidPlacement(candidate, state.placedItems)) return false;
      return commitRoom(
        { ...readRoomSnapshot(state), placedItems: [...clonePlacedItems(state.placedItems), candidate] },
        { selectedItemId: candidate.id, placingCatalogId: null },
      );
    },
    beginDrag: (id) => {
      const item = get().placedItems.find((placed) => placed.id === id);
      if (!item) return;
      set({
        draggingItemId: id,
        dragPreview: { item: { ...item }, valid: true },
        selectedItemId: id,
        placingCatalogId: null,
      });
    },
    previewMove: (candidate) => {
      const state = get();
      if (!state.draggingItemId || candidate.id !== state.draggingItemId) return;
      set({
        dragPreview: {
          item: { ...candidate },
          valid: isValidPlacement(candidate, state.placedItems, state.draggingItemId),
        },
      });
    },
    invalidateDragPreview: () =>
      set((state) => (state.dragPreview ? { dragPreview: { ...state.dragPreview, valid: false } } : state)),
    finishDrag: () => {
      const state = get();
      if (!state.dragPreview || !state.draggingItemId) return false;
      if (!state.dragPreview.valid) {
        set({ dragPreview: null, draggingItemId: null });
        return false;
      }
      return commitRoom(
        {
          ...readRoomSnapshot(state),
          placedItems: state.placedItems.map((item) =>
            item.id === state.draggingItemId ? { ...state.dragPreview!.item } : { ...item },
          ),
        },
        { dragPreview: null, draggingItemId: null },
      );
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
      if (!isValidPlacement(candidate, state.placedItems, selected.id)) return false;
      return commitRoom({
        ...readRoomSnapshot(state),
        placedItems: state.placedItems.map((item) => (item.id === selected.id ? candidate : { ...item })),
      });
    },
    duplicateSelected: () => {
      const state = get();
      const selected = state.placedItems.find((item) => item.id === state.selectedItemId);
      if (!selected) return false;
      const duplicateBase = { ...selected, id: makePlacedId(selected.catalogId) };
      const target = nearbyAnchors(duplicateBase).find((candidate) => isValidPlacement(candidate, state.placedItems));
      if (!target) return false;
      return commitRoom(
        { ...readRoomSnapshot(state), placedItems: [...clonePlacedItems(state.placedItems), target] },
        { selectedItemId: target.id },
      );
    },
    deleteSelected: () => {
      const state = get();
      if (!state.selectedItemId || !state.placedItems.some((item) => item.id === state.selectedItemId)) return;
      commitRoom(
        {
          ...readRoomSnapshot(state),
          placedItems: state.placedItems.filter((item) => item.id !== state.selectedItemId).map((item) => ({ ...item })),
        },
        {
          ...clearEditorPatch,
          readyModelItemIds: state.readyModelItemIds.filter((id) => id !== state.selectedItemId),
        },
      );
    },
    undo: () => {
      const state = get();
      const target = state.past.at(-1);
      if (!target) return false;
      const current = readRoomSnapshot(state);
      const targetIds = new Set(target.placedItems.map((item) => item.id));
      set({
        ...cloneRoomSnapshot(target),
        ...clearEditorPatch,
        past: state.past.slice(0, -1),
        future: [current, ...state.future].slice(0, HISTORY_LIMIT),
        readyModelItemIds: state.readyModelItemIds.filter((id) => targetIds.has(id)),
      });
      return true;
    },
    redo: () => {
      const state = get();
      const target = state.future[0];
      if (!target) return false;
      const current = readRoomSnapshot(state);
      const targetIds = new Set(target.placedItems.map((item) => item.id));
      set({
        ...cloneRoomSnapshot(target),
        ...clearEditorPatch,
        past: [...state.past, current].slice(-HISTORY_LIMIT),
        future: state.future.slice(1),
        readyModelItemIds: state.readyModelItemIds.filter((id) => targetIds.has(id)),
      });
      return true;
    },
    hydrateRoom: (snapshot) =>
      set({
        ...cloneRoomSnapshot(snapshot),
        ...clearEditorPatch,
        past: [],
        future: [],
        isHydrated: true,
        readyModelItemIds: [],
      }),
    finishHydration: () => set({ isHydrated: true }),
    setCameraZoom: (cameraZoom) => set({ cameraZoom }),
    setCaptureClean: (isCaptureClean) => set({ isCaptureClean }),
    markModelReady: (placedItemId) =>
      set((state) => {
        if (
          state.readyModelItemIds.includes(placedItemId) ||
          !state.placedItems.some((item) => item.id === placedItemId)
        ) {
          return state;
        }
        return { readyModelItemIds: [...state.readyModelItemIds, placedItemId] };
      }),
  };
});
