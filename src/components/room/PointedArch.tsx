import { useMemo } from 'react';
import * as THREE from 'three';

type PointedArchProps = {
  width: number;
  height: number;
  frameWidth?: number;
  fillColor: string;
  frameColor: string;
  emissive?: boolean;
  showFill?: boolean;
  position?: [number, number, number];
  rotation?: [number, number, number];
};

function traceArch(path: THREE.Path | THREE.Shape, width: number, height: number) {
  const half = width / 2;
  const spring = height * 0.58;
  path.moveTo(-half, 0);
  path.lineTo(half, 0);
  path.lineTo(half, spring);
  path.quadraticCurveTo(half * 0.72, height * 0.82, 0, height);
  path.quadraticCurveTo(-half * 0.72, height * 0.82, -half, spring);
  path.closePath();
}

export function PointedArch({
  width,
  height,
  frameWidth = 0.09,
  fillColor,
  frameColor,
  emissive = false,
  showFill = true,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
}: PointedArchProps) {
  const { fillGeometry, frameGeometry } = useMemo(() => {
    const fillShape = new THREE.Shape();
    traceArch(fillShape, width - frameWidth * 2, height - frameWidth * 1.6);

    const frameShape = new THREE.Shape();
    traceArch(frameShape, width, height);
    const hole = new THREE.Path();
    traceArch(hole, width - frameWidth * 2, height - frameWidth * 1.6);
    frameShape.holes.push(hole);

    return {
      fillGeometry: new THREE.ShapeGeometry(fillShape, 24),
      frameGeometry: new THREE.ShapeGeometry(frameShape, 24),
    };
  }, [frameWidth, height, width]);

  return (
    <group position={position} rotation={rotation}>
      {showFill ? (
        <mesh geometry={fillGeometry} position={[0, frameWidth * 0.15, 0]}>
          <meshStandardMaterial
            color={fillColor}
            emissive={emissive ? fillColor : '#000000'}
            emissiveIntensity={emissive ? 0.72 : 0}
            side={THREE.DoubleSide}
          />
        </mesh>
      ) : null}
      <mesh geometry={frameGeometry} position={[0, 0, 0.012]}>
        <meshStandardMaterial color={frameColor} roughness={0.7} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
