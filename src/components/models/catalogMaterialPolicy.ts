import * as THREE from 'three';

export const CATALOG_MATERIAL_POLICY = {
  defaultRoughness: 0.85,
  softRoughness: 0.95,
  ceramicRoughness: 0.65,
} as const;

const MASKED_METAL_ROUGHNESS = new Map<string, number>([
  ['imported-model-14', 0.35], // Quran Chest hardware
  ['imported-model-25', 0.32], // Octagonal tray-table top
  ['imported-model-39', 0.32], // Wall-sconce frame
  ['imported-model-40', 0.32], // Floor-lamp frame
  ['imported-model-42', 0.32], // Candle-holder frame
  ['imported-model-43', 0.32], // Mosque wall-chandelier frame
  ['imported-model-44', 0.32], // Dome wall-lantern frame
  ['imported-model-45', 0.3], // Dallah tray set
  ['imported-model-47', 0.28], // Gold dallah
  ['imported-model-48', 0.34], // Copper dallah
  ['imported-model-49', 0.32], // String-light frames
  ['imported-model-50', 0.22], // Gold attar bottle
  ['imported-model-54', 0.3], // Iftar tray
  ['imported-model-55', 0.25], // Crescent wall body
  ['imported-model-56', 0.28], // Second gold dallah
  ['imported-model-58', 0.25], // Crescent ornament body
  ['imported-model-61', 0.26], // Oval-mirror frame
  ['fanous-lantern', 0.3],
  ['minaret', 0.3], // Catalog name is legacy; this is a fanous model.
  ['curtains', 0.32], // Catalog name is legacy; this is a wall lantern.
]);

const SOFT_ASSET_IDS = new Set([
  'floor-cushion',
  'imported-model-57',
  'imported-model-96',
  'imported-model-97',
  'imported-model-98',
  'imported-model-99',
  'imported-model-100',
  'imported-model-101',
  'imported-model-102',
  'imported-model-103',
  'imported-model-104',
  'imported-model-105',
]);

const reportedAdjustments = new Set<string>();

export function applyCatalogMaterialPolicy(
  material: THREE.Material,
  catalogId: string,
  meshName = 'unnamed-mesh',
  category?: string,
) {
  if (!(material instanceof THREE.MeshStandardMaterial)) return;

  const previousMetalness = material.metalness;
  const previousRoughness = material.roughness;
  const metalRoughness = MASKED_METAL_ROUGHNESS.get(catalogId);
  const hasAuthoredMetalMask =
    metalRoughness !== undefined && Boolean(material.metalnessMap);

  if (hasAuthoredMetalMask) {
    // Meshy packs metal and non-metal pixels into one material. The texture's
    // blue channel is therefore the only safe way to isolate gold, copper and
    // hardware. Preserve the authored mask at full strength instead of making
    // the whole object metallic or clamping the mask down to 0.25.
    material.metalness = 1;
    material.roughness = metalRoughness;
  } else {
    const softCategory =
      category === 'Plants' ||
      category === 'Pets' ||
      category === 'Rugs' ||
      category === 'Prayer Rugs' ||
      category === 'Characters' ||
      SOFT_ASSET_IDS.has(catalogId);
    const ceramicOrLacquerCategory =
      category === 'Serving' || category === 'Tables';
    material.metalness = 0;
    material.roughness = softCategory
      ? CATALOG_MATERIAL_POLICY.softRoughness
      : ceramicOrLacquerCategory
        ? CATALOG_MATERIAL_POLICY.ceramicRoughness
        : CATALOG_MATERIAL_POLICY.defaultRoughness;
  }

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

export function applyCatalogMaterialPolicyToObject(
  root: THREE.Object3D,
  catalogId: string,
  category?: string,
) {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) =>
      applyCatalogMaterialPolicy(
        material,
        catalogId,
        object.name || object.type,
        category,
      ),
    );
  });
}
