import { Suspense } from 'react';
import { useRoomStore } from '../../store/roomStore';
import { ModelValidationScene } from '../models/ModelValidationScene';
import { PlacedItems } from './PlacedItems';
import { RoomShell } from './RoomShell';
import { SceneBackdrop } from './SceneBackdrop';

// Kept off in the product scene. Set true only while validating the complete asset pack.
const SHOW_MODEL_VALIDATION_SCENE = false;

export function RoomScene() {
  const floorColor = useRoomStore((state) => state.floorColor);
  const wallColor = useRoomStore((state) => state.wallColor);
  const backgroundId = useRoomStore((state) => state.backgroundId);
  const accentColor = useRoomStore((state) => state.accentColor);
  const lighting = useRoomStore((state) => state.lighting);
  const isWarm = lighting === 'warm';

  return (
    <>
      <SceneBackdrop backgroundId={backgroundId} />
      <ambientLight intensity={isWarm ? 0.56 : 0.6} color={isWarm ? '#FFF8F0' : '#FFFFFF'} />
      <hemisphereLight
        intensity={0.5}
        color={isWarm ? '#FFE9D5' : '#FFF6E8'}
        groundColor={isWarm ? '#C89B7C' : '#D9B08C'}
      />
      <directionalLight
        position={[4, 7, 3]}
        intensity={isWarm ? 1.2 : 1.3}
        color={isWarm ? '#FFE1BC' : '#FFF3DC'}
      />
      <RoomShell floorColor={floorColor} wallColor={wallColor} accentColor={accentColor} />
      <PlacedItems />
      {SHOW_MODEL_VALIDATION_SCENE ? (
        <Suspense fallback={null}>
          <ModelValidationScene />
        </Suspense>
      ) : null}
    </>
  );
}
