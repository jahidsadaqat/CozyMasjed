import { useFrame } from '@react-three/fiber/native';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { AssetCatalogItem } from '../../catalog/types';
import { weatherVisualProfiles } from '../../domain/weather';
import { useRoomStore } from '../../store/roomStore';
import { applyCatalogMaterialPolicy } from './catalogMaterialPolicy';
import { useMeshoptGLTF } from './useMeshoptGLTF';

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

function FlickeringPointLight({ phaseKey }: { phaseKey: string }) {
  const lightRef = useRef<THREE.PointLight>(null);
  const phase = useMemo(() => stablePhase(phaseKey), [phaseKey]);

  useFrame((state) => {
    const light = lightRef.current;
    if (!light) return;
    const time = state.clock.elapsedTime + phase;
    light.intensity =
      1.4 *
      (1 +
        0.12 * Math.sin(time * 7.3) +
        0.06 * Math.sin(time * 13.7) +
        0.04 * Math.sin(time * 3.1));
  });

  return (
    <pointLight
      ref={lightRef}
      position={[0, 1.2, 0]}
      color="#FFC56E"
      intensity={1.4}
      distance={2.2}
      decay={2}
    />
  );
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
  const gltf = useMeshoptGLTF(item.asset);
  const weather = useRoomStore((state) => state.weather);
  const lampsActive = weatherVisualProfiles[weather].lampsActive;

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
    scene.position.set(-center.x, -bounds.min.y, -center.z);
    scene.updateMatrixWorld(true);
    return scene;
  }, [gltf.scene, item.id]);

  useEffect(() => {
    onReady?.(item.id);
    if (placedItemId) useRoomStore.getState().markModelReady(placedItemId);
    if (__DEV__) {
      console.info(`[Deen Rooms] model ready: ${item.id}`);
    }
  }, [item.id, onReady, placedItemId]);

  useEffect(() => {
    if (!item.emitsLight) return;
    normalizedScene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => {
        if (!(material instanceof THREE.MeshStandardMaterial)) return;
        material.emissive.set(lampsActive ? '#B8682D' : '#000000');
        material.emissiveIntensity = lampsActive ? 0.32 : 0;
        material.needsUpdate = true;
      });
    });
  }, [item.emitsLight, lampsActive, normalizedScene]);

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
      <primitive object={normalizedScene} dispose={null} />
      {item.emitsLight && enablePointLight && lampsActive ? (
        <FlickeringPointLight phaseKey={placedItemId ?? item.id} />
      ) : null}
    </group>
  );
}
