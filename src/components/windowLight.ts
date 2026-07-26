import * as THREE from 'three';
import type { BuildingId } from '../domain/buildings';
import { ROOM_FOOTPRINT_SCALE } from '../domain/grid';

type Vector2Tuple = [number, number];
type Vector3Tuple = [number, number, number];
type QuaternionTuple = [number, number, number, number];

export type WindowPaneQuad = [
  Vector2Tuple,
  Vector2Tuple,
  Vector2Tuple,
  Vector2Tuple,
];

export type WindowLightConfig = {
  start: Vector3Tuple;
  end: Vector3Tuple;
  midpoint: Vector3Tuple;
  quaternion: QuaternionTuple;
  length: number;
  sourceWidth: number;
  landingWidth: number;
  spotAngle: number;
  glowPosition: Vector3Tuple;
  glowSize: [number, number];
  paneQuads: readonly WindowPaneQuad[];
};

type AuthoredWindowLight = Omit<
  WindowLightConfig,
  'midpoint' | 'quaternion' | 'length'
>;

function resolveWindowLight(config: AuthoredWindowLight): WindowLightConfig {
  const scaleXZ = ([x, y, z]: Vector3Tuple): Vector3Tuple => [
    x * ROOM_FOOTPRINT_SCALE,
    y,
    z * ROOM_FOOTPRINT_SCALE,
  ];
  const scaledConfig: AuthoredWindowLight = {
    ...config,
    start: scaleXZ(config.start),
    end: scaleXZ(config.end),
    sourceWidth: config.sourceWidth * ROOM_FOOTPRINT_SCALE,
    landingWidth: config.landingWidth * ROOM_FOOTPRINT_SCALE,
    glowPosition: scaleXZ(config.glowPosition),
    glowSize: [
      config.glowSize[0] * ROOM_FOOTPRINT_SCALE,
      config.glowSize[1],
    ],
    paneQuads: config.paneQuads.map((quad) =>
      quad.map(([x, z]) => [
        x * ROOM_FOOTPRINT_SCALE,
        z * ROOM_FOOTPRINT_SCALE,
      ]) as WindowPaneQuad,
    ),
  };
  const midpoint: Vector3Tuple = [
    (scaledConfig.start[0] + scaledConfig.end[0]) / 2,
    (scaledConfig.start[1] + scaledConfig.end[1]) / 2,
    (scaledConfig.start[2] + scaledConfig.end[2]) / 2,
  ];
  const beamDirection = new THREE.Vector3(
    scaledConfig.end[0] - scaledConfig.start[0],
    scaledConfig.end[1] - scaledConfig.start[1],
    scaledConfig.end[2] - scaledConfig.start[2],
  );
  const length = beamDirection.length();
  beamDirection.normalize();

  const widthAxis = new THREE.Vector3(0, 0, 1);
  const normalAxis = new THREE.Vector3().crossVectors(widthAxis, beamDirection).normalize();
  const beamBasis = new THREE.Matrix4().makeBasis(widthAxis, beamDirection, normalAxis);
  const beamQuaternion = new THREE.Quaternion().setFromRotationMatrix(beamBasis);

  return {
    ...scaledConfig,
    midpoint,
    length,
    quaternion: [
      beamQuaternion.x,
      beamQuaternion.y,
      beamQuaternion.z,
      beamQuaternion.w,
    ],
  };
}

const peachSunriseWindow = resolveWindowLight({
  // Measured from the authored Peach clear aperture. Its window is narrower
  // and slightly higher than Violet's, so it needs its own projection rather
  // than inheriting an oversized generic beam.
  start: [-1.995, 1.262, 0],
  end: [-0.58, 0.046, 0],
  sourceWidth: 0.624,
  landingWidth: 1.386,
  spotAngle: 0.37,
  glowPosition: [-2.085, 1.361, 0],
  glowSize: [1.54, 1.74],
  paneQuads: [
    [[-1.527, -0.624], [-1.527, -0.087], [-0.912, -0.069], [-0.912, -0.693]],
    [[-1.527, 0.087], [-1.527, 0.624], [-0.912, 0.693], [-0.912, 0.069]],
    [[-0.779, -0.745], [-0.779, -0.069], [0.491, -0.052], [0.491, -0.884]],
    [[-0.779, 0.069], [-0.779, 0.745], [0.491, 0.884], [0.491, 0.052]],
  ],
});

const violetDuskWindow = resolveWindowLight({
  // Measured from the authored Violet clear aperture. Keeping z=0 centres the
  // beam and its four-pane floor projection on the pointed window.
  start: [-1.995, 1.227, 0],
  end: [-0.62, 0.046, 0],
  sourceWidth: 0.72,
  landingWidth: 1.6,
  spotAngle: 0.42,
  glowPosition: [-2.085, 1.32, 0],
  glowSize: [1.78, 1.7],
  paneQuads: [
    [[-1.55, -0.72], [-1.55, -0.1], [-0.95, -0.08], [-0.95, -0.8]],
    [[-1.55, 0.1], [-1.55, 0.72], [-0.95, 0.8], [-0.95, 0.08]],
    [[-0.82, -0.86], [-0.82, -0.08], [0.42, -0.06], [0.42, -1.02]],
    [[-0.82, 0.08], [-0.82, 0.86], [0.42, 1.02], [0.42, 0.06]],
  ],
});

export const WINDOW_LIGHT_CONFIGS: Readonly<Record<BuildingId, WindowLightConfig>> = {
  'peach-sunrise-room': peachSunriseWindow,
  'violet-dusk-room': violetDuskWindow,
};

export function getWindowLightConfig(buildingId: BuildingId) {
  return WINDOW_LIGHT_CONFIGS[buildingId];
}
