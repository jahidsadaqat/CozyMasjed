import { useCallback, useRef } from 'react';
import { catalog } from '../../catalog/catalog';
import { CatalogModel } from './CatalogModel';

const columns = [-1.65, -0.82, 0, 0.82, 1.65];
const rows = [-0.52, 0.66];

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
        <CatalogModel
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
