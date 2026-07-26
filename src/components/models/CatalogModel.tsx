import { useThree } from '@react-three/fiber/native';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { AssetCatalogItem } from '../../catalog/types';
import { WALL_ROW_SIZE } from '../../domain/grid';
import {
  getCozyAmbientKind,
  type CozyAmbientKind,
} from '../../domain/livingAssets';
import { weatherVisualProfiles } from '../../domain/weather';
import { useRoomStore } from '../../store/roomStore';
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
      <meshBasicMaterial map={texture} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

function MinbarAccentGlow({ intensity }: { intensity: number }) {
  if (intensity <= 0.05) return null;
  return (
    <>
      <SoftGlowDisc
        color={{ red: 255, green: 196, blue: 102 }}
        opacity={0.04 + intensity * 0.11}
        position={[0, 0.035, 0]}
        scale={[0.72, 0.58, 1]}
      />
      <SoftGlowDisc
        color={{ red: 255, green: 221, blue: 142 }}
        opacity={0.035 + intensity * 0.095}
        position={[0.02, 1.02, -0.03]}
        rotation={[0, 0, 0]}
        scale={[0.3, 0.3, 1]}
      />
    </>
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

function PlantAccentGlow({ item, active }: { item: AssetCatalogItem; active: boolean }) {
  if (!active) return null;
  const compact = Math.max(item.footprint.width, item.footprint.depth) <= 0.75;
  const discScale: [number, number, number] = compact ? [0.34, 0.3, 1] : [0.52, 0.46, 1];
  return (
    <>
      <SoftGlowDisc
        color={{ red: 234, green: 223, blue: 195 }}
        opacity={compact ? 0.1 : 0.13}
        pulse={0.015}
        position={[0, 0.025, 0]}
        scale={discScale}
      />
    </>
  );
}

function QuranAccentGlow({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <>
      <SoftGlowDisc
        color={{ red: 243, green: 225, blue: 191 }}
        opacity={0.14}
        pulse={0.015}
        position={[0, 0.028, 0]}
        scale={[0.68, 0.56, 1]}
      />
    </>
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
  modelHeight,
  mountsToWall,
  ambientActive,
  lightActive,
}: {
  item: AssetCatalogItem;
  ambientKind: CozyAmbientKind | null;
  modelHeight: number;
  mountsToWall: boolean;
  ambientActive: boolean;
  lightActive: boolean;
}) {
  if (item.category === 'Lights') {
    return lightActive ? <LightAccentGlow item={item} active /> : null;
  }
  if (item.category === 'Minbar') {
    return <MinbarAccentGlow intensity={ambientActive ? 0.42 : 0} />;
  }
  if (!ambientKind) return null;
  if (ambientKind === 'plant') {
    if (mountsToWall) {
      if (!ambientActive) return null;
      return (
        <SoftGlowDisc
          color={{ red: 240, green: 224, blue: 196 }}
          opacity={0.12}
          pulse={0.012}
          position={[0, modelHeight * 0.52, -0.016]}
          rotation={[0, 0, 0]}
          scale={[0.72, 0.82, 1]}
        />
      );
    }
    return <PlantAccentGlow item={item} active={ambientActive} />;
  }
  if (ambientKind === 'quran') return <QuranAccentGlow active={ambientActive} />;
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
  const weather = useRoomStore((state) => state.weather);
  const weatherProfile = weatherVisualProfiles[weather];
  const lampsActive = weatherProfile.lampsActive;
  const hangsFromCeiling =
    item.allowedSurfaces.includes('ceiling') && !item.allowedSurfaces.includes('floor');
  const mountsToWall =
    !hangsFromCeiling &&
    !item.allowedSurfaces.includes('floor') &&
    (item.allowedSurfaces.includes('wallL') || item.allowedSurfaces.includes('wallR'));

  const normalizedModel = useMemo(() => {
    const scene = gltf.scene.clone(true);
    const materialClones = new Map<string, THREE.Material>();

    const cloneMaterial = (source: THREE.Material, meshName: string) => {
      const sourceIsLight = item.emitsLight && isLightSourceMaterial(source, meshName);
      const materialKey = `${source.uuid}:${sourceIsLight ? 'source' : 'housing'}`;
      const existing = materialClones.get(materialKey);
      if (existing) return existing;
      const material = source.clone();
      applyCatalogMaterialPolicy(material, item.id, meshName);
      if (material instanceof THREE.MeshStandardMaterial) {
        material.userData.cozyOriginalEmissive = material.emissive.clone();
        material.userData.cozyOriginalEmissiveMap = material.emissiveMap;
        material.userData.cozyOriginalEmissiveIntensity = material.emissiveIntensity;
        material.userData.cozyIsLightSource = sourceIsLight;
      }
      materialClones.set(materialKey, material);
      return material;
    };

    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.frustumCulled = true;
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
  }, [gltf.scene, hangsFromCeiling, item.id, mountsToWall]);
  const normalizedScene = normalizedModel.scene;
  const resolvedScale = scale ?? 1;
  const cozyAmbientKind = getCozyAmbientKind(item);
  const cozyAmbientActive = weather === 'night';
  const reservedWallHeight =
    (item.wallFootprint?.height ?? item.footprint.depth) * WALL_ROW_SIZE;
  const wallVerticalOffset = mountsToWall
    ? Math.max(0, (reservedWallHeight - normalizedModel.height * resolvedScale) / 2)
    : 0;
  const authoredSourceAnchor = LIGHT_SOURCE_ANCHORS[item.id];
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

        if (item.emitsLight && lampsActive && isLightSource) {
          material.emissive.set('#FFC97A');
          material.emissiveIntensity =
            0.52 + weatherProfile.practicalLightIntensity * 0.32;
        }
        material.needsUpdate = true;
      });
    });
    invalidate();
  }, [
    invalidate,
    item.emitsLight,
    lampsActive,
    normalizedScene,
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
      {item.emitsLight && lampsActive ? (
        item.id === 'imported-model-49' ? (
          <>
            {[-0.32, 0, 0.32].map((offset) => (
              <PracticalSourceGlow
                key={offset}
                intensity={weatherProfile.practicalLightIntensity}
                position={[
                  sourcePosition[0] + normalizedModel.width * resolvedScale * offset,
                  sourcePosition[1],
                  sourcePosition[2],
                ]}
                radius={sourceGlowRadius * 0.62}
              />
            ))}
          </>
        ) : (
          <PracticalSourceGlow
            intensity={weatherProfile.practicalLightIntensity}
            position={sourcePosition}
            radius={sourceGlowRadius}
          />
        )
      ) : null}
      <group position={[0, wallVerticalOffset, 0]} scale={resolvedScale}>
        <CategoryAccentGlow
          item={item}
          ambientKind={cozyAmbientKind}
          modelHeight={normalizedModel.height}
          mountsToWall={mountsToWall}
          ambientActive={cozyAmbientActive}
          lightActive={lampsActive}
        />
        <primitive object={normalizedScene} dispose={null} />
      </group>
      {item.emitsLight && enablePointLight && lampsActive ? (
        <PracticalPointLight
          distance={practicalLightDistance}
          intensity={2.2 * weatherProfile.practicalLightIntensity}
          position={sourcePosition}
        />
      ) : null}
    </group>
  );
}
