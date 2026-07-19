import * as THREE from 'three';

export const CATALOG_MATERIAL_POLICY = {
  maxMetalness: 0.25,
  minRoughness: 0.55,
} as const;

const reportedAdjustments = new Set<string>();

export function applyCatalogMaterialPolicy(
  material: THREE.Material,
  catalogId: string,
  meshName = 'unnamed-mesh',
) {
  if (!(material instanceof THREE.MeshStandardMaterial)) return;

  const previousMetalness = material.metalness;
  const previousRoughness = material.roughness;
  material.metalness = Math.min(previousMetalness, CATALOG_MATERIAL_POLICY.maxMetalness);
  material.roughness = Math.max(previousRoughness, CATALOG_MATERIAL_POLICY.minRoughness);

  if (
    __DEV__ &&
    (material.metalness !== previousMetalness || material.roughness !== previousRoughness)
  ) {
    const adjustmentKey = `${catalogId}:${meshName}:${material.name || material.type}`;
    if (!reportedAdjustments.has(adjustmentKey)) {
      reportedAdjustments.add(adjustmentKey);
      console.info(
        `[Deen Rooms] material tuned: ${catalogId}/${meshName} ` +
          `(metalness ${previousMetalness.toFixed(2)}->${material.metalness.toFixed(2)}, ` +
          `roughness ${previousRoughness.toFixed(2)}->${material.roughness.toFixed(2)})`,
      );
    }
  }
}

export function applyCatalogMaterialPolicyToObject(root: THREE.Object3D, catalogId: string) {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) =>
      applyCatalogMaterialPolicy(material, catalogId, object.name || object.type),
    );
  });
}
