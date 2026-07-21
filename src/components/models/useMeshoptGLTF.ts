import { useLoader } from '@react-three/fiber';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { GLTFLoader } from 'three-stdlib';

export function useMeshoptGLTF(asset: number) {
  return useLoader(
    GLTFLoader,
    asset as unknown as string,
    (loader) => loader.setMeshoptDecoder(MeshoptDecoder),
  );
}
