import type { RootState } from '@react-three/fiber';
import * as Haptics from 'expo-haptics';
import { AccessibilityInfo } from 'react-native';
import * as THREE from 'three';
import { catalogById } from '../../catalog/catalog';
import type { PlacementSurface } from '../../catalog/types';
import { BUILDING_OPTIONS } from '../../domain/buildings';
import {
  canAttachToSlot,
  rotationForAttachment,
  worldItemRotation,
} from '../../domain/attachments';
import {
  CAMERA_TARGET,
  cameraPositionForYaw,
  cameraYawFromDrag,
  clampCameraZoom,
  DEFAULT_CAMERA_YAW,
  DEFAULT_CAMERA_ZOOM,
} from '../../domain/camera';
import {
  placementToWorld,
  worldToPlacement,
  type PlacedItem,
} from '../../domain/grid';
import { useRoomStore } from '../../store/roomStore';

let rootState: RootState | null = null;
let pinchStartZoom = DEFAULT_CAMERA_ZOOM;
let currentCameraYaw = DEFAULT_CAMERA_YAW;
const currentCameraTarget = new THREE.Vector3(...CAMERA_TARGET);
const pinchAnchor = new THREE.Vector3();
const pinchPlanePoint = new THREE.Vector3();
const pinchPlaneNormal = new THREE.Vector3();
const pinchTargetCandidate = new THREE.Vector3();
const pinchPlane = new THREE.Plane();
let hasPinchAnchor = false;
let dragGrabOffset = new THREE.Vector3();
let activeDragSurface: PlacementSurface | null = null;
let preparedPan: { mode: 'item' | 'placement' | 'orbit'; x: number; y: number; placedId?: string } | null = null;
let activePanMode: 'item' | 'placement' | 'orbit' | null = null;
let orbitStartYaw = DEFAULT_CAMERA_YAW;
let pinchActive = false;
let suppressTapUntil = 0;

function findTaggedParent(
  object: THREE.Object3D,
  key:
    | 'placedItemId'
    | 'placementPreviewId'
    | 'placementSurface'
    | 'attachmentHostId'
    | 'attachmentSlotId',
) {
  let current: THREE.Object3D | null = object;
  while (current) {
    if (current.userData[key]) return current.userData[key] as string;
    current = current.parent;
  }
  return null;
}

function attachmentSlotHit(
  hits: THREE.Intersection[],
  child: PlacedItem,
  ignoredItemId?: string,
) {
  const placedItems = useRoomStore.getState().placedItems;
  for (const hit of hits) {
    const hostId = findTaggedParent(hit.object, 'attachmentHostId');
    const slotId = findTaggedParent(hit.object, 'attachmentSlotId');
    if (!hostId || !slotId) continue;
    const host = placedItems.find((item) => item.id === hostId);
    if (host && canAttachToSlot(child, host, slotId, placedItems, ignoredItemId)) {
      return { hostId, slotId };
    }
  }
  return null;
}

function intersectionsAt(x: number, y: number) {
  if (!rootState) return [];
  rootState.pointer.set((x / rootState.size.width) * 2 - 1, -(y / rootState.size.height) * 2 + 1);
  rootState.raycaster.setFromCamera(rootState.pointer, rootState.camera);
  return rootState.raycaster.intersectObjects(rootState.scene.children, true);
}

function findPlacedId(hits: THREE.Intersection[]) {
  for (const hit of hits) {
    const id = findTaggedParent(hit.object, 'placedItemId');
    if (id) return id;
  }
  return null;
}

function findPlacementPreviewId(hits: THREE.Intersection[]) {
  for (const hit of hits) {
    const id = findTaggedParent(hit.object, 'placementPreviewId');
    if (id) return id;
  }
  return null;
}

function surfaceHit(hits: THREE.Intersection[], accepted?: readonly PlacementSurface[]) {
  for (const hit of hits) {
    const surface = findTaggedParent(hit.object, 'placementSurface') as PlacementSurface | null;
    if (surface && (!accepted || accepted.includes(surface))) return { surface, point: hit.point };
  }
  return null;
}

function updatePlacementFromPointer(x: number, y: number) {
  const store = useRoomStore.getState();
  const preview = store.placementPreview;
  const catalogItem = store.placingCatalogId ? catalogById[store.placingCatalogId] : null;
  if (!preview || !catalogItem) return false;

  const hits = intersectionsAt(x, y);
  if (catalogItem.attachmentRole) {
    const slotHit = attachmentSlotHit(hits, preview.item);
    if (slotHit) {
      const host = store.placedItems.find((item) => item.id === slotHit.hostId);
      const rotation = host
        ? rotationForAttachment(preview.item, host, slotHit.slotId, store.placedItems)
        : preview.item.rotation;
      store.previewPlacement({
        ...preview.item,
        rotation,
        surface: 'floor',
        attachment: { hostItemId: slotHit.hostId, slotId: slotHit.slotId },
      });
      return useRoomStore.getState().placementPreview?.valid ?? false;
    }
  }

  const hit = surfaceHit(hits, catalogItem.allowedSurfaces);
  if (!hit) return false;

  const rotation = preview.item.attachment
    ? worldItemRotation(preview.item, store.placedItems)
    : preview.item.rotation;

  const anchor = worldToPlacement(
    hit.point,
    catalogItem,
    hit.surface,
    rotation,
    hit.surface !== 'floor',
  );
  store.previewPlacement({ ...preview.item, ...anchor, rotation, attachment: undefined });
  return useRoomStore.getState().placementPreview?.valid ?? false;
}

export function updateEditorPlacementHover(x: number, y: number) {
  if (pinchActive || activePanMode || !useRoomStore.getState().placingCatalogId) return;
  updatePlacementFromPointer(x, y);
}

export function setEditorRootState(state: RootState) {
  rootState = state;
  const store = useRoomStore.getState();
  currentCameraYaw = store.cameraYaw;
  currentCameraTarget.fromArray(store.cameraTarget);
  if (state.camera instanceof THREE.OrthographicCamera) {
    const [x, y, z] = cameraPositionForYaw(currentCameraYaw, [
      currentCameraTarget.x,
      currentCameraTarget.y,
      currentCameraTarget.z,
    ]);
    state.camera.position.set(x, y, z);
    state.camera.zoom = store.cameraZoom;
    state.camera.lookAt(currentCameraTarget);
    state.camera.updateProjectionMatrix();
    state.camera.updateMatrixWorld();
    state.invalidate();
  }
}

export function getEditorRootState() {
  return rootState;
}

export function handleEditorTap(x: number, y: number) {
  if (pinchActive || Date.now() < suppressTapUntil) return;
  const store = useRoomStore.getState();
  if (store.placingCatalogId) {
    if (updatePlacementFromPointer(x, y)) useRoomStore.getState().commitPlacementPreview();
    return;
  }

  const hits = intersectionsAt(x, y);
  const placedId = findPlacedId(hits);
  if (placedId) {
    store.selectItem(placedId);
    return;
  }
  store.selectItem(null);
}

function beginItemDrag(placedId: string, x: number, y: number) {
  const hits = intersectionsAt(x, y);
  if (findPlacedId(hits) !== placedId) return false;
  const store = useRoomStore.getState();
  const placed = store.placedItems.find((item) => item.id === placedId);
  if (!placed) return false;
  const catalogItem = catalogById[placed.catalogId];
  if (!catalogItem) return false;

  if (placed.attachment) {
    dragGrabOffset.set(0, 0, 0);
    activeDragSurface = 'floor';
    store.beginDrag(placedId);
    return true;
  }

  const hit = surfaceHit(hits, [placed.surface]);
  if (!hit) return false;
  const [worldX, worldY, worldZ] = placementToWorld(placed, catalogItem);
  dragGrabOffset = hit.point.clone().sub(new THREE.Vector3(worldX, worldY, worldZ));
  if (placed.surface !== 'floor') dragGrabOffset.y = hit.point.y - worldY;
  activeDragSurface = placed.surface;
  store.beginDrag(placedId);
  return true;
}

function updateItemDrag(x: number, y: number) {
  const store = useRoomStore.getState();
  const preview = store.dragPreview;
  if (!preview || !activeDragSurface) return;
  const catalogItem = catalogById[preview.item.catalogId];
  if (!catalogItem) return;
  const hits = intersectionsAt(x, y);
  const sourceItem = store.placedItems.find((item) => item.id === preview.item.id) ?? preview.item;
  if (catalogItem.attachmentRole) {
    const slotHit = attachmentSlotHit(hits, preview.item, preview.item.id);
    if (slotHit) {
      const host = store.placedItems.find((item) => item.id === slotHit.hostId);
      const rotation = host
        ? rotationForAttachment(sourceItem, host, slotHit.slotId, store.placedItems)
        : preview.item.rotation;
      store.previewMove({
        ...preview.item,
        rotation,
        surface: 'floor',
        attachment: { hostItemId: slotHit.hostId, slotId: slotHit.slotId },
      });
      return;
    }
  }

  const hit = surfaceHit(hits, [activeDragSurface]);
  if (!hit) {
    store.invalidateDragPreview();
    return;
  }
  const desired = hit.point.clone().sub(dragGrabOffset);
  const rotation = sourceItem.attachment
    ? worldItemRotation(sourceItem, store.placedItems)
    : sourceItem.rotation;
  const anchor = worldToPlacement(desired, catalogItem, activeDragSurface, rotation);
  const candidate: PlacedItem = { ...preview.item, ...anchor, rotation, attachment: undefined };
  store.previewMove(candidate);
}

function clearItemDrag() {
  activeDragSurface = null;
  dragGrabOffset.set(0, 0, 0);
}

function applyCameraYaw(yaw: number) {
  if (!rootState) return;
  currentCameraYaw = yaw;
  const [x, y, z] = cameraPositionForYaw(yaw, [
    currentCameraTarget.x,
    currentCameraTarget.y,
    currentCameraTarget.z,
  ]);
  rootState.camera.position.set(x, y, z);
  rootState.camera.lookAt(currentCameraTarget);
  rootState.camera.updateMatrixWorld();
  rootState.invalidate();
}

function saveCameraView() {
  const store = useRoomStore.getState();
  const zoom = rootState?.camera instanceof THREE.OrthographicCamera ? rootState.camera.zoom : store.cameraZoom;
  store.setCameraView(zoom, currentCameraYaw, [
    currentCameraTarget.x,
    currentCameraTarget.y,
    currentCameraTarget.z,
  ]);
}

function pointOnCameraPlane(x: number, y: number, target: THREE.Vector3, result: THREE.Vector3) {
  if (!rootState) return false;
  rootState.pointer.set((x / rootState.size.width) * 2 - 1, -(y / rootState.size.height) * 2 + 1);
  rootState.raycaster.setFromCamera(rootState.pointer, rootState.camera);
  rootState.camera.getWorldDirection(pinchPlaneNormal);
  pinchPlane.setFromNormalAndCoplanarPoint(pinchPlaneNormal, target);
  return rootState.raycaster.ray.intersectPlane(pinchPlane, result) !== null;
}

function keepTargetInsideRoom(target: THREE.Vector3) {
  target.x = THREE.MathUtils.clamp(target.x, -0.82, 0.82);
  target.y = THREE.MathUtils.clamp(target.y, 1.47, 2.17);
  target.z = THREE.MathUtils.clamp(target.z, -0.82, 0.82);
}

export function prepareEditorPan(x: number, y: number) {
  if (pinchActive) return;
  const hits = intersectionsAt(x, y);
  const store = useRoomStore.getState();
  const placingItem = store.placingCatalogId ? catalogById[store.placingCatalogId] : null;
  if (placingItem) {
    preparedPan = findPlacementPreviewId(hits) === store.placementPreview?.item.id
      ? { mode: 'placement', x, y }
      : { mode: 'orbit', x, y };
    return;
  }
  const placedId = findPlacedId(hits);
  preparedPan = placedId ? { mode: 'item', x, y, placedId } : { mode: 'orbit', x, y };
}

export function activateEditorPan() {
  if (!preparedPan || pinchActive) return;
  if (preparedPan.mode === 'placement') {
    activePanMode = 'placement';
    updatePlacementFromPointer(preparedPan.x, preparedPan.y);
    return;
  }
  if (preparedPan.mode === 'item' && preparedPan.placedId) {
    activePanMode = beginItemDrag(preparedPan.placedId, preparedPan.x, preparedPan.y) ? 'item' : null;
    return;
  }
  orbitStartYaw = currentCameraYaw;
  activePanMode = 'orbit';
}

export function updateEditorPan(x: number, y: number, translationX: number) {
  if (pinchActive) return;
  if (activePanMode === 'placement') {
    updatePlacementFromPointer(x, y);
    return;
  }
  if (activePanMode === 'item') {
    updateItemDrag(x, y);
    return;
  }
  if (activePanMode === 'orbit' && rootState) {
    applyCameraYaw(cameraYawFromDrag(orbitStartYaw, translationX, rootState.size.width));
  }
}

function switchBuildingFromRoomSwipe(
  translationX: number,
  translationY: number,
  velocityX: number,
) {
  if (!rootState) return false;
  const horizontal = Math.abs(translationX);
  const vertical = Math.abs(translationY);
  const width = Math.max(rootState.size.width, 1);
  const isLongSwipe = horizontal >= Math.max(150, width * 0.52) && horizontal >= vertical * 1.5;
  const isFastSwipe =
    horizontal >= Math.max(72, width * 0.22) &&
    Math.abs(velocityX) >= 850 &&
    horizontal >= vertical * 1.35;
  if (!isLongSwipe && !isFastSwipe) return false;

  const store = useRoomStore.getState();
  const currentIndex = BUILDING_OPTIONS.findIndex(
    (building) => building.id === store.activeBuildingId,
  );
  const nextIndex = Math.min(
    BUILDING_OPTIONS.length - 1,
    Math.max(0, currentIndex + (translationX < 0 ? 1 : -1)),
  );
  const nextBuilding = BUILDING_OPTIONS[nextIndex];
  if (!nextBuilding || nextBuilding.id === store.activeBuildingId) return false;

  // The same gesture previews camera orbit while the finger moves. Restore the
  // original angle before paging so switching buildings never leaves a camera
  // rotation behind.
  applyCameraYaw(orbitStartYaw);
  store.setActiveBuildingId(nextBuilding.id);
  saveCameraView();
  suppressTapUntil = Date.now() + 180;
  void Haptics.selectionAsync();
  void AccessibilityInfo.announceForAccessibility(
    `${nextBuilding.name}, building ${nextIndex + 1} of ${BUILDING_OPTIONS.length}`,
  );
  return true;
}

export function finishEditorPan(
  success: boolean,
  x: number,
  y: number,
  translationX = 0,
  translationY = 0,
  velocityX = 0,
) {
  const store = useRoomStore.getState();
  if (activePanMode === 'placement') {
    if (success && updatePlacementFromPointer(x, y)) useRoomStore.getState().commitPlacementPreview();
  } else if (activePanMode === 'item') {
    if (success) store.finishDrag();
    else store.cancelDrag();
    clearItemDrag();
  } else if (activePanMode === 'orbit') {
    if (!success || !switchBuildingFromRoomSwipe(translationX, translationY, velocityX)) {
      saveCameraView();
    }
  }
  preparedPan = null;
  activePanMode = null;
}

export function beginEditorPinch(focalX: number, focalY: number) {
  if (!rootState) return;
  pinchStartZoom = rootState.camera.zoom;
  pinchActive = true;
  suppressTapUntil = Number.POSITIVE_INFINITY;
  const store = useRoomStore.getState();
  store.cancelDrag();
  hasPinchAnchor = pointOnCameraPlane(focalX, focalY, currentCameraTarget, pinchAnchor);
  clearItemDrag();
  preparedPan = null;
  activePanMode = null;
}

export function updateEditorPinch(scale: number, focalX: number, focalY: number) {
  if (!rootState || !(rootState.camera instanceof THREE.OrthographicCamera)) return;
  const zoom = clampCameraZoom(pinchStartZoom * scale);
  rootState.camera.zoom = zoom;
  rootState.camera.updateProjectionMatrix();
  rootState.camera.updateMatrixWorld();

  if (hasPinchAnchor && pointOnCameraPlane(focalX, focalY, currentCameraTarget, pinchPlanePoint)) {
    pinchTargetCandidate.copy(currentCameraTarget).add(pinchAnchor).sub(pinchPlanePoint);
    keepTargetInsideRoom(pinchTargetCandidate);
    const appliedDelta = pinchTargetCandidate.sub(currentCameraTarget);
    currentCameraTarget.add(appliedDelta);
    rootState.camera.position.add(appliedDelta);
    rootState.camera.lookAt(currentCameraTarget);
    rootState.camera.updateMatrixWorld();
  }
  rootState.invalidate();
}

export function finishEditorPinch() {
  if (!pinchActive) return;
  saveCameraView();
  hasPinchAnchor = false;
  pinchActive = false;
  suppressTapUntil = Date.now() + 160;
}
