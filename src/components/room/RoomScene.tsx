import { useThree } from '@react-three/fiber/native';
import { Suspense, useCallback, useEffect, useState } from 'react';
import * as THREE from 'three';
import { GodRay } from '../GodRay';
import { weatherVisualProfiles, type WeatherMode } from '../../domain/weather';
import { useRoomStore } from '../../store/roomStore';
import { ModelValidationScene } from '../models/ModelValidationScene';
import { RoomLighting } from '../../three/RoomLighting';
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
    // A previously requested shell can finish after the user has moved on.
    // Never let that stale callback unlock the active room's item layer.
    if (useRoomStore.getState().activeBuildingId !== buildingId) return;

    setReadyBuildingId(buildingId);
    invalidate();
  }, [invalidate]);

  return (
    <>
      <WeatherRendererSettings weather={weather} />
      <RoomLighting />
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
