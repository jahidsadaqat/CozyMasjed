import * as THREE from 'three';
import { catalogById } from '../catalog/catalog';
import type { AttachmentSlot } from '../catalog/types';
import { placementToWorld, type PlacedItem, type QuarterTurn } from './grid';

export type ResolvedItemTransform = {
  position: [number, number, number];
  rotationY: number;
  attached: boolean;
};

export function getAttachmentSlot(host: PlacedItem, slotId: string): AttachmentSlot | null {
  return catalogById[host.catalogId]?.attachmentSlots?.find((slot) => slot.id === slotId) ?? null;
}

export function canAttachToSlot(
  child: PlacedItem,
  host: PlacedItem,
  slotId: string,
  placedItems: readonly PlacedItem[],
  ignoredItemId?: string,
) {
  const childCatalog = catalogById[child.catalogId];
  const slot = getAttachmentSlot(host, slotId);
  if (
    !childCatalog?.attachmentRole ||
    !slot?.accepts.includes(childCatalog.attachmentRole) ||
    child.buildingId !== host.buildingId ||
    child.level !== host.level ||
    child.zoneId !== host.zoneId ||
    host.id === child.id ||
    host.attachment ||
    host.surface !== 'floor'
  ) {
    return false;
  }

  return !placedItems.some(
    (item) =>
      item.id !== ignoredItemId &&
      item.attachment?.hostItemId === host.id &&
      item.attachment.slotId === slotId,
  );
}

function rotateOffset(offsetX: number, offsetZ: number, rotationY: number) {
  const cos = Math.cos(rotationY);
  const sin = Math.sin(rotationY);
  return {
    x: offsetX * cos + offsetZ * sin,
    z: -offsetX * sin + offsetZ * cos,
  };
}

function normalizeQuarterTurn(degrees: number): QuarterTurn {
  return (((Math.round(degrees / 90) * 90) % 360 + 360) % 360) as QuarterTurn;
}

export function worldItemRotation(
  item: PlacedItem,
  placedItems: readonly PlacedItem[],
): QuarterTurn {
  const { rotationY } = resolveItemTransform(item, placedItems);
  return normalizeQuarterTurn(THREE.MathUtils.radToDeg(rotationY));
}

export function rotationForAttachment(
  item: PlacedItem,
  host: PlacedItem,
  slotId: string,
  placedItems: readonly PlacedItem[],
): QuarterTurn {
  const slot = getAttachmentSlot(host, slotId);
  if (!slot) return item.rotation;
  const slotRotation = THREE.MathUtils.radToDeg(slot.localRotation ?? 0);
  return normalizeQuarterTurn(worldItemRotation(item, placedItems) - host.rotation - slotRotation);
}

export function resolveItemTransform(
  item: PlacedItem,
  placedItems: readonly PlacedItem[],
  dragPreview?: { item: PlacedItem } | null,
): ResolvedItemTransform {
  const catalogItem = catalogById[item.catalogId];
  const baseRotation = (item.rotation * Math.PI) / 180;
  if (!catalogItem) return { position: [0, 0, 0], rotationY: baseRotation, attached: false };

  if (item.attachment) {
    const storedHost = placedItems.find((candidate) => candidate.id === item.attachment?.hostItemId);
    const host = storedHost && dragPreview?.item.id === storedHost.id ? dragPreview.item : storedHost;
    const slot = host ? getAttachmentSlot(host, item.attachment.slotId) : null;
    const hostCatalog = host ? catalogById[host.catalogId] : null;
    if (host && hostCatalog && slot) {
      const hostPosition = placementToWorld(host, hostCatalog);
      const hostRotation = (host.rotation * Math.PI) / 180;
      const offset = rotateOffset(slot.localPosition[0], slot.localPosition[2], hostRotation);
      const childRotation = slot.lockRotation ? 0 : baseRotation;
      return {
        position: [
          hostPosition[0] + offset.x,
          hostPosition[1] + slot.localPosition[1],
          hostPosition[2] + offset.z,
        ],
        rotationY: hostRotation + (slot.localRotation ?? 0) + childRotation,
        attached: true,
      };
    }
  }

  const position = placementToWorld(item, catalogItem);
  const surfaceTurn = item.surface === 'wallL' ? Math.PI / 2 : 0;
  return { position, rotationY: surfaceTurn + baseRotation, attached: false };
}

export function attachmentSlotWorldPosition(host: PlacedItem, slot: AttachmentSlot) {
  return attachmentLocalPositionToWorld(host, slot.localPosition);
}

export function attachmentSlotHitWorldPosition(host: PlacedItem, slot: AttachmentSlot) {
  return attachmentLocalPositionToWorld(host, slot.hitPosition ?? slot.localPosition);
}

function attachmentLocalPositionToWorld(
  host: PlacedItem,
  localPosition: readonly [number, number, number],
) {
  const hostCatalog = catalogById[host.catalogId];
  if (!hostCatalog) return new THREE.Vector3();
  const position = placementToWorld(host, hostCatalog);
  const rotationY = (host.rotation * Math.PI) / 180;
  const offset = rotateOffset(localPosition[0], localPosition[2], rotationY);
  return new THREE.Vector3(position[0] + offset.x, position[1] + localPosition[1], position[2] + offset.z);
}
