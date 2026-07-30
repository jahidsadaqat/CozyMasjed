import { useFrame, useThree } from '@react-three/fiber/native';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { SmokeDefinition } from './lightingManifest';

const SMOKE_FPS = 12;
const PUFF_COUNT = 5;
const noRaycast = () => undefined;

export function BakhoorSmoke({ smoke }: { smoke: SmokeDefinition }) {
  const groupRef = useRef<THREE.Group>(null);
  const invalidate = useThree((state) => state.invalidate);
  const phases = useMemo(
    () =>
      Array.from({ length: PUFF_COUNT }, (_, index) => ({
        phase: index / PUFF_COUNT,
        sway: 0.78 + (index % 3) * 0.14,
      })),
    [],
  );

  useEffect(() => {
    const timer = setInterval(invalidate, 1000 / SMOKE_FPS);
    invalidate();
    return () => clearInterval(timer);
  }, [invalidate]);

  useFrame(({ clock }) => {
    const group = groupRef.current;
    if (!group) return;

    phases.forEach(({ phase, sway }, index) => {
      const puff = group.children[index];
      if (!(puff instanceof THREE.Mesh)) return;
      const progress = (clock.elapsedTime * 0.16 + phase) % 1;
      const fade = Math.sin(progress * Math.PI) ** 1.35;
      const horizontal =
        Math.sin(progress * Math.PI * 2.4 + phase * 8) *
        smoke.radiusM *
        sway;
      const depth =
        Math.cos(progress * Math.PI * 1.8 + phase * 5) *
        smoke.radiusM *
        0.42;
      const puffScale = smoke.radiusM * (0.42 + progress * 1.12);

      puff.position.set(
        smoke.origin[0] + horizontal,
        smoke.origin[1] + progress * smoke.heightM,
        smoke.origin[2] + depth,
      );
      puff.scale.set(
        puffScale,
        puffScale * (1.35 + progress * 0.35),
        puffScale * 0.72,
      );

      const material = puff.material;
      if (material instanceof THREE.MeshBasicMaterial) {
        material.opacity = 0.16 * fade;
      }
    });
  });

  return (
    <group ref={groupRef}>
      {phases.map(({ phase }) => (
        <mesh
          key={phase}
          raycast={noRaycast}
          renderOrder={8}
          frustumCulled={false}
        >
          <sphereGeometry args={[1, 10, 8]} />
          <meshBasicMaterial
            color="#BDB8B2"
            depthWrite={false}
            opacity={0}
            toneMapped={false}
            transparent
          />
        </mesh>
      ))}
    </group>
  );
}
