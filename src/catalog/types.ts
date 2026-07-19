export type CatalogCategory = 'Prayer' | 'Lights' | 'Seating' | 'Decor' | 'Wall' | 'Buildings';
export type PlacementSurface = 'floor' | 'wallL' | 'wallR';

export type CatalogItem = {
  id: string;
  name: string;
  category: CatalogCategory;
  asset: number;
  allowedSurfaces: readonly PlacementSurface[];
  footprint: { width: number; depth: number };
  modelScale: number;
  modelRotation?: [number, number, number];
  placeholderColor: string;
  emitsLight?: boolean;
};
