import type * as THREE from 'three';

export const SCENE_INTERACTION_LAYER = 0;
export const PLACEMENT_TARGET_LAYER = 1;

/**
 * Placement planes are invisible interaction geometry, not scene content.
 * Keeping them on their own layer lets drag updates skip triangle tests for
 * every loaded GLB while ordinary taps can still select the visible models.
 */
export function configurePlacementRaycastTarget(object: THREE.Object3D | null) {
  object?.layers.set(PLACEMENT_TARGET_LAYER);
}
