import { Nunito_700Bold, Nunito_800ExtraBold, useFonts } from '@expo-google-fonts/nunito';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SkyBackdrop } from './src/components/SkyBackdrop';
import { RoomCanvas } from './src/components/room/RoomCanvas';
import { EditorOverlay } from './src/components/ui/EditorOverlay';
import { useRoomPersistence } from './src/store/roomPersistence';
import { useRoomStore } from './src/store/roomStore';
import { palette } from './src/theme/palette';

export default function App() {
  const [fontsLoaded] = useFonts({ Nunito_700Bold, Nunito_800ExtraBold });
  const isHydrated = useRoomStore((state) => state.isHydrated);
  useRoomPersistence();

  if (!fontsLoaded || !isHydrated) {
    return <View style={[styles.root, { backgroundColor: palette.cream }]} />;
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <View style={styles.root}>
          <SkyBackdrop />
          <RoomCanvas />
          <EditorOverlay />
          <StatusBar style="dark" />
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
