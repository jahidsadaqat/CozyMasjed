import type { RootState } from '@react-three/fiber';
import * as THREE from 'three';
import { catalogById } from '../../catalog/catalog';
import type { PlacementSurface } from '../../catalog/types';
import { placementToWorld, worldToPlacement, type PlacedItem } from '../../domain/grid';
import { useRoomStore } from '../../store/roomStore';

let rootState: RootState | null = null;
let pinchStartZoom = 72;
let dragGrabOffset = new THREE.Vector3();
let activeDragSurface: PlacementSurface | null = null;

function findTaggedParent(object: THREE.Object3D, key: 'placedItemId' | 'placementSurface') {
  let current: THREE.Object3D | null = object;
  while (current) {
    if (current.userData[key]) return current.userData[key] as string;
    current = current.parent;
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

function surfaceHit(hits: THREE.Intersection[], accepted?: readonly PlacementSurface[]) {
  for (const hit of hits) {
    const surface = findTaggedParent(hit.object, 'placementSurface') as PlacementSurface | null;
    if (surface && (!accepted || accepted.includes(surface))) return { surface, point: hit.point };
  }
  return null;
}

export function setEditorRootState(state: RootState) {
  rootState = state;
}

export function getEditorRootState() {
  return rootState;
}

export function handleEditorTap(x: number, y: number) {
  const hits = intersectionsAt(x, y);
  const placedId = findPlacedId(hits);
  if (placedId) {
    useRoomStore.getState().selectItem(placedId);
    return;
  }

  const store = useRoomStore.getState();
  const placingItem = store.placingCatalogId ? catalogById[store.placingCatalogId] : null;
  if (placingItem) {
    const hit = surfaceHit(hits, placingItem.allowedSurfaces);
    if (hit) {
      const anchor = worldToPlacement(hit.point, placingItem, hit.surface, 0, hit.surface !== 'floor');
      store.placeCatalogItem(placingItem.id, anchor.gridX, anchor.gridY, hit.surface);
      return;
    }
  }
  store.selectItem(null);
}

export function beginEditorDrag(x: number, y: number) {
  const hits = intersectionsAt(x, y);
  const placedId = findPlacedId(hits);
  if (!placedId) return;
  const store = useRoomStore.getState();
  const placed = store.placedItems.find((item) => item.id === placedId);
  if (!placed) return;
  const catalogItem = catalogById[placed.catalogId];
  const hit = surfaceHit(hits, [placed.surface]);
  if (!catalogItem || !hit) return;
  const [worldX, worldY, worldZ] = placementToWorld(placed, catalogItem);
  dragGrabOffset = hit.point.clone().sub(new THREE.Vector3(worldX, worldY, worldZ));
  if (placed.surface !== 'floor') dragGrabOffset.y = hit.point.y - worldY;
  activeDragSurface = placed.surface;
  store.beginDrag(placedId);
}

export function updateEditorDrag(x: number, y: number) {
  const store = useRoomStore.getState();
  const preview = store.dragPreview;
  if (!preview || !activeDragSurface) return;
  const catalogItem = catalogById[preview.item.catalogId];
  if (!catalogItem) return;
  const hit = surfaceHit(intersectionsAt(x, y), [activeDragSurface]);
  if (!hit) {
    store.invalidateDragPreview();
    return;
  }
  const desired = hit.point.clone().sub(dragGrabOffset);
  const anchor = worldToPlacement(desired, catalogItem, activeDragSurface, preview.item.rotation);
  const candidate: PlacedItem = { ...preview.item, ...anchor };
  store.previewMove(candidate);
}

export function finishEditorDrag() {
  useRoomStore.getState().finishDrag();
  activeDragSurface = null;
  dragGrabOffset.set(0, 0, 0);
}

export function beginEditorPinch() {
  if (!rootState) return;
  pinchStartZoom = rootState.camera.zoom;
  useRoomStore.getState().cancelDrag();
  activeDragSurface = null;
}

export function updateEditorPinch(scale: number) {
  if (!rootState || !(rootState.camera instanceof THREE.OrthographicCamera)) return;
  const zoom = THREE.MathUtils.clamp(pinchStartZoom * scale, 52, 104);
  rootState.camera.zoom = zoom;
  rootState.camera.updateProjectionMatrix();
  rootState.invalidate();
  useRoomStore.getState().setCameraZoom(zoom);
}
