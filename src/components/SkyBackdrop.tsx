import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import { palette } from '../theme/palette';

export function SkyBackdrop() {
  return (
    <LinearGradient
      colors={[palette.skyTop, palette.skyMiddle, palette.skyBottom]}
      locations={[0, 0.52, 1]}
      style={StyleSheet.absoluteFill}
    >
      <View style={[styles.cloud, styles.cloudOne]} />
      <View style={[styles.cloud, styles.cloudTwo]} />
      <View style={[styles.cloud, styles.cloudThree]} />
      <View style={styles.sunGlow} />
      <View style={styles.horizonGlow} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  cloud: {
    position: 'absolute',
    height: 74,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 250, 232, 0.42)',
    shadowColor: '#FFF8DE',
    shadowOpacity: 0.5,
    shadowRadius: 18,
  },
  cloudOne: {
    width: 230,
    left: -80,
    top: '13%',
    transform: [{ rotate: '-9deg' }],
  },
  cloudTwo: {
    width: 280,
    right: -120,
    top: '24%',
    transform: [{ rotate: '8deg' }],
  },
  cloudThree: {
    width: 180,
    left: -70,
    bottom: '18%',
    opacity: 0.42,
  },
  sunGlow: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(255, 239, 184, 0.27)',
    alignSelf: 'center',
    top: '29%',
  },
  horizonGlow: {
    position: 'absolute',
    left: -80,
    right: -80,
    bottom: '7%',
    height: 170,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 211, 151, 0.22)',
  },
});
