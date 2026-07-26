import type { CatalogItem } from '../catalog/types';

export type LivingAssetKind = 'plant' | 'decor' | 'quran' | 'cat';
export type CozyAmbientKind = Exclude<LivingAssetKind, 'cat'>;

type LivingAssetDescriptor = Pick<CatalogItem, 'category' | 'name'>;

function isSlippers(item: LivingAssetDescriptor) {
  return item.name.toLowerCase().includes('slipper');
}

export function getLivingAssetKind(
  item: LivingAssetDescriptor,
): LivingAssetKind | null {
  if (item.category === 'Pets') return 'cat';
  if (item.category === 'Plants') return 'plant';
  if (item.category === 'Quran') return 'quran';
  if (item.category === 'Decor' && !isSlippers(item)) return 'decor';
  return null;
}

export function getCozyAmbientKind(
  item: LivingAssetDescriptor,
): CozyAmbientKind | null {
  const kind = getLivingAssetKind(item);
  return kind === 'cat' ? null : kind;
}
