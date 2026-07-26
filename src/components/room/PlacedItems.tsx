import { useFrame, useThree } from '@react-three/fiber/native';
import {
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import * as THREE from 'three';
import { catalogById } from '../../catalog/catalog';
import { BlobShadow } from '../BlobShadow';
import { attachmentSlotHitWorldPosition, resolveItemTransform } from '../../domain/attachments';
import { CELL_SIZE, getPlacementGrid, getPlacementSize, type PlacedItem } from '../../domain/grid';
import {
  getLivingAssetKind,
  type LivingAssetKind,
} from '../../domain/livingAssets';
import { useRoomStore } from '../../store/roomStore';
import { CatalogItemModel } from '../models/CatalogItemModel';
import { configurePlacementRaycastTarget } from './editorRaycastLayers';

function modelRotation(item: PlacedItem, resolvedRotationY?: number): [number, number, number] {
  const catalogItem = catalogById[item.catalogId];
  const base = catalogItem?.modelRotation ?? [0, 0, 0];
  const surfaceTurn = item.surface === 'wallL' ? Math.PI / 2 : 0;
  const rotationY = resolvedRotationY ?? surfaceTurn + (item.rotation * Math.PI) / 180;
  return [base[0], base[1] + rotationY, base[2]];
}

const BOING_DURATION = 0.35;
const MAX_FRAME_DELTA = 0.05;
const LIVING_ANIMATION_INTERVAL_MS = 1000 / 12;

function stableMotionPhase(key: string) {
  let hash = 2166136261;
  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) / 0x100000000) * Math.PI * 2;
}

function resetLivingMotion(group: THREE.Group) {
  group.position.set(0, 0, 0);
  group.rotation.set(0, 0, 0);
  group.scale.setScalar(1);
}

function animateLivingMotion(
  group: THREE.Group,
  kind: LivingAssetKind,
  name: string,
  time: number,
  phase: number,
) {
  const slow = time + phase;
  resetLivingMotion(group);

  if (kind === 'cat') {
    const resting = /\b(lying|sleeping)\b/i.test(name);
    if (resting) {
      const breath = Math.sin(slow * 1.7);
      group.position.z = Math.sin(slow * 0.55) * 0.014;
      group.position.y = Math.max(0, breath) * 0.004;
      group.rotation.y = Math.sin(slow * 0.65) * 0.018;
      group.scale.set(1 - breath * 0.003, 1 + breath * 0.012, 1);
      return;
    }

    const step = Math.sin(slow * 3.1);
    group.position.x = Math.sin(slow * 0.72) * 0.012;
    group.position.z = Math.sin(slow * 0.9) * 0.032;
    group.position.y = Math.max(0, step) * 0.012;
    group.rotation.y = Math.sin(slow * 0.9) * 0.035;
    group.rotation.z = step * 0.014;
    return;
  }

  if (kind === 'plant') {
    const sway = Math.sin(slow * 0.72);
    group.position.y = (1 + Math.sin(slow * 1.1)) * 0.002;
    group.rotation.x = Math.cos(slow * 0.61) * 0.005;
    group.rotation.z = sway * 0.012;
    group.scale.setScalar(1 + Math.sin(slow * 0.54) * 0.003);
    return;
  }

  if (kind === 'quran') {
    const breath = Math.sin(slow * 0.82);
    group.position.y = (1 + breath) * 0.0025;
    group.rotation.y = Math.sin(slow * 0.48) * 0.006;
    group.scale.setScalar(1 + breath * 0.004);
    return;
  }

  const float = Math.sin(slow * 0.9);
  group.position.y = (1 + float) * 0.0015;
  group.rotation.y = Math.sin(slow * 0.52) * 0.007;
  group.scale.setScalar(1 + float * 0.0025);
}

function practicalLightPriority(catalogId: string) {
  const name = catalogById[catalogId]?.name.toLowerCase() ?? '';
  if (name.includes('wall sconce')) return 100;
  if (name.includes('candle')) return 90;
  if (name.includes('floor lamp')) return 80;
  if (name.includes('wall lantern') || name.includes('wall chandelier')) return 75;
  if (name.includes('string light')) return 65;
  return 50;
}

function easeOutCubic(value: number) {
  return 1 - (1 - value) ** 3;
}

function BoingItem({
  animate,
  children,
  itemId,
  modelReady,
  onComplete,
}: {
  animate: boolean;
  children: ReactNode;
  itemId: string;
  modelReady: boolean;
  onComplete: (itemId: string) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const invalidate = useThree((state) => state.invalidate);
  const elapsedRef = useRef(0);
  const finishedRef = useRef(!animate);

  useLayoutEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    if (!animate) {
      finishedRef.current = true;
      group.scale.setScalar(1);
      return;
    }
    elapsedRef.current = 0;
    finishedRef.current = false;
    group.scale.setScalar(0.7);
    if (modelReady) invalidate();
  }, [animate, invalidate, modelReady]);

  useFrame((_, frameDelta) => {
    const group = groupRef.current;
    if (!group || !animate || !modelReady || finishedRef.current) return;
    const elapsed = Math.min(BOING_DURATION, elapsedRef.current + Math.min(frameDelta, MAX_FRAME_DELTA));
    elapsedRef.current = elapsed;
    const progress = elapsed / BOING_DURATION;
    let scale: number;
    if (progress < 0.72) {
      const rise = easeOutCubic(progress / 0.72);
      scale = THREE.MathUtils.lerp(0.7, 1.05, rise);
    } else {
      const settle = easeOutCubic((progress - 0.72) / 0.28);
      scale = THREE.MathUtils.lerp(1.05, 1, settle);
    }
    group.scale.setScalar(scale);

    if (elapsed >= BOING_DURATION) {
      group.scale.setScalar(1);
      finishedRef.current = true;
      onComplete(itemId);
    } else {
      invalidate();
    }
  });

  return <group ref={groupRef}>{children}</group>;
}

function SelectionFootprint({
  item,
  invalid,
  items,
  dragPreview,
}: {
  item: PlacedItem;
  invalid: boolean;
  items: readonly PlacedItem[];
  dragPreview?: { item: PlacedItem } | null;
}) {
  const catalogItem = catalogById[item.catalogId];
  if (!catalogItem) return null;
  const resolved = resolveItemTransform(item, items, dragPreview);
  const [x, y, z] = resolved.position;
  const size = getPlacementSize(catalogItem, item.surface, item.rotation);
  const placementGrid = getPlacementGrid(
    item.buildingId,
    item.level,
    item.surface,
    item.zoneId,
  );
  const columnSize = placementGrid?.cellSize ?? CELL_SIZE;
  const rowSize = placementGrid?.rowSize ?? columnSize;
  const fillColor = invalid ? '#D96F66' : '#EFE7D8';
  const visualWidth = size.width * columnSize;
  const visualHeight = size.height * rowSize;
  const floorRadiusX = THREE.MathUtils.clamp(visualWidth * 0.56 + 0.06, 0.38, 0.92);
  const floorRadiusZ = THREE.MathUtils.clamp(visualHeight * 0.56 + 0.06, 0.38, 0.92);
  const wallRadiusX = THREE.MathUtils.clamp(visualWidth * 0.5 + 0.05, 0.34, 0.78);
  const wallRadiusY = THREE.MathUtils.clamp(visualHeight * 0.5 + 0.05, 0.34, 0.78);

  if (item.surface === 'floor' || item.surface === 'ceiling') {
    return (
      <group
        position={[x, y + (item.surface === 'ceiling' ? -0.004 : 0.004), z]}
        rotation={[item.surface === 'ceiling' ? Math.PI / 2 : -Math.PI / 2, 0, 0]}
        scale={[floorRadiusX, floorRadiusZ, 1]}
      >
        <mesh>
          <circleGeometry args={[1, 48]} />
          <meshBasicMaterial
            color={fillColor}
            transparent
            opacity={invalid ? 0.58 : 0.46}
            depthTest
            depthWrite={false}
            polygonOffset
            polygonOffsetFactor={-1}
            polygonOffsetUnits={-1}
          />
        </mesh>
      </group>
    );
  }

  const centerY = y + (size.height * rowSize) / 2;
  const position: [number, number, number] = item.surface === 'wallL' ? [x + 0.004, centerY, z] : [x, centerY, z + 0.004];
  const rotation: [number, number, number] = item.surface === 'wallL' ? [0, Math.PI / 2, 0] : [0, 0, 0];
  return (
    <group
      position={position}
      rotation={rotation}
      scale={[wallRadiusX, wallRadiusY, 1]}
    >
      <mesh>
        <circleGeometry args={[1, 48]} />
        <meshBasicMaterial
          color={fillColor}
          transparent
          opacity={invalid ? 0.56 : 0.44}
          depthTest
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
        />
      </mesh>
    </group>
  );
}

function AttachmentSlotTargets({
  item,
  items,
  draggedItemId,
}: {
  item: PlacedItem;
  items: readonly PlacedItem[];
  draggedItemId?: string;
}) {
  const catalogItem = catalogById[item.catalogId];
  if (!catalogItem?.attachmentSlots?.length || item.attachment) return null;
  const rotationY = (item.rotation * Math.PI) / 180;
  const availableSlots = catalogItem.attachmentSlots.filter((slot) => {
    const occupant = items.find(
      (candidate) =>
        candidate.attachment?.hostItemId === item.id && candidate.attachment.slotId === slot.id,
    );
    return !occupant || occupant.id === draggedItemId;
  });
  return (
    <>
      {availableSlots.map((slot) => {
        const position = attachmentSlotHitWorldPosition(item, slot);
        return (
          <mesh
            key={`${item.id}-${slot.id}`}
            ref={configurePlacementRaycastTarget}
            position={[position.x, position.y + 0.008, position.z]}
            rotation={[-Math.PI / 2, 0, rotationY]}
            userData={{
              attachmentHostId: item.id,
              attachmentSlotId: slot.id,
              placedItemId: item.id,
            }}
          >
            <planeGeometry args={[slot.hitSize.width, slot.hitSize.depth]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
          </mesh>
        );
      })}
    </>
  );
}

export function PlacedItems() {
  const allItems = useRoomStore((state) => state.placedItems);
  const activeBuildingId = useRoomStore((state) => state.activeBuildingId);
  const items = useMemo(
    () => allItems.filter((item) => item.buildingId === activeBuildingId),
    [activeBuildingId, allItems],
  );
  const selectedItemId = useRoomStore((state) => state.selectedItemId);
  const dragPreview = useRoomStore((state) => state.dragPreview);
  const placementPreview = useRoomStore((state) => state.placementPreview);
  const isCaptureClean = useRoomStore((state) => state.isCaptureClean);
  const readyModelItemIds = useRoomStore((state) => state.readyModelItemIds);
  const invalidate = useThree((state) => state.invalidate);
  const livingMotionRefs = useRef(new Map<string, THREE.Group>());
  const livingMotionCallbacks = useRef(
    new Map<string, (group: THREE.Group | null) => void>(),
  );
  const livingItems = useMemo(
    () =>
      items.flatMap((item) => {
        const catalogItem = catalogById[item.catalogId];
        const kind = catalogItem ? getLivingAssetKind(catalogItem) : null;
        return kind
          ? [{
              id: item.id,
              kind,
              name: catalogItem?.name ?? '',
              phase: stableMotionPhase(item.id),
            }]
          : [];
      }),
    [items],
  );
  const getLivingMotionRef = useCallback((itemId: string) => {
    const existing = livingMotionCallbacks.current.get(itemId);
    if (existing) return existing;
    const callback = (group: THREE.Group | null) => {
      if (group) {
        livingMotionRefs.current.set(itemId, group);
      } else {
        livingMotionRefs.current.delete(itemId);
        livingMotionCallbacks.current.delete(itemId);
      }
    };
    livingMotionCallbacks.current.set(itemId, callback);
    return callback;
  }, []);

  useEffect(() => {
    if (livingItems.length === 0 || isCaptureClean) return;
    const timer = setInterval(invalidate, LIVING_ANIMATION_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [invalidate, isCaptureClean, livingItems.length]);

  useEffect(() => {
    if (!isCaptureClean) return;
    livingMotionRefs.current.forEach(resetLivingMotion);
    invalidate();
  }, [invalidate, isCaptureClean]);

  useFrame((state) => {
    if (isCaptureClean) return;
    const selectedOrDraggedId = dragPreview?.item.id ?? selectedItemId;
    livingItems.forEach((livingItem) => {
      const group = livingMotionRefs.current.get(livingItem.id);
      if (!group) return;
      if (livingItem.id === selectedOrDraggedId) {
        resetLivingMotion(group);
        return;
      }
      animateLivingMotion(
        group,
        livingItem.kind,
        livingItem.name,
        state.clock.elapsedTime,
        livingItem.phase,
      );
    });
  });
  const knownItemIdsRef = useRef<Set<string> | null>(null);
  const boingItemIdsRef = useRef<Set<string> | null>(null);
  const knownItemIds = knownItemIdsRef.current ?? new Set(items.map((item) => item.id));
  const boingItemIds = boingItemIdsRef.current ?? new Set<string>();
  knownItemIdsRef.current = knownItemIds;
  boingItemIdsRef.current = boingItemIds;
  for (const item of items) {
    if (!knownItemIds.has(item.id)) {
      knownItemIds.add(item.id);
      boingItemIds.add(item.id);
    }
  }
  const finishBoing = useCallback((itemId: string) => {
    boingItemIdsRef.current?.delete(itemId);
  }, []);
  const activePointLightIds = useMemo(
    () => new Set(
      items
        .filter((item) => catalogById[item.catalogId]?.emitsLight)
        .sort(
          (a, b) =>
            practicalLightPriority(b.catalogId) - practicalLightPriority(a.catalogId),
        )
        .slice(0, 2)
        .map((item) => item.id),
    ),
    [items],
  );

  return (
    <group>
      {items.map((storedItem) => {
        const isDragging = dragPreview?.item.id === storedItem.id;
        const item = isDragging ? dragPreview.item : storedItem;
        const catalogItem = catalogById[item.catalogId];
        if (!catalogItem) return null;
        const resolved = resolveItemTransform(item, items, dragPreview);
        const position = resolved.position;
        const rotation = modelRotation(item, resolved.rotationY);
        const selected = selectedItemId === item.id;
        return (
          <group key={item.id}>
            {selected && !isCaptureClean ? (
              <SelectionFootprint
                item={item}
                invalid={isDragging && !dragPreview.valid}
                items={items}
                dragPreview={dragPreview}
              />
            ) : null}
            <AttachmentSlotTargets item={item} items={items} draggedItemId={dragPreview?.item.id} />
            <group position={position} rotation={rotation}>
              {item.surface === 'floor' && !resolved.attached ? <BlobShadow footprint={catalogItem.footprint} /> : null}
              <BoingItem
                animate={boingItemIds.has(item.id)}
                itemId={item.id}
                modelReady={readyModelItemIds.includes(item.id)}
                onComplete={finishBoing}
              >
                <group ref={getLivingMotionRef(item.id)}>
                  <Suspense fallback={null}>
                    <CatalogItemModel
                      item={catalogItem}
                      placedItemId={item.id}
                      enablePointLight={activePointLightIds.has(item.id)}
                      position={[0, 0, 0]}
                      renderOrder={2}
                      rotation={[0, 0, 0]}
                    />
                  </Suspense>
                </group>
              </BoingItem>
            </group>
          </group>
        );
      })}
      {placementPreview ? (() => {
        const item = placementPreview.item;
        const catalogItem = catalogById[item.catalogId];
        if (!catalogItem) return null;
        const resolved = resolveItemTransform(item, items, dragPreview);
        return (
          <group key={`placement-${item.id}`} userData={{ placementPreviewId: item.id }}>
            {!isCaptureClean ? (
              <SelectionFootprint
                item={item}
                invalid={!placementPreview.valid}
                items={items}
                dragPreview={dragPreview}
              />
            ) : null}
            <Suspense fallback={null}>
              <CatalogItemModel
                item={catalogItem}
                enablePointLight={false}
                position={resolved.position}
                renderOrder={2}
                rotation={modelRotation(item, resolved.rotationY)}
              />
            </Suspense>
          </group>
        );
      })() : null}
    </group>
  );
}
