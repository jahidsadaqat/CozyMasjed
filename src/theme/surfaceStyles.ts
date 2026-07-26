import {
  BUILDING_IDS,
  type BuildingId,
} from '../domain/buildings';

export type SurfaceStyle = {
  floorColor: string;
  wallColor: string;
};

export type BuildingSurfaceStyles = Record<BuildingId, SurfaceStyle>;

export type SurfaceStyleOption = {
  value: string;
  preview: string;
  name: string;
};

export const ORIGINAL_SURFACE_TINT = '#FFFFFF';

const originalPreview: Record<BuildingId, Pick<SurfaceStyleOption, 'preview' | 'name'>> = {
  'peach-sunrise-room': { preview: '#D98770', name: 'Original peach' },
  'violet-dusk-room': { preview: '#9B5F91', name: 'Original violet' },
};

const originalFloorPreview: Record<BuildingId, Pick<SurfaceStyleOption, 'preview' | 'name'>> = {
  'peach-sunrise-room': { preview: '#D79A6B', name: 'Original honey wood' },
  'violet-dusk-room': { preview: '#A96E49', name: 'Original wood' },
};

function originalOption(
  buildingId: BuildingId,
  surface: 'floor' | 'walls',
): SurfaceStyleOption {
  const preview = surface === 'floor'
    ? originalFloorPreview[buildingId]
    : originalPreview[buildingId];
  return {
    value: ORIGINAL_SURFACE_TINT,
    preview: preview.preview,
    name: preview.name,
  };
}

const floorOptions: Record<BuildingId, readonly SurfaceStyleOption[]> = {
  'peach-sunrise-room': [
    originalOption('peach-sunrise-room', 'floor'),
    { value: '#F3D3A7', preview: '#D6A05F', name: 'Desert honey' },
    { value: '#E7B29B', preview: '#B96F54', name: 'Terracotta oak' },
    { value: '#D0A088', preview: '#875A45', name: 'Date walnut' },
    { value: '#E1CFB3', preview: '#B6A17E', name: 'Sand oak' },
  ],
  'violet-dusk-room': [
    originalOption('violet-dusk-room', 'floor'),
    { value: '#F1D2AD', preview: '#C99362', name: 'Honey oak' },
    { value: '#D7AF91', preview: '#9B684C', name: 'Warm walnut' },
    { value: '#B89278', preview: '#6F5141', name: 'Deep walnut' },
    { value: '#D1C6BB', preview: '#92867D', name: 'Soft stone oak' },
  ],
};

const wallOptions: Record<BuildingId, readonly SurfaceStyleOption[]> = {
  'peach-sunrise-room': [
    originalOption('peach-sunrise-room', 'walls'),
    { value: '#DAB77E', preview: '#F6E2C7', name: 'Warm ivory' },
    { value: '#B79762', preview: '#D8C49E', name: 'Desert sand' },
    { value: '#82966E', preview: '#C8D1BC', name: 'Olive sage' },
    { value: '#B87D70', preview: '#DAB6AD', name: 'Clay blush' },
    { value: '#7795A2', preview: '#BECED2', name: 'Dawn blue' },
  ],
  'violet-dusk-room': [
    originalOption('violet-dusk-room', 'walls'),
    { value: '#D8B77F', preview: '#F4E6C8', name: 'Warm ivory' },
    { value: '#7F9A6B', preview: '#C8D8BF', name: 'Masjid sage' },
    { value: '#B77F89', preview: '#D8B6BE', name: 'Dusty rose' },
    { value: '#7898B0', preview: '#B9CBD9', name: 'Noor blue' },
    { value: '#937FA8', preview: '#CDB9D7', name: 'Soft lilac' },
  ],
};

export function createDefaultBuildingSurfaceStyles(): BuildingSurfaceStyles {
  return Object.fromEntries(
    BUILDING_IDS.map((buildingId) => [
      buildingId,
      {
        floorColor: ORIGINAL_SURFACE_TINT,
        wallColor: ORIGINAL_SURFACE_TINT,
      },
    ]),
  ) as BuildingSurfaceStyles;
}

export function getSurfaceStyleOptions(
  buildingId: BuildingId,
  surface: 'floor' | 'walls',
) {
  return surface === 'floor' ? floorOptions[buildingId] : wallOptions[buildingId];
}
