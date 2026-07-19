import { Nunito_700Bold, Nunito_800ExtraBold, useFonts } from '@expo-google-fonts/nunito';
import { StatusBar } from 'expo-status-bar';
import { CopyPlus, RotateCcw, RotateCw, Trash2 } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { SkyBackdrop } from './src/components/SkyBackdrop';
import { RoomCanvas } from './src/components/room/RoomCanvas';
import { catalogById } from './src/catalog/catalog';
import { useRoomStore } from './src/store/roomStore';
import { palette } from './src/theme/palette';

export default function App() {
  const [fontsLoaded] = useFonts({ Nunito_700Bold, Nunito_800ExtraBold });
  const selectedItemId = useRoomStore((state) => state.selectedItemId);
  const placedItems = useRoomStore((state) => state.placedItems);
  const rotateSelected = useRoomStore((state) => state.rotateSelected);
  const duplicateSelected = useRoomStore((state) => state.duplicateSelected);
  const deleteSelected = useRoomStore((state) => state.deleteSelected);
  const selectedItem = placedItems.find((item) => item.id === selectedItemId);
  const canRotate = selectedItem ? catalogById[selectedItem.catalogId]?.rotatable !== false : false;

  if (!fontsLoaded) {
    return <View style={[styles.root, { backgroundColor: palette.cream }]} />;
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <View style={styles.root}>
          <SkyBackdrop />
          <RoomCanvas />
          <SafeAreaView pointerEvents="box-none" style={styles.safeArea}>
            {selectedItem ? (
              <View style={styles.actionPill}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Rotate left"
                  disabled={!canRotate}
                  onPress={() => rotateSelected(-1)}
                  style={({ pressed }) => [styles.actionButton, pressed && styles.actionPressed, !canRotate && styles.actionDisabled]}
                >
                  <RotateCcw color={palette.ink} size={21} strokeWidth={2.4} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Rotate right"
                  disabled={!canRotate}
                  onPress={() => rotateSelected(1)}
                  style={({ pressed }) => [styles.actionButton, pressed && styles.actionPressed, !canRotate && styles.actionDisabled]}
                >
                  <RotateCw color={palette.ink} size={21} strokeWidth={2.4} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Duplicate item"
                  onPress={duplicateSelected}
                  style={({ pressed }) => [styles.actionButton, pressed && styles.actionPressed]}
                >
                  <CopyPlus color={palette.ink} size={21} strokeWidth={2.4} />
                </Pressable>
                <View style={styles.actionDivider} />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Delete item"
                  onPress={deleteSelected}
                  style={({ pressed }) => [styles.actionButton, pressed && styles.actionPressed]}
                >
                  <Trash2 color="#B85C4C" size={21} strokeWidth={2.4} />
                </Pressable>
              </View>
            ) : (
              <View style={styles.brandPill}>
                <Text style={styles.brandText}>Deen Rooms</Text>
                <Text style={styles.brandSubtext}>Build a peaceful place</Text>
              </View>
            )}
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
  actionPill: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 28,
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: 'rgba(246, 244, 239, 0.96)',
    shadowColor: palette.ink,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 6,
  },
  actionButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionPressed: {
    backgroundColor: 'rgba(232, 201, 155, 0.55)',
    transform: [{ scale: 0.94 }],
  },
  actionDisabled: {
    opacity: 0.3,
  },
  actionDivider: {
    width: 1,
    height: 26,
    marginHorizontal: 2,
    backgroundColor: 'rgba(78, 59, 49, 0.14)',
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
