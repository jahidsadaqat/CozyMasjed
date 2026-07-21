import { Canvas } from '@react-three/fiber/native';
import { useEffect, useMemo, useState } from 'react';
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

  useEffect(() => {
    const subscription = AppState.addEventListener('change', setAppState);
    return () => subscription.remove();
  }, []);

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
      .minDistance(8)
      .runOnJS(true)
      // Capture the exact touch-down point. Waiting until activation can move a
      // finger beyond the bounds of small models such as the fanous lantern.
      .onBegin((event) => prepareEditorPan(event.x, event.y))
      .onStart(() => activateEditorPan())
      .onUpdate((event) => updateEditorPan(event.x, event.y, event.translationX))
      .onFinalize((event, success) =>
        finishEditorPan(
          success,
          event.x,
          event.y,
          event.translationX,
          event.translationY,
          event.velocityX,
        ),
      );
    const pinch = Gesture.Pinch()
      .runOnJS(true)
      .onStart((event) => beginEditorPinch(event.focalX, event.focalY))
      .onUpdate((event) => updateEditorPinch(event.scale, event.focalX, event.focalY))
      .onFinalize(() => finishEditorPinch());
    return Gesture.Simultaneous(Gesture.Exclusive(pan, tap), pinch);
  }, []);

  return (
    <GestureDetector gesture={gesture}>
      <View
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
