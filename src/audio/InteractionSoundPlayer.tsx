import {
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  type AudioPlayer,
} from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  subscribeToInteractionFeedback,
  type InteractionFeedbackSignal,
} from '../feedback/interactionFeedbackEvents';

const uiClickSound = require('../../assets/audio/ui/ui-click.wav') as number;
const assetSelectSound = require('../../assets/audio/ui/asset-select.wav') as number;
const cameraSound = require('../../assets/audio/ui/camera-shutter.wav') as number;
const placeSound = require('../../assets/audio/ui/asset-place.wav') as number;
const deleteSound = require('../../assets/audio/ui/asset-delete.wav') as number;
const moveSound = require('../../assets/audio/ui/asset-move.wav') as number;

const UI_SOUND_INTERVAL_MS = 24;
const MOVE_SOUND_INTERVAL_MS = 70;
const MAX_PENDING_SIGNALS = 12;
const playerOptions = {
  keepAudioSessionActive: true,
  updateInterval: 250,
} as const;

function replay(player: AudioPlayer, volume: number, playbackRate = 1) {
  player.pause();
  player.volume = volume;
  player.playbackRate = playbackRate;
  if (player.currentTime <= 0.001) {
    player.play();
    return;
  }

  void player.seekTo(0, 0, 0).then(
    () => player.play(),
    () => player.play(),
  );
}

export function InteractionSoundPlayer({
  enabled,
  initialSignal,
}: {
  enabled: boolean;
  initialSignal: InteractionFeedbackSignal | null;
}) {
  const uiPlayer = useAudioPlayer(uiClickSound, playerOptions);
  const assetSelectPlayer = useAudioPlayer(assetSelectSound, playerOptions);
  const cameraPlayer = useAudioPlayer(cameraSound, playerOptions);
  const placePlayer = useAudioPlayer(placeSound, playerOptions);
  const deletePlayer = useAudioPlayer(deleteSound, playerOptions);
  const movePlayer = useAudioPlayer(moveSound, playerOptions);
  const uiStatus = useAudioPlayerStatus(uiPlayer);
  const assetSelectStatus = useAudioPlayerStatus(assetSelectPlayer);
  const cameraStatus = useAudioPlayerStatus(cameraPlayer);
  const placeStatus = useAudioPlayerStatus(placePlayer);
  const deleteStatus = useAudioPlayerStatus(deletePlayer);
  const moveStatus = useAudioPlayerStatus(movePlayer);
  const [audioSessionReady, setAudioSessionReady] = useState(false);
  const enabledRef = useRef(enabled);
  const readyRef = useRef(false);
  const playSignalRef = useRef<(signal: InteractionFeedbackSignal) => void>(() => undefined);
  const pendingSignalsRef = useRef<InteractionFeedbackSignal[]>(
    initialSignal ? [initialSignal] : [],
  );
  const lastUiAtRef = useRef(0);
  const lastMoveAtRef = useRef(0);

  const allPlayersLoaded =
    uiStatus.isLoaded &&
    assetSelectStatus.isLoaded &&
    cameraStatus.isLoaded &&
    placeStatus.isLoaded &&
    deleteStatus.isLoaded &&
    moveStatus.isLoaded;

  useEffect(() => {
    let cancelled = false;

    void setAudioModeAsync({
      allowsRecording: false,
      interruptionMode: 'mixWithOthers',
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      shouldRouteThroughEarpiece: false,
    })
      .catch((error: unknown) => {
        if (__DEV__) {
          console.warn('Interaction audio session could not be configured.', error);
        }
      })
      .finally(() => {
        if (!cancelled) setAudioSessionReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    enabledRef.current = enabled;
    if (enabled) return;

    for (const player of [
      uiPlayer,
      assetSelectPlayer,
      cameraPlayer,
      placePlayer,
      deletePlayer,
      movePlayer,
    ]) {
      player.pause();
      void player.seekTo(0).catch(() => undefined);
    }
  }, [
    enabled,
    uiPlayer,
    assetSelectPlayer,
    cameraPlayer,
    placePlayer,
    deletePlayer,
    movePlayer,
  ]);

  const playSignal = useCallback(
    (signal: InteractionFeedbackSignal) => {
      if (!enabledRef.current || !signal.sound) return;
      const { event } = signal;

      if (event === 'ui' || event === 'selection' || event === 'buildingSwitch') {
        const now = Date.now();
        if (now - lastUiAtRef.current < UI_SOUND_INTERVAL_MS) return;
        lastUiAtRef.current = now;
        replay(uiPlayer, 0.42);
        return;
      }
      if (event === 'assetSelect') {
        replay(assetSelectPlayer, 0.4);
        return;
      }
      if (event === 'camera') {
        replay(cameraPlayer, 0.62);
        return;
      }
      if (event === 'place') {
        replay(placePlayer, 0.43);
        return;
      }
      if (event === 'settle') {
        replay(placePlayer, 0.32, 0.96);
        return;
      }
      if (event === 'delete') {
        replay(deletePlayer, 0.38);
        return;
      }
      if (event !== 'move') return;

      const now = Date.now();
      if (now - lastMoveAtRef.current < MOVE_SOUND_INTERVAL_MS) return;
      lastMoveAtRef.current = now;
      replay(movePlayer, 0.36, Math.floor(now / MOVE_SOUND_INTERVAL_MS) % 2 === 0 ? 0.97 : 1.03);
    },
    [uiPlayer, assetSelectPlayer, cameraPlayer, placePlayer, deletePlayer, movePlayer],
  );

  useEffect(() => {
    playSignalRef.current = playSignal;
  }, [playSignal]);

  useEffect(() => {
    const ready = audioSessionReady && allPlayersLoaded;
    readyRef.current = ready;
    if (!ready || !enabledRef.current) return;

    const pendingSignals = pendingSignalsRef.current.splice(0);
    pendingSignals.forEach((signal) => playSignal(signal));
  }, [allPlayersLoaded, audioSessionReady, playSignal]);

  useEffect(
    () =>
      subscribeToInteractionFeedback((signal) => {
        if (!enabledRef.current || !signal.sound) return;
        if (readyRef.current) {
          playSignalRef.current(signal);
          return;
        }

        const queue = pendingSignalsRef.current;
        if (queue.length >= MAX_PENDING_SIGNALS) queue.shift();
        queue.push(signal);
      }),
    [],
  );

  return null;
}
