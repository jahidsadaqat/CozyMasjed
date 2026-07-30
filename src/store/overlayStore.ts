import { create } from 'zustand';

export type AppSheet = 'paywall' | 'settings';

/**
 * Where a paywall was opened from. Useful for wording ("Unlock this room")
 * and for analytics later on.
 */
export type PaywallSource = 'chrome' | 'settings' | 'locked-content';

type OverlayState = {
  activeSheet: AppSheet | null;
  paywallSource: PaywallSource;
  openPaywall: (source?: PaywallSource) => void;
  openSettings: () => void;
  closeSheet: () => void;
};

export const useOverlayStore = create<OverlayState>((set) => ({
  activeSheet: null,
  paywallSource: 'chrome',
  openPaywall: (source = 'chrome') => set({ activeSheet: 'paywall', paywallSource: source }),
  openSettings: () => set({ activeSheet: 'settings' }),
  closeSheet: () => set({ activeSheet: null }),
}));
