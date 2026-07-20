import * as THREE from 'three';

export const DEFAULT_CAMERA_POSITION = [5.8, 6.45, 6.4] as const;
export const CAMERA_TARGET = [0, 1.77, 0] as const;
export const DEFAULT_CAMERA_ZOOM = 72;
export const MIN_CAMERA_ZOOM = 52;
export const MAX_CAMERA_ZOOM = 104;

export const CAMERA_HORIZONTAL_RADIUS = Math.hypot(DEFAULT_CAMERA_POSITION[0], DEFAULT_CAMERA_POSITION[2]);
export const CAMERA_VERTICAL_OFFSET = DEFAULT_CAMERA_POSITION[1] - CAMERA_TARGET[1];
export const DEFAULT_CAMERA_YAW = Math.atan2(DEFAULT_CAMERA_POSITION[0], DEFAULT_CAMERA_POSITION[2]);
export const MIN_CAMERA_YAW = THREE.MathUtils.degToRad(12);
export const MAX_CAMERA_YAW = THREE.MathUtils.degToRad(78);

export function clampCameraYaw(yaw: number) {
  return THREE.MathUtils.clamp(yaw, MIN_CAMERA_YAW, MAX_CAMERA_YAW);
}

export function cameraYawFromDrag(startYaw: number, translationX: number, viewportWidth: number) {
  const safeWidth = Math.max(viewportWidth, 1);
  return clampCameraYaw(startYaw - (translationX / safeWidth) * (Math.PI / 2));
}

export function clampCameraZoom(zoom: number) {
  return THREE.MathUtils.clamp(zoom, MIN_CAMERA_ZOOM, MAX_CAMERA_ZOOM);
}

export function cameraPositionForYaw(
  yaw: number,
  target: readonly [number, number, number] = CAMERA_TARGET,
): [number, number, number] {
  return [
    target[0] + CAMERA_HORIZONTAL_RADIUS * Math.sin(yaw),
    target[1] + CAMERA_VERTICAL_OFFSET,
    target[2] + CAMERA_HORIZONTAL_RADIUS * Math.cos(yaw),
  ];
}
