import * as THREE from 'three';
import { useMemo } from 'react';
import type { BuildingId } from '../domain/buildings';
import { FLOOR_TOP } from '../domain/grid';
import { weatherVisualProfiles } from '../domain/weather';
import { useRoomStore } from '../store/roomStore';
import { createRadialGradientTexture } from './BlobShadow';
import { getWindowLightConfig, type WindowLightConfig } from './windowLight';

const BEAM_RIBBONS = [
  // Two crossed translucent ribbons read as one soft volume from every room
  // angle without the cost of a volumetric post-processing pass.
  { rotation: 0, opacity: 0.22 },
  { rotation: Math.PI / 2, opacity: 0.14 },
] as const;

const DAY_BEAM_COLOR = '#FFDCA4';
const MOON_BEAM_COLOR = '#F5E4CE';
const OVERCAST_BEAM_COLOR = '#E5EAF0';
const WINDOW_GLOW_COLOR = '#FFE8C2';
const WINDOW_PANE_Y = FLOOR_TOP + 0.006;
const BEAM_TEXTURE_WIDTH = 64;
const BEAM_TEXTURE_HEIGHT = 128;
const ignoreRaycast = () => undefined;

const WINDOW_PANE_PROFILE = {
  sunny: {
    color: '#FFB25E',
    opacity: 0.13,
    lightColor: '#FFD29A',
    lightIntensity: 8,
  },
  cloudy: {
    color: '#F2F0E8',
    opacity: 0.035,
    lightColor: '#F3EDE3',
    lightIntensity: 3.5,
  },
  windy: {
    color: '#FFF1CF',
    opacity: 0.075,
    lightColor: '#FFE1B7',
    lightIntensity: 5.2,
  },
} as const;

function createTaperedBeamGeometry(config: WindowLightConfig) {
  const halfLength = config.length / 2;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      [
        -config.sourceWidth / 2, -halfLength, 0,
        config.sourceWidth / 2, -halfLength, 0,
        -config.landingWidth / 2, halfLength, 0,
        config.landingWidth / 2, halfLength, 0,
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

function createWindowPaneGeometry(config: WindowLightConfig) {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  config.paneQuads.forEach((quad, quadIndex) => {
    const vertexOffset = quadIndex * 4;
    quad.forEach(([x, z]) => {
      positions.push(x, 0, z);
    });
    uvs.push(0, 0, 0, 1, 1, 1, 1, 0);
    indices.push(
      vertexOffset,
      vertexOffset + 1,
      vertexOffset + 2,
      vertexOffset,
      vertexOffset + 2,
      vertexOffset + 3,
    );
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function createWindowPaneMaskTexture() {
  const size = 32;
  const pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const u = x / (size - 1);
      const v = y / (size - 1);
      const edgeDistance = Math.min(u, 1 - u, v, 1 - v);
      const alpha = THREE.MathUtils.smoothstep(edgeDistance, 0, 0.09);
      const offset = (y * size + x) * 4;
      pixels[offset] = 255;
      pixels[offset + 1] = 255;
      pixels[offset + 2] = 255;
      pixels[offset + 3] = Math.round(alpha * 255);
    }
  }

  const texture = new THREE.DataTexture(pixels, size, size, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
}

const beamMaskTexture = createBeamMaskTexture();
const windowPaneMaskTexture = createWindowPaneMaskTexture();
const geometryCache = new Map<
  BuildingId,
  { taperedBeamGeometry: THREE.BufferGeometry; windowPaneGeometry: THREE.BufferGeometry }
>();

function getWindowLightGeometry(buildingId: BuildingId, config: WindowLightConfig) {
  const cached = geometryCache.get(buildingId);
  if (cached) return cached;
  const geometry = {
    taperedBeamGeometry: createTaperedBeamGeometry(config),
    windowPaneGeometry: createWindowPaneGeometry(config),
  };
  geometryCache.set(buildingId, geometry);
  return geometry;
}

const windowGlowTexture = createRadialGradientTexture({
  red: 255,
  green: 255,
  blue: 255,
  alpha: 0.8,
});

export function GodRay() {
  const weather = useRoomStore((state) => state.weather);
  const activeBuildingId = useRoomStore((state) => state.activeBuildingId);
  const windowLight = getWindowLightConfig(activeBuildingId);
  const { taperedBeamGeometry, windowPaneGeometry } = getWindowLightGeometry(
    activeBuildingId,
    windowLight,
  );
  const lightTarget = useMemo(() => new THREE.Object3D(), []);
  const weatherProfile = weatherVisualProfiles[weather];
  const isNight = weather === 'night';
  const isOvercast = weather === 'cloudy' || weather === 'rainy';
  const beamColor = isNight ? MOON_BEAM_COLOR : isOvercast ? OVERCAST_BEAM_COLOR : DAY_BEAM_COLOR;
  const beamOpacity = weatherProfile.godRayIntensity;
  const windowGlowOpacity = weatherProfile.godRayIntensity * 0.12;
  const paneProfile =
    weather === 'sunny' || weather === 'cloudy' || weather === 'windy'
      ? WINDOW_PANE_PROFILE[weather]
      : null;

  if (beamOpacity <= 0.001 && !paneProfile) return null;

  return (
    <group>
      <mesh
        position={windowLight.glowPosition}
        raycast={ignoreRaycast}
        renderOrder={0}
        rotation={[0, Math.PI / 2, 0]}
      >
        <planeGeometry args={windowLight.glowSize} />
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

      <group position={windowLight.midpoint} quaternion={windowLight.quaternion}>
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

      {paneProfile ? (
        <>
          <primitive object={lightTarget} position={windowLight.end} />
          <spotLight
            angle={windowLight.spotAngle}
            castShadow={false}
            color={paneProfile.lightColor}
            decay={2}
            distance={3.4}
            intensity={paneProfile.lightIntensity}
            penumbra={0.55}
            position={windowLight.start}
            target={lightTarget}
          />
          <mesh
            geometry={windowPaneGeometry}
            position={[0, WINDOW_PANE_Y, 0]}
            raycast={ignoreRaycast}
            renderOrder={-2}
            userData={{ decorativeLighting: 'four-pane-window-projection' }}
          >
            <meshBasicMaterial
              blending={THREE.AdditiveBlending}
              color={paneProfile.color}
              depthTest
              depthWrite={false}
              map={windowPaneMaskTexture}
              opacity={paneProfile.opacity}
              toneMapped={false}
              transparent
            />
          </mesh>
        </>
      ) : null}
    </group>
  );
}
