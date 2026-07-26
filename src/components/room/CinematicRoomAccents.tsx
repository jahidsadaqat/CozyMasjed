import * as THREE from 'three';
import { ROOM_FOOTPRINT_SCALE, WALL_INSET } from '../../domain/grid';
import type { WeatherVisualProfile } from '../../domain/weather';
import { createRadialGradientTexture } from '../BlobShadow';

const ignoreRaycast = () => undefined;
const mihrabGlowTexture = createRadialGradientTexture({
  red: 255,
  green: 201,
  blue: 122,
  alpha: 0.72,
});

const interiorWall = WALL_INSET + 0.022;

function MihrabBacklight({ intensity }: { intensity: number }) {
  return (
    <mesh
      position={[0, 1.2, interiorWall + 0.014]}
      raycast={ignoreRaycast}
      renderOrder={2}
      scale={[0.62 * ROOM_FOOTPRINT_SCALE, 1.05, 1]}
    >
      <circleGeometry args={[1, 32]} />
      <meshBasicMaterial
        blending={THREE.AdditiveBlending}
        color="#FFC97A"
        depthWrite={false}
        map={mihrabGlowTexture}
        opacity={0.045 + intensity * 0.095}
        toneMapped={false}
        transparent
      />
    </mesh>
  );
}

export function CinematicRoomAccents({
  profile,
}: {
  profile: WeatherVisualProfile;
}) {
  if (profile.topTrimIntensity <= 0.01) return null;
  return <MihrabBacklight intensity={profile.topTrimIntensity} />;
}
