import { useFrame, useThree } from '@react-three/fiber/native';
import { Asset } from 'expo-asset';
import { Platform } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { createNativeFileTexture } from '../services/nativeTexture';
import type { GlowType } from './lightingManifest';

const glowTextures = {
  omni: require('../../assets/textures/glow/glow-radial-256.png'),
  floor_pool: require('../../assets/textures/glow/glow-pool-256.png'),
  wall_wash: require('../../assets/textures/glow/glow-cone-256.png'),
} as const;

const sharedGlowTextures = new Map<GlowType, THREE.Texture>();
const sharedGlowTexturePromises = new Map<GlowType, Promise<THREE.Texture>>();

type GlowQuadProps = {
  type: GlowType;
  position: [number, number, number];
  radius: number;
  color: string;
  opacity: number;
};

const noRaycast = () => undefined;

function configureGlowTexture(texture: THREE.Texture) {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
}

function loadGlowTexture(type: GlowType) {
  const cached = sharedGlowTextures.get(type);
  if (cached) return Promise.resolve(cached);

  const pending = sharedGlowTexturePromises.get(type);
  if (pending) return pending;

  const promise = Asset.fromModule(glowTextures[type])
    .downloadAsync()
    .then(
      (asset) =>
        new Promise<THREE.Texture>((resolve, reject) => {
          const uri = asset.localUri ?? asset.uri;
          if (!uri) {
            reject(new Error(`Glow texture ${type} has no readable URI.`));
            return;
          }

          if (Platform.OS !== 'web') {
            if (!asset.localUri) {
              reject(
                new Error(`Glow texture ${type} did not resolve to file://.`),
              );
              return;
            }
            const texture = createNativeFileTexture(asset.localUri, 256, 256);
            configureGlowTexture(texture);
            resolve(texture);
            return;
          }

          new THREE.TextureLoader().load(
            uri,
            (texture) => {
              configureGlowTexture(texture);
              resolve(texture);
            },
            undefined,
            reject,
          );
        }),
    )
    .then((texture) => {
      sharedGlowTextures.set(type, texture);
      sharedGlowTexturePromises.delete(type);
      return texture;
    })
    .catch((error) => {
      sharedGlowTexturePromises.delete(type);
      throw error;
    });

  sharedGlowTexturePromises.set(type, promise);
  return promise;
}

function useGlowTexture(type: GlowType) {
  const invalidate = useThree((state) => state.invalidate);
  const [texture, setTexture] = useState<THREE.Texture | null>(
    () => sharedGlowTextures.get(type) ?? null,
  );

  useEffect(() => {
    let cancelled = false;
    loadGlowTexture(type)
      .then((loaded) => {
        if (cancelled) return;
        setTexture(loaded);
        invalidate();
      })
      .catch((error) => {
        console.warn(`[Cozy Masjid] Could not load glow texture ${type}.`, error);
      });

    return () => {
      cancelled = true;
    };
  }, [invalidate, type]);

  return texture;
}

export function GlowQuad({
  type,
  position,
  radius,
  color,
  opacity,
}: GlowQuadProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const texture = useGlowTexture(type);

  useFrame(({ camera }) => {
    if (type !== 'omni' || !meshRef.current) return;
    const parentQuaternion = meshRef.current.parent?.getWorldQuaternion(
      new THREE.Quaternion(),
    );
    if (!parentQuaternion) {
      meshRef.current.quaternion.copy(camera.quaternion);
      return;
    }
    meshRef.current.quaternion
      .copy(parentQuaternion.invert())
      .multiply(camera.quaternion);
  });

  const resolvedPosition: [number, number, number] =
    type === 'floor_pool'
      ? [position[0], 0.022, position[2]]
      : type === 'wall_wash'
        ? [position[0], position[1], position[2] + 0.022]
        : position;
  const rotation: [number, number, number] =
    type === 'floor_pool' ? [-Math.PI / 2, 0, 0] : [0, 0, 0];
  const scaleX = type === 'wall_wash' ? radius * 1.35 : radius;
  const scaleY = type === 'floor_pool' ? radius * 0.58 : radius;

  if (!texture) return null;

  return (
    <mesh
      ref={meshRef}
      position={resolvedPosition}
      rotation={rotation}
      raycast={noRaycast}
      renderOrder={999}
      scale={[scaleX, scaleY, 1]}
    >
      <planeGeometry args={[2, 2]} />
      <meshBasicMaterial
        map={texture}
        color={color}
        transparent
        opacity={opacity}
        depthWrite={false}
        depthTest
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  );
}
