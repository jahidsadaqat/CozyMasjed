import { useFrame } from '@react-three/fiber/native';
import { Suspense, useCallback, useLayoutEffect, useMemo, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import { catalogById } from '../../catalog/catalog';
import { BlobShadow } from '../BlobShadow';
import { attachmentSlotHitWorldPosition, resolveItemTransform } from '../../domain/attachments';
import { CELL_SIZE, getPlacementSize, type PlacedItem } from '../../domain/grid';
import { useRoomStore } from '../../store/roomStore';
import { CatalogItemModel } from '../models/CatalogItemModel';

function modelRotation(item: PlacedItem, resolvedRotationY?: number): [number, number, number] {
  const catalogItem = catalogById[item.catalogId];
  const base = catalogItem?.modelRotation ?? [0, 0, 0];
  const surfaceTurn = item.surface === 'wallL' ? Math.PI / 2 : 0;
  const rotationY = resolvedRotationY ?? surfaceTurn + (item.rotation * Math.PI) / 180;
  return [base[0], base[1] + rotationY, base[2]];
}

const BOING_DURATION = 0.35;
const MAX_FRAME_DELTA = 0.05;

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
  }, [animate]);

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
  const color = invalid ? '#D96F66' : '#C2BEC8';
  const baseRadius = (Math.max(size.width, size.height) * CELL_SIZE) / 2;
  const radius = baseRadius + (item.surface === 'floor' ? 0.24 : 0.07);

  if (item.surface === 'floor') {
    return (
      <mesh position={[x, y + 0.012, z]} renderOrder={3} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[radius, 48]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={invalid ? 0.66 : 0.58}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
        />
      </mesh>
    );
  }

  const centerY = y + (size.height * CELL_SIZE) / 2;
  const position: [number, number, number] = item.surface === 'wallL' ? [x + 0.018, centerY, z] : [x, centerY, z + 0.018];
  const rotation: [number, number, number] = item.surface === 'wallL' ? [0, Math.PI / 2, 0] : [0, 0, 0];
  return (
    <mesh position={position} renderOrder={3} rotation={rotation}>
      <circleGeometry args={[radius, 48]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={invalid ? 0.58 : 0.46}
        depthWrite={false}
        polygonOffset
        polygonOffsetFactor={-1}
        polygonOffsetUnits={-1}
      />
    </mesh>
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
  const activePointLightIds = new Set(
    items.filter((item) => catalogById[item.catalogId]?.emitsLight).slice(0, 3).map((item) => item.id),
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
