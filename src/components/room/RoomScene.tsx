import { useThree } from '@react-three/fiber/native';
import { Suspense, useEffect } from 'react';
import * as THREE from 'three';
import { weatherVisualProfiles, type WeatherMode } from '../../domain/weather';
import { useRoomStore } from '../../store/roomStore';
import { ModelValidationScene } from '../models/ModelValidationScene';
import { PlacedItems } from './PlacedItems';
import { ModelRoomShell } from './ModelRoomShell';
import { SceneBackdrop } from './SceneBackdrop';

// Kept off in the product scene. Set true only while validating the complete asset pack.
const SHOW_MODEL_VALIDATION_SCENE = false;

function WeatherRendererSettings({ weather }: { weather: WeatherMode }) {
  const gl = useThree((state) => state.gl);
  const profile = weatherVisualProfiles[weather];

  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = profile.sceneExposure;
  }, [gl, profile.sceneExposure]);

  return null;
}

export function RoomScene() {
  const backgroundId = useRoomStore((state) => state.backgroundId);
  const weather = useRoomStore((state) => state.weather);
  const activeBuildingId = useRoomStore((state) => state.activeBuildingId);
  const profile = weatherVisualProfiles[weather];

  return (
    <>
      <WeatherRendererSettings weather={weather} />
      <SceneBackdrop backgroundId={backgroundId} weather={weather} />
      <ambientLight intensity={profile.ambientIntensity} color={profile.ambientColor} />
      <hemisphereLight
        intensity={profile.hemisphereIntensity}
        color={profile.hemisphereSkyColor}
        groundColor={profile.hemisphereGroundColor}
      />
      <directionalLight
        position={[4.5, 7.5, 5.5]}
        intensity={profile.directionalIntensity}
        color={profile.directionalColor}
      />
      <directionalLight
        position={[-4, 4.5, 3]}
        intensity={profile.fillIntensity}
        color={profile.fillColor}
      />
      <Suspense fallback={null}>
        <ModelRoomShell buildingId={activeBuildingId} />
      </Suspense>
      <PlacedItems />
      {SHOW_MODEL_VALIDATION_SCENE ? (
        <Suspense fallback={null}>
          <ModelValidationScene />
        </Suspense>
      ) : null}
    </>
  );
}
