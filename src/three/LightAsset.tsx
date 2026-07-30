import { useFrame, useThree } from '@react-three/fiber/native';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { BakhoorSmoke } from './BakhoorSmoke';
import { GlowQuad } from './GlowQuad';
import type {
  GlowDefinition,
  LightingManifestEntry,
} from './lightingManifest';

const FLICKER_FPS = 12;

function pseudoNoise(value: number) {
  const first = Math.sin(value * 1.71) * 0.58;
  const second = Math.sin(value * 2.93 + 1.7) * 0.29;
  const third = Math.sin(value * 5.17 + 0.4) * 0.13;
  return first + second + third;
}

function glowPositions(
  entry: LightingManifestEntry,
  glow: GlowDefinition,
): [number, number, number][] {
  const origin = entry.lightOrigin ?? [0, 0, 0];
  if (!entry.strip || glow.type !== 'omni') return [origin];

  return Array.from({ length: entry.strip.bulbCount }, (_, index) => {
    const progress =
      entry.strip!.bulbCount === 1 ? 0.5 : index / (entry.strip!.bulbCount - 1);
    const x = (progress - 0.5) * entry.strip!.spanM;
    const sag = 4 * entry.strip!.sagM * progress * (1 - progress);
    return [origin[0] + x, origin[1] - sag, origin[2]];
  });
}

export function LightAssetEffects({
  entry,
  active,
  intensity = 1,
}: {
  entry: LightingManifestEntry | null;
  active: boolean;
  intensity?: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const invalidate = useThree((state) => state.invalidate);
  const opacityByMaterial = useRef(new Map<string, number>());
  const glows = useMemo(
    () =>
      entry?.glow.flatMap((glow) =>
        glowPositions(entry, glow).map((position, index) => ({
          ...glow,
          position,
          key: `${glow.type}-${index}`,
        })),
      ) ?? [],
    [entry],
  );

  useEffect(() => {
    if (!active || !entry?.flicker) return;
    const timer = setInterval(invalidate, 1000 / FLICKER_FPS);
    return () => clearInterval(timer);
  }, [active, entry?.flicker, invalidate]);

  useFrame(({ clock }) => {
    if (!active || !entry?.flicker || !groupRef.current) return;
    const phase = clock.elapsedTime * entry.flicker.hz * Math.PI * 2;
    const wave =
      entry.flicker.noise === 'sine' ? Math.sin(phase) : pseudoNoise(phase);
    const multiplier = 1 + wave * entry.flicker.amplitude;
    groupRef.current.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const material = object.material;
      if (!(material instanceof THREE.MeshBasicMaterial)) return;
      const base =
        opacityByMaterial.current.get(material.uuid) ?? material.opacity;
      opacityByMaterial.current.set(material.uuid, base);
      material.opacity = THREE.MathUtils.clamp(base * multiplier, 0, 1);
    });
  });

  if (!entry?.emitter) return null;

  return (
    <>
      {entry.smoke ? <BakhoorSmoke smoke={entry.smoke} /> : null}
      <group ref={groupRef} visible={active}>
        {glows.map((glow) => (
          <GlowQuad
            key={glow.key}
            type={glow.type}
            position={glow.position as [number, number, number]}
            radius={glow.radius}
            color={glow.color}
            opacity={glow.opacity * intensity}
          />
        ))}
      </group>
    </>
  );
}
