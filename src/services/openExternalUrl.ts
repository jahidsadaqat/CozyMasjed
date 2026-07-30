import { Linking } from 'react-native';

/**
 * Opens a web or mail link. Returns false instead of throwing so callers can
 * show an inline message rather than crashing the sheet.
 */
export async function openExternalUrl(url: string): Promise<boolean> {
  try {
    await Linking.openURL(url);
    return true;
  } catch (error) {
    console.warn(`[links] Could not open ${url}`, error);
    return false;
  }
}
