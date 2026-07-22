import {
  useAudioPlayer,
  type AudioPlayer,
  type AudioSource,
} from 'expo-audio';
import { useEffect, useRef } from 'react';
import { subscribeToInteractionFeedback } from '../feedback/interactionFeedbackEvents';

const uiClickSound = require('../../assets/audio/ui/ui-click.wav') as number;
const assetSelectSound = require('../../assets/audio/ui/asset-select.wav') as number;
const cameraSound = require('../../assets/audio/ui/camera-shutter.wav') as number;
const placeSound = require('../../assets/audio/ui/asset-place.wav') as number;
const deleteSound = require('../../assets/audio/ui/asset-delete.wav') as number;
const moveSound = require('../../assets/audio/ui/asset-move.wav') as number;

const UI_SOUND_INTERVAL_MS = 24;
const MOVE_SOUND_INTERVAL_MS = 70;

function replay(player: AudioPlayer, source: AudioSource, volume: number, playbackRate = 1) {
  player.pause();
  player.replace(source);
  player.volume = volume;
  player.playbackRate = playbackRate;
  player.play();
}

export function InteractionSoundPlayer({ enabled }: { enabled: boolean }) {
  const playerA = useAudioPlayer(null);
  const playerB = useAudioPlayer(null);
  const enabledRef = useRef(enabled);
  const lastUiAtRef = useRef(0);
  const lastMoveAtRef = useRef(0);
  const playerIndexRef = useRef(0);

  useEffect(() => {
    enabledRef.current = enabled;
    if (enabled) return;

    for (const player of [playerA, playerB]) {
      player.pause();
      void player.seekTo(0).catch(() => undefined);
    }
  }, [enabled, playerA, playerB]);

  useEffect(
    () =>
      subscribeToInteractionFeedback((signal) => {
        if (!enabledRef.current || !signal.sound) return;
        const { event } = signal;

        const play = (source: AudioSource, volume: number, playbackRate = 1) => {
          const player = playerIndexRef.current % 2 === 0 ? playerA : playerB;
          playerIndexRef.current += 1;
          replay(player, source, volume, playbackRate);
        };

        if (event === 'ui' || event === 'selection' || event === 'buildingSwitch') {
          const now = Date.now();
          if (now - lastUiAtRef.current < UI_SOUND_INTERVAL_MS) return;
          lastUiAtRef.current = now;
          play(uiClickSound, 0.32);
          return;
        }
        if (event === 'assetSelect') {
          play(assetSelectSound, 0.31);
          return;
        }
        if (event === 'camera') {
          play(cameraSound, 0.55);
          return;
        }
        if (event === 'place') {
          play(placeSound, 0.34);
          return;
        }
        if (event === 'settle') {
          play(placeSound, 0.24, 0.96);
          return;
        }
        if (event === 'delete') {
          play(deleteSound, 0.27);
          return;
        }
        if (event !== 'move') return;

        const now = Date.now();
        if (now - lastMoveAtRef.current < MOVE_SOUND_INTERVAL_MS) return;
        lastMoveAtRef.current = now;
        play(moveSound, 0.3, playerIndexRef.current % 2 === 0 ? 0.97 : 1.03);
      }),
    [playerA, playerB],
  );

  return null;
}
