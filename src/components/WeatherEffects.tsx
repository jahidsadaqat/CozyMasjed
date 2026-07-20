import { useFrame, useThree } from '@react-three/fiber/native';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useRoomStore } from '../store/roomStore';

const RAIN_COUNT = 72;
const WIND_COUNT = 42;
const STAR_COUNT = 42;
const MAX_FRAME_DELTA = 0.05;
const STREAK_VERTICES = 6;
const STREAK_POSITION_STRIDE = STREAK_VERTICES * 3;
const STREAK_UV_STRIDE = STREAK_VERTICES * 2;
const RAIN_HALF_WIDTH_CSS = 0.9;
const WIND_HALF_WIDTH_CSS = 1;
const ignoreRaycast = () => undefined;

const CLIP_VERTEX_SHADER = `
  varying vec2 vStreakUv;

  void main() {
    vStreakUv = uv;
    gl_Position = vec4(position.xy, 0.998, 1.0);
  }
`;

const STREAK_FRAGMENT_SHADER = `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying vec2 vStreakUv;

  void main() {
    float startFade = smoothstep(0.0, 0.18, vStreakUv.x);
    float endFade = smoothstep(0.0, 0.18, 1.0 - vStreakUv.x);
    float lengthFade = startFade * endFade;
    float taperedWidth = max(0.001, lengthFade);
    float distanceFromCenter = abs(vStreakUv.y * 2.0 - 1.0);
    float sideFade = 1.0 - smoothstep(taperedWidth * 0.25, taperedWidth, distanceFromCenter);
    float alpha = uOpacity * lengthFade * sideFade;
    if (alpha < 0.002) discard;
    gl_FragColor = vec4(uColor, alpha);
    #include <colorspace_fragment>
  }
`;

const STAR_VERTEX_SHADER = `
  attribute float aSize;
  attribute float aPhase;
  uniform float uTime;
  varying float vTwinkle;

  void main() {
    float pulse = 0.82 + 0.18 * sin(uTime * 1.7 + aPhase);
    vTwinkle = 0.68 + 0.32 * sin(uTime * 1.25 + aPhase);
    gl_PointSize = aSize * pulse;
    gl_Position = vec4(position.xy, 0.998, 1.0);
  }
`;

const STAR_FRAGMENT_SHADER = `
  varying float vTwinkle;

  void main() {
    float distanceFromCenter = length(gl_PointCoord - vec2(0.5)) * 2.0;
    float alpha = (1.0 - smoothstep(0.15, 1.0, distanceFromCenter)) * vTwinkle * 0.72;
    gl_FragColor = vec4(1.0, 0.94, 0.72, alpha);
    #include <colorspace_fragment>
  }
`;

function makeRandom(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 0x100000000;
  };
}

function createStreakUvs(count: number) {
  const uvs = new Float32Array(count * STREAK_UV_STRIDE);
  for (let index = 0; index < count; index += 1) {
    const offset = index * STREAK_UV_STRIDE;
    // Two triangles: start-left, end-left, start-right / end-left, end-right, start-right.
    uvs[offset] = 0;
    uvs[offset + 1] = 0;
    uvs[offset + 2] = 1;
    uvs[offset + 3] = 0;
    uvs[offset + 4] = 0;
    uvs[offset + 5] = 1;
    uvs[offset + 6] = 1;
    uvs[offset + 7] = 0;
    uvs[offset + 8] = 1;
    uvs[offset + 9] = 1;
    uvs[offset + 10] = 0;
    uvs[offset + 11] = 1;
  }
  return uvs;
}

function writeStreakQuad(
  positions: Float32Array,
  index: number,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  viewportWidth: number,
  viewportHeight: number,
  halfWidthCss: number,
) {
  const safeWidth = Math.max(1, viewportWidth);
  const safeHeight = Math.max(1, viewportHeight);
  const directionXInPixels = (endX - startX) * safeWidth * 0.5;
  const directionYInPixels = (endY - startY) * safeHeight * 0.5;
  const inverseLength = 1 / Math.max(0.0001, Math.hypot(directionXInPixels, directionYInPixels));
  const normalXInPixels = -directionYInPixels * inverseLength;
  const normalYInPixels = directionXInPixels * inverseLength;
  const offsetX = (normalXInPixels * halfWidthCss * 2) / safeWidth;
  const offsetY = (normalYInPixels * halfWidthCss * 2) / safeHeight;

  const startLeftX = startX - offsetX;
  const startLeftY = startY - offsetY;
  const startRightX = startX + offsetX;
  const startRightY = startY + offsetY;
  const endLeftX = endX - offsetX;
  const endLeftY = endY - offsetY;
  const endRightX = endX + offsetX;
  const endRightY = endY + offsetY;
  const offset = index * STREAK_POSITION_STRIDE;

  positions[offset] = startLeftX;
  positions[offset + 1] = startLeftY;
  positions[offset + 3] = endLeftX;
  positions[offset + 4] = endLeftY;
  positions[offset + 6] = startRightX;
  positions[offset + 7] = startRightY;
  positions[offset + 9] = endLeftX;
  positions[offset + 10] = endLeftY;
  positions[offset + 12] = endRightX;
  positions[offset + 13] = endRightY;
  positions[offset + 15] = startRightX;
  positions[offset + 16] = startRightY;
}

type RainData = {
  segments: Float32Array;
  quadPositions: Float32Array;
  quadUvs: Float32Array;
  speeds: Float32Array;
};

function createRainData(): RainData {
  const random = makeRandom(0x7a11fa11);
  const segments = new Float32Array(RAIN_COUNT * 4);
  const quadPositions = new Float32Array(RAIN_COUNT * STREAK_POSITION_STRIDE);
  const quadUvs = createStreakUvs(RAIN_COUNT);
  const speeds = new Float32Array(RAIN_COUNT);

  for (let index = 0; index < RAIN_COUNT; index += 1) {
    const x = -1.12 + random() * 2.24;
    const y = -1.12 + random() * 2.4;
    const length = 0.055 + random() * 0.075;
    const slope = 0.012 + random() * 0.025;
    const offset = index * 4;
    segments[offset] = x;
    segments[offset + 1] = y;
    segments[offset + 2] = x - slope;
    segments[offset + 3] = y - length;
    speeds[index] = 0.62 + random() * 0.48;
  }

  return { segments, quadPositions, quadUvs, speeds };
}

type WindData = {
  quadPositions: Float32Array;
  quadUvs: Float32Array;
  x: Float32Array;
  baseY: Float32Array;
  lengths: Float32Array;
  rises: Float32Array;
  speeds: Float32Array;
  phases: Float32Array;
};

function createWindData(): WindData {
  const random = makeRandom(0x71ad5eed);
  const quadPositions = new Float32Array(WIND_COUNT * STREAK_POSITION_STRIDE);
  const quadUvs = createStreakUvs(WIND_COUNT);
  const x = new Float32Array(WIND_COUNT);
  const baseY = new Float32Array(WIND_COUNT);
  const lengths = new Float32Array(WIND_COUNT);
  const rises = new Float32Array(WIND_COUNT);
  const speeds = new Float32Array(WIND_COUNT);
  const phases = new Float32Array(WIND_COUNT);

  for (let index = 0; index < WIND_COUNT; index += 1) {
    x[index] = -1.15 + random() * 2.3;
    baseY[index] = -1.05 + random() * 2.1;
    lengths[index] = 0.075 + random() * 0.13;
    rises[index] = (random() - 0.5) * 0.008;
    speeds[index] = 0.16 + random() * 0.2;
    phases[index] = random() * Math.PI * 2;
  }

  return { quadPositions, quadUvs, x, baseY, lengths, rises, speeds, phases };
}

type StarData = {
  positions: Float32Array;
  sizes: Float32Array;
  phases: Float32Array;
};

function createStarData(): StarData {
  const random = makeRandom(0x57a211e5);
  const positions = new Float32Array(STAR_COUNT * 3);
  const sizes = new Float32Array(STAR_COUNT);
  const phases = new Float32Array(STAR_COUNT);

  for (let index = 0; index < STAR_COUNT; index += 1) {
    const offset = index * 3;
    positions[offset] = -0.96 + random() * 1.92;
    positions[offset + 1] = -0.92 + random() * 1.84;
    sizes[index] = 1.4 + random() * 2.2;
    phases[index] = random() * Math.PI * 2;
  }

  return { positions, sizes, phases };
}

function Rain({ active }: { active: boolean }) {
  const attributeRef = useRef<THREE.BufferAttribute>(null);
  const size = useThree((state) => state.size);
  const dataRef = useRef<RainData | null>(null);
  if (!dataRef.current) dataRef.current = createRainData();
  const data = dataRef.current;
  const uniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color('#C9E3F2') },
      uOpacity: { value: 0.34 },
    }),
    [],
  );

  useFrame((_, frameDelta) => {
    if (!active) return;
    const delta = Math.min(frameDelta, MAX_FRAME_DELTA);
    for (let index = 0; index < RAIN_COUNT; index += 1) {
      const offset = index * 4;
      const movement = data.speeds[index] * delta;
      data.segments[offset + 1] -= movement;
      data.segments[offset + 3] -= movement;
      if (data.segments[offset + 1] < -1.14) {
        data.segments[offset + 1] += 2.4;
        data.segments[offset + 3] += 2.4;
      }
      writeStreakQuad(
        data.quadPositions,
        index,
        data.segments[offset],
        data.segments[offset + 1],
        data.segments[offset + 2],
        data.segments[offset + 3],
        size.width,
        size.height,
        RAIN_HALF_WIDTH_CSS,
      );
    }
    if (attributeRef.current) attributeRef.current.needsUpdate = true;
  });

  return (
    <mesh frustumCulled={false} raycast={ignoreRaycast} renderOrder={-100} visible={active}>
      <bufferGeometry>
        <bufferAttribute
          ref={attributeRef}
          attach="attributes-position"
          args={[data.quadPositions, 3]}
          usage={THREE.DynamicDrawUsage}
        />
        <bufferAttribute attach="attributes-uv" args={[data.quadUvs, 2]} />
      </bufferGeometry>
      <shaderMaterial
        depthTest
        depthWrite={false}
        fragmentShader={STREAK_FRAGMENT_SHADER}
        toneMapped={false}
        transparent
        uniforms={uniforms}
        vertexShader={CLIP_VERTEX_SHADER}
      />
    </mesh>
  );
}

function WindStreaks({ active }: { active: boolean }) {
  const attributeRef = useRef<THREE.BufferAttribute>(null);
  const size = useThree((state) => state.size);
  const dataRef = useRef<WindData | null>(null);
  if (!dataRef.current) dataRef.current = createWindData();
  const data = dataRef.current;
  const uniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color('#52685B') },
      uOpacity: { value: 0.5 },
    }),
    [],
  );

  useFrame((state, frameDelta) => {
    if (!active) return;
    const delta = Math.min(frameDelta, MAX_FRAME_DELTA);
    const time = state.clock.elapsedTime;
    for (let index = 0; index < WIND_COUNT; index += 1) {
      let x = data.x[index] + data.speeds[index] * delta;
      if (x > 1.16) x = -1.16;
      data.x[index] = x;
      const y = data.baseY[index] + Math.sin(time * 0.85 + data.phases[index]) * 0.028;
      writeStreakQuad(
        data.quadPositions,
        index,
        x,
        y,
        x - data.lengths[index],
        y + data.rises[index],
        size.width,
        size.height,
        WIND_HALF_WIDTH_CSS,
      );
    }
    if (attributeRef.current) attributeRef.current.needsUpdate = true;
  });

  return (
    <mesh frustumCulled={false} raycast={ignoreRaycast} renderOrder={-100} visible={active}>
      <bufferGeometry>
        <bufferAttribute
          ref={attributeRef}
          attach="attributes-position"
          args={[data.quadPositions, 3]}
          usage={THREE.DynamicDrawUsage}
        />
        <bufferAttribute attach="attributes-uv" args={[data.quadUvs, 2]} />
      </bufferGeometry>
      <shaderMaterial
        depthTest
        depthWrite={false}
        fragmentShader={STREAK_FRAGMENT_SHADER}
        toneMapped={false}
        transparent
        uniforms={uniforms}
        vertexShader={CLIP_VERTEX_SHADER}
      />
    </mesh>
  );
}

function NightStars({ active }: { active: boolean }) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const dataRef = useRef<StarData | null>(null);
  if (!dataRef.current) dataRef.current = createStarData();
  const data = dataRef.current;
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);

  useFrame((state) => {
    if (!active || !materialRef.current) return;
    materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <points frustumCulled={false} raycast={ignoreRaycast} renderOrder={-100} visible={active}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[data.positions, 3]} />
        <bufferAttribute attach="attributes-aSize" args={[data.sizes, 1]} />
        <bufferAttribute attach="attributes-aPhase" args={[data.phases, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        blending={THREE.AdditiveBlending}
        depthTest
        depthWrite={false}
        fragmentShader={STAR_FRAGMENT_SHADER}
        toneMapped={false}
        transparent
        uniforms={uniforms}
        vertexShader={STAR_VERTEX_SHADER}
      />
    </points>
  );
}

export function WeatherEffects() {
  const weather = useRoomStore((state) => state.weather);

  return (
    <>
      <Rain active={weather === 'rainy'} />
      <WindStreaks active={weather === 'windy'} />
      <NightStars active={weather === 'night'} />
    </>
  );
}
