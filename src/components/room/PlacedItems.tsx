import { Suspense } from 'react';
import { catalogById } from '../../catalog/catalog';
import { CELL_SIZE, getPlacementSize, placementToWorld, type PlacedItem } from '../../domain/grid';
import { useRoomStore } from '../../store/roomStore';
import { palette } from '../../theme/palette';
import { CatalogModel } from '../models/CatalogModel';

function modelRotation(item: PlacedItem): [number, number, number] {
  const catalogItem = catalogById[item.catalogId];
  const base = catalogItem?.modelRotation ?? [0, 0, 0];
  const surfaceTurn = item.surface === 'wallL' ? Math.PI / 2 : 0;
  return [base[0], base[1] + surfaceTurn + (item.rotation * Math.PI) / 180, base[2]];
}

function SelectionFootprint({ item, invalid }: { item: PlacedItem; invalid: boolean }) {
  const catalogItem = catalogById[item.catalogId];
  if (!catalogItem) return null;
  const [x, y, z] = placementToWorld(item, catalogItem);
  const size = getPlacementSize(catalogItem, item.surface, item.rotation);
  const color = invalid ? '#D65F55' : palette.sand;

  if (item.surface === 'floor') {
    return (
      <mesh position={[x, y + 0.012, z]}>
        <boxGeometry args={[size.width * 0.55 - 0.04, 0.025, size.height * 0.55 - 0.04]} />
        <meshBasicMaterial color={color} transparent opacity={invalid ? 0.47 : 0.32} depthWrite={false} />
      </mesh>
    );
  }

  const centerY = y + (size.height * CELL_SIZE) / 2;
  const position: [number, number, number] = item.surface === 'wallL' ? [x + 0.018, centerY, z] : [x, centerY, z + 0.018];
  const rotation: [number, number, number] = item.surface === 'wallL' ? [0, Math.PI / 2, 0] : [0, 0, 0];
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[size.width * 0.55 - 0.04, size.height * 0.55 - 0.04]} />
      <meshBasicMaterial color={color} transparent opacity={invalid ? 0.47 : 0.3} depthWrite={false} />
    </mesh>
  );
}

export function PlacedItems() {
  const items = useRoomStore((state) => state.placedItems);
  const selectedItemId = useRoomStore((state) => state.selectedItemId);
  const dragPreview = useRoomStore((state) => state.dragPreview);

  return (
    <group>
      {items.map((storedItem) => {
        const isDragging = dragPreview?.item.id === storedItem.id;
        const item = isDragging ? dragPreview.item : storedItem;
        const catalogItem = catalogById[item.catalogId];
        if (!catalogItem) return null;
        const position = placementToWorld(item, catalogItem);
        const selected = selectedItemId === item.id;
        return (
          <group key={item.id}>
            {selected ? <SelectionFootprint item={item} invalid={isDragging && !dragPreview.valid} /> : null}
            <Suspense fallback={null}>
              <CatalogModel
                item={catalogItem}
                placedItemId={item.id}
                position={position}
                rotation={modelRotation(item)}
              />
            </Suspense>
          </group>
        );
      })}
    </group>
  );
}
