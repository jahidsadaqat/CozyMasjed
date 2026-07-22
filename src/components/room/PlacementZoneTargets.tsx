import { useMemo } from 'react';
import * as THREE from 'three';
import type { BuildingId } from '../../domain/buildings';
import { getPlacementZones, type PlacementZone } from '../../domain/grid';
import { configurePlacementRaycastTarget } from './editorRaycastLayers';

function InvisibleTargetMaterial() {
  return (
    <meshBasicMaterial
      transparent
      opacity={0}
      depthWrite={false}
      colorWrite={false}
      side={THREE.FrontSide}
    />
  );
}

function placementTags(zone: PlacementZone) {
  return {
    placementBuildingId: zone.buildingId,
    placementLevel: zone.level,
    placementSurface: zone.surface,
    placementZoneId: zone.id,
  };
}

function FloorTarget({ zone }: { zone: PlacementZone }) {
  const rowSize = zone.rowSize ?? zone.cellSize;
  return (
    <mesh
      ref={configurePlacementRaycastTarget}
      position={[
        zone.originX + (zone.columns * zone.cellSize) / 2,
        zone.originY - 0.005,
        zone.originZ + (zone.rows * rowSize) / 2,
      ]}
      rotation={[-Math.PI / 2, 0, 0]}
      userData={placementTags(zone)}
    >
      <planeGeometry args={[zone.columns * zone.cellSize, zone.rows * rowSize]} />
      <InvisibleTargetMaterial />
    </mesh>
  );
}

function pushWallCell(
  positions: number[],
  zone: PlacementZone,
  gridX: number,
  gridY: number,
) {
  const rowSize = zone.rowSize ?? zone.cellSize;
  const horizontalOrigin = zone.surface === 'wallL' ? zone.originZ : zone.originX;
  const horizontal0 = horizontalOrigin + gridX * zone.cellSize;
  const horizontal1 = horizontal0 + zone.cellSize;
  const y0 = zone.originY + gridY * rowSize;
  const y1 = y0 + rowSize;

  if (zone.surface === 'wallL') {
    const x = zone.originX;
    // Winding faces +X, toward the usable room interior.
    positions.push(
      x, y0, horizontal0,
      x, y1, horizontal1,
      x, y0, horizontal1,
      x, y0, horizontal0,
      x, y1, horizontal0,
      x, y1, horizontal1,
    );
    return;
  }

  const z = zone.originZ;
  // Winding faces +Z, toward the usable room interior.
  positions.push(
    horizontal0, y0, z,
    horizontal1, y0, z,
    horizontal1, y1, z,
    horizontal0, y0, z,
    horizontal1, y1, z,
    horizontal0, y1, z,
  );
}

function buildWallGeometry(zone: PlacementZone, occluders: boolean) {
  const positions: number[] = [];
  for (let gridY = 0; gridY < zone.rows; gridY += 1) {
    for (let gridX = 0; gridX < zone.columns; gridX += 1) {
      const key = `${gridX}:${gridY}`;
      const isBlocked = zone.blockedCells?.has(key) ?? false;
      const isOccluder = zone.occluderCells?.has(key) ?? false;
      if (occluders ? !isOccluder : isBlocked) continue;
      pushWallCell(positions, zone, gridX, gridY);
    }
  }

  if (positions.length === 0) return null;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function MergedWallTarget({
  zone,
  occluder,
}: {
  zone: PlacementZone;
  occluder: boolean;
}) {
  const geometry = useMemo(() => buildWallGeometry(zone, occluder), [occluder, zone]);
  if (!geometry) return null;

  return (
    <mesh
      ref={configurePlacementRaycastTarget}
      geometry={geometry}
      userData={{
        ...placementTags(zone),
        ...(occluder ? { placementOccluder: true } : null),
      }}
    >
      <InvisibleTargetMaterial />
    </mesh>
  );
}

function WallTargets({ zone }: { zone: PlacementZone }) {
  return (
    <>
      <MergedWallTarget zone={zone} occluder={false} />
      <MergedWallTarget zone={zone} occluder />
    </>
  );
}

export function PlacementZoneTargets({ buildingId }: { buildingId: BuildingId }) {
  return (
    <group userData={{ placementTargetsForBuilding: buildingId }}>
      {getPlacementZones(buildingId).map((zone) =>
        zone.surface === 'floor' ? (
          <FloorTarget key={zone.id} zone={zone} />
        ) : (
          <WallTargets key={zone.id} zone={zone} />
        ),
      )}
    </group>
  );
}
