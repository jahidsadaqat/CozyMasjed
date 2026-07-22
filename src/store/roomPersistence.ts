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
  CELL_SIZE,
  DEFAULT_PLACEMENT_LEVEL,
  getDefaultPlacementZoneId,
  getPlacementSize,
  getPlacementZones,
  isPlacementLevel,
  isPlacementZoneId,
  isWithinGrid,
  placementToWorld,
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

const STORAGE_KEY = 'deen-rooms:room:v7';
const LEGACY_V6_STORAGE_KEY = 'deen-rooms:room:v6';
const LEGACY_V5_STORAGE_KEY = 'deen-rooms:room:v5';
const LEGACY_V4_STORAGE_KEY = 'deen-rooms:room:v4';
const LEGACY_V3_STORAGE_KEY = 'deen-rooms:room:v3';
const LEGACY_V2_STORAGE_KEY = 'deen-rooms:room:v2';
const LEGACY_V1_STORAGE_KEY = 'deen-rooms:room:v1';
const STORAGE_VERSION = 7;
const LEGACY_STORAGE_VERSIONS = [1, 2, 3, 4, 5, 6] as const;
const STORAGE_KEYS = [
  STORAGE_KEY,
  LEGACY_V6_STORAGE_KEY,
  LEGACY_V5_STORAGE_KEY,
  LEGACY_V4_STORAGE_KEY,
  LEGACY_V3_STORAGE_KEY,
  LEGACY_V2_STORAGE_KEY,
  LEGACY_V1_STORAGE_KEY,
] as const;
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

type WorldPoint = readonly [number, number, number];

type LegacyGrid = {
  columns: number;
  rows: number;
  cellSize: number;
  rowSize: number;
  originX: number;
  originY: number;
  originZ: number;
};

const LEGACY_ROOM_SIZE = 4.4;
const LEGACY_FLOOR_TOP = 0.04;
const LEGACY_WALL_INSET = -2.035;
const LEGACY_UPPER_FLOOR_TOP = 2.071;

function getLegacyGrid(item: PlacedItem): LegacyGrid | null {
  if (item.level === 'ground') {
    if (item.surface === 'floor') {
      return {
        columns: 8,
        rows: 8,
        cellSize: CELL_SIZE,
        rowSize: CELL_SIZE,
        originX: -LEGACY_ROOM_SIZE / 2,
        originY: LEGACY_FLOOR_TOP,
        originZ: -LEGACY_ROOM_SIZE / 2,
      };
    }
    return {
      columns: 8,
      rows: 4,
      cellSize: CELL_SIZE,
      rowSize: CELL_SIZE,
      originX: item.surface === 'wallL' ? LEGACY_WALL_INSET : -LEGACY_ROOM_SIZE / 2,
      originY: LEGACY_FLOOR_TOP,
      originZ: item.surface === 'wallR' ? LEGACY_WALL_INSET : -LEGACY_ROOM_SIZE / 2,
    };
  }

  if (item.buildingId !== 'arched-atrium') return null;
  if (item.surface === 'floor') {
    return {
      columns: 6,
      rows: 2,
      cellSize: CELL_SIZE,
      rowSize: CELL_SIZE,
      originX: -1.65,
      originY: LEGACY_UPPER_FLOOR_TOP,
      originZ: -1.65,
    };
  }
  return {
    columns: item.surface === 'wallL' ? 2 : 6,
    rows: 3,
    cellSize: CELL_SIZE,
    rowSize: 0.5,
    originX: item.surface === 'wallL' ? -1.869 : -1.65,
    originY: LEGACY_UPPER_FLOOR_TOP,
    originZ: item.surface === 'wallR' ? -1.869 : -1.65,
  };
}

function legacyPlacementToWorld(item: PlacedItem): WorldPoint {
  const grid = getLegacyGrid(item);
  const catalogItem = catalogById[item.catalogId];
  if (!grid || !catalogItem) return [0, LEGACY_FLOOR_TOP, 0];

  const size = getPlacementSize(catalogItem, item.surface, item.rotation);
  const horizontal = grid.originX + (item.gridX + size.width / 2) * grid.cellSize;
  if (item.surface === 'floor') {
    return [
      horizontal,
      grid.originY,
      grid.originZ + (item.gridY + size.height / 2) * grid.rowSize,
    ];
  }

  const vertical = grid.originY + item.gridY * grid.rowSize + 0.1;
  if (item.surface === 'wallL') {
    return [
      grid.originX,
      vertical,
      grid.originZ + (item.gridX + size.width / 2) * grid.cellSize,
    ];
  }
  return [horizontal, vertical, grid.originZ];
}

function isWithinLegacyGrid(item: PlacedItem) {
  const grid = getLegacyGrid(item);
  const catalogItem = catalogById[item.catalogId];
  if (!grid || !catalogItem) return false;
  const size = getPlacementSize(catalogItem, item.surface, item.rotation);
  return (
    item.gridX >= 0 &&
    item.gridY >= 0 &&
    item.gridX + size.width <= grid.columns &&
    item.gridY + size.height <= grid.rows
  );
}

function squaredDistance(a: WorldPoint, b: WorldPoint) {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
}

function orderedMigrationZones(item: PlacedItem) {
  const catalogItem = catalogById[item.catalogId];
  const groups = [
    getPlacementZones(item.buildingId, item.level, item.surface),
    getPlacementZones(item.buildingId, item.level).filter(
      (zone) => catalogItem.allowedSurfaces.includes(zone.surface),
    ),
    getPlacementZones(item.buildingId).filter(
      (zone) => zone.surface === item.surface,
    ),
    getPlacementZones(item.buildingId).filter(
      (zone) => catalogItem.allowedSurfaces.includes(zone.surface),
    ),
  ];
  const seen = new Set<string>();
  return groups.map((zones) => zones.filter((zone) => {
    if (seen.has(zone.id)) return false;
    seen.add(zone.id);
    return true;
  }));
}

function findLegacyPlacement(
  item: PlacedItem,
  placedItems: readonly PlacedItem[],
  referencePoint = legacyPlacementToWorld(item),
): PlacedItem | null {
  const catalogItem = catalogById[item.catalogId];
  for (const zones of orderedMigrationZones(item)) {
    let best: { item: PlacedItem; distance: number; order: number } | null = null;
    let order = 0;
    for (const zone of zones) {
      const size = getPlacementSize(catalogItem, zone.surface, item.rotation);
      for (let gridY = 0; gridY <= zone.rows - size.height; gridY += 1) {
        for (let gridX = 0; gridX <= zone.columns - size.width; gridX += 1) {
          const candidate: PlacedItem = {
            ...item,
            gridX,
            gridY,
            surface: zone.surface,
            level: zone.level,
            zoneId: zone.id,
            attachment: undefined,
          };
          if (!isValidPlacement(candidate, placedItems)) {
            order += 1;
            continue;
          }
          const distance = squaredDistance(
            referencePoint,
            placementToWorld(candidate, catalogItem),
          );
          if (
            !best ||
            distance < best.distance - Number.EPSILON ||
            (Math.abs(distance - best.distance) <= Number.EPSILON && order < best.order)
          ) {
            best = { item: candidate, distance, order };
          }
          order += 1;
        }
      }
    }
    if (best) return best.item;
  }
  return null;
}

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
    level: storedLevel,
    zoneId: storedZoneId,
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
  const level = storedLevel === undefined
    ? DEFAULT_PLACEMENT_LEVEL
    : isPlacementLevel(storedLevel)
      ? storedLevel
      : null;
  const zoneId = storedZoneId === undefined && buildingId && level &&
      (surface === 'floor' || surface === 'wallL' || surface === 'wallR')
    ? getDefaultPlacementZoneId(buildingId, level, surface)
    : isPlacementZoneId(storedZoneId)
      ? storedZoneId
      : null;
  if (
    !buildingId ||
    !level ||
    !zoneId ||
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
    level,
    zoneId,
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
    (catalogItem.rotatable === false && rotation !== 0)
  ) {
    return null;
  }
  return item;
}

function parseCurrentPlacedItems(values: readonly unknown[]): PlacedItem[] | null {
  const parsedItems: PlacedItem[] = [];
  const ids = new Set<string>();
  for (const value of values) {
    const item = parsePlacedItem(value);
    if (!item || ids.has(item.id)) return null;
    const itemCatalog = catalogById[item.catalogId];
    if (!isWithinGrid(item, itemCatalog)) return null;
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
  return parsedItems;
}

function migrateLegacyPlacedItems(values: readonly unknown[]): PlacedItem[] {
  const sourceItems: PlacedItem[] = [];
  const ids = new Set<string>();
  for (const value of values) {
    const item = parsePlacedItem(value);
    if (!item || ids.has(item.id) || !isWithinLegacyGrid(item)) {
      if (__DEV__) console.warn('[Deen Rooms] Skipped one invalid legacy room item.');
      continue;
    }
    ids.add(item.id);
    sourceItems.push(item);
  }

  const migratedItems: PlacedItem[] = [];
  for (const item of sourceItems.filter((candidate) => !candidate.attachment)) {
    const migrated = findLegacyPlacement(item, migratedItems);
    if (migrated) {
      migratedItems.push(migrated);
    } else if (__DEV__) {
      console.warn(`[Deen Rooms] No free placement remained for legacy item ${item.id}.`);
    }
  }

  for (const item of sourceItems.filter((candidate) => candidate.attachment)) {
    const host = migratedItems.find((candidate) => candidate.id === item.attachment?.hostItemId);
    if (host && host.buildingId === item.buildingId) {
      const attachedCandidate: PlacedItem = {
        ...item,
        surface: 'floor',
        level: host.level,
        zoneId: host.zoneId,
        gridX: host.gridX,
        gridY: host.gridY,
      };
      if (isValidPlacement(attachedCandidate, migratedItems, item.id)) {
        migratedItems.push(attachedCandidate);
        continue;
      }
    }

    const detached = findLegacyPlacement(
      { ...item, attachment: undefined },
      migratedItems,
    );
    if (detached) {
      migratedItems.push(detached);
    } else if (__DEV__) {
      console.warn(`[Deen Rooms] No free placement remained for legacy item ${item.id}.`);
    }
  }

  return migratedItems;
}

function parseRoomSnapshot(value: unknown, storageVersion: number): RoomSnapshot | null {
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

  const parsedItems = storageVersion < STORAGE_VERSION
    ? migrateLegacyPlacedItems(placedItems)
    : parseCurrentPlacedItems(placedItems);
  if (!parsedItems) return null;

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
    const room = parseRoomSnapshot(envelope.room, envelope.version as number);
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
    // Starter IDs are stable even after users move or rotate those items. A
    // non-empty room is therefore always user-owned and must never be replaced
    // merely because every ID still has the starter prefix.
    if (buildingItems.length > 0) continue;

    const layout = starterLayouts[buildingId];
    const preservedItems = placedItems;
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
        let raw: string | null = null;
        let storedRoom: ParsedStoredRoom | null = null;
        for (const key of STORAGE_KEYS) {
          const candidateRaw = await AsyncStorage.getItem(key);
          const candidate = parseStoredRoom(candidateRaw);
          if (!candidate) continue;
          raw = candidateRaw;
          storedRoom = candidate;
          break;
        }
        restoredRaw = raw;
        if (disposed) return;
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
