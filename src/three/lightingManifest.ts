export type GlowType = 'omni' | 'floor_pool' | 'wall_wash';

export type GlowDefinition = {
  type: GlowType;
  radius: number;
  color: string;
  opacity: number;
};

export type FlickerDefinition = {
  amplitude: number;
  hz: number;
  noise: 'perlin' | 'sine';
  perBulbOffset?: boolean;
};

export type SmokeDefinition = {
  origin: [number, number, number];
  heightM: number;
  radiusM: number;
};

export type LightingManifestEntry = {
  id: string;
  placement: 'floor' | 'table' | 'wall' | 'ceiling' | 'hanging';
  targetHeightM: number | null;
  emitter: boolean;
  emissiveFactor: [number, number, number];
  emissiveStrength: number;
  lightOrigin: [number, number, number] | null;
  glow: GlowDefinition[];
  realLightPriority: number | null;
  flicker: FlickerDefinition | null;
  smoke: SmokeDefinition | null;
  strip?: {
    bulbCount: number;
    spanM: number;
    sagM: number;
  };
};

type LightingManifest = {
  version: 1;
  activationWeather: string[];
  entries: LightingManifestEntry[];
};

const manifest = require('../../assets/lighting-manifest.json') as LightingManifest;

const entriesById = new Map(
  manifest.entries.map((entry) => [entry.id, entry] as const),
);

export function getLightingManifestEntry(id: string) {
  return entriesById.get(id) ?? null;
}

export function getLightingManifestEntries() {
  return manifest.entries;
}

export function isLightingWeatherActive(weather: string) {
  const manifestWeather = weather === 'rainy' ? 'rain' : weather;
  return manifest.activationWeather.includes(manifestWeather);
}
