import { Nunito_700Bold } from '@expo-google-fonts/nunito/700Bold';
import { Nunito_800ExtraBold } from '@expo-google-fonts/nunito/800ExtraBold';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ImageBackground, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DeferredInteractionSoundPlayer } from './src/audio/DeferredInteractionSoundPlayer';
import { RoomCanvas } from './src/components/room/RoomCanvas';
import { AppErrorBoundary } from './src/components/ui/AppErrorBoundary';
import { EditorOverlay } from './src/components/ui/EditorOverlay';
import { WelcomeGuide } from './src/components/ui/WelcomeGuide';
import WeatherOverlay from './src/components/weather/WeatherOverlay';
import { InteractionHapticPlayer } from './src/feedback/InteractionHapticPlayer';
import { useRoomPersistence } from './src/store/roomPersistence';
import { useRoomStore } from './src/store/roomStore';
import { getBackgroundOption } from './src/theme/backgrounds';
import { palette } from './src/theme/palette';

function AppContent() {
  const [fontsLoaded] = useFonts({ Nunito_700Bold, Nunito_800ExtraBold });
  const [ambienceOn, setAmbienceOn] = useState(false);
  const isHydrated = useRoomStore((state) => state.isHydrated);
  const backgroundId = useRoomStore((state) => state.backgroundId);
  const roomWeather = useRoomStore((state) => state.weather);
  const markBackgroundReady = useRoomStore((state) => state.markBackgroundReady);
  const backgroundOption = getBackgroundOption(backgroundId);
  const backgroundSource = backgroundOption.source;
  const weather = roomWeather === 'rainy' ? 'rain' : roomWeather === 'windy' ? 'wind' : roomWeather;
  useRoomPersistence();

  if (!fontsLoaded || !isHydrated) {
    return (
      <ImageBackground
        resizeMode="cover"
        source={backgroundSource}
        style={[styles.root, { backgroundColor: palette.cream }]}
      />
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ImageBackground
          onLoadEnd={() => markBackgroundReady(backgroundId)}
          resizeMode="cover"
          source={backgroundSource}
          style={[styles.root, { backgroundColor: backgroundOption.fallbackColor }]}
        >
          <DeferredInteractionSoundPlayer enabled />
          <InteractionHapticPlayer />
          <WeatherOverlay
            dom={{
              automaticallyAdjustContentInsets: false,
              automaticallyAdjustsScrollIndicatorInsets: false,
              bounces: false,
              containerStyle: styles.weatherOverlay,
              contentInsetAdjustmentBehavior: 'never',
              mediaPlaybackRequiresUserAction: false,
              pointerEvents: 'none',
              scrollEnabled: false,
              showsHorizontalScrollIndicator: false,
              showsVerticalScrollIndicator: false,
              style: styles.weatherOverlay,
            }}
            mode={weather}
            soundOn={ambienceOn}
          />
          <View style={styles.roomLayer}>
            <RoomCanvas />
          </View>
          <EditorOverlay
            soundOn={ambienceOn}
            onToggleSound={() => setAmbienceOn((current) => !current)}
          />
          <WelcomeGuide />
          <StatusBar style="dark" />
        </ImageBackground>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default function App() {
  return (
    <AppErrorBoundary>
      <AppContent />
    </AppErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  weatherOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 1,
    backgroundColor: 'transparent',
    pointerEvents: 'none',
  },
  roomLayer: {
    flex: 1,
    zIndex: 2,
  },
});
