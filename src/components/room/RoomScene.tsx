import { Suspense } from 'react';
import { GodRay } from '../GodRay';
import { useRoomStore } from '../../store/roomStore';
import { weatherVisualProfiles } from '../../domain/weather';
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
  const weather = useRoomStore((state) => state.weather);
  const weatherProfile = weatherVisualProfiles[weather];
  const roomAmbientIntensity = Math.max(weatherProfile.ambientIntensity, 0.55);
  const roomHemisphereIntensity = Math.max(weatherProfile.hemisphereIntensity, 0.45);
  const roomDirectionalIntensity = Math.max(weatherProfile.directionalIntensity, 0.9);

  return (
    <>
      <SceneBackdrop backgroundId={backgroundId} weather={weather} />
      <ambientLight intensity={roomAmbientIntensity} color={weatherProfile.ambientColor} />
      <hemisphereLight
        intensity={roomHemisphereIntensity}
        color={weatherProfile.hemisphereSkyColor}
        groundColor={weatherProfile.hemisphereGroundColor}
      />
      <directionalLight
        position={[4, 7, 3]}
        intensity={roomDirectionalIntensity}
        color={weatherProfile.directionalColor}
      />
      <RoomShell floorColor={floorColor} wallColor={wallColor} accentColor={accentColor} />
      <GodRay />
      <PlacedItems />
      {SHOW_MODEL_VALIDATION_SCENE ? (
        <Suspense fallback={null}>
          <ModelValidationScene />
        </Suspense>
      ) : null}
    </>
  );
}
