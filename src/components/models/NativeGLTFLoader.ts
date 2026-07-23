import { toByteArray } from 'base64-js';
import { File } from 'expo-file-system';
import { Platform } from 'react-native';
import {
  GLTFLoader,
  type GLTF,
} from 'three/addons/loaders/GLTFLoader.js';
import { LoadingManager } from 'three';
import { cacheEmbeddedModelTexture } from '../../services/nativeImageCache';
import {
  NATIVE_MODEL_TEXTURE_PATTERN,
  NativeFileTextureLoader,
  readNativeImageSize,
  registerNativeTexture,
} from '../../services/nativeTexture';

const GLB_MAGIC = 0x46546c67;
const GLB_VERSION = 2;
const GLB_HEADER_BYTES = 12;
const GLB_CHUNK_HEADER_BYTES = 8;
const GLB_JSON_CHUNK = 0x4e4f534a;
const GLB_BIN_CHUNK = 0x004e4942;

function validateGlb(data: ArrayBuffer, url: string) {
  if (data.byteLength < GLB_HEADER_BYTES) {
    throw new Error(`Truncated native GLB asset (${data.byteLength} bytes): ${url}`);
  }

  const header = new DataView(data, 0, GLB_HEADER_BYTES);
  if (header.getUint32(0, true) !== GLB_MAGIC) {
    throw new Error(`Invalid GLB header in native model asset: ${url}`);
  }

  const version = header.getUint32(4, true);
  if (version !== GLB_VERSION) {
    throw new Error(`Unsupported GLB version ${version} in native model asset: ${url}`);
  }

  const declaredLength = header.getUint32(8, true);
  if (declaredLength !== data.byteLength) {
    throw new Error(
      `Incomplete native GLB asset (${data.byteLength}/${declaredLength} bytes): ${url}`,
    );
  }
}

type GlbImageDefinition = {
  bufferView?: number;
  mimeType?: string;
  uri?: string;
};

type GlbJson = {
  bufferViews?: Array<{
    buffer?: number;
    byteLength: number;
    byteOffset?: number;
  }>;
  images?: GlbImageDefinition[];
};

/**
 * GLTFLoader turns embedded GLB images into blob: URLs. R3F Native's blob
 * bridge reads those binary blobs as text on iOS, so texture failures are
 * swallowed by GLTFLoader and every textured material falls back to white.
 *
 * Extract each embedded image to Expo's writable cache and replace only the
 * JSON image reference. Geometry stays in the original BIN chunk. Parsing with
 * an empty resource path then lets TextureLoader receive the absolute cache
 * file:// URI unchanged.
 */
async function prepareEmbeddedTextures(data: ArrayBuffer, url: string) {
  const view = new DataView(data);
  const jsonChunkLength = view.getUint32(GLB_HEADER_BYTES, true);
  const jsonChunkType = view.getUint32(GLB_HEADER_BYTES + 4, true);
  if (jsonChunkType !== GLB_JSON_CHUNK) {
    throw new Error(`Native GLB is missing its leading JSON chunk: ${url}`);
  }

  const jsonStart = GLB_HEADER_BYTES + GLB_CHUNK_HEADER_BYTES;
  const jsonEnd = jsonStart + jsonChunkLength;
  if (jsonEnd > data.byteLength) {
    throw new Error(`Native GLB JSON chunk exceeds the file bounds: ${url}`);
  }

  const jsonText = new TextDecoder()
    .decode(new Uint8Array(data, jsonStart, jsonChunkLength))
    .replace(/[\u0000\u0020]+$/u, '');
  const json = JSON.parse(jsonText) as GlbJson;
  const images = json.images ?? [];
  const embeddedImages = images.filter((image) => image.bufferView !== undefined);
  if (embeddedImages.length === 0) return data;

  const binChunkHeader = jsonEnd;
  if (
    binChunkHeader + GLB_CHUNK_HEADER_BYTES > data.byteLength ||
    view.getUint32(binChunkHeader + 4, true) !== GLB_BIN_CHUNK
  ) {
    throw new Error(`Native textured GLB is missing its BIN chunk: ${url}`);
  }

  const binLength = view.getUint32(binChunkHeader, true);
  const binStart = binChunkHeader + GLB_CHUNK_HEADER_BYTES;
  if (binStart + binLength > data.byteLength) {
    throw new Error(`Native GLB BIN chunk exceeds the file bounds: ${url}`);
  }

  await Promise.all(
    images.map(async (image, imageIndex) => {
      if (image.bufferView === undefined) return;
      if (!image.mimeType) {
        throw new Error(`Embedded model texture ${imageIndex} has no MIME type: ${url}`);
      }

      const bufferView = json.bufferViews?.[image.bufferView];
      if (!bufferView || (bufferView.buffer ?? 0) !== 0) {
        throw new Error(`Embedded model texture ${imageIndex} has an invalid buffer view: ${url}`);
      }

      const byteOffset = bufferView.byteOffset ?? 0;
      const imageStart = binStart + byteOffset;
      const imageEnd = imageStart + bufferView.byteLength;
      if (imageStart < binStart || imageEnd > binStart + binLength) {
        throw new Error(`Embedded model texture ${imageIndex} exceeds the BIN chunk: ${url}`);
      }

      const imageBytes = new Uint8Array(data, imageStart, bufferView.byteLength);
      const metadata = readNativeImageSize(imageBytes, image.mimeType);
      image.uri = await cacheEmbeddedModelTexture(imageBytes, image.mimeType);
      registerNativeTexture(image.uri, metadata);
      delete image.bufferView;
    }),
  );

  const encodedJson = new TextEncoder().encode(JSON.stringify(json));
  const paddedJsonLength = Math.ceil(encodedJson.byteLength / 4) * 4;
  const trailingChunks = new Uint8Array(data, jsonEnd);
  const preparedLength =
    GLB_HEADER_BYTES + GLB_CHUNK_HEADER_BYTES + paddedJsonLength + trailingChunks.byteLength;
  const prepared = new Uint8Array(preparedLength);
  const preparedView = new DataView(prepared.buffer);

  preparedView.setUint32(0, GLB_MAGIC, true);
  preparedView.setUint32(4, GLB_VERSION, true);
  preparedView.setUint32(8, preparedLength, true);
  preparedView.setUint32(GLB_HEADER_BYTES, paddedJsonLength, true);
  preparedView.setUint32(GLB_HEADER_BYTES + 4, GLB_JSON_CHUNK, true);
  prepared.set(encodedJson, GLB_HEADER_BYTES + GLB_CHUNK_HEADER_BYTES);
  prepared.fill(
    0x20,
    GLB_HEADER_BYTES + GLB_CHUNK_HEADER_BYTES + encodedJson.byteLength,
    GLB_HEADER_BYTES + GLB_CHUNK_HEADER_BYTES + paddedJsonLength,
  );
  prepared.set(
    trailingChunks,
    GLB_HEADER_BYTES + GLB_CHUNK_HEADER_BYTES + paddedJsonLength,
  );

  return prepared.buffer;
}

/**
 * Loads the root GLB with Expo's native binary file API.
 *
 * R3F's native FileLoader converts a file to a Buffer and passes the Buffer's
 * whole backing ArrayBuffer to Three. A Buffer may be a view into that backing
 * store, so the GLB can begin at a non-zero byteOffset. Three then misses the
 * `glTF` header and attempts to parse unrelated bytes as JSON. Reading through
 * Expo FileSystem's iOS bytes()/arrayBuffer() path incorrectly requests write
 * permission in SDK 57, which bundled app assets do not have. base64() uses
 * read permission; decoding it and slicing the resulting view by its own
 * byteOffset and byteLength produces the exact ArrayBuffer Three expects.
 */
export class NativeGLTFLoader extends GLTFLoader {
  constructor(manager?: LoadingManager) {
    // R3F constructs loaders without a manager. Keep this native-only handler
    // isolated instead of registering it on Three's global DefaultLoadingManager.
    super(manager ?? new LoadingManager());
    this.manager.addHandler(
      NATIVE_MODEL_TEXTURE_PATTERN,
      new NativeFileTextureLoader(this.manager),
    );
  }

  override load(
    url: string,
    onLoad: (gltf: GLTF) => void,
    onProgress?: (event: ProgressEvent) => void,
    onError?: (error: unknown) => void,
  ): void {
    if (Platform.OS === 'web') {
      super.load(url, onLoad, onProgress, onError);
      return;
    }

    this.manager.itemStart(url);

    const fail = (reason: unknown) => {
      const error =
        reason instanceof Error ? reason : new Error(String(reason));

      if (onError) onError(error);
      else console.error(error);

      this.manager.itemError(url);
      this.manager.itemEnd(url);
    };

    new File(url)
      .base64()
      .then(async (base64) => {
        const bytes = toByteArray(base64);
        const data =
          bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength
            ? (bytes.buffer as ArrayBuffer)
            : (bytes.buffer.slice(
                bytes.byteOffset,
                bytes.byteOffset + bytes.byteLength,
              ) as ArrayBuffer);

        validateGlb(data, url);
        const preparedData = await prepareEmbeddedTextures(data, url);

        this.parse(
          preparedData,
          // Native app models are verified as self-contained GLBs. An empty
          // path preserves the absolute file:// texture cache URIs above.
          '',
          (gltf) => {
            onLoad(gltf);
            this.manager.itemEnd(url);
          },
          fail,
        );
      })
      .catch(fail);
  }
}
