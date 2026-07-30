import fs from 'node:fs/promises';
import path from 'node:path';
import { PNG } from 'pngjs';

const ROOT = process.cwd();
const IMPORTED_CATALOG_PATH = path.join(ROOT, 'src', 'catalog', 'importedCatalog.ts');
const MANIFEST_PATH = path.join(ROOT, 'assets', 'lighting-manifest.json');
const GLOW_DIR = path.join(ROOT, 'assets', 'textures', 'glow');

const wallIds = new Set([
  'imported-model-11',
  'imported-model-15',
  'imported-model-20',
  'imported-model-39',
  'imported-model-43',
  'imported-model-44',
  'imported-model-49',
  'imported-model-53',
  'imported-model-55',
  'imported-model-59',
  'imported-model-61',
  'imported-model-62',
  'curtains',
  'wall-art',
]);

const baseAssetIds = [
  'masjid-model',
  'fanous-lantern',
  'tasbih',
  'rehal-quran',
  'minbar',
  'floor-cushion',
  'curtains',
  'minaret',
  'wall-art',
  // Kept in the manifest because old saved rooms can still resolve it.
  'mini-masjid',
];

const emitterProfiles = {
  'imported-model-43': {
    targetHeightM: 0.87,
    emissiveFactor: [1, 0.84, 0.6],
    emissiveStrength: 1.7,
    lightOrigin: [0, 0.5, 0.23],
    glow: [
      { type: 'omni', radius: 0.42, color: '#FFD79A', opacity: 0.36 },
      { type: 'wall_wash', radius: 1.15, color: '#FFD79A', opacity: 0.16 },
    ],
    realLightPriority: 1,
  },
  'imported-model-44': {
    targetHeightM: 0.8,
    emissiveFactor: [1, 0.79, 0.54],
    emissiveStrength: 1.55,
    lightOrigin: [0, 0.13, 0.25],
    glow: [
      { type: 'omni', radius: 0.3, color: '#FFC98A', opacity: 0.34 },
      { type: 'wall_wash', radius: 0.9, color: '#FFC98A', opacity: 0.15 },
    ],
    realLightPriority: 2,
  },
  'imported-model-40': {
    targetHeightM: 0.8,
    emissiveFactor: [1, 0.86, 0.66],
    emissiveStrength: 1.35,
    lightOrigin: [0, 0.62, 0],
    glow: [
      { type: 'omni', radius: 0.3, color: '#FFD9AE', opacity: 0.32 },
      { type: 'floor_pool', radius: 1.25, color: '#FFD9AE', opacity: 0.14 },
    ],
    realLightPriority: 3,
  },
  'fanous-lantern': {
    targetHeightM: 0.87,
    emissiveFactor: [1, 0.72, 0.4],
    emissiveStrength: 1.55,
    lightOrigin: [0, 0.46, 0],
    glow: [
      { type: 'omni', radius: 0.28, color: '#FFB25C', opacity: 0.34 },
      { type: 'floor_pool', radius: 1, color: '#FFB25C', opacity: 0.14 },
    ],
    realLightPriority: 4,
  },
  'imported-model-39': {
    targetHeightM: 0.51,
    emissiveFactor: [1, 0.78, 0.52],
    emissiveStrength: 1.45,
    lightOrigin: [0, 0.22, 0.14],
    glow: [
      { type: 'omni', radius: 0.22, color: '#FFC98A', opacity: 0.34 },
      { type: 'wall_wash', radius: 0.85, color: '#FFC98A', opacity: 0.15 },
    ],
    realLightPriority: 5,
  },
  'imported-model-42': {
    targetHeightM: 0.3,
    emissiveFactor: [1, 0.66, 0.3],
    emissiveStrength: 1.9,
    lightOrigin: [-0.01, 0.26, -0.02],
    glow: [{ type: 'omni', radius: 0.12, color: '#FFA544', opacity: 0.38 }],
    realLightPriority: null,
    flicker: { amplitude: 0.12, hz: 6.5, noise: 'perlin' },
  },
  'imported-model-49': {
    targetHeightM: 0.43,
    emissiveFactor: [1, 0.74, 0.44],
    emissiveStrength: 1.45,
    lightOrigin: [0, 0.08, 0.06],
    glow: [{ type: 'omni', radius: 0.055, color: '#FFC070', opacity: 0.32 }],
    realLightPriority: null,
    flicker: {
      amplitude: 0.04,
      hz: 0.8,
      noise: 'perlin',
      perBulbOffset: true,
    },
    strip: { bulbCount: 6, spanM: 0.78, sagM: 0.08 },
  },
  minaret: {
    targetHeightM: 0.8,
    emissiveFactor: [1, 0.81, 0.62],
    emissiveStrength: 1.45,
    lightOrigin: [0, 0.4, 0],
    glow: [
      { type: 'omni', radius: 0.25, color: '#FFCF9E', opacity: 0.32 },
      { type: 'floor_pool', radius: 0.95, color: '#FFCF9E', opacity: 0.13 },
    ],
    realLightPriority: null,
  },
  curtains: {
    targetHeightM: 0.8,
    emissiveFactor: [1, 0.81, 0.62],
    emissiveStrength: 1.4,
    lightOrigin: [0, 0.4, 0.14],
    glow: [
      { type: 'omni', radius: 0.22, color: '#FFCF9E', opacity: 0.31 },
      { type: 'wall_wash', radius: 0.8, color: '#FFCF9E', opacity: 0.14 },
    ],
    realLightPriority: null,
  },
  'imported-model-37': {
    targetHeightM: 0.46,
    emissiveFactor: [1, 0.45, 0.16],
    emissiveStrength: 1.7,
    lightOrigin: [0, 0.37, 0],
    glow: [{ type: 'omni', radius: 0.09, color: '#FF7A2E', opacity: 0.36 }],
    realLightPriority: null,
    flicker: { amplitude: 0.08, hz: 1.2, noise: 'sine' },
    smoke: {
      origin: [0, 0.37, 0],
      heightM: 0.62,
      radiusM: 0.075,
    },
  },
  'imported-model-41': {
    targetHeightM: 0.53,
    emissiveFactor: [1, 0.45, 0.16],
    emissiveStrength: 1.7,
    lightOrigin: [0, 0.4, 0],
    glow: [{ type: 'omni', radius: 0.09, color: '#FF7A2E', opacity: 0.36 }],
    realLightPriority: null,
    flicker: { amplitude: 0.08, hz: 1.2, noise: 'sine' },
    smoke: {
      origin: [0, 0.4, 0],
      heightM: 0.66,
      radiusM: 0.08,
    },
  },
};

function placementFor(id) {
  return wallIds.has(id) ? 'wall' : 'floor';
}

function defaultEntry(id) {
  return {
    id,
    placement: placementFor(id),
    targetHeightM: null,
    emitter: false,
    emissiveFactor: [0, 0, 0],
    emissiveStrength: 0,
    lightOrigin: null,
    glow: [],
    realLightPriority: null,
    flicker: null,
    smoke: null,
  };
}

async function writeManifest() {
  const importedSource = await fs.readFile(IMPORTED_CATALOG_PATH, 'utf8');
  const importedIds = [...new Set(importedSource.match(/imported-model-\d+/g) ?? [])]
    .sort((left, right) => {
      const a = Number(left.split('-').at(-1));
      const b = Number(right.split('-').at(-1));
      return a - b;
    });
  const ids = [...importedIds, ...baseAssetIds];
  const entries = ids.map((id) => {
    const profile = emitterProfiles[id];
    return profile
      ? {
          ...defaultEntry(id),
          ...profile,
          emitter: true,
          flicker: profile.flicker ?? null,
        }
      : defaultEntry(id);
  });

  const manifest = {
    $schema: './lighting-manifest.schema.json',
    version: 1,
    activationWeather: ['rain', 'night'],
    entries,
  };
  await fs.writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
  return entries;
}

function writePng(fileName, alphaAt) {
  const size = 256;
  const png = new PNG({ width: size, height: size, colorType: 6 });
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const offset = (y * size + x) * 4;
      const alpha = Math.max(0, Math.min(1, alphaAt(x, y, size)));
      png.data[offset] = 255;
      png.data[offset + 1] = 255;
      png.data[offset + 2] = 255;
      png.data[offset + 3] = Math.round(alpha * 255);
    }
  }
  return fs.writeFile(path.join(GLOW_DIR, fileName), PNG.sync.write(png));
}

async function writeGlowTextures() {
  await fs.mkdir(GLOW_DIR, { recursive: true });
  await Promise.all([
    writePng('glow-radial-256.png', (x, y, size) => {
      const nx = (x + 0.5 - size / 2) / (size / 2);
      const ny = (y + 0.5 - size / 2) / (size / 2);
      const distance = Math.min(1, Math.hypot(nx, ny));
      return (1 - distance) ** 2.2;
    }),
    writePng('glow-pool-256.png', (x, y, size) => {
      const nx = (x + 0.5 - size / 2) / (size / 2);
      const ny = (y + 0.5 - size / 2) / (size / 2);
      const distance = Math.min(1, Math.hypot(nx, ny));
      return 0.7 * (1 - distance) ** 1.55;
    }),
    writePng('glow-cone-256.png', (x, y, size) => {
      const nx = Math.abs((x + 0.5 - size / 2) / (size / 2));
      const ny = (y + 0.5) / size;
      const horizontal = Math.max(0, 1 - nx ** 1.6);
      const vertical = Math.max(0, 1 - ny) ** 1.45;
      return 0.72 * horizontal * vertical;
    }),
  ]);
}

const entries = await writeManifest();
await writeGlowTextures();
console.log(
  `Generated ${entries.length} manifest entries (${entries.filter((entry) => entry.emitter).length} emitters) and 3 glow textures.`,
);
