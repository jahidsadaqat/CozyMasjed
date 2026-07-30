import { useMemo } from 'react';
import * as THREE from 'three';
import { catalogById } from '../catalog/catalog';
import { resolveItemTransform } from '../domain/attachments';
import { weatherVisualProfiles } from '../domain/weather';
import { useRoomStore } from '../store/roomStore';
import {
  getLightingManifestEntry,
  isLightingWeatherActive,
  type LightingManifestEntry,
} from './lightingManifest';

type AssignedLight = {
  id: string;
  position: [number, number, number];
  color: string;
  entry: LightingManifestEntry;
};

function rotateLocalOrigin(
  origin: readonly [number, number, number],
  rotationY: number,
) {
  const cos = Math.cos(rotationY);
  const sin = Math.sin(rotationY);
  return {
    x: origin[0] * cos + origin[2] * sin,
    z: -origin[0] * sin + origin[2] * cos,
  };
}

export function RoomLighting() {
  const weather = useRoomStore((state) => state.weather);
  const allItems = useRoomStore((state) => state.placedItems);
  const activeBuildingId = useRoomStore((state) => state.activeBuildingId);
  const profile = weatherVisualProfiles[weather];
  const active = isLightingWeatherActive(weather);

  const assignedLights = useMemo(() => {
    if (!active) return [];
    const visibleItems = allItems.filter(
      (item) => item.buildingId === activeBuildingId,
    );
    const candidates = visibleItems.flatMap((item) => {
      const catalogItem = catalogById[item.catalogId];
      const entry = getLightingManifestEntry(item.catalogId);
      if (
        !catalogItem ||
        !entry?.emitter ||
        !entry.lightOrigin
      ) {
        return [];
      }
      const resolved = resolveItemTransform(item, visibleItems);
      const local = rotateLocalOrigin(entry.lightOrigin, resolved.rotationY);
      return [{
        id: item.id,
        entry,
        color: entry.glow[0]?.color ?? '#FFC97A',
        position: [
          resolved.position[0] + local.x,
          resolved.position[1] + entry.lightOrigin[1],
          resolved.position[2] + local.z,
        ] as [number, number, number],
      }];
    });
    return candidates;
  }, [active, activeBuildingId, allItems]);

  return (
    <>
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
      {assignedLights.map((assignment) => (
        <pointLight
          key={assignment.id}
          position={assignment.position}
          color={assignment.color}
          intensity={1.35 * profile.practicalLightIntensity}
          distance={3}
          decay={2}
          castShadow={false}
        />
      ))}
    </>
  );
}
