import type { CatalogItem, ProceduralCatalogItem } from '../../catalog/types';
import { CatalogModel } from './CatalogModel';
import { TasbihWallHolder } from './TasbihWallHolder';

type CatalogItemModelProps = {
  item: CatalogItem;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  onReady?: (catalogId: string) => void;
  placedItemId?: string;
  enablePointLight?: boolean;
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
}: CatalogItemModelProps) {
  if (isProceduralItem(item)) {
    return (
      <TasbihWallHolder
        variant={item.proceduralModel}
        catalogId={item.id}
        position={position}
        rotation={rotation}
        scale={scale}
        onReady={onReady}
        placedItemId={placedItemId}
      />
    );
  }

  return (
    <CatalogModel
      item={item}
      position={position}
      rotation={rotation}
      scale={scale}
      onReady={onReady}
      placedItemId={placedItemId}
      enablePointLight={enablePointLight}
    />
  );
}
