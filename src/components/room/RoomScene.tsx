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
  const accentColor = useRoomStore((state) => state.accentColor);
  const lighting = useRoomStore((state) => state.lighting);

  return (
    <>
      <SceneBackdrop lighting={lighting} />
      <ambientLight intensity={0.6} color="#FFFFFF" />
      <hemisphereLight intensity={0.5} color="#FFF6E8" groundColor="#D9B08C" />
      <directionalLight position={[4, 7, 3]} intensity={1.3} color="#FFF3DC" />
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
