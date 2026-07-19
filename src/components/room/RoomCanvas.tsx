import { Canvas } from '@react-three/fiber/native';
import { useMemo } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { RoomScene } from './RoomScene';
import {
  beginEditorDrag,
  beginEditorPinch,
  finishEditorDrag,
  handleEditorTap,
  setEditorRootState,
  updateEditorDrag,
  updateEditorPinch,
} from './editorController';

export function RoomCanvas() {
  const gesture = useMemo(() => {
    const tap = Gesture.Tap()
      .maxDistance(8)
      .runOnJS(true)
      .onEnd((event, success) => {
        if (success) handleEditorTap(event.x, event.y);
      });
    const pan = Gesture.Pan()
      .minDistance(8)
      .runOnJS(true)
      // Capture the exact touch-down point. Waiting until activation can move a
      // finger beyond the bounds of small models such as the fanous lantern.
      .onBegin((event) => beginEditorDrag(event.x, event.y))
      .onUpdate((event) => updateEditorDrag(event.x, event.y))
      .onFinalize(() => finishEditorDrag());
    const pinch = Gesture.Pinch()
      .runOnJS(true)
      .onStart(() => beginEditorPinch())
      .onUpdate((event) => updateEditorPinch(event.scale));
    return Gesture.Simultaneous(Gesture.Exclusive(pan, tap), pinch);
  }, []);

  return (
    <GestureDetector gesture={gesture}>
      <View style={styles.canvas}>
        <Canvas
          orthographic
          camera={{ position: [5.8, 5.2, 6.4], zoom: 72, near: 0.1, far: 100 }}
          frameloop="demand"
          gl={{ antialias: true, alpha: false, preserveDrawingBuffer: Platform.OS === 'web' }}
          shadows={false}
          pointerEvents="none"
          style={styles.canvas}
          onCreated={(state) => {
            state.camera.lookAt(0, 0.52, 0);
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
