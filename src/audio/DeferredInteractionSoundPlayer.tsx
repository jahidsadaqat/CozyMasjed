import { requireOptionalNativeModule } from 'expo-modules-core';
import {
  Component,
  type ComponentType,
  type ErrorInfo,
  type ReactNode,
  useEffect,
  useState,
} from 'react';
import { Platform } from 'react-native';
import {
  subscribeToInteractionFeedback,
  type InteractionFeedbackSignal,
} from '../feedback/interactionFeedbackEvents';

type SoundPlayerProps = {
  enabled: boolean;
  initialSignal: InteractionFeedbackSignal | null;
};

type DeferredSoundPlayerProps = {
  enabled: boolean;
};

type SoundBoundaryProps = {
  children: ReactNode;
};

type SoundBoundaryState = {
  failed: boolean;
};

class SoundBoundary extends Component<SoundBoundaryProps, SoundBoundaryState> {
  state: SoundBoundaryState = { failed: false };

  static getDerivedStateFromError(): SoundBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    if (__DEV__) {
      console.warn('Interaction audio was disabled after an initialization error.', error, info);
    }
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** A missing or failing native audio module must never prevent the room from opening. */
export function DeferredInteractionSoundPlayer({ enabled }: DeferredSoundPlayerProps) {
  const [SoundPlayer, setSoundPlayer] = useState<ComponentType<SoundPlayerProps> | null>(null);
  const [initialSignal, setInitialSignal] = useState<InteractionFeedbackSignal | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    if (!enabled || SoundPlayer || unavailable) return;

    let cancelled = false;
    const unsubscribe = subscribeToInteractionFeedback((signal) => {
      if (!signal.sound) return;
      setInitialSignal((current) => current ?? signal);
    });

    if (Platform.OS !== 'web' && !requireOptionalNativeModule('ExpoAudio')) {
      setUnavailable(true);
      return unsubscribe;
    }

    // Mount and download the short effects during normal app startup. Waiting
    // for the first tap made the first sound race six native AVPlayer loads.
    void import('./InteractionSoundPlayer')
      .then((module) => {
        if (!cancelled) setSoundPlayer(() => module.InteractionSoundPlayer);
      })
      .catch((error: unknown) => {
        console.warn('Interaction audio could not be loaded and has been disabled.', error);
        if (!cancelled) setUnavailable(true);
      });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [enabled, SoundPlayer, unavailable]);

  if (!enabled || !SoundPlayer || unavailable) return null;

  return (
    <SoundBoundary>
      <SoundPlayer enabled initialSignal={initialSignal} />
    </SoundBoundary>
  );
}
