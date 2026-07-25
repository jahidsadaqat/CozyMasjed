export const BUILDING_IDS = [
  'violet-dusk-room',
  'peach-sunrise-room',
  'brick-noor-room',
  'charcoal-noor-room',
] as const;

export type BuildingId = (typeof BUILDING_IDS)[number];

export type BuildingOption = {
  id: BuildingId;
  name: string;
  shell: 'model-room';
  asset?: number;
};

export const DEFAULT_BUILDING_ID: BuildingId = 'violet-dusk-room';
export const defaultBuildingId = DEFAULT_BUILDING_ID;

export const buildingOptions: readonly BuildingOption[] = [
  {
    id: DEFAULT_BUILDING_ID,
    name: 'Violet Dusk',
    shell: 'model-room',
    asset: require('../../assets/models/optimized/buildings/violet-dusk-room.glb'),
  },
  {
    id: 'peach-sunrise-room',
    name: 'Peach Sunrise',
    shell: 'model-room',
    asset: require('../../assets/models/optimized/buildings/peach-sunrise-room.glb'),
  },
  {
    id: 'brick-noor-room',
    name: 'Brick Noor',
    shell: 'model-room',
    asset: require('../../assets/models/optimized/buildings/brick-noor-room.glb'),
  },
  {
    id: 'charcoal-noor-room',
    name: 'Charcoal Noor',
    shell: 'model-room',
    asset: require('../../assets/models/optimized/buildings/charcoal-noor-room.glb'),
  },
] as const;

export const BUILDING_OPTIONS = buildingOptions;

export const buildingById = Object.fromEntries(
  buildingOptions.map((building) => [building.id, building]),
) as Record<BuildingId, BuildingOption>;

export function isBuildingId(value: unknown): value is BuildingId {
  return typeof value === 'string' && BUILDING_IDS.includes(value as BuildingId);
}
