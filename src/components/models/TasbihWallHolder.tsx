import { RoundedBox } from '@react-three/drei/native';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { ProceduralModelKind } from '../../catalog/types';
import { WALL_ROW_SIZE } from '../../domain/grid';
import { useRoomStore } from '../../store/roomStore';
import { palette } from '../../theme/palette';

type TasbihWallHolderProps = {
  variant: ProceduralModelKind;
  catalogId: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  onReady?: (catalogId: string) => void;
  placedItemId?: string;
};

type BeadLoopProps = {
  x: number;
  topY: number;
  color: string;
  radiusX?: number;
  radiusY?: number;
  z?: number;
};

type HookProps = {
  x: number;
  y: number;
  color?: string;
};

type FlatBarProps = {
  from: [number, number];
  to: [number, number];
  width: number;
  depth?: number;
  color: string;
  z?: number;
};

const cream = '#FFF4DA';
const darkWood = '#80523C';
const beadCoral = '#C86E55';
const beadTeal = '#4F887D';
const beadIvory = '#F1DFAF';
const variantAuthoredHeights: Readonly<Record<ProceduralModelKind, number>> = {
  'tasbih-crescent-hook': 1.0,
  'tasbih-mihrab-rack': 1.15,
  'tasbih-geometric-rail': 1.0,
  'tasbih-mashrabiya-board': 1.05,
  'tasbih-palm-hanger': 1.18,
};

function BeadLoop({
  x,
  topY,
  color,
  radiusX = 0.095,
  radiusY = 0.22,
  z = 0.18,
}: BeadLoopProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const beadCount = 24;

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const matrix = new THREE.Matrix4();
    const centerY = topY - radiusY;
    for (let index = 0; index < beadCount; index += 1) {
      const angle = (index / beadCount) * Math.PI * 2;
      matrix.makeTranslation(
        x + Math.sin(angle) * radiusX,
        centerY + Math.cos(angle) * radiusY,
        z,
      );
      mesh.setMatrixAt(index, matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [radiusX, radiusY, topY, x, z]);

  const tasselY = topY - radiusY * 2 - 0.055;
  return (
    <group>
      <instancedMesh ref={meshRef} args={[undefined, undefined, beadCount]}>
        <sphereGeometry args={[0.026, 9, 7]} />
        <meshStandardMaterial color={color} roughness={0.6} metalness={0.03} />
      </instancedMesh>
      <mesh position={[x, tasselY, z]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.017, 0.027, 0.075, 8]} />
        <meshStandardMaterial color={palette.gold} roughness={0.48} metalness={0.28} />
      </mesh>
      <mesh position={[x, tasselY - 0.072, z]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.043, 0.11, 10]} />
        <meshStandardMaterial color={color} roughness={0.75} />
      </mesh>
    </group>
  );
}

function Hook({ x, y, color = palette.gold }: HookProps) {
  return (
    <group position={[x, y, 0]}>
      <mesh position={[0, 0, 0.13]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.027, 0.027, 0.21, 10]} />
        <meshStandardMaterial color={color} roughness={0.42} metalness={0.34} />
      </mesh>
      <mesh position={[0, 0, 0.245]}>
        <sphereGeometry args={[0.052, 12, 9]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.36} />
      </mesh>
    </group>
  );
}

function FlatBar({ from, to, width, depth = 0.035, color, z = 0.105 }: FlatBarProps) {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const length = Math.sqrt(dx * dx + dy * dy);
  return (
    <RoundedBox
      args={[length, width, depth]}
      radius={Math.min(width * 0.35, 0.018)}
      smoothness={2}
      position={[(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, z]}
      rotation={[0, 0, Math.atan2(dy, dx)]}
    >
      <meshStandardMaterial color={color} roughness={0.68} />
    </RoundedBox>
  );
}

function CrescentHook() {
  return (
    <group>
      <RoundedBox args={[0.48, 0.7, 0.09]} radius={0.18} smoothness={5} position={[0, 0.56, 0.035]}>
        <meshStandardMaterial color={cream} roughness={0.86} />
      </RoundedBox>
      <mesh position={[0, 0.72, 0.105]} rotation={[0, 0, -0.72]}>
        <torusGeometry args={[0.14, 0.027, 10, 40, Math.PI * 1.48]} />
        <meshStandardMaterial color={palette.gold} roughness={0.4} metalness={0.32} />
      </mesh>
      <mesh position={[0.105, 0.785, 0.106]} rotation={[0, 0, 0.36]}>
        <octahedronGeometry args={[0.036, 0]} />
        <meshStandardMaterial color={palette.gold} roughness={0.4} metalness={0.32} />
      </mesh>
      <Hook x={0} y={0.48} />
      <BeadLoop x={0} topY={0.45} color={beadTeal} radiusX={0.082} radiusY={0.19} z={0.205} />
    </group>
  );
}

function makeMihrabGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.46, 0);
  shape.lineTo(0.46, 0);
  shape.lineTo(0.46, 0.63);
  shape.quadraticCurveTo(0.45, 0.86, 0.22, 0.96);
  shape.quadraticCurveTo(0.08, 1.03, 0, 1.13);
  shape.quadraticCurveTo(-0.08, 1.03, -0.22, 0.96);
  shape.quadraticCurveTo(-0.45, 0.86, -0.46, 0.63);
  shape.closePath();
  return new THREE.ExtrudeGeometry(shape, {
    depth: 0.075,
    steps: 1,
    curveSegments: 18,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.018,
    bevelThickness: 0.018,
  });
}

function MihrabRack() {
  const geometry = useMemo(() => makeMihrabGeometry(), []);

  return (
    <group>
      <mesh geometry={geometry} position={[0, 0, 0.02]}>
        <meshStandardMaterial color={palette.terracotta} roughness={0.82} />
      </mesh>
      <FlatBar from={[-0.34, 0.22]} to={[0.34, 0.22]} width={0.045} color={cream} z={0.13} />
      <FlatBar from={[-0.29, 0.84]} to={[0, 1.025]} width={0.04} color={palette.gold} z={0.13} />
      <FlatBar from={[0, 1.025]} to={[0.29, 0.84]} width={0.04} color={palette.gold} z={0.13} />
      <mesh position={[0, 0.8, 0.13]}>
        <circleGeometry args={[0.075, 20]} />
        <meshStandardMaterial color={cream} roughness={0.7} />
      </mesh>
      <Hook x={-0.22} y={0.55} />
      <Hook x={0} y={0.5} />
      <Hook x={0.22} y={0.55} />
      <BeadLoop x={-0.22} topY={0.52} color={beadIvory} radiusX={0.075} radiusY={0.2} z={0.22} />
      <BeadLoop x={0.22} topY={0.52} color={beadTeal} radiusX={0.075} radiusY={0.2} z={0.22} />
    </group>
  );
}

function GeometricRail() {
  const hookXs = [-0.5, -0.17, 0.17, 0.5];
  return (
    <group>
      <RoundedBox args={[1.36, 0.32, 0.1]} radius={0.11} smoothness={4} position={[0, 0.72, 0.04]}>
        <meshStandardMaterial color={palette.mutedTeal} roughness={0.82} />
      </RoundedBox>
      <FlatBar from={[-0.55, 0.72]} to={[-0.42, 0.83]} width={0.035} color={cream} z={0.12} />
      <FlatBar from={[-0.42, 0.83]} to={[-0.29, 0.72]} width={0.035} color={cream} z={0.12} />
      <FlatBar from={[-0.29, 0.72]} to={[-0.16, 0.83]} width={0.035} color={cream} z={0.12} />
      <FlatBar from={[-0.16, 0.83]} to={[0, 0.69]} width={0.035} color={cream} z={0.12} />
      <FlatBar from={[0, 0.69]} to={[0.16, 0.83]} width={0.035} color={cream} z={0.12} />
      <FlatBar from={[0.16, 0.83]} to={[0.29, 0.72]} width={0.035} color={cream} z={0.12} />
      <FlatBar from={[0.29, 0.72]} to={[0.42, 0.83]} width={0.035} color={cream} z={0.12} />
      <FlatBar from={[0.42, 0.83]} to={[0.55, 0.72]} width={0.035} color={cream} z={0.12} />
      {hookXs.map((x) => (
        <Hook key={x} x={x} y={0.59} />
      ))}
      <BeadLoop x={-0.5} topY={0.56} color={beadCoral} radiusX={0.082} radiusY={0.21} z={0.22} />
      <BeadLoop x={0.17} topY={0.56} color={beadIvory} radiusX={0.082} radiusY={0.21} z={0.22} />
    </group>
  );
}

function MashrabiyaBoard() {
  const latticeBars: Array<{ from: [number, number]; to: [number, number] }> = [
    { from: [-0.38, 0.3], to: [0.38, 0.88] },
    { from: [-0.38, 0.52], to: [0.12, 0.88] },
    { from: [-0.12, 0.3], to: [0.38, 0.68] },
    { from: [0.38, 0.3], to: [-0.38, 0.88] },
    { from: [0.38, 0.52], to: [-0.12, 0.88] },
    { from: [0.12, 0.3], to: [-0.38, 0.68] },
  ];
  return (
    <group>
      <RoundedBox args={[1.0, 0.94, 0.1]} radius={0.1} smoothness={4} position={[0, 0.57, 0.035]}>
        <meshStandardMaterial color={darkWood} roughness={0.88} />
      </RoundedBox>
      <RoundedBox args={[0.86, 0.78, 0.05]} radius={0.065} smoothness={3} position={[0, 0.59, 0.105]}>
        <meshStandardMaterial color={cream} roughness={0.9} />
      </RoundedBox>
      {latticeBars.map((bar, index) => (
        <FlatBar key={index} from={bar.from} to={bar.to} width={0.026} color={palette.sand} z={0.148 + index * 0.0002} />
      ))}
      <Hook x={-0.27} y={0.57} color={darkWood} />
      <Hook x={0} y={0.5} color={darkWood} />
      <Hook x={0.27} y={0.57} color={darkWood} />
      <BeadLoop x={-0.27} topY={0.54} color={beadTeal} radiusX={0.075} radiusY={0.19} z={0.25} />
      <BeadLoop x={0.27} topY={0.54} color={beadCoral} radiusX={0.075} radiusY={0.19} z={0.25} />
    </group>
  );
}

function PalmLeaf({ x, y, rotation, color }: { x: number; y: number; rotation: number; color: string }) {
  return (
    <mesh position={[x, y, 0.14]} rotation={[0, 0, rotation]} scale={[1, 0.45, 0.28]}>
      <sphereGeometry args={[0.13, 12, 8]} />
      <meshStandardMaterial color={color} roughness={0.8} />
    </mesh>
  );
}

function PalmHanger() {
  return (
    <group>
      <FlatBar from={[-0.65, 0.64]} to={[0.65, 0.78]} width={0.095} depth={0.085} color={darkWood} z={0.08} />
      <FlatBar from={[-0.35, 0.71]} to={[-0.5, 0.98]} width={0.035} color={darkWood} z={0.095} />
      <FlatBar from={[-0.08, 0.73]} to={[-0.04, 1.03]} width={0.035} color={darkWood} z={0.095} />
      <FlatBar from={[0.25, 0.76]} to={[0.45, 1.0]} width={0.035} color={darkWood} z={0.095} />
      <PalmLeaf x={-0.52} y={0.96} rotation={0.5} color="#6F9D75" />
      <PalmLeaf x={-0.38} y={0.96} rotation={-0.42} color="#8AB58C" />
      <PalmLeaf x={-0.12} y={1.03} rotation={0.5} color="#6F9D75" />
      <PalmLeaf x={0.04} y={1.04} rotation={-0.38} color="#8AB58C" />
      <PalmLeaf x={0.38} y={1.0} rotation={0.48} color="#6F9D75" />
      <PalmLeaf x={0.51} y={0.94} rotation={-0.46} color="#8AB58C" />
      <Hook x={-0.42} y={0.62} color={darkWood} />
      <Hook x={0} y={0.67} color={darkWood} />
      <Hook x={0.42} y={0.71} color={darkWood} />
      <BeadLoop x={-0.42} topY={0.59} color={beadIvory} radiusX={0.082} radiusY={0.21} z={0.23} />
      <BeadLoop x={0.42} topY={0.68} color={beadTeal} radiusX={0.082} radiusY={0.21} z={0.23} />
    </group>
  );
}

function HolderVariant({ variant }: { variant: ProceduralModelKind }) {
  switch (variant) {
    case 'tasbih-crescent-hook':
      return <CrescentHook />;
    case 'tasbih-mihrab-rack':
      return <MihrabRack />;
    case 'tasbih-geometric-rail':
      return <GeometricRail />;
    case 'tasbih-mashrabiya-board':
      return <MashrabiyaBoard />;
    case 'tasbih-palm-hanger':
      return <PalmHanger />;
  }
}

export function TasbihWallHolder({
  variant,
  catalogId,
  position = [0, 0.04, 0],
  rotation = [0, 0, 0],
  scale = 1,
  onReady,
  placedItemId,
}: TasbihWallHolderProps) {
  const verticalOffset = Math.max(
    0,
    (WALL_ROW_SIZE - variantAuthoredHeights[variant] * scale) / 2,
  );

  useEffect(() => {
    onReady?.(catalogId);
    if (placedItemId) useRoomStore.getState().markModelReady(placedItemId);
    if (__DEV__) {
      console.info(`[Deen Rooms] procedural model ready: ${catalogId}`);
    }
  }, [catalogId, onReady, placedItemId]);

  return (
    <group
      position={position}
      rotation={rotation}
      userData={{ catalogId, placedItemId }}
    >
      <group position={[0, verticalOffset, 0]} scale={scale}>
        <HolderVariant variant={variant} />
      </group>
    </group>
  );
}
