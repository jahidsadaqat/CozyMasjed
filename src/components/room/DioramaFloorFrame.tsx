import { FLOOR_TOP, ROOM_SIZE } from '../../domain/grid';

const ignoreRaycast = () => undefined;

const FRAME_DEPTH = 0.22;
const FRAME_OVERLAP = 0.055;
const FASCIA_HEIGHT = 0.24;
const CAP_HEIGHT = 0.055;
const FRAME_CENTER = ROOM_SIZE / 2 + FRAME_DEPTH / 2 - FRAME_OVERLAP;
const FRAME_LENGTH = ROOM_SIZE + (FRAME_DEPTH - FRAME_OVERLAP) * 2;

function FrameMaterial({ cap = false }: { cap?: boolean }) {
  return (
    <meshStandardMaterial
      color={cap ? '#D8C7B8' : '#78685E'}
      metalness={0}
      roughness={cap ? 0.62 : 0.78}
    />
  );
}

/**
 * Covers the two exposed floor edges and gives the room a finished diorama
 * base. The back edges are already concealed by the authored wall shell.
 */
export function DioramaFloorFrame() {
  const fasciaY = FLOOR_TOP + 0.015 - FASCIA_HEIGHT / 2;
  const capY = FLOOR_TOP + CAP_HEIGHT / 2;

  return (
    <group userData={{ decorativeRoomFrame: true }}>
      <mesh
        position={[0, fasciaY, FRAME_CENTER]}
        raycast={ignoreRaycast}
        receiveShadow
      >
        <boxGeometry args={[FRAME_LENGTH, FASCIA_HEIGHT, FRAME_DEPTH]} />
        <FrameMaterial />
      </mesh>
      <mesh
        position={[FRAME_CENTER, fasciaY, 0]}
        raycast={ignoreRaycast}
        receiveShadow
      >
        <boxGeometry args={[FRAME_DEPTH, FASCIA_HEIGHT, FRAME_LENGTH]} />
        <FrameMaterial />
      </mesh>

      <mesh
        position={[0, capY, FRAME_CENTER]}
        raycast={ignoreRaycast}
        receiveShadow
        renderOrder={1}
      >
        <boxGeometry args={[FRAME_LENGTH, CAP_HEIGHT, FRAME_DEPTH]} />
        <FrameMaterial cap />
      </mesh>
      <mesh
        position={[FRAME_CENTER, capY, 0]}
        raycast={ignoreRaycast}
        receiveShadow
        renderOrder={1}
      >
        <boxGeometry args={[FRAME_DEPTH, CAP_HEIGHT, FRAME_LENGTH]} />
        <FrameMaterial cap />
      </mesh>
    </group>
  );
}
