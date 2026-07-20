import { useLayoutEffect, useRef } from 'react';
import * as THREE from 'three';
import type { CatalogItem, ProceduralCatalogItem } from '../../catalog/types';
import { CatalogModel } from './CatalogModel';
import { TasbihWallHolder } from './TasbihWallHolder';
import { applyCatalogMaterialPolicyToObject } from './catalogMaterialPolicy';

type CatalogItemModelProps = {
  item: CatalogItem;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  onReady?: (catalogId: string) => void;
  placedItemId?: string;
  enablePointLight?: boolean;
  renderOrder?: number;
};

function isProceduralItem(item: CatalogItem): item is ProceduralCatalogItem {
  return Boolean(item.proceduralModel);
}

export function CatalogItemModel({
  item,
  position = [0, 0.04, 0],
  rotation = item.modelRotation ?? [0, 0, 0],
  scale = item.modelScale,
  onReady,
  placedItemId,
  enablePointLight = true,
  renderOrder = 0,
}: CatalogItemModelProps) {
  const materialPolicyRef = useRef<THREE.Group>(null);

  useLayoutEffect(() => {
    if (!materialPolicyRef.current) return;
    applyCatalogMaterialPolicyToObject(materialPolicyRef.current, item.id);
    materialPolicyRef.current.traverse((object) => {
      if (object instanceof THREE.Mesh) object.renderOrder = renderOrder;
    });
  }, [item.id, renderOrder]);

  return (
    <group ref={materialPolicyRef}>
      {isProceduralItem(item) ? (
        <TasbihWallHolder
          variant={item.proceduralModel}
          catalogId={item.id}
          position={position}
          rotation={rotation}
          scale={scale}
          onReady={onReady}
          placedItemId={placedItemId}
        />
      ) : (
        <CatalogModel
          item={item}
          position={position}
          rotation={rotation}
          scale={scale}
          onReady={onReady}
          placedItemId={placedItemId}
          enablePointLight={enablePointLight}
        />
      )}
    </group>
  );
}
