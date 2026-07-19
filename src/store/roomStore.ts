import { create } from 'zustand';
import { palette } from '../theme/palette';

export type LightingMode = 'day' | 'warm';

type RoomAppearanceState = {
  floorColor: string;
  wallColor: string;
  accentColor: string;
  lighting: LightingMode;
  setFloorColor: (color: string) => void;
  setWallColor: (color: string) => void;
  setAccentColor: (color: string) => void;
  toggleLighting: () => void;
};

export const useRoomStore = create<RoomAppearanceState>((set) => ({
  floorColor: palette.woodLight,
  wallColor: '#F4E6C8',
  accentColor: palette.mutedTeal,
  lighting: 'day',
  setFloorColor: (floorColor) => set({ floorColor }),
  setWallColor: (wallColor) => set({ wallColor }),
  setAccentColor: (accentColor) => set({ accentColor }),
  toggleLighting: () => set((state) => ({ lighting: state.lighting === 'day' ? 'warm' : 'day' })),
}));
