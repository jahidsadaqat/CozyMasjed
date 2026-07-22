import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { buildingById } from '../../domain/buildings';
import { FLOOR_TOP, ROOM_SIZE } from '../../domain/grid';
import { applyCatalogMaterialPolicy } from '../models/catalogMaterialPolicy';
import { useModelGLTF } from '../models/useModelGLTF';
import { PlacementZoneTargets } from './PlacementZoneTargets';

const BUILDING_ID = 'arched-atrium' as const;
// The raw bounding-box minimum belongs to the lower exterior trim. The broad
// walkable floor is 0.0884 model units higher, so compensate after scaling or
// placed furniture would be hidden inside the visible floor.
const LOWER_FLOOR_FROM_BOUNDS_MIN = 0.0884;

type NormalizedBuilding = {
  scene: THREE.Object3D;
  scale: number;
  visibleFloorLift: number;
  materials: Set<THREE.Material>;
};

function normalizeBuilding(source: THREE.Object3D): NormalizedBuilding {
  const scene = source.clone(true);
  const materialClones = new Map<THREE.Material, THREE.Material>();
  const materials = new Set<THREE.Material>();

  const cloneMaterial = (sourceMaterial: THREE.Material, meshName: string) => {
    const existing = materialClones.get(sourceMaterial);
    if (existing) return existing;

    const material = sourceMaterial.clone();
    applyCatalogMaterialPolicy(material, BUILDING_ID, meshName);
    materialClones.set(sourceMaterial, material);
    materials.add(material);
    return material;
  };

  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;

    object.frustumCulled = true;
    object.castShadow = false;
    object.receiveShadow = false;
    // The shell itself never needs pointer hits. Placement is handled by the
    // three simple surfaces below, which keeps raycasting cheap on mobile.
    object.raycast = () => {};
    object.material = Array.isArray(object.material)
      ? object.material.map((material) => cloneMaterial(material, object.name || object.type))
      : cloneMaterial(object.material, object.name || object.type);
  });

  const bounds = new THREE.Box3().setFromObject(scene);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const horizontalSpan = Math.max(size.x, size.z);
  const scale = horizontalSpan > 0 ? ROOM_SIZE / horizontalSpan : 1;

  // The optimized model already has Y-up and its open corner faces +X/+Z,
  // matching the existing room/camera convention. Center the horizontal
  // bounds and put the lowest point on the shared floor plane.
  scene.position.set(-center.x, -bounds.min.y, -center.z);
  scene.updateMatrixWorld(true);

  return {
    scene,
    scale,
    visibleFloorLift: LOWER_FLOOR_FROM_BOUNDS_MIN * scale,
    materials,
  };
}

export function ArchedAtriumShell() {
  const building = buildingById[BUILDING_ID];
  if (!building.asset) {
    throw new Error('Arched Atrium building asset is missing.');
  }

  const gltf = useModelGLTF(building.asset);
  const normalized = useMemo(() => normalizeBuilding(gltf.scene), [gltf.scene]);

  useEffect(() => {
    return () => {
      normalized.materials.forEach((material) => material.dispose());
    };
  }, [normalized]);

  return (
    <group userData={{ buildingId: BUILDING_ID }}>
      <group position={[0, FLOOR_TOP - normalized.visibleFloorLift, 0]} scale={normalized.scale}>
        <primitive object={normalized.scene} dispose={null} />
      </group>
      <PlacementZoneTargets buildingId={BUILDING_ID} />
    </group>
  );
}
