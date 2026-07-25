export type CatalogCategory =
  | 'Minbar'
  | 'Prayer Rugs'
  | 'Quran'
  | 'Tasbih'
  | 'Characters'
  | 'Pets'
  | 'Lights'
  | 'Seating'
  | 'Tables'
  | 'Storage'
  | 'Plants'
  | 'Serving'
  | 'Rugs'
  | 'Decor'
  | 'Wall'
  | 'Buildings';
export type PlacementSurface = 'floor' | 'wallL' | 'wallR' | 'ceiling';
export type AttachmentRole = 'cat' | 'figure' | 'display';
export type AttachmentSlot = {
  id: string;
  accepts: readonly AttachmentRole[];
  localPosition: readonly [number, number, number];
  hitPosition?: readonly [number, number, number];
  localRotation?: number;
  hitSize: { width: number; depth: number };
  lockRotation?: boolean;
};
export type ProceduralModelKind =
  | 'tasbih-crescent-hook'
  | 'tasbih-mihrab-rack'
  | 'tasbih-geometric-rail'
  | 'tasbih-mashrabiya-board'
  | 'tasbih-palm-hanger';

type CatalogItemBase = {
  id: string;
  name: string;
  category: CatalogCategory;
  allowedSurfaces: readonly PlacementSurface[];
  footprint: { width: number; depth: number };
  wallFootprint?: { width: number; height: number };
  modelScale: number;
  modelRotation?: [number, number, number];
  placeholderColor: string;
  emitsLight?: boolean;
  rotatable?: boolean;
  attachmentRole?: AttachmentRole;
  attachmentSlots?: readonly AttachmentSlot[];
};

export type AssetCatalogItem = CatalogItemBase & {
  asset: number;
  proceduralModel?: never;
};

export type ProceduralCatalogItem = CatalogItemBase & {
  asset?: never;
  proceduralModel: ProceduralModelKind;
};

export type CatalogItem = AssetCatalogItem | ProceduralCatalogItem;
