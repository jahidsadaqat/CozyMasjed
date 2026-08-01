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

// Sampled from unobstructed floor areas across the approved room references.
// The shell shader preserves the authored plank texture and luminance while
// applying these wood hues, so no grain or floor detail is replaced.
const referenceFloorOptions = [
  { value: '#CB9A4F', preview: '#CB9A4F', name: 'Sunlit golden oak' },
  { value: '#B28547', preview: '#B28547', name: 'Honey oak' },
  { value: '#AE7046', preview: '#AE7046', name: 'Warm caramel' },
  { value: '#A2693F', preview: '#A2693F', name: 'Sunset cedar' },
  { value: '#864127', preview: '#864127', name: 'Twilight walnut' },
] as const satisfies readonly SurfaceStyleOption[];

const floorOptions: Record<BuildingId, readonly SurfaceStyleOption[]> = {
  'peach-sunrise-room': [
    originalOption('peach-sunrise-room', 'floor'),
    ...referenceFloorOptions,
  ],
  'violet-dusk-room': [
    originalOption('violet-dusk-room', 'floor'),
    ...referenceFloorOptions,
  ],
};

// Sampled from the four wall finishes in the approved "Favorite Sky"
// reference artwork. Keep value and preview identical so the swatch is an
// honest representation of the hue sent to the room-shell tint shader.
const referenceWallOptions = [
  { value: '#7C4558', preview: '#7C4558', name: 'Heritage mauve' },
  { value: '#418A70', preview: '#418A70', name: 'Masjid teal' },
  { value: '#4F728D', preview: '#4F728D', name: 'Noor blue' },
  { value: '#53385F', preview: '#53385F', name: 'Twilight plum' },
] as const satisfies readonly SurfaceStyleOption[];

const wallOptions: Record<BuildingId, readonly SurfaceStyleOption[]> = {
  'peach-sunrise-room': [
    originalOption('peach-sunrise-room', 'walls'),
    { value: '#DAB77E', preview: '#F6E2C7', name: 'Warm ivory' },
    ...referenceWallOptions,
  ],
  'violet-dusk-room': [
    originalOption('violet-dusk-room', 'walls'),
    { value: '#D8B77F', preview: '#F4E6C8', name: 'Warm ivory' },
    ...referenceWallOptions,
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
