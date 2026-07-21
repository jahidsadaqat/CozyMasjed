import { palette } from '../theme/palette';
import { importedModelAssets } from './assets';
import type {
  AttachmentRole,
  AttachmentSlot,
  CatalogCategory,
  CatalogItem,
  PlacementSurface,
} from './types';

type ImportedDefinition = {
  id: string;
  name: string;
  category: CatalogCategory;
  footprint: { width: number; depth: number };
  allowedSurfaces?: readonly PlacementSurface[];
  wallFootprint?: { width: number; height: number };
  modelScale?: number;
  placeholderColor?: string;
  emitsLight?: boolean;
  rotatable?: boolean;
  attachmentRole?: AttachmentRole;
  attachmentSlots?: readonly AttachmentSlot[];
};

const character = (id: string, name: string): ImportedDefinition => ({
  id,
  name,
  category: 'Characters',
  footprint: { width: 1, depth: 1 },
  modelScale: 0.48,
  placeholderColor: palette.mutedTeal,
  attachmentRole: 'figure',
});

const pet = (id: string, name: string): ImportedDefinition => ({
  id,
  name,
  category: 'Pets',
  footprint: { width: 1, depth: 1 },
  modelScale: 0.48,
  placeholderColor: '#D98D74',
  attachmentRole: 'cat',
});

const wall = (
  id: string,
  name: string,
  category: Extract<CatalogCategory, 'Wall' | 'Lights' | 'Storage'> = 'Wall',
  width = 2,
): ImportedDefinition => ({
  id,
  name,
  category,
  allowedSurfaces: ['wallL', 'wallR'],
  footprint: { width, depth: 1 },
  wallFootprint: { width, height: 2 },
  modelScale: 0.48,
  placeholderColor: category === 'Lights' ? palette.gold : palette.terracotta,
  emitsLight: category === 'Lights',
  rotatable: false,
});

const minbarVariant = (id: string, name: string): ImportedDefinition => ({
  id,
  name,
  category: 'Minbar',
  footprint: { width: 2, depth: 2 },
  modelScale: 0.67,
  placeholderColor: '#9A6748',
});

const prayerRugVariant = (id: string, name: string): ImportedDefinition => ({
  id,
  name,
  category: 'Prayer Rugs',
  footprint: { width: 2, depth: 2 },
  modelScale: 0.76,
  placeholderColor: palette.mutedTeal,
  attachmentSlots: [
    {
      id: 'prayer-end',
      accepts: ['cat', 'figure'],
      localPosition: [-0.46, 0.065, 0],
      hitPosition: [0, 0.065, 0],
      hitSize: { width: 1.45, depth: 0.82 },
    },
  ],
});

const prayerAccessory = (
  id: string,
  name: string,
  category: Extract<CatalogCategory, 'Quran' | 'Tasbih'>,
  modelScale: number,
): ImportedDefinition => ({
  id,
  name,
  category,
  footprint: { width: 1, depth: 1 },
  modelScale,
  placeholderColor: palette.terracotta,
});

const majlisCushion = (
  id: string,
  name: string,
  topY: number,
): ImportedDefinition => ({
  id,
  name,
  category: 'Seating',
  footprint: { width: 1, depth: 1 },
  modelScale: 0.39,
  placeholderColor: '#D98D74',
  attachmentSlots: [
    {
      id: 'cushion-center',
      accepts: ['cat', 'figure'],
      localPosition: [0, topY, 0],
      hitSize: { width: 0.68, depth: 0.68 },
    },
  ],
});

const definitions: readonly ImportedDefinition[] = [
  character('imported-model-01', 'Qiyam Figure'),
  character('imported-model-02', 'Takbir Figure'),
  character('imported-model-03', 'Jalsa Figure'),
  character('imported-model-04', 'Standing Figure'),
  character('imported-model-06', 'Ruku Figure'),
  character('imported-model-07', 'Taslim Figure'),
  character('imported-model-08', 'Dua Figure'),
  character('imported-model-09', 'Sujud Figure'),
  { id: 'imported-model-10', name: 'Low Bookshelf', category: 'Storage', footprint: { width: 2, depth: 1 } },
  { id: 'imported-model-11', name: 'Hanging Ivy', category: 'Plants', footprint: { width: 1, depth: 1 } },
  { id: 'imported-model-12', name: 'Succulent Bowl', category: 'Plants', footprint: { width: 1, depth: 1 } },
  { id: 'imported-model-13', name: 'Tall Bookcase', category: 'Storage', footprint: { width: 2, depth: 1 } },
  { id: 'imported-model-14', name: 'Quran Chest', category: 'Storage', footprint: { width: 1, depth: 1 } },
  { id: 'imported-model-15', name: 'Macrame Planter', category: 'Plants', footprint: { width: 1, depth: 1 } },
  { id: 'imported-model-16', name: 'Potted Olive Tree', category: 'Plants', footprint: { width: 2, depth: 2 } },
  { id: 'imported-model-17', name: 'Potted Date Palm', category: 'Plants', footprint: { width: 2, depth: 2 } },
  { id: 'imported-model-18', name: 'Book Cabinet', category: 'Storage', footprint: { width: 2, depth: 1 } },
  character('imported-model-19', 'Thobe Figure'),
  wall('imported-model-20', 'Wall Book Shelf', 'Storage', 2),
  pet('imported-model-21', 'Sitting Cream Cat'),
  pet('imported-model-22', 'Lying Grey Cat'),
  { id: 'imported-model-23', name: 'Terracotta Side Table', category: 'Tables', footprint: { width: 1, depth: 1 } },
  pet('imported-model-24', 'Orange Kitten'),
  { id: 'imported-model-25', name: 'Octagonal Tray Table', category: 'Tables', footprint: { width: 2, depth: 2 } },
  { id: 'imported-model-26', name: 'Round Tea Table', category: 'Tables', footprint: { width: 2, depth: 2 } },
  { id: 'imported-model-27', name: 'Low Majlis Table', category: 'Tables', footprint: { width: 2, depth: 1 } },
  pet('imported-model-28', 'Sleeping Ginger Cat'),
  { id: 'imported-model-37', name: 'Cube Bakhoor Burner', category: 'Decor', footprint: { width: 1, depth: 1 } },
  { id: 'imported-model-38', name: 'Two-tier Shoe Rack', category: 'Storage', footprint: { width: 2, depth: 1 } },
  wall('imported-model-39', 'Wall Sconce', 'Lights', 1),
  {
    id: 'imported-model-40',
    name: 'Floor Lamp',
    category: 'Lights',
    footprint: { width: 1, depth: 1 },
    emitsLight: true,
  },
  { id: 'imported-model-41', name: 'Round Bakhoor Burner', category: 'Decor', footprint: { width: 1, depth: 1 } },
  { id: 'imported-model-42', name: 'Candle Holder', category: 'Lights', footprint: { width: 1, depth: 1 }, emitsLight: true },
  { id: 'imported-model-43', name: 'Mosque Chandelier', category: 'Lights', footprint: { width: 2, depth: 2 }, emitsLight: true },
  { id: 'imported-model-44', name: 'Dome Ceiling Lamp', category: 'Lights', footprint: { width: 2, depth: 2 }, emitsLight: true },
  { id: 'imported-model-45', name: 'Dallah Tray Set', category: 'Serving', footprint: { width: 1, depth: 1 } },
  { id: 'imported-model-46', name: 'Cream Slippers', category: 'Decor', footprint: { width: 1, depth: 1 } },
  { id: 'imported-model-47', name: 'Gold Dallah', category: 'Serving', footprint: { width: 1, depth: 1 } },
  { id: 'imported-model-48', name: 'Copper Dallah', category: 'Serving', footprint: { width: 1, depth: 1 } },
  wall('imported-model-49', 'Lantern String Lights', 'Lights', 3),
  { id: 'imported-model-50', name: 'Gold Attar Bottle', category: 'Decor', footprint: { width: 1, depth: 1 } },
  { id: 'imported-model-51', name: 'Bowl of Dates', category: 'Serving', footprint: { width: 1, depth: 1 } },
  { id: 'imported-model-52', name: 'Eid Gift Boxes', category: 'Decor', footprint: { width: 1, depth: 1 } },
  wall('imported-model-53', 'Prayer Times Clock', 'Wall', 2),
  { id: 'imported-model-54', name: 'Iftar Tray', category: 'Serving', footprint: { width: 2, depth: 1 } },
  wall('imported-model-55', 'Crescent Wall Decor', 'Wall', 2),
  { id: 'imported-model-56', name: 'Gold Dallah Set', category: 'Serving', footprint: { width: 1, depth: 1 } },
  {
    id: 'imported-model-57',
    name: 'Bolster Cushion',
    category: 'Seating',
    footprint: { width: 2, depth: 1 },
    attachmentSlots: [
      { id: 'cushion-top', accepts: ['cat'], localPosition: [0, 0.37, 0], hitSize: { width: 0.82, depth: 0.38 } },
    ],
  },
  { id: 'imported-model-58', name: 'Crescent Ornament', category: 'Decor', footprint: { width: 1, depth: 1 } },
  wall('imported-model-59', 'Mashrabiya Panel', 'Wall', 2),
  {
    id: 'imported-model-60',
    name: 'Spiral Round Rug',
    category: 'Rugs',
    footprint: { width: 2, depth: 2 },
    attachmentSlots: [
      {
        id: 'rug-center',
        accepts: ['cat', 'figure'],
        localPosition: [0, 0.04, 0],
        hitSize: { width: 0.88, depth: 0.88 },
      },
    ],
  },
  wall('imported-model-61', 'Oval Mirror', 'Wall', 2),
  wall('imported-model-62', 'Eid Bunting Flags', 'Wall', 3),
  {
    id: 'imported-model-63',
    name: 'Prayer Chair',
    category: 'Seating',
    footprint: { width: 2, depth: 2 },
    attachmentSlots: [
      {
        id: 'chair-seat',
        accepts: ['figure'],
        localPosition: [0, 0.5, 0.08],
        hitSize: { width: 0.48, depth: 0.45 },
        lockRotation: true,
      },
    ],
  },
  minbarVariant('imported-model-64', 'Sand & Teal Minbar'),
  minbarVariant('imported-model-65', 'Teal Rail Minbar'),
  minbarVariant('imported-model-66', 'Terracotta Palace Minbar'),
  minbarVariant('imported-model-67', 'Cream Canopy Minbar'),
  minbarVariant('imported-model-68', 'Open Minbar'),
  minbarVariant('imported-model-69', 'Scalloped Teal Minbar'),
  minbarVariant('imported-model-70', 'Twin Arch Minbar'),
  minbarVariant('imported-model-71', 'Round Tower Minbar'),
  minbarVariant('imported-model-72', 'Teal Panel Minbar'),
  minbarVariant('imported-model-73', 'Sand Pavilion Minbar'),
  prayerRugVariant('imported-model-74', 'Double Arch Prayer Rug'),
  prayerRugVariant('imported-model-75', 'Stepped Arch Prayer Rug'),
  prayerRugVariant('imported-model-76', 'Sunrise Prayer Rug'),
  prayerRugVariant('imported-model-77', 'Cream Arch Prayer Rug'),
  prayerRugVariant('imported-model-78', 'Star Medallion Prayer Rug'),
  prayerRugVariant('imported-model-79', 'Nested Arch Prayer Rug'),
  prayerRugVariant('imported-model-80', 'Geometric Path Prayer Rug'),
  prayerRugVariant('imported-model-81', 'Scalloped Mihrab Rug'),
  prayerRugVariant('imported-model-82', 'Teal Corner Prayer Rug'),
  prayerRugVariant('imported-model-83', 'Minimal Three-Tone Rug'),
  prayerAccessory('imported-model-84', 'Onyx Gold Tasbih', 'Tasbih', 0.3),
  prayerAccessory('imported-model-85', 'Turquoise Silver Tasbih', 'Tasbih', 0.3),
  prayerAccessory('imported-model-86', 'Terracotta Heritage Tasbih', 'Tasbih', 0.3),
  prayerAccessory('imported-model-87', 'Sandalwood Cream Tasbih', 'Tasbih', 0.3),
  prayerAccessory('imported-model-88', 'Emerald Lantern Tasbih', 'Tasbih', 0.3),
  prayerAccessory('imported-model-89', 'Lavender Silver Tasbih', 'Tasbih', 0.3),
  prayerAccessory('imported-model-90', 'Rose Sand Tasbih', 'Tasbih', 0.3),
  prayerAccessory('imported-model-91', 'Festival Tasbih', 'Tasbih', 0.3),
  prayerAccessory('imported-model-92', 'Closed Teal Quran', 'Quran', 0.39),
  prayerAccessory('imported-model-93', 'Terracotta Quran & Rehal', 'Quran', 0.39),
  prayerAccessory('imported-model-94', 'Closed Terracotta Quran', 'Quran', 0.39),
  prayerAccessory('imported-model-95', 'Closed Ivory Quran', 'Quran', 0.39),
  prayerAccessory('imported-model-96', 'Teal Quran & Rehal', 'Quran', 0.39),
  prayerAccessory('imported-model-97', 'Closed Sand Quran', 'Quran', 0.39),
  prayerAccessory('imported-model-98', 'Scalloped Quran Rehal', 'Quran', 0.39),
  prayerAccessory('imported-model-99', 'Minimal Gold Rehal', 'Quran', 0.39),
  prayerAccessory('imported-model-100', 'Closed Deep Teal Quran', 'Quran', 0.39),
  majlisCushion('imported-model-101', 'Terracotta Majlis Pouf', 0.34),
  majlisCushion('imported-model-102', 'Teal Radial Pouf', 0.256),
  majlisCushion('imported-model-103', 'Cream Petal Pouf', 0.274),
  majlisCushion('imported-model-104', 'Rounded Square Cushion', 0.315),
  majlisCushion('imported-model-105', 'Soft Oval Cushion', 0.225),
  majlisCushion('imported-model-106', 'Segmented Majlis Pouf', 0.254),
  majlisCushion('imported-model-107', 'Scalloped Floor Cushion', 0.215),
  majlisCushion('imported-model-108', 'Teal Hexagonal Pouf', 0.206),
  majlisCushion('imported-model-109', 'Sand Majlis Cushion', 0.257),
] as const;

const assetById = Object.fromEntries(importedModelAssets.map((model) => [model.id, model.asset])) as Record<string, number>;

export const importedCatalogItems: readonly CatalogItem[] = definitions.map((definition) => {
  const asset = assetById[definition.id];
  if (!asset) throw new Error(`Missing imported model asset: ${definition.id}`);
  return {
    ...definition,
    asset,
    allowedSurfaces: definition.allowedSurfaces ?? ['floor'],
    modelScale: definition.modelScale ?? 0.48,
    placeholderColor: definition.placeholderColor ?? palette.terracotta,
  } as CatalogItem;
});
