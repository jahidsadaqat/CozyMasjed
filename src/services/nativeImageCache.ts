import { fromByteArray } from 'base64-js';
import * as LegacyFileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

// Version the cache when the native upload pipeline changes. TestFlight
// updates preserve Library/Caches, so a fresh folder prevents a new build from
// inheriting a same-sized but unreadable file produced by an older pipeline.
const CACHE_FOLDER = 'cozy-masjid-textures-v2';
const cacheWrites = new Map<string, Promise<string>>();
let cacheDirectoryPromise: Promise<string> | null = null;

function normalizeExtension(extension: string) {
  const normalized = extension.toLowerCase().replace(/^\./u, '');
  if (normalized === 'jpeg') return 'jpg';
  if (/^[a-z0-9]+$/u.test(normalized)) return normalized;
  return 'bin';
}

function extensionForMimeType(mimeType: string) {
  switch (mimeType.toLowerCase()) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    default:
      throw new Error(`Unsupported embedded model texture type: ${mimeType}`);
  }
}

function stableBytesKey(bytes: Uint8Array) {
  // FNV-1a gives cache files a stable, content-derived name without keeping a
  // second copy of the compressed image in memory.
  let hash = 2166136261;
  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, 16777619);
  }
  return `${(hash >>> 0).toString(16).padStart(8, '0')}-${bytes.byteLength}`;
}

function decodedBase64Length(base64: string) {
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

async function getCacheDirectory() {
  if (cacheDirectoryPromise) return cacheDirectoryPromise;

  cacheDirectoryPromise = (async () => {
    const root = LegacyFileSystem.cacheDirectory;
    if (!root) throw new Error('Expo did not provide a writable texture cache directory.');

    const directory = `${root}${CACHE_FOLDER}/`;
    const info = await LegacyFileSystem.getInfoAsync(directory);
    if (!info.exists) {
      await LegacyFileSystem.makeDirectoryAsync(directory, { intermediates: true });
    }
    return directory;
  })().catch((error) => {
    cacheDirectoryPromise = null;
    throw error;
  });

  return cacheDirectoryPromise;
}

async function cacheBase64Image(
  base64: string,
  cacheKey: string,
  extension: string,
  expectedBytes = decodedBase64Length(base64),
) {
  if (Platform.OS === 'web') {
    return `data:image/${normalizeExtension(extension)};base64,${base64}`;
  }

  const directory = await getCacheDirectory();
  const normalizedExtension = normalizeExtension(extension);
  const destination = `${directory}${cacheKey}.${normalizedExtension}`;
  const existing = cacheWrites.get(destination);
  if (existing) return existing;

  const pending = (async () => {
    const info = await LegacyFileSystem.getInfoAsync(destination);
    const existingSize = info.exists && 'size' in info ? info.size : 0;
    if (!info.exists || existingSize !== expectedBytes) {
      await LegacyFileSystem.writeAsStringAsync(destination, base64, {
        encoding: LegacyFileSystem.EncodingType.Base64,
      });

      const written = await LegacyFileSystem.getInfoAsync(destination);
      const writtenSize = written.exists && 'size' in written ? written.size : 0;
      if (!written.exists || writtenSize !== expectedBytes) {
        throw new Error(
          `Native texture cache write was incomplete (${writtenSize}/${expectedBytes} bytes).`,
        );
      }
    }
    return destination;
  })().catch((error) => {
    cacheWrites.delete(destination);
    throw error;
  });

  cacheWrites.set(destination, pending);
  return pending;
}

export async function cacheEmbeddedModelTexture(bytes: Uint8Array, mimeType: string) {
  const extension = extensionForMimeType(mimeType);
  return cacheBase64Image(
    fromByteArray(bytes),
    `model-${stableBytesKey(bytes)}`,
    extension,
    bytes.byteLength,
  );
}
