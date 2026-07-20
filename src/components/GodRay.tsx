import * as THREE from 'three';
import { FLOOR_TOP } from '../domain/grid';
import { useRoomStore } from '../store/roomStore';
import { createRadialGradientTexture } from './BlobShadow';
import {
  WINDOW_LIGHT_END,
  WINDOW_LIGHT_LENGTH,
  WINDOW_LIGHT_MIDPOINT,
  WINDOW_LIGHT_QUATERNION,
} from './windowLight';

const BEAM_LAYERS = [
  { width: 0.5, opacity: 0.1, normalOffset: -0.012 },
  { width: 0.62, opacity: 0.07, normalOffset: 0 },
  { width: 0.74, opacity: 0.05, normalOffset: 0.012 },
] as const;

const DAY_BEAM_COLOR = '#FFE0A8';
const NIGHT_BEAM_COLOR = '#C8D4F0';
const NIGHT_OPACITY_MULTIPLIER = 0.35;
const ignoreRaycast = () => undefined;

// White pixels carry the radial alpha; material color switches the same pool
// between exact warm daylight (#FFDC96) and cool moonlight without new textures.
const lightPoolTexture = createRadialGradientTexture({
  red: 255,
  green: 255,
  blue: 255,
  alpha: 0.28,
});

export function GodRay() {
  const lighting = useRoomStore((state) => state.lighting);
  const isNight = lighting === 'warm';
  const beamColor = isNight ? NIGHT_BEAM_COLOR : DAY_BEAM_COLOR;
  const opacityMultiplier = isNight ? NIGHT_OPACITY_MULTIPLIER : 1;

  return (
    <group>
      <group position={WINDOW_LIGHT_MIDPOINT} quaternion={WINDOW_LIGHT_QUATERNION}>
        {BEAM_LAYERS.map((layer) => (
          <mesh
            key={layer.width}
            position={[0, 0, layer.normalOffset]}
            raycast={ignoreRaycast}
            renderOrder={0}
          >
            <planeGeometry args={[layer.width, WINDOW_LIGHT_LENGTH]} />
            <meshBasicMaterial
              blending={THREE.AdditiveBlending}
              color={beamColor}
              depthWrite={false}
              opacity={layer.opacity * opacityMultiplier}
              side={THREE.DoubleSide}
              toneMapped={false}
              transparent
            />
          </mesh>
        ))}
      </group>

      <mesh
        position={[WINDOW_LIGHT_END[0], FLOOR_TOP + 0.001, WINDOW_LIGHT_END[2]]}
        raycast={ignoreRaycast}
        renderOrder={0}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[0.864, 0.396, 1]}
      >
        <circleGeometry args={[1, 48]} />
        <meshBasicMaterial
          blending={THREE.AdditiveBlending}
          color={isNight ? NIGHT_BEAM_COLOR : '#FFDC96'}
          depthWrite={false}
          map={lightPoolTexture}
          opacity={opacityMultiplier}
          toneMapped={false}
          transparent
        />
      </mesh>
    </group>
  );
}
