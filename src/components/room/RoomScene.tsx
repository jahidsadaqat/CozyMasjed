import { useThree } from '@react-three/fiber/native';
import { Suspense, useCallback, useEffect, useState } from 'react';
import * as THREE from 'three';
import { GodRay } from '../GodRay';
import { weatherVisualProfiles, type WeatherMode } from '../../domain/weather';
import { useRoomStore } from '../../store/roomStore';
import { ModelValidationScene } from '../models/ModelValidationScene';
import { CinematicRoomAccents } from './CinematicRoomAccents';
import { PlacedItems } from './PlacedItems';
import { ModelRoomShell } from './ModelRoomShell';

// Kept off in the product scene. Set true only while validating the complete asset pack.
const SHOW_MODEL_VALIDATION_SCENE = false;

function WeatherRendererSettings({ weather }: { weather: WeatherMode }) {
  const gl = useThree((state) => state.gl);
  const invalidate = useThree((state) => state.invalidate);
  const profile = weatherVisualProfiles[weather];

  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = profile.sceneExposure;
    invalidate();
  }, [gl, invalidate, profile.sceneExposure]);

  return null;
}

export function RoomScene() {
  const weather = useRoomStore((state) => state.weather);
  const activeBuildingId = useRoomStore((state) => state.activeBuildingId);
  const invalidate = useThree((state) => state.invalidate);
  const [readyBuildingId, setReadyBuildingId] = useState<string | null>(null);
  const profile = weatherVisualProfiles[weather];
  const handleShellReady = useCallback((buildingId: string) => {
    setReadyBuildingId(buildingId);
    invalidate();
  }, [invalidate]);

  useEffect(() => {
    setReadyBuildingId(null);
  }, [activeBuildingId]);

  return (
    <>
      <WeatherRendererSettings weather={weather} />
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
        position={[2.5, 4.5, 4]}
        intensity={profile.fillIntensity}
        color={profile.fillColor}
      />
      <Suspense fallback={null}>
        <ModelRoomShell buildingId={activeBuildingId} onReady={handleShellReady} />
      </Suspense>
      {readyBuildingId === activeBuildingId ? (
        <>
          <GodRay />
          <CinematicRoomAccents profile={profile} />
          <PlacedItems />
        </>
      ) : null}
      {SHOW_MODEL_VALIDATION_SCENE ? (
        <Suspense fallback={null}>
          <ModelValidationScene />
        </Suspense>
      ) : null}
    </>
  );
}
