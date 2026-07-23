import { Canvas } from '@react-three/fiber/native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { DEFAULT_CAMERA_POSITION, DEFAULT_CAMERA_ZOOM } from '../../domain/camera';
import { RoomScene } from './RoomScene';
import {
  activateEditorPan,
  beginEditorPinch,
  finishEditorPan,
  finishEditorPinch,
  handleEditorTap,
  prepareEditorPan,
  setEditorRootState,
  updateEditorPan,
  updateEditorPlacementHover,
  updateEditorPinch,
} from './editorController';

export function RoomCanvas() {
  const [appState, setAppState] = useState(AppState.currentState);
  const renderContinuously = appState === 'active' || appState === 'unknown';
  const pendingPanRef = useRef<{ x: number; y: number; translationX: number } | null>(null);
  const panFrameRef = useRef<number | null>(null);

  const flushPanUpdate = useCallback(() => {
    if (panFrameRef.current !== null) {
      cancelAnimationFrame(panFrameRef.current);
      panFrameRef.current = null;
    }
    const pending = pendingPanRef.current;
    pendingPanRef.current = null;
    if (pending) updateEditorPan(pending.x, pending.y, pending.translationX);
  }, []);

  const cancelPanUpdate = useCallback(() => {
    if (panFrameRef.current !== null) cancelAnimationFrame(panFrameRef.current);
    panFrameRef.current = null;
    pendingPanRef.current = null;
  }, []);

  const queuePanUpdate = useCallback((x: number, y: number, translationX: number) => {
    pendingPanRef.current = { x, y, translationX };
    if (panFrameRef.current !== null) return;
    // ProMotion can deliver touch samples faster than React/Three can present
    // frames. Process the newest sample once per frame instead of building a
    // delayed queue of raycasts and React reconciliations on the JS thread.
    panFrameRef.current = requestAnimationFrame(() => {
      panFrameRef.current = null;
      const pending = pendingPanRef.current;
      pendingPanRef.current = null;
      if (pending) updateEditorPan(pending.x, pending.y, pending.translationX);
    });
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', setAppState);
    return () => {
      subscription.remove();
      cancelPanUpdate();
    };
  }, [cancelPanUpdate]);

  const gesture = useMemo(() => {
    const tap = Gesture.Tap()
      .maxDistance(8)
      .runOnJS(true)
      .onEnd((event, success) => {
        if (success) handleEditorTap(event.x, event.y);
      });
    const pan = Gesture.Pan()
      .minPointers(1)
      .maxPointers(1)
      .minDistance(4)
      .runOnJS(true)
      // Capture the exact touch-down point. Waiting until activation can move a
      // finger beyond the bounds of small models such as the fanous lantern.
      .onBegin((event) => prepareEditorPan(event.x, event.y))
      .onStart(() => activateEditorPan())
      .onUpdate((event) => queuePanUpdate(event.x, event.y, event.translationX))
      .onFinalize((event, success) => {
        flushPanUpdate();
        finishEditorPan(
          success,
          event.x,
          event.y,
          event.translationX,
          event.translationY,
          event.velocityX,
        );
      });
    const pinch = Gesture.Pinch()
      .shouldCancelWhenOutside(false)
      .runOnJS(true)
      .onStart((event) => {
        cancelPanUpdate();
        beginEditorPinch(event.focalX, event.focalY);
      })
      .onUpdate((event) => updateEditorPinch(event.scale, event.focalX, event.focalY))
      .onFinalize(() => finishEditorPinch());
    // Keep pinch as a first-class peer of the one-finger gestures. A direct
    // simultaneous composition lets iOS promote the second pointer to a pinch
    // without waiting on a nested one-finger recognizer. Pan and tap already
    // disambiguate via minDistance/maxDistance.
    return Gesture.Simultaneous(pinch, pan, tap);
  }, [cancelPanUpdate, flushPanUpdate, queuePanUpdate]);

  return (
    <GestureDetector gesture={gesture}>
      <View
        collapsable={false}
        onPointerMove={
          Platform.OS === 'web'
            ? (event) => updateEditorPlacementHover(event.nativeEvent.offsetX, event.nativeEvent.offsetY)
            : undefined
        }
        style={styles.canvas}
      >
        <Canvas
          orthographic
          flat
          // R3F Native already uses PixelRatio.get(), so Expo GL renders at
          // the device's native Retina resolution without a dpr prop.
          camera={{ position: [...DEFAULT_CAMERA_POSITION], zoom: DEFAULT_CAMERA_ZOOM, near: 0.1, far: 100 }}
          // Particle and light motion need a continuous loop. Pausing it while
          // iOS backgrounds the app avoids spending GPU/CPU off-screen.
          frameloop={renderContinuously ? 'always' : 'never'}
          gl={{ antialias: true, alpha: false, preserveDrawingBuffer: Platform.OS === 'web' }}
          shadows={false}
          pointerEvents="none"
          style={styles.canvas}
          onCreated={(state) => {
            state.gl.setClearColor(0x000000, 1);
            setEditorRootState(state);
          }}
        >
          <RoomScene />
        </Canvas>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  canvas: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
