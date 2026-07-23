import {
  setAudioModeAsync,
  setIsAudioActiveAsync,
  useAudioPlayer,
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
const PLAYER_READY_RETRY_MS = 40;
const PLAYER_READY_MAX_ATTEMPTS = 75;
const playerOptions = {
  downloadFirst: true,
  keepAudioSessionActive: true,
  updateInterval: 250,
} as const;

type PendingPlayback = {
  player: AudioPlayer;
  volume: number;
  playbackRate: number;
  attempts: number;
};

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
  const [audioSessionReady, setAudioSessionReady] = useState(false);
  const enabledRef = useRef(enabled);
  const readyRef = useRef(false);
  const playSignalRef = useRef<(signal: InteractionFeedbackSignal) => void>(() => undefined);
  const pendingSignalsRef = useRef<InteractionFeedbackSignal[]>(
    initialSignal ? [initialSignal] : [],
  );
  const lastUiAtRef = useRef(0);
  const lastMoveAtRef = useRef(0);
  const pendingPlaybackRef = useRef(new Map<string, PendingPlayback>());
  const retryTimersRef = useRef(
    new Map<string, ReturnType<typeof setTimeout>>(),
  );

  useEffect(() => {
    let cancelled = false;

    const configureAudioSession = async () => {
      try {
        await setAudioModeAsync({
          allowsRecording: false,
          interruptionMode: 'mixWithOthers',
          playsInSilentMode: true,
          shouldPlayInBackground: false,
          shouldRouteThroughEarpiece: false,
        });
      } catch (primaryError) {
        try {
          // Keep a minimal iOS-safe fallback. A failed optional routing field
          // must not leave every interaction sound permanently queued.
          await setAudioModeAsync({ playsInSilentMode: true });
        } catch (fallbackError) {
          console.warn(
            'Interaction audio session could not be configured.',
            primaryError,
            fallbackError,
          );
          return;
        }
      }

      try {
        await setIsAudioActiveAsync(true);
      } catch (error) {
        // The session mode is already valid. AVPlayer may still activate it on
        // the first play, so keep interaction audio available.
        console.warn('Interaction audio could not be activated eagerly.', error);
      }

      if (!cancelled) setAudioSessionReady(true);
    };

    void configureAudioSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const clearPendingPlaybacks = useCallback(() => {
    retryTimersRef.current.forEach((timer) => clearTimeout(timer));
    retryTimersRef.current.clear();
    pendingPlaybackRef.current.clear();
  }, []);

  useEffect(() => clearPendingPlaybacks, [clearPendingPlaybacks]);

  const replayWhenReady = useCallback(
    (player: AudioPlayer, volume: number, playbackRate = 1) => {
      const playerId = player.id;
      pendingPlaybackRef.current.set(playerId, {
        player,
        volume,
        playbackRate,
        attempts: 0,
      });
      if (retryTimersRef.current.has(playerId)) return;

      const attemptPlayback = () => {
        retryTimersRef.current.delete(playerId);
        const pending = pendingPlaybackRef.current.get(playerId);
        if (!pending || !enabledRef.current) return;

        const status = pending.player.currentStatus;
        if (status.isLoaded) {
          pendingPlaybackRef.current.delete(playerId);
          replay(pending.player, pending.volume, pending.playbackRate);
          return;
        }

        if (status.error || pending.attempts >= PLAYER_READY_MAX_ATTEMPTS) {
          pendingPlaybackRef.current.delete(playerId);
          console.warn(
            `Interaction sound did not become ready (${playerId}).`,
            status.error,
          );
          return;
        }

        pending.attempts += 1;
        retryTimersRef.current.set(
          playerId,
          setTimeout(attemptPlayback, PLAYER_READY_RETRY_MS),
        );
      };

      attemptPlayback();
    },
    [],
  );

  useEffect(() => {
    enabledRef.current = enabled;
    if (enabled) return;

    clearPendingPlaybacks();

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
    clearPendingPlaybacks,
  ]);

  const playSignal = useCallback(
    (signal: InteractionFeedbackSignal) => {
      if (!enabledRef.current || !signal.sound) return;
      const { event } = signal;

      if (event === 'ui' || event === 'selection' || event === 'buildingSwitch') {
        const now = Date.now();
        if (now - lastUiAtRef.current < UI_SOUND_INTERVAL_MS) return;
        lastUiAtRef.current = now;
        replayWhenReady(uiPlayer, 0.42);
        return;
      }
      if (event === 'assetSelect') {
        replayWhenReady(assetSelectPlayer, 0.4);
        return;
      }
      if (event === 'camera') {
        replayWhenReady(cameraPlayer, 0.62);
        return;
      }
      if (event === 'place') {
        replayWhenReady(placePlayer, 0.43);
        return;
      }
      if (event === 'settle') {
        replayWhenReady(placePlayer, 0.32, 0.96);
        return;
      }
      if (event === 'delete') {
        replayWhenReady(deletePlayer, 0.38);
        return;
      }
      if (event !== 'move') return;

      const now = Date.now();
      if (now - lastMoveAtRef.current < MOVE_SOUND_INTERVAL_MS) return;
      lastMoveAtRef.current = now;
      replayWhenReady(
        movePlayer,
        0.36,
        Math.floor(now / MOVE_SOUND_INTERVAL_MS) % 2 === 0 ? 0.97 : 1.03,
      );
    },
    [
      uiPlayer,
      assetSelectPlayer,
      cameraPlayer,
      placePlayer,
      deletePlayer,
      movePlayer,
      replayWhenReady,
    ],
  );

  useEffect(() => {
    playSignalRef.current = playSignal;
  }, [playSignal]);

  useEffect(() => {
    readyRef.current = audioSessionReady;
    if (!audioSessionReady || !enabledRef.current) return;

    const pendingSignals = pendingSignalsRef.current.splice(0);
    pendingSignals.forEach((signal) => playSignal(signal));
  }, [audioSessionReady, playSignal]);

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
