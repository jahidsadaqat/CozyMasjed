import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { CatalogItem } from '../../catalog/types';
import { useRoomStore } from '../../store/roomStore';
import { useMeshoptGLTF } from './useMeshoptGLTF';

type CatalogModelProps = {
  item: CatalogItem;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  onReady?: (catalogId: string) => void;
};

export function CatalogModel({
  item,
  position = [0, 0.04, 0],
  rotation = item.modelRotation ?? [0, 0, 0],
  scale = item.modelScale,
  onReady,
}: CatalogModelProps) {
  const gltf = useMeshoptGLTF(item.asset);
  const lighting = useRoomStore((state) => state.lighting);

  const normalizedScene = useMemo(() => {
    const scene = gltf.scene.clone(true);

    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.frustumCulled = true;
        object.castShadow = false;
        object.receiveShadow = false;
        if (Array.isArray(object.material)) {
          object.material = object.material.map((material) => material.clone());
        } else {
          object.material = object.material.clone();
        }
      }
    });

    const bounds = new THREE.Box3().setFromObject(scene);
    const center = bounds.getCenter(new THREE.Vector3());
    scene.position.set(-center.x, -bounds.min.y, -center.z);
    scene.updateMatrixWorld(true);
    return scene;
  }, [gltf.scene]);

  useEffect(() => {
    onReady?.(item.id);
    if (__DEV__) {
      console.info(`[Deen Rooms] model ready: ${item.id}`);
    }
  }, [item.id, onReady]);

  return (
    <group position={position} rotation={rotation} scale={scale} userData={{ catalogId: item.id }}>
      <primitive object={normalizedScene} dispose={null} />
      {item.emitsLight && lighting === 'warm' ? (
        <pointLight position={[0, 1.2, 0]} color="#FFC56E" intensity={1.25} distance={2.2} decay={2} />
      ) : null}
    </group>
  );
}
