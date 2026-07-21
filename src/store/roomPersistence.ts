import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { catalogById } from '../catalog/catalog';
import {
  BUILDING_IDS,
  defaultBuildingId,
  isBuildingId,
  type BuildingId,
} from '../domain/buildings';
import {
  isWithinGrid,
  placementsOverlap,
  type PlacedItem,
  type QuarterTurn,
} from '../domain/grid';
import { defaultWeatherMode, isWeatherMode } from '../domain/weather';
import { STARTER_LAYOUT_REVISION, starterLayouts } from '../domain/starterLayouts';
import {
  backgroundIdFromLegacyColor,
  defaultBackgroundId,
  isBackgroundId,
} from '../theme/backgrounds';
import {
  isValidPlacement,
  getInitialRoomSnapshot,
  readRoomSnapshot,
  type RoomSnapshot,
  type RoomState,
  useRoomStore,
} from './roomStore';

const STORAGE_KEY = 'deen-rooms:room:v5';
const LEGACY_V4_STORAGE_KEY = 'deen-rooms:room:v4';
const LEGACY_V3_STORAGE_KEY = 'deen-rooms:room:v3';
const LEGACY_V2_STORAGE_KEY = 'deen-rooms:room:v2';
const LEGACY_V1_STORAGE_KEY = 'deen-rooms:room:v1';
const STORAGE_VERSION = 5;
const LEGACY_STORAGE_VERSIONS = [1, 2, 3, 4] as const;
const MAX_PERSISTED_ITEMS = 128;
const WRITE_DEBOUNCE_MS = 300;

type StorageEnvelope = {
  version: typeof STORAGE_VERSION;
  room: RoomSnapshot;
  activeBuildingId: BuildingId;
  starterLayoutRevision: number;
};

type ParsedStoredRoom = {
  room: RoomSnapshot;
  activeBuildingId: BuildingId;
  starterLayoutRevision: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[\dA-Fa-f]{6}([\dA-Fa-f]{2})?$/.test(value);
}

function isQuarterTurn(value: unknown): value is QuarterTurn {
  return value === 0 || value === 90 || value === 180 || value === 270;
}

const CATALOG_ID_ALIASES: Readonly<Record<string, string>> = {
  'imported-model-05': 'imported-model-01',
  'imported-model-29': 'imported-model-10',
  'imported-model-30': 'imported-model-11',
  'imported-model-31': 'imported-model-12',
  'imported-model-32': 'imported-model-13',
  'imported-model-33': 'imported-model-14',
  'imported-model-34': 'imported-model-15',
  'imported-model-35': 'imported-model-16',
  'imported-model-36': 'imported-model-17',
};

function parsePlacedItem(value: unknown): PlacedItem | null {
  if (!isRecord(value)) return null;
  const {
    id,
    buildingId: storedBuildingId,
    catalogId: storedCatalogId,
    gridX,
    gridY,
    rotation,
    surface,
    attachment: storedAttachment,
  } = value;
  const catalogId = typeof storedCatalogId === 'string'
    ? CATALOG_ID_ALIASES[storedCatalogId] ?? storedCatalogId
    : storedCatalogId;
  const buildingId = storedBuildingId === undefined
    ? defaultBuildingId
    : isBuildingId(storedBuildingId)
      ? storedBuildingId
      : null;
  if (
    !buildingId ||
    typeof id !== 'string' ||
    id.length === 0 ||
    typeof catalogId !== 'string' ||
    !catalogById[catalogId] ||
    !Number.isInteger(gridX) ||
    !Number.isInteger(gridY) ||
    !isQuarterTurn(rotation) ||
    (surface !== 'floor' && surface !== 'wallL' && surface !== 'wallR')
  ) {
    return null;
  }
  const item: PlacedItem = {
    id,
    buildingId,
    catalogId,
    gridX: gridX as number,
    gridY: gridY as number,
    rotation,
    surface,
  };
  if (storedAttachment !== undefined) {
    if (
      !isRecord(storedAttachment) ||
      typeof storedAttachment.hostItemId !== 'string' ||
      storedAttachment.hostItemId.length === 0 ||
      typeof storedAttachment.slotId !== 'string' ||
      storedAttachment.slotId.length === 0
    ) {
      return null;
    }
    item.attachment = {
      hostItemId: storedAttachment.hostItemId,
      slotId: storedAttachment.slotId,
    };
  }
  const catalogItem = catalogById[catalogId];
  if (
    !catalogItem.allowedSurfaces.includes(surface) ||
    !isWithinGrid(item, catalogItem) ||
    (catalogItem.rotatable === false && rotation !== 0)
  ) {
    return null;
  }
  return item;
}

function parseRoomSnapshot(value: unknown): RoomSnapshot | null {
  if (!isRecord(value)) return null;
  const {
    placedItems,
    floorColor,
    wallColor,
    backgroundId: storedBackgroundId,
    backgroundColor: legacyBackgroundColor,
    accentColor,
    weather: storedWeather,
    lighting: legacyLighting,
  } = value;
  const backgroundId = isBackgroundId(storedBackgroundId)
    ? storedBackgroundId
    : storedBackgroundId === undefined
      ? backgroundIdFromLegacyColor(legacyBackgroundColor)
      : defaultBackgroundId;
  const weather = isWeatherMode(storedWeather)
    ? storedWeather
    : legacyLighting === 'warm'
      ? 'night'
      : legacyLighting === 'day'
        ? 'sunny'
        : defaultWeatherMode;
  if (
    !Array.isArray(placedItems) ||
    placedItems.length > MAX_PERSISTED_ITEMS ||
    !isColor(floorColor) ||
    !isColor(wallColor) ||
    !isColor(accentColor)
  ) {
    return null;
  }

  const parsedItems: PlacedItem[] = [];
  const ids = new Set<string>();
  for (const valueItem of placedItems) {
    const item = parsePlacedItem(valueItem);
    if (!item || ids.has(item.id)) return null;
    const itemCatalog = catalogById[item.catalogId];
    const overlaps = parsedItems.some((other) => {
      if (item.buildingId !== other.buildingId || item.attachment || other.attachment) return false;
      const otherCatalog = catalogById[other.catalogId];
      return placementsOverlap(item, itemCatalog, other, otherCatalog);
    });
    if (overlaps) return null;
    ids.add(item.id);
    parsedItems.push(item);
  }

  if (parsedItems.some((item) => item.attachment && !isValidPlacement(item, parsedItems, item.id))) {
    return null;
  }

  return { placedItems: parsedItems, floorColor, wallColor, backgroundId, accentColor, weather };
}

function parseStoredRoom(raw: string | null): ParsedStoredRoom | null {
  if (!raw) return null;
  try {
    const envelope: unknown = JSON.parse(raw);
    if (
      !isRecord(envelope) ||
      (envelope.version !== STORAGE_VERSION &&
        !LEGACY_STORAGE_VERSIONS.includes(envelope.version as (typeof LEGACY_STORAGE_VERSIONS)[number]))
    ) {
      return null;
    }
    const room = parseRoomSnapshot(envelope.room);
    if (!room) return null;
    return {
      room,
      activeBuildingId: isBuildingId(envelope.activeBuildingId)
        ? envelope.activeBuildingId
        : defaultBuildingId,
      starterLayoutRevision:
        typeof envelope.starterLayoutRevision === 'number' &&
        Number.isInteger(envelope.starterLayoutRevision) &&
        envelope.starterLayoutRevision >= 0
          ? envelope.starterLayoutRevision
          : 0,
    };
  } catch {
    return null;
  }
}

function clonePlacedItem(item: PlacedItem): PlacedItem {
  return {
    ...item,
    attachment: item.attachment ? { ...item.attachment } : undefined,
  };
}

function seedEmptyBuildings(room: RoomSnapshot, previousRevision: number): RoomSnapshot {
  if (previousRevision >= STARTER_LAYOUT_REVISION) return room;

  let placedItems = room.placedItems.map(clonePlacedItem);
  for (const buildingId of BUILDING_IDS) {
    const buildingItems = placedItems.filter((item) => item.buildingId === buildingId);
    const isPreviousStarterLayout =
      buildingItems.length > 0 &&
      previousRevision < STARTER_LAYOUT_REVISION &&
      buildingItems.every((item) => item.id.startsWith('starter-v1-'));
    if (buildingItems.length > 0 && !isPreviousStarterLayout) continue;

    const layout = starterLayouts[buildingId];
    const preservedItems = isPreviousStarterLayout
      ? placedItems.filter((item) => item.buildingId !== buildingId)
      : placedItems;
    if (preservedItems.length + layout.length > MAX_PERSISTED_ITEMS) continue;

    const candidateItems = preservedItems.map(clonePlacedItem);
    let valid = true;
    for (const layoutItem of layout) {
      const candidate = clonePlacedItem(layoutItem);
      if (
        candidateItems.some((item) => item.id === candidate.id) ||
        !isValidPlacement(candidate, candidateItems)
      ) {
        valid = false;
        break;
      }
      candidateItems.push(candidate);
    }

    if (valid) {
      placedItems = candidateItems;
    } else if (__DEV__) {
      console.warn(`[Deen Rooms] Starter layout for ${buildingId} was invalid and was skipped.`);
    }
  }

  return { ...room, placedItems };
}

function serializeState(state: RoomState) {
  const envelope: StorageEnvelope = {
    version: STORAGE_VERSION,
    room: readRoomSnapshot(state),
    activeBuildingId: state.activeBuildingId,
    starterLayoutRevision: STARTER_LAYOUT_REVISION,
  };
  return JSON.stringify(envelope);
}

export function useRoomPersistence() {
  useEffect(() => {
    let disposed = false;
    let restoring = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let lastObserved: string | null = null;
    let lastPersisted: string | null = null;
    let pendingWrite: string | null = null;
    let writeInFlight: Promise<void> | null = null;
    let restoredRaw: string | null = null;
    let restoredSnapshot = false;

    const drainWrites = async () => {
      if (writeInFlight) return writeInFlight;
      writeInFlight = (async () => {
        while (pendingWrite) {
          const value = pendingWrite;
          pendingWrite = null;
          try {
            await AsyncStorage.setItem(STORAGE_KEY, value);
            lastPersisted = value;
            if (__DEV__) console.info('[Deen Rooms] room saved');
          } catch (error) {
            // Keep the newest unsaved value queued so backgrounding or cleanup
            // can retry it. Never allow an older write to finish after a newer one.
            if (!pendingWrite) pendingWrite = value;
            console.warn('[Deen Rooms] Could not save the room.', error);
            break;
          }
        }
      })();
      try {
        await writeInFlight;
      } finally {
        writeInFlight = null;
      }
    };

    const flush = async () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      await drainWrites();
    };

    const scheduleWrite = (state: RoomState) => {
      if (restoring) return;
      const serialized = serializeState(state);
      if (serialized === lastObserved) return;
      lastObserved = serialized;
      pendingWrite = serialized;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        void flush();
      }, WRITE_DEBOUNCE_MS);
    };

    const unsubscribe = useRoomStore.subscribe(scheduleWrite);

    const restore = async () => {
      try {
        const currentRaw = await AsyncStorage.getItem(STORAGE_KEY);
        const currentStoredRoom = parseStoredRoom(currentRaw);
        const legacyV4Raw = currentStoredRoom ? null : await AsyncStorage.getItem(LEGACY_V4_STORAGE_KEY);
        const legacyV4StoredRoom = parseStoredRoom(legacyV4Raw);
        const legacyV3Raw = currentStoredRoom || legacyV4StoredRoom
          ? null
          : await AsyncStorage.getItem(LEGACY_V3_STORAGE_KEY);
        const legacyV3StoredRoom = parseStoredRoom(legacyV3Raw);
        const legacyV2Raw = currentStoredRoom || legacyV4StoredRoom || legacyV3StoredRoom
          ? null
          : await AsyncStorage.getItem(LEGACY_V2_STORAGE_KEY);
        const legacyV2StoredRoom = parseStoredRoom(legacyV2Raw);
        const legacyV1Raw = currentStoredRoom || legacyV4StoredRoom || legacyV3StoredRoom || legacyV2StoredRoom
          ? null
          : await AsyncStorage.getItem(LEGACY_V1_STORAGE_KEY);
        const legacyV1StoredRoom = parseStoredRoom(legacyV1Raw);
        const raw = currentStoredRoom
          ? currentRaw
          : legacyV4StoredRoom
            ? legacyV4Raw
            : legacyV3StoredRoom
              ? legacyV3Raw
              : legacyV2StoredRoom
                ? legacyV2Raw
                : legacyV1Raw;
        restoredRaw = raw;
        if (disposed) return;
        const storedRoom = currentStoredRoom ?? legacyV4StoredRoom ?? legacyV3StoredRoom ?? legacyV2StoredRoom ?? legacyV1StoredRoom;
        if (__DEV__) console.info(`[Deen Rooms] restore found ${storedRoom?.room.placedItems.length ?? 0} item(s)`);
        if (storedRoom) {
          restoredSnapshot = true;
          useRoomStore.getState().hydrateRoom(
            seedEmptyBuildings(storedRoom.room, storedRoom.starterLayoutRevision),
            storedRoom.activeBuildingId,
          );
        } else {
          restoredSnapshot = true;
          useRoomStore.getState().hydrateRoom(
            seedEmptyBuildings(getInitialRoomSnapshot(), 0),
            defaultBuildingId,
          );
        }
      } catch (error) {
        console.warn('[Deen Rooms] Could not restore the room.', error);
        if (!disposed) useRoomStore.getState().finishHydration();
      } finally {
        if (!disposed) {
          lastObserved = serializeState(useRoomStore.getState());
          lastPersisted = restoredRaw;
          restoring = false;
          if (restoredSnapshot && restoredRaw !== lastObserved) {
            pendingWrite = lastObserved;
            void flush();
          }
        }
      }
    };

    void restore();
    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') void flush();
    });

    return () => {
      disposed = true;
      unsubscribe();
      appStateSubscription.remove();
      void flush();
    };
  }, []);
}
