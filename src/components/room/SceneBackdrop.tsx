import { useThree } from '@react-three/fiber/native';
import { Asset } from 'expo-asset';
import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { useRoomStore } from '../../store/roomStore';
import { getBackgroundOption, type BackgroundId } from '../../theme/backgrounds';

const BACKGROUND_ASPECT = 941 / 1672;

function applyCoverCrop(texture: THREE.Texture, viewportAspect: number) {
  if (viewportAspect < BACKGROUND_ASPECT) {
    const visibleWidth = viewportAspect / BACKGROUND_ASPECT;
    texture.repeat.set(visibleWidth, 1);
    texture.offset.set((1 - visibleWidth) / 2, 0);
  } else {
    const visibleHeight = BACKGROUND_ASPECT / viewportAspect;
    texture.repeat.set(1, visibleHeight);
    texture.offset.set(0, (1 - visibleHeight) / 2);
  }
  texture.updateMatrix();
}

function IllustratedBackdrop({
  backgroundId,
  source,
  fallbackColor,
}: {
  backgroundId: BackgroundId;
  source: number;
  fallbackColor: string;
}) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [failed, setFailed] = useState(false);
  const fallback = useMemo(() => new THREE.Color(fallbackColor), [fallbackColor]);
  const size = useThree((state) => state.size);
  const scene = useThree((state) => state.scene);
  const invalidate = useThree((state) => state.invalidate);
  const markBackgroundReady = useRoomStore((state) => state.markBackgroundReady);

  useEffect(() => {
    let cancelled = false;
    let ownedTexture: THREE.Texture | null = null;
    let disposed = false;

    const disposeOwnedTexture = () => {
      if (!ownedTexture || disposed) return;
      if (scene.background === ownedTexture) scene.background = null;
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
        const uri = asset.localUri ?? asset.uri;
        if (!uri) throw new Error('The background asset has no readable URI.');

        ownedTexture = new THREE.TextureLoader().load(
          uri,
          (loadedTexture) => {
            if (cancelled) {
              disposeOwnedTexture();
              return;
            }
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
  }, [scene, source]);

  useLayoutEffect(() => {
    if (!texture) return;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.needsUpdate = true;
  }, [texture]);

  useLayoutEffect(() => {
    const background = texture ?? fallback;
    if (texture) applyCoverCrop(texture, size.width / Math.max(1, size.height));

    scene.background = background;
    invalidate();

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
      if (scene.background === background) scene.background = null;
    };
  }, [backgroundId, failed, fallback, invalidate, markBackgroundReady, scene, size.height, size.width, texture]);

  return null;
}

export function SceneBackdrop({ backgroundId }: { backgroundId: BackgroundId }) {
  const option = getBackgroundOption(backgroundId);
  return (
    <IllustratedBackdrop
      key={backgroundId}
      backgroundId={backgroundId}
      fallbackColor={option.fallbackColor}
      source={option.source}
    />
  );
}
