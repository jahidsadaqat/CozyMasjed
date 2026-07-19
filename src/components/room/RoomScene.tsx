import { useRoomStore } from '../../store/roomStore';
import { RoomShell } from './RoomShell';

export function RoomScene() {
  const floorColor = useRoomStore((state) => state.floorColor);
  const wallColor = useRoomStore((state) => state.wallColor);
  const accentColor = useRoomStore((state) => state.accentColor);
  const lighting = useRoomStore((state) => state.lighting);

  return (
    <>
      <ambientLight intensity={lighting === 'day' ? 1.75 : 0.92} color={lighting === 'day' ? '#FFF8E8' : '#E5B777'} />
      <directionalLight
        position={[4.5, 7, 5]}
        intensity={lighting === 'day' ? 2.1 : 1.1}
        color={lighting === 'day' ? '#FFF2D2' : '#FFD08A'}
      />
      <RoomShell floorColor={floorColor} wallColor={wallColor} accentColor={accentColor} />
    </>
  );
}
