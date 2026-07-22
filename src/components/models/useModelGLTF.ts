import { useLoader } from '@react-three/fiber/native';
import { Asset } from 'expo-asset';
import { use } from 'react';

import { NativeGLTFLoader } from './NativeGLTFLoader';

type ModelAssetModule = number | string;

const modelUriPromises = new Map<ModelAssetModule, Promise<string>>();

async function resolveModelUri(assetModule: ModelAssetModule) {
  const [asset] = await Asset.loadAsync(assetModule);
  const uri = asset.localUri ?? asset.uri;

  if (typeof uri !== 'string' || uri.length === 0) {
    throw new Error(`Could not resolve model asset "${String(assetModule)}" to a URI.`);
  }

  return uri;
}

function getModelUriPromise(assetModule: ModelAssetModule) {
  const cached = modelUriPromises.get(assetModule);
  if (cached) return cached;

  const pending = resolveModelUri(assetModule).catch((error) => {
    // A transient cache/download failure should be retryable after the error
    // boundary remounts the room.
    modelUriPromises.delete(assetModule);
    throw error;
  });

  modelUriPromises.set(assetModule, pending);
  return pending;
}

export function useModelGLTF(assetModule: ModelAssetModule) {
  // Metro's require(...) returns an opaque numeric module ID on native. Three's
  // loaders only accept URL strings, so Expo must first resolve/download that
  // ID to a local file URI. React.use keeps that asynchronous step Suspense-safe.
  const uri = use(getModelUriPromise(assetModule));

  // Optimized app assets are decoded at build time. Keeping them free of
  // EXT_meshopt_compression avoids a WebAssembly requirement in native Hermes.
  return useLoader(NativeGLTFLoader, uri);
}
