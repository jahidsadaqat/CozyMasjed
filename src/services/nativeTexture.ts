import * as THREE from 'three';

type NativeTextureMetadata = {
  width: number;
  height: number;
};

const nativeTextureMetadata = new Map<string, NativeTextureMetadata>();

export const NATIVE_MODEL_TEXTURE_PATTERN =
  /^file:\/\/.*\/cozy-masjid-textures-v2\/model-.*\.(?:jpe?g|png)$/iu;

export function readNativeImageSize(bytes: Uint8Array, mimeType: string) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  if (mimeType === 'image/png') {
    if (
      bytes.byteLength < 24 ||
      view.getUint32(0, false) !== 0x89504e47 ||
      view.getUint32(4, false) !== 0x0d0a1a0a
    ) {
      throw new Error('Embedded native texture is not a valid PNG.');
    }
    return {
      width: view.getUint32(16, false),
      height: view.getUint32(20, false),
    };
  }

  if (mimeType === 'image/jpeg') {
    if (bytes.byteLength < 4 || view.getUint16(0, false) !== 0xffd8) {
      throw new Error('Embedded native texture is not a valid JPEG.');
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
        return {
          width: view.getUint16(offset + 7, false),
          height: view.getUint16(offset + 5, false),
        };
      }

      if (
        marker === 0xd8 ||
        marker === 0xd9 ||
        (marker >= 0xd0 && marker <= 0xd7)
      ) {
        offset += 2;
        continue;
      }

      const segmentLength = view.getUint16(offset + 2, false);
      if (segmentLength < 2) break;
      offset += 2 + segmentLength;
    }

    throw new Error('Embedded native JPEG has no readable size marker.');
  }

  throw new Error(`Unsupported native texture MIME type: ${mimeType}`);
}

/**
 * Expo GL accepts image pixels as an object shaped like `{ localUri }`. A
 * DataTexture forces Three to pass that object to texImage2D without a DOM
 * Image or React Native Image.getSize round-trip.
 */
export function createNativeFileTexture(
  uri: string,
  width: number,
  height: number,
) {
  if (!uri.startsWith('file://')) {
    throw new Error(`Expo GL native textures require a file:// URI: ${uri}`);
  }

  const texture = new THREE.DataTexture();
  texture.image = {
    data: { localUri: uri },
    width,
    height,
  } as unknown as THREE.DataTexture['image'];
  texture.flipY = true;
  texture.needsUpdate = true;
  return texture;
}

export function registerNativeTexture(
  uri: string,
  metadata: NativeTextureMetadata,
) {
  nativeTextureMetadata.set(uri, metadata);
}

/** Loader selected by GLTFLoader's LoadingManager for extracted model maps. */
export class NativeFileTextureLoader extends THREE.Loader {
  override load(
    url: string,
    onLoad?: (texture: THREE.DataTexture) => void,
    _onProgress?: (event: ProgressEvent) => void,
    onError?: (error: unknown) => void,
  ) {
    const metadata = nativeTextureMetadata.get(url);
    const placeholder = new THREE.DataTexture();
    this.manager.itemStart(url);

    queueMicrotask(() => {
      if (!metadata) {
        const error = new Error(`Native texture metadata was not registered: ${url}`);
        onError?.(error);
        this.manager.itemError(url);
        this.manager.itemEnd(url);
        return;
      }

      const texture = createNativeFileTexture(url, metadata.width, metadata.height);
      onLoad?.(texture);
      this.manager.itemEnd(url);
    });

    return placeholder;
  }
}
