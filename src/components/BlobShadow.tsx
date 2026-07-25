import * as THREE from 'three';
import { CELL_SIZE } from '../domain/grid';

type RadialGradientColor = {
  red: number;
  green: number;
  blue: number;
  alpha: number;
};

type BlobShadowProps = {
  footprint: {
    width: number;
    depth: number;
  };
};

const TEXTURE_SIZE = 64;
const ignoreRaycast = () => undefined;

function configureRadialTexture(texture: THREE.Texture) {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
}

export function createRadialGradientTexture(color: RadialGradientColor) {
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = TEXTURE_SIZE;
    canvas.height = TEXTURE_SIZE;
    const context = canvas.getContext('2d');
    if (context) {
      const center = TEXTURE_SIZE / 2;
      const gradient = context.createRadialGradient(center, center, 0, center, center, center);
      const rgb = `${color.red}, ${color.green}, ${color.blue}`;
      gradient.addColorStop(0, `rgba(${rgb}, ${color.alpha})`);
      gradient.addColorStop(0.38, `rgba(${rgb}, ${color.alpha * 0.76})`);
      gradient.addColorStop(0.72, `rgba(${rgb}, ${color.alpha * 0.24})`);
      gradient.addColorStop(1, `rgba(${rgb}, 0)`);
      context.fillStyle = gradient;
      context.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
      return configureRadialTexture(new THREE.CanvasTexture(canvas));
    }
  }

  // Expo GLView runs without a DOM canvas on iOS/Android. A tiny DataTexture
  // is the native-safe equivalent and keeps the same shared radial falloff.
  const pixels = new Uint8Array(TEXTURE_SIZE * TEXTURE_SIZE * 4);
  const center = (TEXTURE_SIZE - 1) / 2;
  for (let y = 0; y < TEXTURE_SIZE; y += 1) {
    for (let x = 0; x < TEXTURE_SIZE; x += 1) {
      const distance = Math.min(1, Math.hypot(x - center, y - center) / center);
      const falloff = 1 - THREE.MathUtils.smoothstep(distance, 0.08, 0.92);
      const offset = (y * TEXTURE_SIZE + x) * 4;
      pixels[offset] = color.red;
      pixels[offset + 1] = color.green;
      pixels[offset + 2] = color.blue;
      pixels[offset + 3] = Math.round(255 * color.alpha * falloff);
    }
  }
  return configureRadialTexture(
    new THREE.DataTexture(pixels, TEXTURE_SIZE, TEXTURE_SIZE, THREE.RGBAFormat),
  );
}

// Module-level singleton: every placed item shares one 64x64 texture.
const blobShadowTexture = createRadialGradientTexture({
  red: 42,
  green: 30,
  blue: 22,
  alpha: 0.68,
});

export function BlobShadow({ footprint }: BlobShadowProps) {
  const longestSide = Math.max(footprint.width, footprint.depth);
  const visualSide = Math.max(longestSide, 0.65);
  const radius = visualSide * CELL_SIZE * 0.42;
  const ratioX = THREE.MathUtils.clamp(footprint.width / longestSide, 0.55, 1);
  const ratioZ = THREE.MathUtils.clamp(footprint.depth / longestSide, 0.55, 1);
  const scaleX = radius * ratioX;
  const scaleZ = radius * ratioZ;

  return (
    <mesh
      position={[0, 0.005, 0]}
      raycast={ignoreRaycast}
      renderOrder={1}
      rotation={[-Math.PI / 2, 0, 0]}
      scale={[scaleX, scaleZ, 1]}
    >
      <circleGeometry args={[1, 24]} />
      <meshBasicMaterial
        map={blobShadowTexture}
        transparent
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}
