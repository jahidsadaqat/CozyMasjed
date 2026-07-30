import { PaywallSheet } from '../premium/PaywallSheet';
import { SettingsSheet } from '../settings/SettingsSheet';
import { useOverlayStore } from '../../store/overlayStore';

/**
 * Renders whichever sheet is open, above the room but below nothing else.
 * Mounted once from App so a sheet survives any overlay re-render.
 */
export function AppSheets() {
  const activeSheet = useOverlayStore((state) => state.activeSheet);

  if (activeSheet === 'paywall') return <PaywallSheet />;
  if (activeSheet === 'settings') return <SettingsSheet />;
  return null;
}
