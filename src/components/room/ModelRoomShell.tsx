import { useThree } from '@react-three/fiber/native';
import { useEffect, useLayoutEffect, useMemo } from 'react';
import * as THREE from 'three';
import { buildingById, type BuildingId } from '../../domain/buildings';
import { ROOM_FOOTPRINT_SCALE } from '../../domain/grid';
import { useRoomStore } from '../../store/roomStore';
import { useModelGLTF } from '../models/useModelGLTF';
import { DioramaFloorFrame } from './DioramaFloorFrame';
import { PlacementZoneTargets } from './PlacementZoneTargets';

type PreparedShell = {
  scene: THREE.Object3D;
  materials: Set<THREE.Material>;
  materialRecords: {
    material: THREE.MeshStandardMaterial;
    baseColor: THREE.Color;
    surface: 'floor' | 'walls' | 'other';
    tintUniform: { value: THREE.Color };
    tintStrengthUniform: { value: number };
  }[];
};

function prepareShell(source: THREE.Object3D, buildingId: BuildingId): PreparedShell {
  const scene = source.clone(true);
  const materialClones = new Map<string, THREE.Material>();
  const materials = new Set<THREE.Material>();
  const materialRecords: PreparedShell['materialRecords'] = [];

  const cloneMaterial = (
    sourceMaterial: THREE.Material,
    surface: PreparedShell['materialRecords'][number]['surface'],
  ) => {
    const materialKey = `${sourceMaterial.uuid}:${surface}`;
    const existing = materialClones.get(materialKey);
    if (existing) return existing;

    const material = sourceMaterial.clone();
    if (material instanceof THREE.MeshStandardMaterial) {
      // Room shells are authored assets, not catalog props. Preserve their
      // baked colors/textures exactly; only clamp extreme metal settings that
      // can render black in Expo GL when no environment map is present.
      material.metalness = Math.min(material.metalness, 0.08);
      material.roughness = Math.max(material.roughness, 0.5);
      const tintUniform = { value: new THREE.Color('#FFFFFF') };
      const tintStrengthUniform = { value: 0 };
      if (surface !== 'other') {
        material.onBeforeCompile = (shader) => {
          shader.uniforms.surfaceTint = tintUniform;
          shader.uniforms.surfaceTintStrength = tintStrengthUniform;
          shader.fragmentShader = shader.fragmentShader
            .replace(
              '#include <common>',
              `#include <common>
uniform vec3 surfaceTint;
uniform float surfaceTintStrength;`,
            )
            .replace(
              '#include <map_fragment>',
              `#include <map_fragment>
float surfaceSourceLuma = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
float surfaceTintLuma = max(dot(surfaceTint, vec3(0.2126, 0.7152, 0.0722)), 0.08);
vec3 surfaceTintedColor = clamp(surfaceTint * (surfaceSourceLuma / surfaceTintLuma), 0.0, 1.0);
diffuseColor.rgb = mix(diffuseColor.rgb, surfaceTintedColor, surfaceTintStrength);`,
            );
        };
        // Each material owns its tint uniforms. A unique program cache key
        // prevents Three from reusing another wall's uniform objects.
        material.customProgramCacheKey = () => [
          'cozy-masjid-surface-tint-v1',
          material.uuid,
          tintUniform.value.getHexString(),
          tintStrengthUniform.value.toFixed(2),
        ].join(':');
      }
      material.needsUpdate = true;
      materialRecords.push({
        material,
        baseColor: material.color.clone(),
        surface,
        tintUniform,
        tintStrengthUniform,
      });
    }
    materialClones.set(materialKey, material);
    materials.add(material);
    return material;
  };

  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const semanticName = [
      object.name,
      object.parent?.name,
      object.parent?.parent?.name,
    ].join(' ').toLowerCase();
    const surface = semanticName.includes('floor')
      ? 'floor'
      : semanticName.includes('wall')
        ? 'walls'
        : 'other';

    object.frustumCulled = true;
    object.castShadow = false;
    object.receiveShadow = false;
    object.raycast = () => {};
    object.material = Array.isArray(object.material)
      ? object.material.map((material) => cloneMaterial(material, surface))
      : cloneMaterial(object.material, surface);
  });

  scene.userData.buildingId = buildingId;
  return { scene, materials, materialRecords };
}

export function ModelRoomShell({
  buildingId,
  onReady,
}: {
  buildingId: BuildingId;
  onReady?: (buildingId: BuildingId) => void;
}) {
  const invalidate = useThree((state) => state.invalidate);
  const floorColor = useRoomStore(
    (state) => state.surfaceStyles[buildingId].floorColor,
  );
  const wallColor = useRoomStore(
    (state) => state.surfaceStyles[buildingId].wallColor,
  );
  const building = buildingById[buildingId];
  if (building.asset === undefined) {
    throw new Error(`Building asset is missing for ${buildingId}.`);
  }

  const gltf = useModelGLTF(building.asset);
  const shell = useMemo(() => prepareShell(gltf.scene, buildingId), [buildingId, gltf.scene]);

  useEffect(() => {
    const floorTint = new THREE.Color(floorColor);
    const wallTint = new THREE.Color(wallColor);
    shell.materialRecords.forEach(({
      material,
      baseColor,
      surface,
      tintUniform,
      tintStrengthUniform,
    }) => {
      const tint = surface === 'floor'
        ? floorTint
        : surface === 'walls'
          ? wallTint
          : null;
      material.side = THREE.DoubleSide;
      material.color.copy(baseColor);
      tintUniform.value.copy(tint ?? new THREE.Color('#FFFFFF'));
      tintStrengthUniform.value = tint
        ? tint.getHexString().toUpperCase() === 'FFFFFF'
          ? 0
          : surface === 'floor'
            ? 0.68
            : 0.82
        : 0;
      // Walls and floors define the scene's contrast. Self-lighting the full
      // base-color texture makes every corner equally bright and flattens the
      // diorama, so only separate practical-light meshes are emissive.
      material.emissive.set('#000000');
      material.emissiveMap = null;
      material.emissiveIntensity = 0;
      material.needsUpdate = true;
    });
    invalidate();
  }, [floorColor, invalidate, shell, wallColor]);

  useEffect(() => {
    return () => {
      shell.materials.forEach((material) => material.dispose());
    };
  }, [shell]);

  useLayoutEffect(() => {
    onReady?.(buildingId);
    invalidate();
  }, [buildingId, invalidate, onReady, shell]);

  return (
    <group userData={{ buildingId }}>
      <primitive
        object={shell.scene}
        dispose={null}
        scale={[ROOM_FOOTPRINT_SCALE, 1, ROOM_FOOTPRINT_SCALE]}
      />
      <DioramaFloorFrame />
      <PlacementZoneTargets buildingId={buildingId} />
    </group>
  );
}
