import { useCallback, useRef } from 'react';
import { catalog } from '../../catalog/catalog';
import { CatalogItemModel } from './CatalogItemModel';

const columns = [-1.65, -0.82, 0, 0.82, 1.65];
const rows = [-0.9, 0.28, 1.46];

export function ModelValidationScene() {
  const readyIds = useRef(new Set<string>());
  const markReady = useCallback((catalogId: string) => {
    readyIds.current.add(catalogId);
    if (readyIds.current.size === catalog.length) {
      console.info(`[Deen Rooms] all ${catalog.length} catalog models loaded`);
    }
  }, []);

  return (
    <group>
      {catalog.map((item, index) => (
        <CatalogItemModel
          key={item.id}
          item={item}
          position={[columns[index % columns.length], 0.04, rows[Math.floor(index / columns.length)]]}
          scale={Math.min(item.modelScale, 0.34)}
          onReady={markReady}
        />
      ))}
    </group>
  );
}
