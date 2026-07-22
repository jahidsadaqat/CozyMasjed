import { create } from 'zustand';
import {
  emitInteractionFeedback,
  type InteractionFeedbackOptions,
} from '../feedback/interactionFeedbackEvents';
import { catalogById } from '../catalog/catalog';
import type { PlacementSurface } from '../catalog/types';
import { CAMERA_TARGET, DEFAULT_CAMERA_YAW, DEFAULT_CAMERA_ZOOM } from '../domain/camera';
import { canAttachToSlot, getAttachmentSlot } from '../domain/attachments';
import { defaultBuildingId, type BuildingId } from '../domain/buildings';
import {
  DEFAULT_PLACEMENT_LEVEL,
  getDefaultPlacementZoneId,
  getPlacementSize,
  getPlacementZones,
  isWithinGrid,
  nearbyAnchors,
  placementsOverlap,
  rotateAroundCenter,
  type PlacementLevel,
  type PlacementZoneId,
  type PlacedItem,
  type QuarterTurn,
} from '../domain/grid';
import { defaultWeatherMode, type WeatherMode } from '../domain/weather';
import { defaultBackgroundId, type BackgroundId } from '../theme/backgrounds';
import { palette } from '../theme/palette';

export type RoomSnapshot = {
  placedItems: PlacedItem[];
  floorColor: string;
  wallColor: string;
  backgroundId: BackgroundId;
  accentColor: string;
  weather: WeatherMode;
};

type DragPreview = {
  item: PlacedItem;
  valid: boolean;
};

export type PlacementPreview = {
  item: PlacedItem;
  valid: boolean;
};

type TransientPatch = Partial<
  Pick<
    RoomState,
    | 'selectedItemId'
    | 'placingCatalogId'
    | 'placementPreview'
    | 'draggingItemId'
    | 'dragPreview'
    | 'cameraZoom'
    | 'cameraYaw'
    | 'cameraTarget'
    | 'isCaptureClean'
    | 'readyModelItemIds'
    | 'readyBackgroundId'
  >
>;

export type RoomState = RoomSnapshot & {
  past: RoomSnapshot[];
  future: RoomSnapshot[];
  isHydrated: boolean;
  activeBuildingId: BuildingId;
  selectedItemId: string | null;
  placingCatalogId: string | null;
  placementPreview: PlacementPreview | null;
  draggingItemId: string | null;
  dragPreview: DragPreview | null;
  cameraZoom: number;
  cameraYaw: number;
  cameraTarget: [number, number, number];
  isCaptureClean: boolean;
  readyModelItemIds: string[];
  readyBackgroundId: BackgroundId | null;
  setActiveBuildingId: (buildingId: BuildingId) => void;
  setFloorColor: (color: string) => void;
  setWallColor: (color: string) => void;
  setBackgroundId: (backgroundId: BackgroundId) => void;
  setAccentColor: (color: string) => void;
  setWeather: (weather: WeatherMode) => void;
  startPlacing: (catalogId: string) => void;
  cancelPlacement: () => void;
  previewPlacement: (
    candidate: PlacedItem,
    moveFeedback?: InteractionFeedbackOptions | false,
  ) => void;
  invalidatePlacementPreview: () => void;
  commitPlacementPreview: () => boolean;
  selectItem: (id: string | null) => void;
  placeCatalogItem: (
    catalogId: string,
    gridX: number,
    gridY: number,
    surface: PlacementSurface,
    level?: PlacementLevel,
    zoneId?: PlacementZoneId,
  ) => boolean;
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
  hydrateRoom: (snapshot: RoomSnapshot, activeBuildingId?: BuildingId) => void;
  finishHydration: () => void;
  setCameraView: (zoom: number, yaw: number, target: [number, number, number]) => void;
  setCaptureClean: (clean: boolean) => void;
  markModelReady: (placedItemId: string) => void;
  markBackgroundReady: (backgroundId: BackgroundId) => void;
};

const HISTORY_LIMIT = 50;

const initialRoom: RoomSnapshot = {
  placedItems: [],
  floorColor: palette.woodLight,
  wallColor: '#F4E6C8',
  backgroundId: defaultBackgroundId,
  accentColor: palette.mutedTeal,
  weather: defaultWeatherMode,
};

function clonePlacedItems(items: readonly PlacedItem[]) {
  return items.map((item) => ({
    ...item,
    attachment: item.attachment ? { ...item.attachment } : undefined,
  }));
}

export function cloneRoomSnapshot(snapshot: RoomSnapshot): RoomSnapshot {
  return {
    placedItems: clonePlacedItems(snapshot.placedItems),
    floorColor: snapshot.floorColor,
    wallColor: snapshot.wallColor,
    backgroundId: snapshot.backgroundId,
    accentColor: snapshot.accentColor,
    weather: snapshot.weather,
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
    a.backgroundId !== b.backgroundId ||
    a.accentColor !== b.accentColor ||
    a.weather !== b.weather ||
    a.placedItems.length !== b.placedItems.length
  ) {
    return false;
  }

  return a.placedItems.every((item, index) => {
    const other = b.placedItems[index];
    return (
      item.id === other.id &&
      item.buildingId === other.buildingId &&
      item.catalogId === other.catalogId &&
      item.gridX === other.gridX &&
      item.gridY === other.gridY &&
      item.rotation === other.rotation &&
      item.surface === other.surface &&
      item.level === other.level &&
      item.zoneId === other.zoneId &&
      item.attachment?.hostItemId === other.attachment?.hostItemId &&
      item.attachment?.slotId === other.attachment?.slotId
    );
  });
}

function makePlacedId(catalogId: string) {
  return `${catalogId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function isValidPlacement(candidate: PlacedItem, placedItems: readonly PlacedItem[], ignoredItemId?: string) {
  const candidateCatalog = catalogById[candidate.catalogId];
  if (!candidateCatalog || !candidateCatalog.allowedSurfaces.includes(candidate.surface)) return false;

  if (candidate.attachment) {
    const host = placedItems.find((item) => item.id === candidate.attachment?.hostItemId);
    return host && host.buildingId === candidate.buildingId
      ? canAttachToSlot(candidate, host, candidate.attachment.slotId, placedItems, ignoredItemId)
      : false;
  }

  if (!isWithinGrid(candidate, candidateCatalog)) return false;
  return !placedItems.some((other) => {
    if (other.buildingId !== candidate.buildingId || other.id === ignoredItemId || other.attachment) return false;
    const otherCatalog = catalogById[other.catalogId];
    return otherCatalog ? placementsOverlap(candidate, candidateCatalog, other, otherCatalog) : false;
  });
}

function makeInitialPlacementPreview(
  catalogId: string,
  placedItems: readonly PlacedItem[],
  buildingId: BuildingId,
): PlacementPreview | null {
  const catalogItem = catalogById[catalogId];
  if (!catalogItem) return null;

  const id = makePlacedId(catalogId);
  let fallback: PlacedItem | null = null;

  for (const zone of getPlacementZones(buildingId)) {
    if (!catalogItem.allowedSurfaces.includes(zone.surface)) continue;
    const size = getPlacementSize(catalogItem, zone.surface, 0);
    const maxX = zone.columns - size.width;
    const maxY = zone.rows - size.height;
    if (maxX < 0 || maxY < 0) continue;

    const centerX = maxX / 2;
    const centerY = maxY / 2;
    const candidates: PlacedItem[] = [];
    for (let gridY = 0; gridY <= maxY; gridY += 1) {
      for (let gridX = 0; gridX <= maxX; gridX += 1) {
        candidates.push({
          id,
          buildingId,
          catalogId,
          gridX,
          gridY,
          rotation: 0,
          surface: zone.surface,
          level: zone.level,
          zoneId: zone.id,
        });
      }
    }
    candidates.sort((a, b) => {
      const distanceA = (a.gridX - centerX) ** 2 + (a.gridY - centerY) ** 2;
      const distanceB = (b.gridX - centerX) ** 2 + (b.gridY - centerY) ** 2;
      return distanceA - distanceB;
    });

    fallback ??= candidates[0] ?? null;
    const validCandidate = candidates.find((candidate) =>
      isValidPlacement(candidate, placedItems),
    );
    if (validCandidate) return { item: validCandidate, valid: true };
  }

  return fallback ? { item: fallback, valid: false } : null;
}

function nextQuarterTurn(rotation: QuarterTurn, direction: 1 | -1): QuarterTurn {
  return ((rotation + direction * 90 + 360) % 360) as QuarterTurn;
}

function placementSoundKey(item: PlacedItem) {
  return [
    item.buildingId,
    item.zoneId,
    item.surface,
    item.level,
    item.gridX,
    item.gridY,
    item.rotation,
    item.attachment?.hostItemId ?? '',
    item.attachment?.slotId ?? '',
  ].join(':');
}

const clearEditorPatch: TransientPatch = {
  selectedItemId: null,
  placingCatalogId: null,
  placementPreview: null,
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
    activeBuildingId: defaultBuildingId,
    selectedItemId: null,
    placingCatalogId: null,
    placementPreview: null,
    draggingItemId: null,
    dragPreview: null,
    cameraZoom: DEFAULT_CAMERA_ZOOM,
    cameraYaw: DEFAULT_CAMERA_YAW,
    cameraTarget: [...CAMERA_TARGET],
    isCaptureClean: false,
    readyModelItemIds: [],
    readyBackgroundId: null,
    setActiveBuildingId: (activeBuildingId) => {
      const state = get();
      if (state.activeBuildingId === activeBuildingId) return;
      set({
        activeBuildingId,
        ...clearEditorPatch,
        // An edit history spanning hidden buildings makes Undo appear to do
        // nothing. Each building therefore starts with a fresh local session.
        past: [],
        future: [],
      });
    },
    setFloorColor: (floorColor) => commitRoom({ ...readRoomSnapshot(get()), floorColor }),
    setWallColor: (wallColor) => commitRoom({ ...readRoomSnapshot(get()), wallColor }),
    setBackgroundId: (backgroundId) => {
      if (get().backgroundId === backgroundId) return;
      commitRoom({ ...readRoomSnapshot(get()), backgroundId }, { readyBackgroundId: null });
    },
    setAccentColor: (accentColor) => commitRoom({ ...readRoomSnapshot(get()), accentColor }),
    setWeather: (weather) => commitRoom({ ...readRoomSnapshot(get()), weather }),
    startPlacing: (placingCatalogId) => {
      const state = get();
      const placementPreview = makeInitialPlacementPreview(
        placingCatalogId,
        state.placedItems,
        state.activeBuildingId,
      );
      if (!placementPreview) return;
      set({
        placingCatalogId,
        placementPreview,
        selectedItemId: null,
        draggingItemId: null,
        dragPreview: null,
      });
    },
    cancelPlacement: () => set({ placingCatalogId: null, placementPreview: null }),
    previewPlacement: (candidate, moveFeedback) => {
      const state = get();
      if (
        !state.placementPreview ||
        candidate.id !== state.placementPreview.item.id ||
        candidate.catalogId !== state.placingCatalogId
      ) {
        return;
      }
      const movedToNewAnchor =
        placementSoundKey(candidate) !== placementSoundKey(state.placementPreview.item);
      // Native pan events can arrive faster than the display refresh rate.
      // The editor uses a snapped grid, so an unchanged anchor is also an
      // unchanged preview. Avoid revalidating and reconciling every 3D model.
      if (!movedToNewAnchor && state.placementPreview.valid) return;
      const valid = isValidPlacement(candidate, state.placedItems);
      if (!movedToNewAnchor && valid === state.placementPreview.valid) return;
      set({
        placementPreview: {
          item: { ...candidate, attachment: candidate.attachment ? { ...candidate.attachment } : undefined },
          valid,
        },
      });
      if (moveFeedback !== false && movedToNewAnchor) {
        emitInteractionFeedback('move', moveFeedback);
      }
    },
    invalidatePlacementPreview: () =>
      set((state) =>
        state.placementPreview?.valid
          ? { placementPreview: { ...state.placementPreview, valid: false } }
          : state,
      ),
    commitPlacementPreview: () => {
      const state = get();
      if (!state.placementPreview?.valid || !state.placingCatalogId) return false;
      const candidate = {
        ...state.placementPreview.item,
        attachment: state.placementPreview.item.attachment
          ? { ...state.placementPreview.item.attachment }
          : undefined,
      };
      const committed = commitRoom(
        { ...readRoomSnapshot(state), placedItems: [...clonePlacedItems(state.placedItems), candidate] },
        { selectedItemId: candidate.id, placingCatalogId: null, placementPreview: null },
      );
      if (committed) emitInteractionFeedback('place');
      return committed;
    },
    selectItem: (selectedItemId) => {
      const state = get();
      if (
        selectedItemId &&
        !state.placedItems.some(
          (item) => item.id === selectedItemId && item.buildingId === state.activeBuildingId,
        )
      ) return;
      set({ selectedItemId, placingCatalogId: null, placementPreview: null, draggingItemId: null, dragPreview: null });
    },
    placeCatalogItem: (
      catalogId,
      gridX,
      gridY,
      surface,
      level = DEFAULT_PLACEMENT_LEVEL,
      requestedZoneId,
    ) => {
      const state = get();
      const zoneId =
        requestedZoneId ?? getDefaultPlacementZoneId(state.activeBuildingId, level, surface);
      if (!zoneId) return false;
      const candidate: PlacedItem = {
        id: makePlacedId(catalogId),
        buildingId: state.activeBuildingId,
        catalogId,
        gridX,
        gridY,
        rotation: 0,
        surface,
        level,
        zoneId,
      };
      if (!isValidPlacement(candidate, state.placedItems)) return false;
      const committed = commitRoom(
        { ...readRoomSnapshot(state), placedItems: [...clonePlacedItems(state.placedItems), candidate] },
        { selectedItemId: candidate.id, placingCatalogId: null, placementPreview: null },
      );
      if (committed) emitInteractionFeedback('place');
      return committed;
    },
    beginDrag: (id) => {
      const state = get();
      const item = state.placedItems.find(
        (placed) => placed.id === id && placed.buildingId === state.activeBuildingId,
      );
      if (!item) return;
      set({
        draggingItemId: id,
        dragPreview: {
          item: { ...item, attachment: item.attachment ? { ...item.attachment } : undefined },
          valid: true,
        },
        selectedItemId: id,
        placingCatalogId: null,
        placementPreview: null,
      });
      emitInteractionFeedback('dragStart');
    },
    previewMove: (candidate) => {
      const state = get();
      if (!state.draggingItemId || candidate.id !== state.draggingItemId) return;
      const movedToNewAnchor =
        Boolean(state.dragPreview) &&
        placementSoundKey(candidate) !== placementSoundKey(state.dragPreview!.item);
      if (!movedToNewAnchor && state.dragPreview?.valid) return;
      const valid = isValidPlacement(candidate, state.placedItems, state.draggingItemId);
      if (!movedToNewAnchor && valid === state.dragPreview?.valid) return;
      set({
        dragPreview: {
          item: { ...candidate, attachment: candidate.attachment ? { ...candidate.attachment } : undefined },
          valid,
        },
      });
      if (movedToNewAnchor) emitInteractionFeedback('move');
    },
    invalidateDragPreview: () =>
      set((state) =>
        state.dragPreview?.valid
          ? { dragPreview: { ...state.dragPreview, valid: false } }
          : state,
      ),
    finishDrag: () => {
      const state = get();
      if (!state.dragPreview || !state.draggingItemId) return false;
      if (!state.dragPreview.valid) {
        set({ dragPreview: null, draggingItemId: null });
        emitInteractionFeedback('reject');
        return false;
      }
      const committed = commitRoom(
        {
          ...readRoomSnapshot(state),
          placedItems: state.placedItems.map((item) => {
            if (item.id === state.draggingItemId) return { ...state.dragPreview!.item };
            if (item.attachment?.hostItemId === state.draggingItemId) {
              return {
                ...item,
                level: state.dragPreview!.item.level,
                zoneId: state.dragPreview!.item.zoneId,
                gridX: state.dragPreview!.item.gridX,
                gridY: state.dragPreview!.item.gridY,
              };
            }
            return { ...item };
          }),
        },
        { dragPreview: null, draggingItemId: null },
      );
      if (committed) emitInteractionFeedback('settle');
      else emitInteractionFeedback('settle', { sound: false });
      return committed;
    },
    cancelDrag: () => set({ dragPreview: null, draggingItemId: null }),
    rotateSelected: (direction) => {
      const state = get();
      const selected = state.placedItems.find(
        (item) => item.id === state.selectedItemId && item.buildingId === state.activeBuildingId,
      );
      if (!selected) return false;
      const catalogItem = catalogById[selected.catalogId];
      if (!catalogItem || catalogItem.rotatable === false) return false;
      const rotation = nextQuarterTurn(selected.rotation, direction);
      const attachmentHost = selected.attachment
        ? state.placedItems.find((item) => item.id === selected.attachment?.hostItemId)
        : null;
      const attachmentSlot = attachmentHost && selected.attachment
        ? getAttachmentSlot(attachmentHost, selected.attachment.slotId)
        : null;
      if (attachmentSlot?.lockRotation) return false;
      const candidate = selected.attachment
        ? { ...selected, rotation }
        : rotateAroundCenter(selected, catalogItem, rotation);
      if (!isValidPlacement(candidate, state.placedItems, selected.id)) return false;
      return commitRoom({
        ...readRoomSnapshot(state),
        placedItems: state.placedItems.map((item) => (item.id === selected.id ? candidate : { ...item })),
      });
    },
    duplicateSelected: () => {
      const state = get();
      const selected = state.placedItems.find(
        (item) => item.id === state.selectedItemId && item.buildingId === state.activeBuildingId,
      );
      if (!selected) return false;
      const duplicateBase = {
        ...selected,
        id: makePlacedId(selected.catalogId),
        attachment: undefined,
      };
      const target = nearbyAnchors(duplicateBase).find((candidate) => isValidPlacement(candidate, state.placedItems));
      if (!target) return false;
      const committed = commitRoom(
        { ...readRoomSnapshot(state), placedItems: [...clonePlacedItems(state.placedItems), target] },
        { selectedItemId: target.id },
      );
      if (committed) emitInteractionFeedback('place');
      return committed;
    },
    deleteSelected: () => {
      const state = get();
      if (
        !state.selectedItemId ||
        !state.placedItems.some(
          (item) => item.id === state.selectedItemId && item.buildingId === state.activeBuildingId,
        )
      ) return;
      const removedIds = new Set([
        state.selectedItemId,
        ...state.placedItems
          .filter((item) => item.attachment?.hostItemId === state.selectedItemId)
          .map((item) => item.id),
      ]);
      const committed = commitRoom(
        {
          ...readRoomSnapshot(state),
          placedItems: clonePlacedItems(state.placedItems.filter((item) => !removedIds.has(item.id))),
        },
        {
          ...clearEditorPatch,
          readyModelItemIds: state.readyModelItemIds.filter((id) => !removedIds.has(id)),
        },
      );
      if (committed) emitInteractionFeedback('delete');
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
        readyBackgroundId: target.backgroundId === current.backgroundId ? state.readyBackgroundId : null,
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
        readyBackgroundId: target.backgroundId === current.backgroundId ? state.readyBackgroundId : null,
      });
      return true;
    },
    hydrateRoom: (snapshot, activeBuildingId = defaultBuildingId) =>
      set({
        ...cloneRoomSnapshot(snapshot),
        activeBuildingId,
        ...clearEditorPatch,
        past: [],
        future: [],
        isHydrated: true,
        readyModelItemIds: [],
        readyBackgroundId: null,
      }),
    finishHydration: () => set({ isHydrated: true }),
    setCameraView: (cameraZoom, cameraYaw, cameraTarget) =>
      set({ cameraZoom, cameraYaw, cameraTarget: [...cameraTarget] }),
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
    markBackgroundReady: (backgroundId) =>
      set((state) =>
        state.backgroundId === backgroundId && state.readyBackgroundId !== backgroundId
          ? { readyBackgroundId: backgroundId }
          : state,
      ),
  };
});
