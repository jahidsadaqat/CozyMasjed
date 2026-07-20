import { useFrame } from '@react-three/fiber/native';
import { useRef } from 'react';
import * as THREE from 'three';
import { useRoomStore } from '../store/roomStore';
import type { BackgroundId } from '../theme/backgrounds';

const SNOW_COUNT = 60;
const SNOW_TOP = 3;
const MAX_FRAME_DELTA = 0.05;
const SNOW_BACKGROUNDS: ReadonlySet<BackgroundId> = new Set([
  'midnight-aurora',
  'ramadan-twilight',
]);

type SnowData = {
  positions: Float32Array;
  baseX: Float32Array;
  baseZ: Float32Array;
  fallSpeed: Float32Array;
  phase: Float32Array;
  swaySpeed: Float32Array;
};

function makeRandom(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 0x100000000;
  };
}

function createSnowData(): SnowData {
  const random = makeRandom(0x5a0f1a11);
  const positions = new Float32Array(SNOW_COUNT * 3);
  const baseX = new Float32Array(SNOW_COUNT);
  const baseZ = new Float32Array(SNOW_COUNT);
  const fallSpeed = new Float32Array(SNOW_COUNT);
  const phase = new Float32Array(SNOW_COUNT);
  const swaySpeed = new Float32Array(SNOW_COUNT);

  for (let index = 0; index < SNOW_COUNT; index += 1) {
    baseX[index] = (random() - 0.5) * 4.8;
    baseZ[index] = (random() - 0.5) * 4.8;
    fallSpeed[index] = 0.08 + random() * 0.1;
    phase[index] = random() * Math.PI * 2;
    swaySpeed[index] = 0.35 + random() * 0.45;
    const offset = index * 3;
    positions[offset] = baseX[index];
    positions[offset + 1] = random() * SNOW_TOP;
    positions[offset + 2] = baseZ[index];
  }

  return { positions, baseX, baseZ, fallSpeed, phase, swaySpeed };
}

export function LightSnow() {
  const backgroundId = useRoomStore((state) => state.backgroundId);
  const positionAttributeRef = useRef<THREE.BufferAttribute>(null);
  const dataRef = useRef<SnowData | null>(null);
  if (!dataRef.current) dataRef.current = createSnowData();
  const data = dataRef.current;
  const visible = SNOW_BACKGROUNDS.has(backgroundId);

  useFrame((state, frameDelta) => {
    if (!visible) return;
    const delta = Math.min(frameDelta, MAX_FRAME_DELTA);
    const time = state.clock.elapsedTime;
    for (let index = 0; index < SNOW_COUNT; index += 1) {
      const offset = index * 3;
      let y = data.positions[offset + 1] - data.fallSpeed[index] * delta;
      if (y < 0) y = SNOW_TOP;
      const sway = time * data.swaySpeed[index] + data.phase[index];
      data.positions[offset] = data.baseX[index] + Math.sin(sway) * 0.09;
      data.positions[offset + 1] = y;
      data.positions[offset + 2] = data.baseZ[index] + Math.cos(sway * 0.71) * 0.035;
    }
    if (positionAttributeRef.current) positionAttributeRef.current.needsUpdate = true;
  });

  return (
    <points frustumCulled={false} visible={visible}>
      <bufferGeometry>
        <bufferAttribute
          ref={positionAttributeRef}
          attach="attributes-position"
          args={[data.positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#FFF4D6"
        depthWrite={false}
        opacity={0.6}
        size={2}
        sizeAttenuation={false}
        toneMapped={false}
        transparent
      />
    </points>
  );
}
