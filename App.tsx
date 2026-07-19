import { Nunito_700Bold, Nunito_800ExtraBold, useFonts } from '@expo-google-fonts/nunito';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { SkyBackdrop } from './src/components/SkyBackdrop';
import { RoomCanvas } from './src/components/room/RoomCanvas';
import { palette } from './src/theme/palette';

export default function App() {
  const [fontsLoaded] = useFonts({ Nunito_700Bold, Nunito_800ExtraBold });

  if (!fontsLoaded) {
    return <View style={[styles.root, { backgroundColor: palette.cream }]} />;
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <View style={styles.root}>
          <SkyBackdrop />
          <RoomCanvas />
          <SafeAreaView pointerEvents="none" style={styles.safeArea}>
            <View style={styles.brandPill}>
              <Text style={styles.brandText}>Deen Rooms</Text>
              <Text style={styles.brandSubtext}>Build a peaceful place</Text>
            </View>
          </SafeAreaView>
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
  safeArea: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    paddingTop: 8,
  },
  brandPill: {
    alignItems: 'center',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'rgba(246, 244, 239, 0.92)',
    shadowColor: palette.ink,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 5,
  },
  brandText: {
    color: palette.ink,
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 20,
    letterSpacing: 0.2,
  },
  brandSubtext: {
    color: palette.inkMuted,
    fontFamily: 'Nunito_700Bold',
    fontSize: 11,
    marginTop: -1,
  },
});
