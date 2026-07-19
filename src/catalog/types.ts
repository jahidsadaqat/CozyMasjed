export type CatalogCategory = 'Prayer' | 'Lights' | 'Seating' | 'Decor' | 'Wall' | 'Buildings';
export type PlacementSurface = 'floor' | 'wallL' | 'wallR';
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
