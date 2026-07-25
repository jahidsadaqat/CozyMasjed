import { useFrame } from '@react-three/fiber/native';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { AssetCatalogItem } from '../../catalog/types';
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

function stablePhase(key: string) {
  let hash = 2166136261;
  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) / 0x100000000) * Math.PI * 2;
}

function FlickeringPointLight({
  phaseKey,
  positionY = 1.2,
}: {
  phaseKey: string;
  positionY?: number;
}) {
  const lightRef = useRef<THREE.PointLight>(null);
  const phase = useMemo(() => stablePhase(phaseKey), [phaseKey]);

  useFrame((state) => {
    const light = lightRef.current;
    if (!light) return;
    const time = state.clock.elapsedTime + phase;
    light.intensity =
      2.2 *
      (1 +
        0.12 * Math.sin(time * 7.3) +
        0.06 * Math.sin(time * 13.7) +
        0.04 * Math.sin(time * 3.1));
  });

  return (
    <pointLight
      ref={lightRef}
      position={[0, positionY, 0]}
      color="#FFC56E"
      intensity={2.2}
      distance={3.5}
      decay={2}
    />
  );
}

const ignoreRaycast = () => undefined;

function SoftGlowDisc({
  color,
  opacity,
  pulse = 0,
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
  const meshRef = useRef<THREE.Mesh>(null);
  const texture = useMemo(
    () => createRadialGradientTexture({ ...color, alpha: opacity }),
    [color.blue, color.green, color.red, opacity],
  );
  const phase = useMemo(() => stablePhase(`${color.red}:${color.green}:${color.blue}:${opacity}`), [
    color.blue,
    color.green,
    color.red,
    opacity,
  ]);

  useFrame((state) => {
    if (!pulse || !meshRef.current) return;
    const shimmer = 1 + pulse * Math.sin(state.clock.elapsedTime * 1.7 + phase);
    meshRef.current.scale.set(scale[0] * shimmer, scale[1] * shimmer, scale[2]);
  });

  return (
    <mesh
      ref={meshRef}
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

function MinbarAccentGlow({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <>
      <SoftGlowDisc
        color={{ red: 255, green: 196, blue: 102 }}
        opacity={0.38}
        position={[0, 0.035, 0]}
        scale={[0.92, 0.76, 1]}
      />
      <SoftGlowDisc
        color={{ red: 255, green: 221, blue: 142 }}
        opacity={0.34}
        position={[0.02, 1.02, -0.03]}
        rotation={[0, 0, 0]}
        scale={[0.42, 0.42, 1]}
      />
      <pointLight color="#FFD58D" decay={2} distance={1.35} intensity={0.38} position={[0, 0.88, 0]} />
    </>
  );
}

function PlantAccentGlow({ item, active }: { item: AssetCatalogItem; active: boolean }) {
  const compact = Math.max(item.footprint.width, item.footprint.depth) <= 0.75;
  const discScale: [number, number, number] = compact ? [0.34, 0.3, 1] : [0.52, 0.46, 1];
  const lightDistance = compact ? 0.72 : 1.0;
  const lightIntensity = compact ? 0.08 : 0.15;
  return (
    <>
      <SoftGlowDisc
        color={{ red: 196, green: 210, blue: 142 }}
        opacity={active ? (compact ? 0.2 : 0.28) : compact ? 0.08 : 0.14}
        pulse={active ? 0.025 : 0.012}
        position={[0, 0.025, 0]}
        scale={discScale}
      />
      {active ? (
        <pointLight
          color="#D8C889"
          decay={2}
          distance={lightDistance}
          intensity={lightIntensity}
          position={[0, 0.42, 0]}
        />
      ) : null}
    </>
  );
}

function QuranAccentGlow({ active }: { active: boolean }) {
  return (
    <>
      <SoftGlowDisc
        color={{ red: 255, green: 210, blue: 132 }}
        opacity={active ? 0.36 : 0.18}
        pulse={active ? 0.025 : 0}
        position={[0, 0.028, 0]}
        scale={[0.68, 0.56, 1]}
      />
      {active ? (
        <pointLight color="#FFDDA0" decay={2} distance={1.05} intensity={0.18} position={[0, 0.42, 0]} />
      ) : null}
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
        color={{ red: 224, green: 196, blue: 158 }}
        opacity={active ? 0.16 : 0.08}
        position={[0, 0.022, 0]}
        scale={[0.54, 0.46, 1]}
      />
    );
  }
  return (
    <>
      <SoftGlowDisc
        color={{ red: 255, green: 184, blue: 92 }}
        opacity={active ? 0.34 : 0.16}
        pulse={active ? 0.025 : 0}
        position={[0, 0.026, 0]}
        scale={[0.58, 0.5, 1]}
      />
      {active ? (
        <pointLight color="#FFC16A" decay={2} distance={0.95} intensity={0.14} position={[0, 0.42, 0]} />
      ) : null}
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
      {isLightLike && active ? (
        <pointLight color="#FFD48C" decay={2} distance={1.25} intensity={0.18} position={[0, 0.48, 0.12]} />
      ) : null}
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

function CategoryAccentGlow({ item, active }: { item: AssetCatalogItem; active: boolean }) {
  if (item.category === 'Minbar') return <MinbarAccentGlow active={active} />;
  if (item.category === 'Plants') return <PlantAccentGlow item={item} active={active} />;
  if (item.category === 'Quran') return <QuranAccentGlow active={active} />;
  if (item.category === 'Tasbih') return <TasbihAccentGlow active={active} />;
  if (item.category === 'Serving') return <ServingAccentGlow active={active} />;
  if (item.category === 'Decor') return <DecorAccentGlow item={item} active={active} />;
  if (item.category === 'Lights') return <LightAccentGlow item={item} active={active} />;
  if (item.category === 'Wall') return <WallAccentGlow item={item} active={active} />;
  if (item.category === 'Prayer Rugs' || item.category === 'Rugs') {
    return <SoftGroundingGlow active={active} wide />;
  }
  if (item.category === 'Seating' || item.category === 'Tables' || item.category === 'Storage') {
    return <SoftGroundingGlow active={active} wide={item.footprint.width > 1 || item.footprint.depth > 1} />;
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

  const normalizedScene = useMemo(() => {
    const scene = gltf.scene.clone(true);
    const materialClones = new Map<THREE.Material, THREE.Material>();

    const cloneMaterial = (source: THREE.Material, meshName: string) => {
      const existing = materialClones.get(source);
      if (existing) return existing;
      const material = source.clone();
      applyCatalogMaterialPolicy(material, item.id, meshName);
      materialClones.set(source, material);
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
    // Floor props are centred on their grid cell. Wall props instead use the
    // back face as local z=0, so their entire depth projects into the room and
    // no part of a clock, shelf or sconce can end up behind the wall.
    scene.position.set(
      -center.x,
      hangsFromCeiling ? -bounds.max.y : -bounds.min.y,
      mountsToWall ? -bounds.min.z : -center.z,
    );
    scene.updateMatrixWorld(true);
    return scene;
  }, [gltf.scene, hangsFromCeiling, item.id, mountsToWall]);

  useEffect(() => {
    onReady?.(item.id);
    if (placedItemId) useRoomStore.getState().markModelReady(placedItemId);
    if (__DEV__) {
      console.info(`[Deen Rooms] model ready: ${item.id}`);
    }
  }, [item.id, onReady, placedItemId]);

  useEffect(() => {
    normalizedScene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => {
        if (!(material instanceof THREE.MeshStandardMaterial)) return;
        material.emissiveMap = material.map;
        if (item.emitsLight && lampsActive) {
          material.emissive.set('#FFC97A');
          material.emissiveIntensity = 0.6;
        } else {
          material.emissive.set('#FFFFFF');
          material.emissiveIntensity = weatherProfile.assetTextureLift;
        }
        material.needsUpdate = true;
      });
    });
  }, [item.emitsLight, lampsActive, normalizedScene, weatherProfile.assetTextureLift]);

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
    <group position={position} rotation={rotation} scale={scale} userData={{ catalogId: item.id, placedItemId }}>
      <CategoryAccentGlow item={item} active={lampsActive} />
      <primitive object={normalizedScene} dispose={null} />
      {item.emitsLight && enablePointLight && lampsActive ? (
        <FlickeringPointLight
          phaseKey={placedItemId ?? item.id}
          positionY={hangsFromCeiling ? -0.72 : mountsToWall ? 0.48 : 1.2}
        />
      ) : null}
    </group>
  );
}
