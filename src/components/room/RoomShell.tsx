import { RoundedBox } from '@react-three/drei/native';
import { useMemo } from 'react';
import * as THREE from 'three';
import { palette } from '../../theme/palette';
import { PlacementZoneTargets } from './PlacementZoneTargets';
import { PointedArch } from './PointedArch';

type RoomShellProps = {
  floorColor: string;
  wallColor: string;
  accentColor: string;
};

const floorSeams = [-1.48, -0.74, 0, 0.74, 1.48];

function makeLeftWallShape() {
  const wallWidth = 4.5;
  const wallHeight = 2.26;
  const wall = new THREE.Shape();
  wall.moveTo(-wallWidth / 2, 0);
  wall.lineTo(wallWidth / 2, 0);
  wall.lineTo(wallWidth / 2, wallHeight);
  wall.lineTo(-wallWidth / 2, wallHeight);
  wall.closePath();

  // The hole follows the inside edge of the teal pointed-arch frame. Its
  // winding is reversed so Three treats it as a true opening in the wall.
  const width = 0.7;
  const height = 1.096;
  const half = width / 2;
  const spring = height * 0.58;
  const center = -0.65;
  const bottom = 0.55;
  const opening = new THREE.Path();
  opening.moveTo(center - half, bottom);
  opening.lineTo(center - half, bottom + spring);
  opening.quadraticCurveTo(center - half * 0.72, bottom + height * 0.82, center, bottom + height);
  opening.quadraticCurveTo(center + half * 0.72, bottom + height * 0.82, center + half, bottom + spring);
  opening.lineTo(center + half, bottom);
  opening.closePath();
  wall.holes.push(opening);

  return wall;
}

function makeLeftWallBodyGeometry() {
  return new THREE.ExtrudeGeometry(makeLeftWallShape(), {
    depth: 0.13,
    steps: 1,
    curveSegments: 32,
    bevelEnabled: true,
    bevelSegments: 3,
    bevelSize: 0.025,
    bevelThickness: 0.025,
  });
}

export function RoomShell({ floorColor, wallColor, accentColor }: RoomShellProps) {
  const leftWallBodyGeometry = useMemo(() => makeLeftWallBodyGeometry(), []);
  const seamColor = useMemo(() => {
    return floorColor === '#6F5141' ? '#4E382F' : '#8D5C43';
  }, [floorColor]);

  return (
    <group>
      <PlacementZoneTargets buildingId="cozy-masjid" />
      <RoundedBox args={[4.86, 0.28, 4.86]} radius={0.12} smoothness={4} position={[0, -0.25, 0]}>
        <meshStandardMaterial color={palette.terracottaDeep} roughness={0.82} />
      </RoundedBox>
      <RoundedBox args={[4.58, 0.2, 4.58]} radius={0.09} smoothness={4} position={[0, -0.08, 0]}>
        <meshStandardMaterial color={floorColor} roughness={0.78} />
      </RoundedBox>

      {floorSeams.map((x) => (
        <mesh key={`seam-x-${x}`} position={[x, 0.024, 0]}>
          <boxGeometry args={[0.015, 0.008, 4.34]} />
          <meshStandardMaterial color={seamColor} transparent opacity={0.28} />
        </mesh>
      ))}
      {[-1.1, 1.1].map((z, index) => (
        <mesh key={`seam-z-${z}`} position={[index === 0 ? -1.1 : 1.1, 0.026, z]}>
          <boxGeometry args={[2.16, 0.008, 0.014]} />
          <meshStandardMaterial color={seamColor} transparent opacity={0.22} />
        </mesh>
      ))}

      <mesh geometry={leftWallBodyGeometry} position={[-2.225, -0.04, 0]} rotation={[0, Math.PI / 2, 0]}>
        <meshStandardMaterial color={wallColor} roughness={0.9} />
      </mesh>
      <RoundedBox args={[4.5, 2.26, 0.18]} radius={0.045} smoothness={3} position={[0, 1.09, -2.16]}>
        <meshStandardMaterial color={wallColor} roughness={0.9} />
      </RoundedBox>

      <mesh position={[-2.045, 0.17, 0]}>
        <boxGeometry args={[0.1, 0.22, 4.34]} />
        <meshStandardMaterial color={palette.terracotta} roughness={0.78} />
      </mesh>
      <mesh position={[0, 0.17, -2.045]}>
        <boxGeometry args={[4.34, 0.22, 0.1]} />
        <meshStandardMaterial color={palette.terracotta} roughness={0.78} />
      </mesh>

      <mesh position={[-2.05, 2.2, 0]}>
        <boxGeometry args={[0.08, 0.12, 4.42]} />
        <meshStandardMaterial color={palette.paper} roughness={0.8} />
      </mesh>
      <mesh position={[0, 2.2, -2.05]}>
        <boxGeometry args={[4.42, 0.12, 0.08]} />
        <meshStandardMaterial color={palette.paper} roughness={0.8} />
      </mesh>

      <PointedArch
        width={0.88}
        height={1.24}
        fillColor="#FFF4CE"
        frameColor={accentColor}
        showFill={false}
        position={[-2.055, 0.55, 0.65]}
        rotation={[0, Math.PI / 2, 0]}
      />
      <mesh position={[-1.98, 0.9, 0.65]}>
        <boxGeometry args={[0.05, 0.055, 0.63]} />
        <meshStandardMaterial color={accentColor} />
      </mesh>
      <mesh position={[-1.98, 1.12, 0.65]}>
        <boxGeometry args={[0.05, 0.53, 0.045]} />
        <meshStandardMaterial color={accentColor} />
      </mesh>

      <PointedArch
        width={1.02}
        height={1.52}
        frameWidth={0.075}
        fillColor="#E7D2AC"
        frameColor={palette.gold}
        position={[0.72, 0.25, -2.055]}
      />
      <RoundedBox args={[1.1, 0.13, 0.32]} radius={0.055} smoothness={3} position={[0.72, 0.08, -1.95]}>
        <meshStandardMaterial color={palette.sand} roughness={0.85} />
      </RoundedBox>
    </group>
  );
}
