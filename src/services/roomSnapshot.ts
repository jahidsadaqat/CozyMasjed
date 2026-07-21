import { GLView, type ExpoWebGLRenderingContext, type GLSnapshot } from 'expo-gl';
import { Platform } from 'react-native';
import { getEditorRootState } from '../components/room/editorController';

export type RoomCaptureResult = {
  savedToLibrary: boolean;
  shared: boolean;
  downloaded: boolean;
  permissionDenied: boolean;
  saveFailed: boolean;
};

async function captureRoomFrame(): Promise<GLSnapshot> {
  const state = getEditorRootState();
  if (!state) throw new Error('The room renderer is not ready yet.');
  state.advance(globalThis.performance?.now?.() ?? Date.now(), true);
  const context = state.gl.getContext() as unknown as ExpoWebGLRenderingContext;
  return GLView.takeSnapshotAsync(context, { format: 'png', compress: 1, flip: false });
}

async function exportWebSnapshot(snapshot: GLSnapshot): Promise<RoomCaptureResult> {
  let blob = snapshot.uri instanceof Blob ? snapshot.uri : null;
  if (!blob && snapshot.localUri) {
    const response = await fetch(snapshot.localUri);
    blob = await response.blob();
  }
  if (!blob) throw new Error('The browser could not create the room image.');

  const file = new File([blob], `cozy-masjid-room-${Date.now()}.png`, { type: 'image/png' });
  const shareData: ShareData = {
    title: 'My Cozy Masjid',
    text: 'A peaceful room made in Cozy Masjid',
    files: [file],
  };
  const mobilePointer = window.matchMedia?.('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
  if (mobilePointer && navigator.share && navigator.canShare?.(shareData)) {
    try {
      await navigator.share(shareData);
      return { savedToLibrary: false, shared: true, downloaded: false, permissionDenied: false, saveFailed: false };
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return { savedToLibrary: false, shared: false, downloaded: false, permissionDenied: false, saveFailed: false };
      }
    }
  }

  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000);
  return { savedToLibrary: false, shared: false, downloaded: true, permissionDenied: false, saveFailed: false };
}

async function exportNativeSnapshot(snapshot: GLSnapshot): Promise<RoomCaptureResult> {
  if (!snapshot.localUri) throw new Error('The room image did not receive a local file path.');
  const MediaLibrary = await import('expo-media-library');
  const Sharing = await import('expo-sharing');

  let savedToLibrary = false;
  let permissionDenied = false;
  let saveFailed = false;
  try {
    let permission = await MediaLibrary.getPermissionsAsync(true, ['photo']);
    if (!permission.granted && permission.canAskAgain) {
      permission = await MediaLibrary.requestPermissionsAsync(true, ['photo']);
    }
    if (permission.granted) {
      await MediaLibrary.Asset.create(snapshot.localUri);
      savedToLibrary = true;
    } else {
      permissionDenied = true;
    }
  } catch (error) {
    saveFailed = true;
    console.warn('[Deen Rooms] Could not save the snapshot to Photos.', error);
  }

  let shared = false;
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(snapshot.localUri, {
      mimeType: 'image/png',
      UTI: 'public.png',
      dialogTitle: 'Share your Deen Room',
    });
    shared = true;
  }
  return { savedToLibrary, shared, downloaded: false, permissionDenied, saveFailed };
}

export async function captureSaveAndShareRoom() {
  const snapshot = await captureRoomFrame();
  if (__DEV__) console.info(`[Deen Rooms] snapshot ready: ${snapshot.width}×${snapshot.height}`);
  const result = Platform.OS === 'web' ? await exportWebSnapshot(snapshot) : await exportNativeSnapshot(snapshot);
  if (__DEV__) console.info('[Deen Rooms] snapshot exported', result);
  return result;
}
