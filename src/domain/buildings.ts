export const BUILDING_IDS = ['cozy-masjid', 'arched-atrium'] as const;

export type BuildingId = (typeof BUILDING_IDS)[number];

export type BuildingOption = {
  id: BuildingId;
  name: string;
  shell: 'procedural' | 'arched-atrium';
  asset?: number;
};

export const DEFAULT_BUILDING_ID: BuildingId = 'cozy-masjid';
export const defaultBuildingId = DEFAULT_BUILDING_ID;

export const buildingOptions: readonly BuildingOption[] = [
  {
    id: DEFAULT_BUILDING_ID,
    name: 'Cozy Masjid',
    shell: 'procedural',
  },
  {
    id: 'arched-atrium',
    name: 'Arched Atrium',
    shell: 'arched-atrium',
    // Metro needs a literal require for bundled binary assets. This building
    // intentionally lives outside the furniture catalog.
    asset: require('../../assets/models/optimized/buildings/two-level-arched-atrium.glb'),
  },
] as const;

export const BUILDING_OPTIONS = buildingOptions;

export const buildingById = Object.fromEntries(
  buildingOptions.map((building) => [building.id, building]),
) as Record<BuildingId, BuildingOption>;

export function isBuildingId(value: unknown): value is BuildingId {
  return typeof value === 'string' && BUILDING_IDS.includes(value as BuildingId);
}
