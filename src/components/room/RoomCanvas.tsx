import { Canvas } from '@react-three/fiber/native';
import { StyleSheet } from 'react-native';
import { RoomScene } from './RoomScene';

export function RoomCanvas() {
  return (
    <Canvas
      orthographic
      camera={{ position: [5.8, 5.2, 6.4], zoom: 72, near: 0.1, far: 100 }}
      gl={{ antialias: true, alpha: true }}
      shadows={false}
      style={styles.canvas}
      onCreated={({ camera, gl }) => {
        camera.lookAt(0, 0.52, 0);
        gl.setClearColor(0x000000, 0);
      }}
    >
      <RoomScene />
    </Canvas>
  );
}

const styles = StyleSheet.create({
  canvas: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
