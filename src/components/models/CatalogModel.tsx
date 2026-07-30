import { useFrame, useThree } from '@react-three/fiber/native';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';
import type { AssetCatalogItem } from '../../catalog/types';
import { CELL_SIZE, WALL_ROW_SIZE } from '../../domain/grid';
import {
  getCozyAmbientKind,
  type CozyAmbientKind,
} from '../../domain/livingAssets';
import { weatherVisualProfiles } from '../../domain/weather';
import { useRoomStore } from '../../store/roomStore';
import { LightAssetEffects } from '../../three/LightAsset';
import { getLightingManifestEntry } from '../../three/lightingManifest';
import { createRadialGradientTexture } from '../BlobShadow';
import { applyCatalogMaterialPolicy } from './catalogMaterialPolicy';
import { useModelGLTF } from './useModelGLTF';

type CatalogModelProps = {
  item: AssetCatalogItem;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  onReady?: (catalogId: string) => void;
  placedItemId?: string;
  enablePointLight?: boolean;
};

function PracticalPointLight({
  distance,
  intensity,
  position,
}: {
  distance: number;
  intensity: number;
  position: [number, number, number];
}) {
  return (
    <pointLight
      position={position}
      color="#FFC56E"
      intensity={intensity}
      distance={distance}
      decay={2}
    />
  );
}

const ignoreRaycast = () => undefined;
const glowTextureCache = new Map<string, THREE.Texture>();
const LIGHT_SOURCE_NAME =
  /\b(bulb|flame|wick|glass|glow|emissive|light|candle|filament|led)\b/i;
const SALAH_ANIMATION_INTERVAL_MS = 1000 / 24;
const MAX_ANIMATION_FRAME_DELTA = 0.05;

function isLightSourceMaterial(material: THREE.Material, meshName: string) {
  return (
    (material instanceof THREE.MeshStandardMaterial && Boolean(material.emissiveMap)) ||
    LIGHT_SOURCE_NAME.test(`${meshName} ${material.name}`)
  );
}

const LIGHT_SOURCE_ANCHORS: Readonly<
  Record<string, readonly [number, number, number]>
> = {
  'imported-model-39': [0.01, 0.82, 0.51],
  'imported-model-42': [-0.09, 1.62, -0.13],
  'imported-model-44': [0.01, 0.3, 0.59],
  'imported-model-49': [0.05, 0.2, 0.14],
};

function getGlowTexture(
  color: { red: number; green: number; blue: number },
  opacity: number,
) {
  const key = `${color.red}:${color.green}:${color.blue}:${opacity}`;
  const existing = glowTextureCache.get(key);
  if (existing) return existing;
  const texture = createRadialGradientTexture({ ...color, alpha: opacity });
  glowTextureCache.set(key, texture);
  return texture;
}

function SoftGlowDisc({
  color,
  opacity,
  pulse: _pulse = 0,
  position,
  rotation = [-Math.PI / 2, 0, 0],
  scale,
}: {
  color: { red: number; green: number; blue: number };
  opacity: number;
  pulse?: number;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale: [number, number, number];
}) {
  const texture = useMemo(
    () => getGlowTexture(color, opacity),
    [color.blue, color.green, color.red, opacity],
  );

  return (
    <mesh
      position={position}
      raycast={ignoreRaycast}
      renderOrder={1}
      rotation={rotation}
      scale={scale}
    >
      <circleGeometry args={[1, 36]} />
      <meshBasicMaterial
        map={texture}
        transparent
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

function PracticalSourceGlow({
  intensity,
  position,
  radius,
}: {
  intensity: number;
  position: [number, number, number];
  radius: number;
}) {
  const texture = useMemo(
    () => getGlowTexture({ red: 255, green: 207, blue: 126 }, 0.9),
    [],
  );
  return (
    <sprite
      position={position}
      raycast={ignoreRaycast}
      renderOrder={4}
      scale={[radius, radius, 1]}
    >
      <spriteMaterial
        blending={THREE.AdditiveBlending}
        color="#FFC97A"
        depthWrite={false}
        map={texture}
        opacity={0.14 + intensity * 0.18}
        toneMapped={false}
        transparent
      />
    </sprite>
  );
}

function TasbihAccentGlow({ active }: { active: boolean }) {
  return (
    <SoftGlowDisc
      color={{ red: 236, green: 202, blue: 122 }}
      opacity={active ? 0.28 : 0.14}
      pulse={active ? 0.018 : 0}
      position={[0, 0.026, 0]}
      scale={[0.56, 0.48, 1]}
    />
  );
}

function ServingAccentGlow({ active }: { active: boolean }) {
  return (
    <SoftGlowDisc
      color={{ red: 255, green: 190, blue: 104 }}
      opacity={active ? 0.28 : 0.13}
      position={[0, 0.024, 0]}
      scale={[0.74, 0.58, 1]}
    />
  );
}

function DecorAccentGlow({ item, active }: { item: AssetCatalogItem; active: boolean }) {
  if (!active) return null;
  const name = item.name.toLowerCase();
  const isWarmDecor =
    name.includes('candle') ||
    name.includes('lantern') ||
    name.includes('fanous') ||
    name.includes('bakhoor') ||
    name.includes('burner') ||
    name.includes('dallah') ||
    name.includes('attar') ||
    name.includes('crescent') ||
    name.includes('ornament');
  if (!isWarmDecor) {
    return (
      <SoftGlowDisc
        color={{ red: 232, green: 216, blue: 196 }}
        opacity={0.09}
        position={[0, 0.022, 0]}
        scale={[0.54, 0.46, 1]}
      />
    );
  }
  return (
    <>
      <SoftGlowDisc
        color={{ red: 244, green: 220, blue: 184 }}
        opacity={0.13}
        pulse={0.015}
        position={[0, 0.026, 0]}
        scale={[0.58, 0.5, 1]}
      />
    </>
  );
}

function WallAccentGlow({ item, active }: { item: AssetCatalogItem; active: boolean }) {
  const name = item.name.toLowerCase();
  const isLightLike = item.category === 'Lights' || item.emitsLight || name.includes('lantern') || name.includes('sconce');
  return (
    <>
      <SoftGlowDisc
        color={isLightLike ? { red: 255, green: 206, blue: 124 } : { red: 232, green: 202, blue: 162 }}
        opacity={isLightLike ? (active ? 0.36 : 0.14) : active ? 0.22 : 0.09}
        pulse={isLightLike && active ? 0.025 : 0}
        position={[0, 0.38, -0.016]}
        rotation={[0, 0, 0]}
        scale={isLightLike ? [0.4, 0.38, 1] : [0.44, 0.36, 1]}
      />
    </>
  );
}

function LightAccentGlow({ item, active }: { item: AssetCatalogItem; active: boolean }) {
  const hangsFromCeiling =
    item.allowedSurfaces.includes('ceiling') && !item.allowedSurfaces.includes('floor');
  const mountsToWall =
    item.allowedSurfaces.includes('wallL') || item.allowedSurfaces.includes('wallR');
  if (mountsToWall) return <WallAccentGlow item={item} active={active} />;
  if (hangsFromCeiling) {
    return (
      <SoftGlowDisc
        color={{ red: 255, green: 201, blue: 116 }}
        opacity={active ? 0.3 : 0.12}
        pulse={active ? 0.02 : 0}
        position={[0, -0.72, 0]}
        scale={[0.5, 0.5, 1]}
      />
    );
  }
  return (
    <SoftGlowDisc
      color={{ red: 255, green: 196, blue: 104 }}
      opacity={active ? 0.3 : 0.12}
      pulse={active ? 0.02 : 0}
      position={[0, 0.026, 0]}
      scale={[0.5, 0.44, 1]}
    />
  );
}

function SoftGroundingGlow({ active, wide = false }: { active: boolean; wide?: boolean }) {
  return (
    <SoftGlowDisc
      color={{ red: 72, green: 52, blue: 38 }}
      opacity={active ? 0.16 : 0.09}
      position={[0, 0.018, 0]}
      scale={wide ? [0.95, 0.68, 1] : [0.66, 0.54, 1]}
    />
  );
}

function CategoryAccentGlow({
  item,
  ambientKind,
  ambientActive,
  lightActive,
  mountsToWall,
}: {
  item: AssetCatalogItem;
  ambientKind: CozyAmbientKind | null;
  ambientActive: boolean;
  lightActive: boolean;
  mountsToWall: boolean;
}) {
  if (item.category === 'Lights') {
    return lightActive ? <LightAccentGlow item={item} active /> : null;
  }
  if (!ambientKind || mountsToWall) return null;
  if (ambientKind === 'decor') {
    return <DecorAccentGlow item={item} active={ambientActive} />;
  }
  return null;
}

export function CatalogModel({
  item,
  position = [0, 0.04, 0],
  rotation = item.modelRotation ?? [0, 0, 0],
  scale = item.modelScale,
  onReady,
  placedItemId,
  enablePointLight = true,
}: CatalogModelProps) {
  const invalidate = useThree((state) => state.invalidate);
  const gltf = useModelGLTF(item.asset);
  const animationMixerRef = useRef<THREE.AnimationMixer | null>(null);
  const weather = useRoomStore((state) => state.weather);
  const weatherProfile = weatherVisualProfiles[weather];
  const lampsActive = weatherProfile.lampsActive;
  const lightingEntry = getLightingManifestEntry(item.id);
  const isManifestEmitter = lightingEntry?.emitter === true;
  const hangsFromCeiling =
    item.allowedSurfaces.includes('ceiling') && !item.allowedSurfaces.includes('floor');
  const mountsToWall =
    !hangsFromCeiling &&
    !item.allowedSurfaces.includes('floor') &&
    (item.allowedSurfaces.includes('wallL') || item.allowedSurfaces.includes('wallR'));

  const normalizedModel = useMemo(() => {
    // A regular Object3D clone leaves a SkinnedMesh bound to the source
    // skeleton. SkeletonUtils gives every placed animated figure an isolated
    // rig, so multiple figures can animate safely and independently.
    const scene = item.animationName
      ? SkeletonUtils.clone(gltf.scene)
      : gltf.scene.clone(true);
    const materialClones = new Map<string, THREE.Material>();

    const cloneMaterial = (source: THREE.Material, meshName: string) => {
      const sourceIsLight =
        isManifestEmitter && isLightSourceMaterial(source, meshName);
      const materialKey = `${source.uuid}:${sourceIsLight ? 'source' : 'housing'}`;
      const existing = materialClones.get(materialKey);
      if (existing) return existing;
      const material = source.clone();
      applyCatalogMaterialPolicy(material, item.id, meshName, item.category);
      if (material instanceof THREE.MeshStandardMaterial) {
        material.userData.cozyOriginalEmissive = material.emissive.clone();
        material.userData.cozyOriginalEmissiveMap = material.emissiveMap;
        material.userData.cozyOriginalEmissiveIntensity = material.emissiveIntensity;
        material.userData.cozyOriginalToneMapped = material.toneMapped;
        material.userData.cozyIsLightSource = sourceIsLight;
      }
      materialClones.set(materialKey, material);
      return material;
    };

    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        // Skinned bounds are not recalculated for each prayer pose. Keeping
        // this single animated mesh out of static frustum culling prevents it
        // disappearing when the bones move beyond the bind-pose bounds.
        object.frustumCulled = !item.animationName;
        object.castShadow = false;
        object.receiveShadow = false;
        if (Array.isArray(object.material)) {
          object.material = object.material.map((material) => cloneMaterial(material, object.name || object.type));
        } else {
          object.material = cloneMaterial(object.material, object.name || object.type);
        }
      }
    });

    const bounds = new THREE.Box3().setFromObject(scene);
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    // Floor props are centred on their grid cell. Wall props instead use the
    // back face as local z=0, so their entire depth projects into the room and
    // no part of a clock, shelf or sconce can end up behind the wall.
    scene.position.set(
      -center.x,
      hangsFromCeiling ? -bounds.max.y : -bounds.min.y,
      mountsToWall ? -bounds.min.z : -center.z,
    );
    scene.updateMatrixWorld(true);
    return {
      scene,
      width: size.x,
      height: size.y,
      depth: size.z,
    };
  }, [
    gltf.scene,
    hangsFromCeiling,
    isManifestEmitter,
    item.animationName,
    item.category,
    item.id,
    mountsToWall,
  ]);
  const normalizedScene = normalizedModel.scene;
  const animationClip = useMemo(() => {
    if (!item.animationName) return null;
    return (
      gltf.animations.find((clip) => clip.name === item.animationName) ??
      gltf.animations[0] ??
      null
    );
  }, [gltf.animations, item.animationName]);
  const resolvedScale = scale ?? 1;
  const animatedSelectionWidth = Math.max(
    normalizedModel.width * resolvedScale,
    item.footprint.width * CELL_SIZE * 0.92,
    0.48,
  );
  const animatedSelectionDepth = Math.max(
    normalizedModel.depth * resolvedScale,
    item.footprint.depth * CELL_SIZE * 1.2,
    0.68,
  );
  const animatedSelectionHeight = Math.max(
    normalizedModel.height * resolvedScale,
    0.92,
  );
  const cozyAmbientKind = getCozyAmbientKind(item);
  const cozyAmbientActive = weather === 'night';
  const receivesNightAmbient =
    !isManifestEmitter &&
    item.category !== 'Lights' &&
    (item.category === 'Minbar' ||
      item.category === 'Quran' ||
      item.category === 'Plants' ||
      mountsToWall);
  const nightAmbientIntensity =
    item.category === 'Minbar'
      ? 0.2
      : item.category === 'Quran'
        ? 0.18
        : item.category === 'Plants'
          ? 0.17
          : mountsToWall
            ? 0.16
            : 0;
  const reservedWallHeight =
    (item.wallFootprint?.height ?? item.footprint.depth) * WALL_ROW_SIZE;
  const wallVerticalOffset = mountsToWall
    ? Math.max(0, (reservedWallHeight - normalizedModel.height * resolvedScale) / 2)
    : 0;
  const authoredSourceAnchor =
    lightingEntry?.lightOrigin ?? LIGHT_SOURCE_ANCHORS[item.id];
  const sourcePosition: [number, number, number] = authoredSourceAnchor
    ? [
        authoredSourceAnchor[0] * resolvedScale,
        authoredSourceAnchor[1] * resolvedScale + wallVerticalOffset,
        authoredSourceAnchor[2] * resolvedScale,
      ]
    : [
        0,
        normalizedModel.height * resolvedScale * (hangsFromCeiling ? -0.58 : 0.58) +
          wallVerticalOffset,
        mountsToWall ? normalizedModel.depth * resolvedScale * 0.34 : 0,
      ];
  const sourceGlowRadius = THREE.MathUtils.clamp(
    Math.max(normalizedModel.width, normalizedModel.height) * resolvedScale * 0.38,
    0.2,
    0.54,
  );
  const practicalLightDistance =
    item.id === 'imported-model-39'
      ? 3.5
      : THREE.MathUtils.clamp(
          2 + Math.max(normalizedModel.width, normalizedModel.depth) * resolvedScale,
          2.3,
          3.4,
        );

  useEffect(() => {
    onReady?.(item.id);
    if (placedItemId) useRoomStore.getState().markModelReady(placedItemId);
    if (__DEV__) {
      console.info(`[Deen Rooms] model ready: ${item.id}`);
    }
    invalidate();
  }, [invalidate, item.id, onReady, placedItemId]);

  useEffect(() => {
    if (!animationClip) return;

    const mixer = new THREE.AnimationMixer(normalizedScene);
    const action = mixer.clipAction(animationClip);
    action.setLoop(THREE.LoopRepeat, Infinity);
    action.reset().play();
    mixer.update(0);
    animationMixerRef.current = mixer;

    // The room renders on demand to protect iPhone battery and temperature.
    // Only an actually placed animated figure requests these lightweight
    // animation frames.
    const timer = setInterval(invalidate, SALAH_ANIMATION_INTERVAL_MS);
    invalidate();

    return () => {
      clearInterval(timer);
      action.stop();
      mixer.stopAllAction();
      mixer.uncacheRoot(normalizedScene);
      if (animationMixerRef.current === mixer) {
        animationMixerRef.current = null;
      }
    };
  }, [animationClip, invalidate, normalizedScene]);

  useFrame((_, frameDelta) => {
    animationMixerRef.current?.update(
      Math.min(frameDelta, MAX_ANIMATION_FRAME_DELTA),
    );
  });

  useEffect(() => {
    normalizedScene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => {
        if (!(material instanceof THREE.MeshStandardMaterial)) return;
        const originalEmissive = material.userData.cozyOriginalEmissive;
        const originalEmissiveMap = material.userData.cozyOriginalEmissiveMap;
        const originalEmissiveIntensity = material.userData.cozyOriginalEmissiveIntensity;
        const isLightSource = material.userData.cozyIsLightSource === true;
        if (originalEmissive instanceof THREE.Color) {
          material.emissive.copy(originalEmissive);
        } else {
          material.emissive.set('#000000');
        }
        material.emissiveMap =
          originalEmissiveMap instanceof THREE.Texture ? originalEmissiveMap : null;
        material.emissiveIntensity =
          typeof originalEmissiveIntensity === 'number' ? originalEmissiveIntensity : 0;

        material.toneMapped =
          typeof material.userData.cozyOriginalToneMapped === 'boolean'
            ? material.userData.cozyOriginalToneMapped
            : true;

        if (cozyAmbientActive && receivesNightAmbient && !isLightSource) {
          if (material.map) {
            material.emissive.set('#FFFFFF');
            material.emissiveMap = material.map;
          } else {
            material.emissive.copy(material.color);
            material.emissiveMap = null;
          }
          material.emissiveIntensity = nightAmbientIntensity;
        }

        if (isManifestEmitter && lampsActive && isLightSource && lightingEntry) {
          material.emissive.setRGB(
            lightingEntry.emissiveFactor[0],
            lightingEntry.emissiveFactor[1],
            lightingEntry.emissiveFactor[2],
          );
          material.emissiveIntensity =
            lightingEntry.emissiveStrength *
            weatherProfile.practicalLightIntensity;
          material.toneMapped = false;
        }
        material.needsUpdate = true;
      });
    });
    invalidate();
  }, [
    invalidate,
    cozyAmbientActive,
    isManifestEmitter,
    lampsActive,
    lightingEntry,
    nightAmbientIntensity,
    normalizedScene,
    receivesNightAmbient,
    weatherProfile.practicalLightIntensity,
  ]);

  useEffect(() => {
    return () => {
      const materials = new Set<THREE.Material>();
      normalizedScene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        const meshMaterials = Array.isArray(object.material) ? object.material : [object.material];
        meshMaterials.forEach((material) => materials.add(material));
      });
      materials.forEach((material) => material.dispose());
    };
  }, [normalizedScene]);

  return (
    <group position={position} rotation={rotation} userData={{ catalogId: item.id, placedItemId }}>
      {placedItemId && item.animationName ? (
        <mesh
          position={[0, animatedSelectionHeight / 2, 0]}
          userData={{ placedItemId }}
        >
          <boxGeometry
            args={[
              animatedSelectionWidth,
              animatedSelectionHeight,
              animatedSelectionDepth,
            ]}
          />
          <meshBasicMaterial
            transparent
            opacity={0}
            depthWrite={false}
            colorWrite={false}
          />
        </mesh>
      ) : null}
      <LightAssetEffects
        entry={lightingEntry}
        active={lampsActive}
        intensity={weatherProfile.practicalLightIntensity}
      />
      <group position={[0, wallVerticalOffset, 0]} scale={resolvedScale}>
        <CategoryAccentGlow
          item={item}
          ambientKind={cozyAmbientKind}
          ambientActive={cozyAmbientActive && !isManifestEmitter}
          lightActive={lampsActive && !isManifestEmitter}
          mountsToWall={mountsToWall}
        />
        <primitive object={normalizedScene} dispose={null} />
      </group>
    </group>
  );
}
