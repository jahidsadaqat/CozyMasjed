import { useThree } from '@react-three/fiber/native';
import { Asset } from 'expo-asset';
import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import * as THREE from 'three';
import type { WeatherMode } from '../../domain/weather';
import { weatherVisualProfiles } from '../../domain/weather';
import { useRoomStore } from '../../store/roomStore';
import { getBackgroundOption, type BackgroundId } from '../../theme/backgrounds';
import { createNativeFileTexture } from '../../services/nativeTexture';

const BACKGROUND_ASPECT = 941 / 1672;
const ignoreRaycast = () => undefined;

const BACKGROUND_VERTEX_SHADER = `
  varying vec2 vBackdropUv;
  uniform vec2 uUvScale;
  uniform vec2 uUvOffset;

  void main() {
    vBackdropUv = uv * uUvScale + uUvOffset;
    gl_Position = vec4(position.xy, 0.9999, 1.0);
  }
`;

const BACKGROUND_FRAGMENT_SHADER = `
  varying vec2 vBackdropUv;
  uniform sampler2D uBackdrop;
  uniform float uHasTexture;
  uniform vec3 uFallbackColor;
  uniform vec3 uTint;
  uniform float uTintMix;
  uniform float uExposure;
  uniform float uSaturation;

  void main() {
    vec3 sampledColor = texture2D(uBackdrop, vBackdropUv).rgb;
    vec3 color = mix(uFallbackColor, sampledColor, uHasTexture);
    float luminance = dot(color, vec3(0.2126, 0.7152, 0.0722));
    color = mix(vec3(luminance), color, uSaturation);
    color *= uExposure;
    color = mix(color, uTint, uTintMix);
    gl_FragColor = vec4(clamp(color, 0.0, 1.0), uHasTexture);
    #include <colorspace_fragment>
  }
`;

function createFallbackTexture() {
  const texture = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

const fallbackTexture = createFallbackTexture();

function configureBackdropTexture(texture: THREE.Texture) {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
}

function IllustratedBackdrop({
  backgroundId,
  weather,
  source,
  fallbackColor,
}: {
  backgroundId: BackgroundId;
  weather: WeatherMode;
  source: number;
  fallbackColor: string;
}) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [failed, setFailed] = useState(false);
  const size = useThree((state) => state.size);
  const scene = useThree((state) => state.scene);
  const invalidate = useThree((state) => state.invalidate);
  const markBackgroundReady = useRoomStore((state) => state.markBackgroundReady);
  const profile = weatherVisualProfiles[weather];
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        depthTest: false,
        depthWrite: false,
        fragmentShader: BACKGROUND_FRAGMENT_SHADER,
        toneMapped: false,
        uniforms: {
          uBackdrop: { value: fallbackTexture as THREE.Texture },
          uHasTexture: { value: 0 },
          uFallbackColor: { value: new THREE.Color(fallbackColor) },
          uTint: { value: new THREE.Color(profile.backgroundTint) },
          uTintMix: { value: profile.tintMix },
          uExposure: { value: profile.exposure },
          uSaturation: { value: profile.saturation },
          uUvScale: { value: new THREE.Vector2(1, 1) },
          uUvOffset: { value: new THREE.Vector2(0, 0) },
        },
        vertexShader: BACKGROUND_VERTEX_SHADER,
      }),
    [],
  );

  useEffect(() => {
    let cancelled = false;
    let ownedTexture: THREE.Texture | null = null;
    let disposed = false;

    const disposeOwnedTexture = () => {
      if (!ownedTexture || disposed) return;
      ownedTexture.dispose();
      disposed = true;
    };

    const fail = (error: unknown) => {
      if (cancelled) return;
      disposeOwnedTexture();
      console.warn('[Deen Rooms] Could not load the selected background.', error);
      setFailed(true);
    };

    const load = async () => {
      try {
        const asset = await Asset.fromModule(source).downloadAsync();
        if (cancelled) return;
        const resolvedUri = asset.localUri ?? asset.uri;
        if (!resolvedUri) throw new Error('The background asset has no readable URI.');

        if (Platform.OS !== 'web') {
          if (!asset.localUri) {
            throw new Error('The bundled background did not resolve to a native file URI.');
          }
          ownedTexture = createNativeFileTexture(
            asset.localUri,
            asset.width || 941,
            asset.height || 1672,
          );
          configureBackdropTexture(ownedTexture);
          setTexture(ownedTexture);
          return;
        }

        ownedTexture = new THREE.TextureLoader().load(
          resolvedUri,
          (loadedTexture) => {
            if (cancelled) {
              disposeOwnedTexture();
              return;
            }
            configureBackdropTexture(loadedTexture);
            setTexture(loadedTexture);
          },
          undefined,
          fail,
        );
      } catch (error) {
        fail(error);
      }
    };

    void load();
    return () => {
      cancelled = true;
      disposeOwnedTexture();
    };
  }, [source]);

  useLayoutEffect(() => {
    scene.background = null;
    return () => {
      scene.background = null;
    };
  }, [scene]);

  useLayoutEffect(() => {
    const viewportAspect = size.width / Math.max(1, size.height);
    const scale = material.uniforms.uUvScale.value as THREE.Vector2;
    const offset = material.uniforms.uUvOffset.value as THREE.Vector2;
    if (viewportAspect < BACKGROUND_ASPECT) {
      const visibleWidth = viewportAspect / BACKGROUND_ASPECT;
      scale.set(visibleWidth, 1);
      offset.set((1 - visibleWidth) / 2, 0);
    } else {
      const visibleHeight = BACKGROUND_ASPECT / viewportAspect;
      scale.set(1, visibleHeight);
      offset.set(0, (1 - visibleHeight) / 2);
    }
    invalidate();
  }, [invalidate, material, size.height, size.width]);

  useLayoutEffect(() => {
    material.uniforms.uBackdrop.value = texture ?? fallbackTexture;
    material.uniforms.uHasTexture.value = texture ? 1 : 0;
    (material.uniforms.uFallbackColor.value as THREE.Color).set(fallbackColor);
    (material.uniforms.uTint.value as THREE.Color).set(profile.backgroundTint);
    material.uniforms.uTintMix.value = profile.tintMix;
    material.uniforms.uExposure.value = profile.exposure;
    material.uniforms.uSaturation.value = profile.saturation;
    invalidate();
  }, [fallbackColor, invalidate, material, profile, texture]);

  useEffect(() => {
    return () => material.dispose();
  }, [material]);

  useLayoutEffect(() => {
    let firstTimer: ReturnType<typeof setTimeout> | null = null;
    let secondTimer: ReturnType<typeof setTimeout> | null = null;
    if (texture || failed) {
      firstTimer = setTimeout(() => {
        invalidate();
        secondTimer = setTimeout(() => markBackgroundReady(backgroundId), 34);
      }, 34);
    }

    return () => {
      if (firstTimer) clearTimeout(firstTimer);
      if (secondTimer) clearTimeout(secondTimer);
    };
  }, [backgroundId, failed, invalidate, markBackgroundReady, texture]);

  return (
    <mesh frustumCulled={false} raycast={ignoreRaycast} renderOrder={-1000}>
      <planeGeometry args={[2, 2]} />
      <primitive attach="material" dispose={null} object={material} />
    </mesh>
  );
}

export function SceneBackdrop({ backgroundId, weather }: { backgroundId: BackgroundId; weather: WeatherMode }) {
  const option = getBackgroundOption(backgroundId);
  return (
    <IllustratedBackdrop
      key={backgroundId}
      backgroundId={backgroundId}
      fallbackColor={option.fallbackColor}
      source={option.source}
      weather={weather}
    />
  );
}
