import { memo, useLayoutEffect, useRef } from 'react';
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

function CatalogItemModelImpl({
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

function vectorEquals(
  left: readonly number[] | undefined,
  right: readonly number[] | undefined,
) {
  if (left === right) return true;
  if (!left || !right || left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}

export const CatalogItemModel = memo(
  CatalogItemModelImpl,
  (previous, next) =>
    previous.item === next.item &&
    vectorEquals(previous.position, next.position) &&
    vectorEquals(previous.rotation, next.rotation) &&
    previous.scale === next.scale &&
    previous.onReady === next.onReady &&
    previous.placedItemId === next.placedItemId &&
    previous.enablePointLight === next.enablePointLight &&
    previous.renderOrder === next.renderOrder,
);
