import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptRoot = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptRoot, '..');
const playerPath = path.resolve(
  projectRoot,
  'src/audio/InteractionSoundPlayer.tsx',
);
const audioRoot = path.resolve(projectRoot, 'assets/audio/ui');
const expectedSounds = [
  'ui-click.wav',
  'asset-select.wav',
  'camera-shutter.wav',
  'asset-place.wav',
  'asset-delete.wav',
  'asset-move.wav',
];

const failures = [];
const source = await fs.readFile(playerPath, 'utf8');

function inspectWave(bytes, fileName) {
  if (
    bytes.length < 44 ||
    bytes.toString('ascii', 0, 4) !== 'RIFF' ||
    bytes.toString('ascii', 8, 12) !== 'WAVE'
  ) {
    failures.push(`${fileName}: expected a non-empty RIFF/WAVE audio file`);
    return;
  }

  let format = null;
  let data = null;
  for (let offset = 12; offset + 8 <= bytes.length; ) {
    const chunkName = bytes.toString('ascii', offset, offset + 4);
    const chunkLength = bytes.readUInt32LE(offset + 4);
    const chunkStart = offset + 8;
    const chunkEnd = chunkStart + chunkLength;
    if (chunkEnd > bytes.length) {
      failures.push(`${fileName}: WAV chunk extends past the end of the file`);
      return;
    }
    if (chunkName === 'fmt ') format = bytes.subarray(chunkStart, chunkEnd);
    if (chunkName === 'data') data = bytes.subarray(chunkStart, chunkEnd);
    offset = chunkEnd + (chunkLength % 2);
  }

  if (!format || format.length < 16) {
    failures.push(`${fileName}: missing WAV format metadata`);
  } else if (format.readUInt16LE(0) !== 1 || format.readUInt16LE(14) !== 16) {
    failures.push(`${fileName}: interaction sounds must be PCM 16-bit WAV files`);
  }

  if (!data || data.length === 0 || data.every((byte) => byte === 0)) {
    failures.push(`${fileName}: WAV data is empty or silent`);
  }
}

// Expo Audio 57 exposes playbackRate as a read-only native property. Web has a
// setter, so this regression otherwise passes localhost testing and fails only
// in TestFlight immediately before player.play().
if (/\.\s*playbackRate\s*=/u.test(source)) {
  failures.push(
    'InteractionSoundPlayer assigns to read-only native playbackRate; use setPlaybackRate()',
  );
}
if (!/\.\s*setPlaybackRate\s*\(/u.test(source)) {
  failures.push(
    'InteractionSoundPlayer must use Expo Audio setPlaybackRate() before playback',
  );
}

for (const fileName of expectedSounds) {
  const absolutePath = path.join(audioRoot, fileName);
  let bytes;
  try {
    bytes = await fs.readFile(absolutePath);
  } catch {
    failures.push(`Missing bundled interaction sound: ${fileName}`);
    continue;
  }

  inspectWave(bytes, fileName);
}

if (failures.length > 0) {
  console.error('Native interaction audio validation failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log(
    `Native interaction audio validation passed (${expectedSounds.length} bundled sounds).`,
  );
}
