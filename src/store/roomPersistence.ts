import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { catalogById } from '../catalog/catalog';
import { isWithinGrid, placementsOverlap, type PlacedItem, type QuarterTurn } from '../domain/grid';
import {
  backgroundIdFromLegacyColor,
  defaultBackgroundId,
  isBackgroundId,
} from '../theme/backgrounds';
import {
  readRoomSnapshot,
  type LightingMode,
  type RoomSnapshot,
  type RoomState,
  useRoomStore,
} from './roomStore';

const STORAGE_KEY = 'deen-rooms:room:v1';
const STORAGE_VERSION = 1;
const MAX_PERSISTED_ITEMS = 128;
const WRITE_DEBOUNCE_MS = 300;

type StorageEnvelope = {
  version: typeof STORAGE_VERSION;
  room: RoomSnapshot;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[\dA-Fa-f]{6}([\dA-Fa-f]{2})?$/.test(value);
}

function isLightingMode(value: unknown): value is LightingMode {
  return value === 'day' || value === 'warm';
}

function isQuarterTurn(value: unknown): value is QuarterTurn {
  return value === 0 || value === 90 || value === 180 || value === 270;
}

function parsePlacedItem(value: unknown): PlacedItem | null {
  if (!isRecord(value)) return null;
  const { id, catalogId, gridX, gridY, rotation, surface } = value;
  if (
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
    catalogId,
    gridX: gridX as number,
    gridY: gridY as number,
    rotation,
    surface,
  };
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
    lighting,
  } = value;
  const backgroundId = isBackgroundId(storedBackgroundId)
    ? storedBackgroundId
    : storedBackgroundId === undefined
      ? backgroundIdFromLegacyColor(legacyBackgroundColor)
      : defaultBackgroundId;
  if (
    !Array.isArray(placedItems) ||
    placedItems.length > MAX_PERSISTED_ITEMS ||
    !isColor(floorColor) ||
    !isColor(wallColor) ||
    !isColor(accentColor) ||
    !isLightingMode(lighting)
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
      const otherCatalog = catalogById[other.catalogId];
      return placementsOverlap(item, itemCatalog, other, otherCatalog);
    });
    if (overlaps) return null;
    ids.add(item.id);
    parsedItems.push(item);
  }

  return { placedItems: parsedItems, floorColor, wallColor, backgroundId, accentColor, lighting };
}

function parseStoredRoom(raw: string | null): RoomSnapshot | null {
  if (!raw) return null;
  try {
    const envelope: unknown = JSON.parse(raw);
    if (!isRecord(envelope) || envelope.version !== STORAGE_VERSION) return null;
    return parseRoomSnapshot(envelope.room);
  } catch {
    return null;
  }
}

function serializeState(state: RoomState) {
  const envelope: StorageEnvelope = {
    version: STORAGE_VERSION,
    room: readRoomSnapshot(state),
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
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        restoredRaw = raw;
        if (disposed) return;
        const snapshot = parseStoredRoom(raw);
        if (__DEV__) console.info(`[Deen Rooms] restore found ${snapshot?.placedItems.length ?? 0} item(s)`);
        if (snapshot) {
          restoredSnapshot = true;
          useRoomStore.getState().hydrateRoom(snapshot);
        } else {
          useRoomStore.getState().finishHydration();
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
