import { useFrame } from '@react-three/fiber/native';
import { useRef } from 'react';
import * as THREE from 'three';
import { useRoomStore } from '../store/roomStore';
import {
  WINDOW_LIGHT_LENGTH,
  WINDOW_LIGHT_MIDPOINT,
  WINDOW_LIGHT_QUATERNION,
} from './windowLight';

const DUST_COUNT = 40;
const HALF_BEAM_LENGTH = WINDOW_LIGHT_LENGTH / 2;
const MAX_FRAME_DELTA = 0.05;

type DustData = {
  positions: Float32Array;
  baseX: Float32Array;
  baseZ: Float32Array;
  driftSpeed: Float32Array;
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

function createDustData(): DustData {
  const random = makeRandom(0xdee4d057);
  const positions = new Float32Array(DUST_COUNT * 3);
  const baseX = new Float32Array(DUST_COUNT);
  const baseZ = new Float32Array(DUST_COUNT);
  const driftSpeed = new Float32Array(DUST_COUNT);
  const phase = new Float32Array(DUST_COUNT);
  const swaySpeed = new Float32Array(DUST_COUNT);

  for (let index = 0; index < DUST_COUNT; index += 1) {
    baseX[index] = (random() - 0.5) * 0.62;
    baseZ[index] = (random() - 0.5) * 0.1;
    driftSpeed[index] = 0.02 + random() * 0.03;
    phase[index] = random() * Math.PI * 2;
    swaySpeed[index] = 0.45 + random() * 0.55;
    const offset = index * 3;
    positions[offset] = baseX[index];
    positions[offset + 1] = -HALF_BEAM_LENGTH + random() * WINDOW_LIGHT_LENGTH;
    positions[offset + 2] = baseZ[index];
  }

  return { positions, baseX, baseZ, driftSpeed, phase, swaySpeed };
}

export function DustMotes() {
  const lighting = useRoomStore((state) => state.lighting);
  const positionAttributeRef = useRef<THREE.BufferAttribute>(null);
  const dataRef = useRef<DustData | null>(null);
  if (!dataRef.current) dataRef.current = createDustData();
  const data = dataRef.current;
  const visible = lighting === 'day';

  useFrame((state, frameDelta) => {
    if (!visible) return;
    const delta = Math.min(frameDelta, MAX_FRAME_DELTA);
    const time = state.clock.elapsedTime;
    for (let index = 0; index < DUST_COUNT; index += 1) {
      const offset = index * 3;
      let y = data.positions[offset + 1] + data.driftSpeed[index] * delta;
      if (y > HALF_BEAM_LENGTH) y = -HALF_BEAM_LENGTH;
      const sway = time * data.swaySpeed[index] + data.phase[index];
      data.positions[offset] = data.baseX[index] + Math.sin(sway) * 0.028;
      data.positions[offset + 1] = y;
      data.positions[offset + 2] = data.baseZ[index] + Math.cos(sway * 0.83) * 0.012;
    }
    if (positionAttributeRef.current) positionAttributeRef.current.needsUpdate = true;
  });

  return (
    <points
      frustumCulled={false}
      position={WINDOW_LIGHT_MIDPOINT}
      quaternion={WINDOW_LIGHT_QUATERNION}
      visible={visible}
    >
      <bufferGeometry>
        <bufferAttribute
          ref={positionAttributeRef}
          attach="attributes-position"
          args={[data.positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#FFE9B8"
        depthWrite={false}
        opacity={0.5}
        size={1.5}
        sizeAttenuation={false}
        toneMapped={false}
        transparent
      />
    </points>
  );
}
