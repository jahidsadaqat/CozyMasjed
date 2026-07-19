import { useLoader } from '@react-three/fiber';
import { GLTFLoader, MeshoptDecoder } from 'three-stdlib';

const meshoptDecoder = MeshoptDecoder();

export function useMeshoptGLTF(asset: number) {
  return useLoader(
    GLTFLoader,
    asset as unknown as string,
    (loader) => loader.setMeshoptDecoder(meshoptDecoder),
  );
}
