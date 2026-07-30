import fs from 'node:fs/promises';

const manifest = JSON.parse(
  await fs.readFile('assets/lighting-manifest.json', 'utf8'),
);

const errors = [];
const ids = new Set();
const validPlacements = new Set(['floor', 'table', 'wall', 'ceiling', 'hanging']);
const validGlowTypes = new Set(['omni', 'floor_pool', 'wall_wash']);

if (manifest.version !== 1) errors.push('version must be 1');
if (!Array.isArray(manifest.entries)) errors.push('entries must be an array');

for (const [index, entry] of (manifest.entries ?? []).entries()) {
  const label = `entries[${index}]`;
  if (typeof entry.id !== 'string' || entry.id.length === 0) {
    errors.push(`${label}.id must be a non-empty string`);
  } else if (ids.has(entry.id)) {
    errors.push(`${label}.id duplicates "${entry.id}"`);
  } else {
    ids.add(entry.id);
  }
  if (!validPlacements.has(entry.placement)) {
    errors.push(`${label}.placement is invalid`);
  }
  if (!Array.isArray(entry.emissiveFactor) || entry.emissiveFactor.length !== 3) {
    errors.push(`${label}.emissiveFactor must contain exactly 3 numbers`);
  }
  if (!Array.isArray(entry.glow)) errors.push(`${label}.glow must be an array`);
  for (const [glowIndex, glow] of (entry.glow ?? []).entries()) {
    const glowLabel = `${label}.glow[${glowIndex}]`;
    if (!validGlowTypes.has(glow.type)) errors.push(`${glowLabel}.type is invalid`);
    if (!(glow.radius > 0)) errors.push(`${glowLabel}.radius must be positive`);
    if (!(glow.opacity >= 0 && glow.opacity <= 1)) {
      errors.push(`${glowLabel}.opacity must be between 0 and 1`);
    }
    if (!/^#[0-9a-f]{6}$/iu.test(glow.color)) {
      errors.push(`${glowLabel}.color must be #RRGGBB`);
    }
  }
  if (entry.smoke !== null) {
    if (!Array.isArray(entry.smoke?.origin) || entry.smoke.origin.length !== 3) {
      errors.push(`${label}.smoke.origin must contain exactly 3 numbers`);
    }
    if (!(entry.smoke?.heightM > 0)) {
      errors.push(`${label}.smoke.heightM must be positive`);
    }
    if (!(entry.smoke?.radiusM > 0)) {
      errors.push(`${label}.smoke.radiusM must be positive`);
    }
  }
  if (entry.emitter) {
    if (!entry.lightOrigin || entry.lightOrigin.length !== 3) {
      errors.push(`${label}.lightOrigin is required for emitters`);
    }
    if (!(entry.emissiveStrength > 0)) {
      errors.push(`${label}.emissiveStrength must be positive for emitters`);
    }
    if (entry.glow.length === 0) {
      errors.push(`${label}.glow must not be empty for emitters`);
    }
  } else if (
    entry.glow.length > 0 ||
    entry.realLightPriority !== null ||
    entry.emissiveStrength !== 0
  ) {
    errors.push(`${label} is a non-emitter with lighting enabled`);
  }
}

if (errors.length > 0) {
  console.error(`Lighting manifest validation failed (${errors.length} issues):`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(
  `Lighting manifest valid: ${manifest.entries.length} entries, ` +
    `${manifest.entries.filter((entry) => entry.emitter).length} emitters.`,
);
