import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { useEffect, useRef } from 'react';
import {
  subscribeToInteractionFeedback,
  type InteractionFeedbackEvent,
} from './interactionFeedbackEvents';

const UI_INTERVAL_MS = 24;
const MOVE_INTERVAL_MS = 70;
const REJECT_INTERVAL_MS = 280;

function playAndroidHaptic(event: InteractionFeedbackEvent) {
  if (event === 'ui') {
    return Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Virtual_Key);
  }
  if (event === 'selection') {
    return Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Segment_Tick);
  }
  if (event === 'assetSelect') {
    return Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Context_Click);
  }
  if (event === 'dragStart') {
    return Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Drag_Start);
  }
  if (event === 'move') {
    return Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Segment_Frequent_Tick);
  }
  if (event === 'place' || event === 'captureSuccess') {
    return Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Confirm);
  }
  if (event === 'settle' || event === 'buildingSwitch') {
    return Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Gesture_End);
  }
  if (event === 'delete' || event === 'camera') {
    return Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Context_Click);
  }
  return Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Reject);
}

function playAppleOrWebHaptic(event: InteractionFeedbackEvent) {
  if (event === 'selection' || event === 'move') {
    return Haptics.selectionAsync();
  }
  if (event === 'ui' || event === 'assetSelect' || event === 'dragStart') {
    return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
  if (event === 'settle') {
    return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
  }
  if (event === 'place' || event === 'buildingSwitch') {
    return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }
  if (event === 'delete' || event === 'camera') {
    return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
  }
  if (event === 'captureSuccess') {
    return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }
  if (event === 'captureError') {
    return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }
  return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
}

function playHaptic(event: InteractionFeedbackEvent) {
  const promise = Platform.OS === 'android' ? playAndroidHaptic(event) : playAppleOrWebHaptic(event);
  void promise.catch(() => undefined);
}

export function InteractionHapticPlayer() {
  const lastUiAtRef = useRef(0);
  const lastMoveAtRef = useRef(0);
  const lastRejectAtRef = useRef(0);

  useEffect(
    () =>
      subscribeToInteractionFeedback((signal) => {
        if (!signal.haptic) return;
        const { event } = signal;
        const now = Date.now();
        if (event === 'ui' || event === 'selection') {
          if (now - lastUiAtRef.current < UI_INTERVAL_MS) return;
          lastUiAtRef.current = now;
        }
        if (event === 'dragStart') {
          lastMoveAtRef.current = now;
        }
        if (event === 'move') {
          if (now - lastMoveAtRef.current < MOVE_INTERVAL_MS) return;
          lastMoveAtRef.current = now;
        }
        if (event === 'reject') {
          if (now - lastRejectAtRef.current < REJECT_INTERVAL_MS) return;
          lastRejectAtRef.current = now;
        }
        playHaptic(event);
      }),
    [],
  );

  return null;
}
