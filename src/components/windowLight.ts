import * as THREE from 'three';

export const WINDOW_LIGHT_START: [number, number, number] = [-1.995, 1.1, 0.65];
export const WINDOW_LIGHT_END: [number, number, number] = [-0.675, 0.043, 0.65];
export const WINDOW_LIGHT_SOURCE_WIDTH = 0.36;
export const WINDOW_LIGHT_LANDING_WIDTH = 0.9;
export const WINDOW_LIGHT_MIDPOINT: [number, number, number] = [
  (WINDOW_LIGHT_START[0] + WINDOW_LIGHT_END[0]) / 2,
  (WINDOW_LIGHT_START[1] + WINDOW_LIGHT_END[1]) / 2,
  (WINDOW_LIGHT_START[2] + WINDOW_LIGHT_END[2]) / 2,
];

const beamDirection = new THREE.Vector3(
  WINDOW_LIGHT_END[0] - WINDOW_LIGHT_START[0],
  WINDOW_LIGHT_END[1] - WINDOW_LIGHT_START[1],
  WINDOW_LIGHT_END[2] - WINDOW_LIGHT_START[2],
);
export const WINDOW_LIGHT_LENGTH = beamDirection.length();
beamDirection.normalize();

const widthAxis = new THREE.Vector3(0, 0, 1);
const normalAxis = new THREE.Vector3().crossVectors(widthAxis, beamDirection).normalize();
const beamBasis = new THREE.Matrix4().makeBasis(widthAxis, beamDirection, normalAxis);
const beamQuaternion = new THREE.Quaternion().setFromRotationMatrix(beamBasis);

export const WINDOW_LIGHT_QUATERNION: [number, number, number, number] = [
  beamQuaternion.x,
  beamQuaternion.y,
  beamQuaternion.z,
  beamQuaternion.w,
];
