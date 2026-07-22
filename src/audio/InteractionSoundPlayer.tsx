import { setAudioModeAsync, useAudioPlayer, type AudioPlayer } from 'expo-audio';
import { useEffect, useRef } from 'react';
import { subscribeToInteractionFeedback } from '../feedback/interactionFeedbackEvents';

const uiClickSound = require('../../assets/audio/ui/ui-click.wav') as number;
const assetSelectSound = require('../../assets/audio/ui/asset-select.wav') as number;
const cameraSound = require('../../assets/audio/ui/camera-shutter.wav') as number;
const placeSound = require('../../assets/audio/ui/asset-place.wav') as number;
const deleteSound = require('../../assets/audio/ui/asset-delete.wav') as number;
const moveSound = require('../../assets/audio/ui/asset-move.wav') as number;

const playerOptions = {
  downloadFirst: true,
  keepAudioSessionActive: true,
} as const;

const UI_SOUND_INTERVAL_MS = 24;
const MOVE_SOUND_INTERVAL_MS = 70;

function replay(player: AudioPlayer, volume: number, playbackRate = 1) {
  player.volume = volume;
  player.playbackRate = playbackRate;
  void player.seekTo(0).catch(() => undefined);
  player.play();
}

export function InteractionSoundPlayer({ enabled }: { enabled: boolean }) {
  const uiPlayerA = useAudioPlayer(uiClickSound, playerOptions);
  const uiPlayerB = useAudioPlayer(uiClickSound, playerOptions);
  const assetSelectPlayer = useAudioPlayer(assetSelectSound, playerOptions);
  const cameraPlayer = useAudioPlayer(cameraSound, playerOptions);
  const placePlayer = useAudioPlayer(placeSound, playerOptions);
  const settlePlayer = useAudioPlayer(placeSound, playerOptions);
  const deletePlayer = useAudioPlayer(deleteSound, playerOptions);
  const movePlayerA = useAudioPlayer(moveSound, playerOptions);
  const movePlayerB = useAudioPlayer(moveSound, playerOptions);
  const enabledRef = useRef(enabled);
  const lastUiAtRef = useRef(0);
  const uiPlayerIndexRef = useRef(0);
  const lastMoveAtRef = useRef(0);
  const movePlayerIndexRef = useRef(0);

  useEffect(() => {
    void setAudioModeAsync({
      allowsRecording: false,
      interruptionMode: 'mixWithOthers',
      playsInSilentMode: false,
      shouldPlayInBackground: false,
      shouldRouteThroughEarpiece: false,
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    enabledRef.current = enabled;
    if (enabled) return;

    for (const player of [
      uiPlayerA,
      uiPlayerB,
      assetSelectPlayer,
      cameraPlayer,
      placePlayer,
      settlePlayer,
      deletePlayer,
      movePlayerA,
      movePlayerB,
    ]) {
      player.pause();
      void player.seekTo(0).catch(() => undefined);
    }
  }, [
    assetSelectPlayer,
    cameraPlayer,
    deletePlayer,
    enabled,
    movePlayerA,
    movePlayerB,
    placePlayer,
    settlePlayer,
    uiPlayerA,
    uiPlayerB,
  ]);

  useEffect(
    () =>
      subscribeToInteractionFeedback((signal) => {
        if (!enabledRef.current || !signal.sound) return;
        const { event } = signal;

        if (event === 'ui' || event === 'selection' || event === 'buildingSwitch') {
          const now = Date.now();
          if (now - lastUiAtRef.current < UI_SOUND_INTERVAL_MS) return;
          lastUiAtRef.current = now;
          const useFirstPlayer = uiPlayerIndexRef.current % 2 === 0;
          uiPlayerIndexRef.current += 1;
          replay(useFirstPlayer ? uiPlayerA : uiPlayerB, 0.32);
          return;
        }
        if (event === 'assetSelect') {
          replay(assetSelectPlayer, 0.31);
          return;
        }
        if (event === 'camera') {
          replay(cameraPlayer, 0.55);
          return;
        }
        if (event === 'place') {
          replay(placePlayer, 0.34);
          return;
        }
        if (event === 'settle') {
          replay(settlePlayer, 0.24, 0.96);
          return;
        }
        if (event === 'delete') {
          replay(deletePlayer, 0.27);
          return;
        }
        if (event !== 'move') return;

        const now = Date.now();
        if (now - lastMoveAtRef.current < MOVE_SOUND_INTERVAL_MS) return;
        lastMoveAtRef.current = now;
        const useFirstPlayer = movePlayerIndexRef.current % 2 === 0;
        movePlayerIndexRef.current += 1;
        replay(useFirstPlayer ? movePlayerA : movePlayerB, 0.3, useFirstPlayer ? 0.97 : 1.03);
      }),
    [
      assetSelectPlayer,
      cameraPlayer,
      deletePlayer,
      movePlayerA,
      movePlayerB,
      placePlayer,
      settlePlayer,
      uiPlayerA,
      uiPlayerB,
    ],
  );

  return null;
}
