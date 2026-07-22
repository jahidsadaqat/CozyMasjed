import { toByteArray } from 'base64-js';
import { File } from 'expo-file-system';
import { Platform } from 'react-native';
import { LoaderUtils } from 'three';
import {
  GLTFLoader,
  type GLTF,
} from 'three/addons/loaders/GLTFLoader.js';

const GLB_MAGIC = 0x46546c67;
const GLB_VERSION = 2;
const GLB_HEADER_BYTES = 12;

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

    const resourcePath =
      this.resourcePath !== ''
        ? this.resourcePath
        : this.path !== ''
          ? LoaderUtils.resolveURL(LoaderUtils.extractUrlBase(url), this.path)
          : LoaderUtils.extractUrlBase(url);

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
      .then((base64) => {
        const bytes = toByteArray(base64);
        const data =
          bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength
            ? (bytes.buffer as ArrayBuffer)
            : (bytes.buffer.slice(
                bytes.byteOffset,
                bytes.byteOffset + bytes.byteLength,
              ) as ArrayBuffer);

        validateGlb(data, url);

        this.parse(
          data,
          resourcePath,
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
