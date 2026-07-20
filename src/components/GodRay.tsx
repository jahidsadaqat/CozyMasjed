import * as THREE from 'three';
import { FLOOR_TOP } from '../domain/grid';
import { useRoomStore } from '../store/roomStore';
import { createRadialGradientTexture } from './BlobShadow';
import {
  WINDOW_LIGHT_END,
  WINDOW_LIGHT_LANDING_WIDTH,
  WINDOW_LIGHT_LENGTH,
  WINDOW_LIGHT_MIDPOINT,
  WINDOW_LIGHT_QUATERNION,
  WINDOW_LIGHT_SOURCE_WIDTH,
} from './windowLight';

const BEAM_RIBBONS = [
  { rotation: 0, opacity: 0.1 },
  { rotation: Math.PI / 3, opacity: 0.07 },
  { rotation: (Math.PI * 2) / 3, opacity: 0.05 },
] as const;

const NIGHT_BACKGROUNDS = new Set(['midnight-aurora', 'ramadan-twilight']);
const DAY_BEAM_COLOR = '#FFDCA4';
const MOON_BEAM_COLOR = '#F5E4CE';
const WINDOW_GLOW_COLOR = '#FFE8C2';
const BEAM_TEXTURE_WIDTH = 64;
const BEAM_TEXTURE_HEIGHT = 128;
const ignoreRaycast = () => undefined;

function createTaperedBeamGeometry() {
  const halfLength = WINDOW_LIGHT_LENGTH / 2;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      [
        -WINDOW_LIGHT_SOURCE_WIDTH / 2, -halfLength, 0,
        WINDOW_LIGHT_SOURCE_WIDTH / 2, -halfLength, 0,
        -WINDOW_LIGHT_LANDING_WIDTH / 2, halfLength, 0,
        WINDOW_LIGHT_LANDING_WIDTH / 2, halfLength, 0,
      ],
      3,
    ),
  );
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 1, 1], 2));
  geometry.setIndex([0, 2, 1, 2, 3, 1]);
  geometry.computeBoundingSphere();
  return geometry;
}

function createBeamMaskTexture() {
  const pixels = new Uint8Array(BEAM_TEXTURE_WIDTH * BEAM_TEXTURE_HEIGHT * 4);
  for (let y = 0; y < BEAM_TEXTURE_HEIGHT; y += 1) {
    const v = y / (BEAM_TEXTURE_HEIGHT - 1);
    const sourceFade = THREE.MathUtils.smoothstep(v, 0, 0.12);
    const landingFade = 1 - THREE.MathUtils.smoothstep(v, 0.72, 1);
    for (let x = 0; x < BEAM_TEXTURE_WIDTH; x += 1) {
      const u = x / (BEAM_TEXTURE_WIDTH - 1);
      const distanceFromCenter = Math.abs(u * 2 - 1);
      const edgeFade = 1 - THREE.MathUtils.smoothstep(distanceFromCenter, 0.48, 1);
      const alpha = edgeFade * edgeFade * sourceFade * landingFade;
      const offset = (y * BEAM_TEXTURE_WIDTH + x) * 4;
      pixels[offset] = 255;
      pixels[offset + 1] = 255;
      pixels[offset + 2] = 255;
      pixels[offset + 3] = Math.round(alpha * 255);
    }
  }

  const texture = new THREE.DataTexture(
    pixels,
    BEAM_TEXTURE_WIDTH,
    BEAM_TEXTURE_HEIGHT,
    THREE.RGBAFormat,
  );
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
}

// Module-level singletons keep the light at three tiny draw calls and avoid
// allocating geometry or textures while the room is animating.
const taperedBeamGeometry = createTaperedBeamGeometry();
const beamMaskTexture = createBeamMaskTexture();

// White pixels carry the radial alpha; material color switches the same pool
// between daylight and moonlight without creating another texture.
const lightPoolTexture = createRadialGradientTexture({
  red: 255,
  green: 255,
  blue: 255,
  alpha: 0.28,
});
const windowGlowTexture = createRadialGradientTexture({
  red: 255,
  green: 255,
  blue: 255,
  alpha: 0.8,
});

export function GodRay() {
  const lighting = useRoomStore((state) => state.lighting);
  const backgroundId = useRoomStore((state) => state.backgroundId);
  const hasNightSky = NIGHT_BACKGROUNDS.has(backgroundId);
  const hasWarmLighting = lighting === 'warm';
  const beamColor = hasNightSky || hasWarmLighting ? MOON_BEAM_COLOR : DAY_BEAM_COLOR;
  const beamOpacity = (hasNightSky ? 0.7 : 1) * (hasWarmLighting ? 0.72 : 1);
  const poolOpacity = (hasNightSky ? 0.58 : 0.78) * (hasWarmLighting ? 0.78 : 1);
  const windowGlowOpacity = hasNightSky ? 0.3 : 0.18;

  return (
    <group>
      <mesh
        position={[-2.085, 1.1, 0.65]}
        raycast={ignoreRaycast}
        renderOrder={0}
        rotation={[0, Math.PI / 2, 0]}
      >
        <planeGeometry args={[0.78, 1.16]} />
        <meshBasicMaterial
          blending={THREE.AdditiveBlending}
          color={WINDOW_GLOW_COLOR}
          depthWrite={false}
          map={windowGlowTexture}
          opacity={windowGlowOpacity}
          side={THREE.DoubleSide}
          toneMapped={false}
          transparent
        />
      </mesh>

      <group position={WINDOW_LIGHT_MIDPOINT} quaternion={WINDOW_LIGHT_QUATERNION}>
        {BEAM_RIBBONS.map((ribbon) => (
          <mesh
            key={ribbon.rotation}
            geometry={taperedBeamGeometry}
            raycast={ignoreRaycast}
            renderOrder={0}
            rotation={[0, ribbon.rotation, 0]}
          >
            <meshBasicMaterial
              blending={THREE.AdditiveBlending}
              color={beamColor}
              depthWrite={false}
              map={beamMaskTexture}
              opacity={ribbon.opacity * beamOpacity}
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
          color={hasNightSky || hasWarmLighting ? MOON_BEAM_COLOR : '#FFDC96'}
          depthWrite={false}
          map={lightPoolTexture}
          opacity={poolOpacity}
          toneMapped={false}
          transparent
        />
      </mesh>
    </group>
  );
}
