import { useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three-stdlib';

export function useModelGLTF(asset: number) {
  // Optimized app assets are decoded at build time. Keeping them free of
  // EXT_meshopt_compression avoids a WebAssembly requirement in native Hermes.
  return useLoader(GLTFLoader, asset as unknown as string);
}
