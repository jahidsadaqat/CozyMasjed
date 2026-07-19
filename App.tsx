import { Nunito_700Bold } from '@expo-google-fonts/nunito/700Bold';
import { Nunito_800ExtraBold } from '@expo-google-fonts/nunito/800ExtraBold';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RoomCanvas } from './src/components/room/RoomCanvas';
import { EditorOverlay } from './src/components/ui/EditorOverlay';
import { WelcomeGuide } from './src/components/ui/WelcomeGuide';
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
          <RoomCanvas />
          <EditorOverlay />
          <WelcomeGuide />
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
