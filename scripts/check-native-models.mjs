import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const GLB_MAGIC = 0x46546c67;
const JSON_CHUNK = 0x4e4f534a;
const BIN_CHUNK = 0x004e4942;
const MESHOPT_EXTENSION = 'EXT_meshopt_compression';
// Expo GL 57 uploads native file:// textures through stb_image, which supports
// PNG and JPEG but not WebP. Keeping this allow-list strict prevents future
// optimized assets from silently rendering white in TestFlight.
const NATIVE_TEXTURE_TYPES = new Set(['image/jpeg', 'image/png']);
const MEBIBYTE = 1024 * 1024;
const scriptRoot = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptRoot, '..');
const modelRoot = process.argv[2]
  ? path.resolve(projectRoot, process.argv[2])
  : path.resolve(projectRoot, 'assets/models/optimized');
const sourceRoot = path.resolve(projectRoot, 'src');
const modelLoaderPath = path.resolve(
  sourceRoot,
  'components/models/useModelGLTF.ts',
);
const nativeLoaderPath = path.resolve(
  sourceRoot,
  'components/models/NativeGLTFLoader.ts',
);
const nativeTexturePath = path.resolve(
  sourceRoot,
  'services/nativeTexture.ts',
);
const backdropPath = path.resolve(
  sourceRoot,
  'components/room/SceneBackdrop.tsx',
);

async function listModels(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) return listModels(absolute);
      return entry.isFile() && entry.name.toLowerCase().endsWith('.glb')
        ? [absolute]
        : [];
    }),
  );

  return nested.flat();
}

async function listTypeScriptSources(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) return listTypeScriptSources(absolute);
      return entry.isFile() && /\.tsx?$/iu.test(entry.name) ? [absolute] : [];
    }),
  );

  return nested.flat();
}

async function checkNativeModelLoader(failures) {
  const loaderSource = await fs.readFile(modelLoaderPath, 'utf8');
  const nativeLoaderSource = await fs.readFile(nativeLoaderPath, 'utf8');
  const nativeTextureSource = await fs.readFile(nativeTexturePath, 'utf8');
  const backdropSource = await fs.readFile(backdropPath, 'utf8');
  const loaderRelativePath = path.relative(projectRoot, modelLoaderPath);
  const nativeLoaderRelativePath = path.relative(projectRoot, nativeLoaderPath);

  // Metro returns a numeric module ID for require('./model.glb') on native.
  // GLTFLoader only accepts a URL string, so every model ID must first pass
  // through Expo Asset and be downloaded/resolved to a local file URI.
  if (!/from\s+['"]expo-asset['"]/u.test(loaderSource)) {
    failures.push(
      `${loaderRelativePath}: native GLB module IDs must be resolved with expo-asset`,
    );
  }

  if (
    !/\bAsset\s*\.\s*(?:loadAsync|fromModule)\s*\(/u.test(loaderSource) &&
    !/\.\s*downloadAsync\s*\(/u.test(loaderSource)
  ) {
    failures.push(
      `${loaderRelativePath}: resolve each Metro asset ID before calling GLTFLoader`,
    );
  }

  if (!/\blocalUri\b/u.test(loaderSource)) {
    failures.push(
      `${loaderRelativePath}: pass Expo Asset.localUri to GLTFLoader on native`,
    );
  }

  if (/\basset\s+as\s+unknown\s+as\s+string\b/u.test(loaderSource)) {
    failures.push(
      `${loaderRelativePath}: a TypeScript cast does not convert Metro's numeric asset ID into a URL`,
    );
  }

  if (
    /useLoader\s*\(\s*(?:GLTFLoader|NativeGLTFLoader)\s*,\s*asset(?:\s|,|\)|as\b)/u.test(
      loaderSource,
    )
  ) {
    failures.push(
      `${loaderRelativePath}: do not pass a raw Metro asset ID to GLTFLoader`,
    );
  }

  if (!/from\s+['"]expo-file-system['"]/u.test(nativeLoaderSource)) {
    failures.push(
      `${nativeLoaderRelativePath}: native GLBs must be read with Expo FileSystem's binary API`,
    );
  }

  if (!/\.\s*base64\s*\(/u.test(nativeLoaderSource)) {
    failures.push(
      `${nativeLoaderRelativePath}: bundled iOS GLBs must use Expo File.base64() for read-only access`,
    );
  }

  if (!/\btoByteArray\s*\(/u.test(nativeLoaderSource)) {
    failures.push(
      `${nativeLoaderRelativePath}: decode the native base64 read into binary bytes before parsing`,
    );
  }

  if (/\.\s*(?:bytes|arrayBuffer)\s*\(/u.test(nativeLoaderSource)) {
    failures.push(
      `${nativeLoaderRelativePath}: Expo SDK 57 iOS bytes()/arrayBuffer() incorrectly require write access for bundled files`,
    );
  }

  if (
    !/\bbyteOffset\b/u.test(nativeLoaderSource) ||
    !/\bbyteLength\b/u.test(nativeLoaderSource)
  ) {
    failures.push(
      `${nativeLoaderRelativePath}: slice the byte view to its exact offset and length before parsing`,
    );
  }

  if (/\bBuffer\s*\.\s*from\s*\(/u.test(nativeLoaderSource)) {
    failures.push(
      `${nativeLoaderRelativePath}: do not expose a Buffer backing store to GLTFLoader`,
    );
  }

  if (
    !/from\s+['"]three\/addons\/loaders\/GLTFLoader\.js['"]/u.test(
      nativeLoaderSource,
    )
  ) {
    failures.push(
      `${nativeLoaderRelativePath}: use Three's version-matched GLTFLoader for native model textures`,
    );
  }

  if (/from\s+['"]three-stdlib['"]/u.test(nativeLoaderSource)) {
    failures.push(
      `${nativeLoaderRelativePath}: three-stdlib's WebP feature detection requires a browser Image global`,
    );
  }

  if (!/\bcacheEmbeddedModelTexture\s*\(/u.test(nativeLoaderSource)) {
    failures.push(
      `${nativeLoaderRelativePath}: embedded GLB images must be extracted before iOS GLTFLoader creates blob URLs`,
    );
  }

  if (!/delete\s+image\.bufferView/u.test(nativeLoaderSource)) {
    failures.push(
      `${nativeLoaderRelativePath}: cached native textures must replace their embedded bufferView references`,
    );
  }

  if (
    !/\bregisterNativeTexture\s*\(/u.test(nativeLoaderSource) ||
    !/\bNativeFileTextureLoader\b/u.test(nativeLoaderSource) ||
    !/\.addHandler\s*\(/u.test(nativeLoaderSource)
  ) {
    failures.push(
      `${nativeLoaderRelativePath}: extracted maps must use the native file texture handler instead of React Native Image.getSize`,
    );
  }

  if (!/super\s*\(\s*manager\s*\?\?\s*new\s+LoadingManager\s*\(\s*\)\s*\)/u.test(nativeLoaderSource)) {
    failures.push(
      `${nativeLoaderRelativePath}: keep the native texture handler off Three's global DefaultLoadingManager`,
    );
  }

  if (
    !/new\s+THREE\.DataTexture\s*\(/u.test(nativeTextureSource) ||
    !/data\s*:\s*\{\s*localUri\s*:\s*uri\s*\}/u.test(nativeTextureSource) ||
    !/\breadNativeImageSize\s*\(/u.test(nativeTextureSource)
  ) {
    failures.push(
      `${path.relative(projectRoot, nativeTexturePath)}: Expo GL textures must provide parsed dimensions and a direct { localUri } DataTexture`,
    );
  }

  if (!/\bcreateNativeFileTexture\s*\(/u.test(backdropSource)) {
    failures.push(
      `${path.relative(projectRoot, backdropPath)}: native backgrounds must bypass TextureLoader/Image.getSize`,
    );
  }

  const sourceFiles = await listTypeScriptSources(sourceRoot);
  for (const file of sourceFiles) {
    if (path.resolve(file) === modelLoaderPath) continue;

    const source = await fs.readFile(file, 'utf8');
    if (/useLoader\s*\(\s*GLTFLoader\b/u.test(source)) {
      failures.push(
        `${path.relative(projectRoot, file)}: use the centralized useModelGLTF hook so native asset IDs are resolved`,
      );
    }
  }
}

function readGlb(bytes, relativePath) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  if (bytes.byteLength < 20 || view.getUint32(0, true) !== GLB_MAGIC) {
    throw new Error(`${relativePath}: invalid GLB header`);
  }

  const declaredLength = view.getUint32(8, true);
  if (declaredLength !== bytes.byteLength) {
    throw new Error(`${relativePath}: GLB length does not match its header`);
  }

  let offset = 12;
  let json = null;
  let binary = null;
  while (offset + 8 <= bytes.byteLength) {
    const chunkLength = view.getUint32(offset, true);
    const chunkType = view.getUint32(offset + 4, true);
    const chunkStart = offset + 8;
    const chunkEnd = chunkStart + chunkLength;

    if (chunkEnd > bytes.byteLength) {
      throw new Error(`${relativePath}: GLB chunk exceeds file bounds`);
    }

    if (chunkType === JSON_CHUNK) {
      const jsonText = new TextDecoder()
        .decode(bytes.subarray(chunkStart, chunkEnd))
        .replace(/[\u0000\u0020]+$/u, '');
      json = JSON.parse(jsonText);
    } else if (chunkType === BIN_CHUNK) {
      binary = bytes.subarray(chunkStart, chunkEnd);
    }

    offset = chunkEnd;
  }

  if (!json) throw new Error(`${relativePath}: missing JSON chunk`);
  return { json, binary };
}

function readImageSize(bytes, mimeType, relativePath, imageIndex) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (mimeType === 'image/png') {
    if (
      bytes.byteLength < 24 ||
      view.getUint32(0, false) !== 0x89504e47 ||
      view.getUint32(4, false) !== 0x0d0a1a0a
    ) {
      throw new Error(`${relativePath}: image ${imageIndex} is not a valid PNG`);
    }
    return [view.getUint32(16, false), view.getUint32(20, false)];
  }

  if (mimeType === 'image/jpeg') {
    if (bytes.byteLength < 4 || view.getUint16(0, false) !== 0xffd8) {
      throw new Error(`${relativePath}: image ${imageIndex} is not a valid JPEG`);
    }

    const startOfFrameMarkers = new Set([
      0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7,
      0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
    ]);
    let offset = 2;
    while (offset + 8 < bytes.byteLength) {
      if (bytes[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      const marker = bytes[offset + 1];
      if (startOfFrameMarkers.has(marker)) {
        return [view.getUint16(offset + 7, false), view.getUint16(offset + 5, false)];
      }
      if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
        offset += 2;
        continue;
      }
      const segmentLength = view.getUint16(offset + 2, false);
      if (segmentLength < 2) break;
      offset += 2 + segmentLength;
    }
    throw new Error(`${relativePath}: image ${imageIndex} has no JPEG size marker`);
  }

  throw new Error(`${relativePath}: image ${imageIndex} has unsupported MIME type ${mimeType}`);
}

const files = (await listModels(modelRoot)).sort();
const failures = [];
let totalBytes = 0;
const textureTypeCounts = { jpeg: 0, png: 0 };

await checkNativeModelLoader(failures);

for (const file of files) {
  const relativePath = path.relative(modelRoot, file);
  const bytes = await fs.readFile(file);
  const { json, binary } = readGlb(bytes, relativePath);
  const requiredExtensions = json.extensionsRequired ?? [];
  const budget = relativePath.startsWith(`buildings${path.sep}`)
    ? 6 * MEBIBYTE
    : 2 * MEBIBYTE;

  totalBytes += bytes.byteLength;

  if (requiredExtensions.includes(MESHOPT_EXTENSION)) {
    failures.push(
      `${relativePath}: ${MESHOPT_EXTENSION} requires WebAssembly and cannot be used by native Hermes`,
    );
  }

  for (const [index, buffer] of (json.buffers ?? []).entries()) {
    if (typeof buffer.uri === 'string') {
      failures.push(
        `${relativePath}: buffer ${index} is external; native models must be self-contained GLBs`,
      );
    }
  }

  for (const [index, image] of (json.images ?? []).entries()) {
    if (typeof image.uri === 'string') {
      failures.push(
        `${relativePath}: image ${index} is external; native models must embed textures as buffer views`,
      );
    }

    if (!NATIVE_TEXTURE_TYPES.has(image.mimeType)) {
      failures.push(
        `${relativePath}: image ${index} has unsupported native texture type ${String(image.mimeType)}; Expo GL 57 requires embedded PNG or JPEG`,
      );
      continue;
    }
    if (image.mimeType === 'image/jpeg') textureTypeCounts.jpeg += 1;
    if (image.mimeType === 'image/png') textureTypeCounts.png += 1;

    const bufferView = json.bufferViews?.[image.bufferView];
    if (!binary || !Number.isInteger(image.bufferView) || !bufferView) {
      failures.push(`${relativePath}: image ${index} is not embedded in the GLB BIN chunk`);
      continue;
    }
    const byteOffset = bufferView.byteOffset ?? 0;
    const byteLength = bufferView.byteLength ?? 0;
    if ((bufferView.buffer ?? 0) !== 0 || byteOffset < 0 || byteLength <= 0 || byteOffset + byteLength > binary.byteLength) {
      failures.push(`${relativePath}: image ${index} has an invalid embedded buffer view`);
      continue;
    }

    try {
      const [width, height] = readImageSize(
        binary.subarray(byteOffset, byteOffset + byteLength),
        image.mimeType,
        relativePath,
        index,
      );
      if (width > 1024 || height > 1024) {
        failures.push(`${relativePath}: image ${index} is ${width}x${height}; native textures must not exceed 1024x1024`);
      }
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
    }
  }

  if (bytes.byteLength > budget) {
    failures.push(
      `${relativePath}: ${(bytes.byteLength / MEBIBYTE).toFixed(2)} MB exceeds the ${(budget / MEBIBYTE).toFixed(0)} MB mobile budget`,
    );
  }
}

if (files.length === 0) {
  failures.push('No GLB models were found.');
}

if (failures.length > 0) {
  console.error(`Native model preflight failed (${failures.length} issue(s)):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `Native model preflight passed: ${files.length} GLBs, ${(totalBytes / MEBIBYTE).toFixed(2)} MB, ${textureTypeCounts.jpeg} JPEG + ${textureTypeCounts.png} PNG textures at <=1024px, exact-byte native loader, no runtime Meshopt.`,
);
