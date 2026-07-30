import { Crown } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Path,
  Stop,
} from 'react-native-svg';
import { palette } from '../../theme/palette';

const ARCH_WIDTH = 108;
const ARCH_HEIGHT = 124;

/**
 * The signature of the paywall: a small mihrab niche, lit like late afternoon
 * sun on plaster, with the crown resting inside it. Borrowed from the shape
 * the app already puts in the room rather than a generic app-store badge.
 */
export function MihrabCrest({ isPremium = false }: { isPremium?: boolean }) {
  return (
    <View accessible={false} style={styles.root}>
      <Svg height={ARCH_HEIGHT} viewBox={`0 0 ${ARCH_WIDTH} ${ARCH_HEIGHT}`} width={ARCH_WIDTH}>
        <Defs>
          <SvgLinearGradient id="crestFill" x1="0" x2="0.9" y1="0" y2="1">
            <Stop offset="0" stopColor="#F9EBD0" />
            <Stop offset="0.55" stopColor="#F0D3A6" />
            <Stop offset="1" stopColor="#E0AE78" />
          </SvgLinearGradient>
        </Defs>

        {/* Outer niche */}
        <Path
          d="M10 118 L10 54 C10 33 26 17 54 4 C82 17 98 33 98 54 L98 118 Z"
          fill="url(#crestFill)"
        />
        {/* Inner arch, drawn as a hairline the way the room mouldings are */}
        <Path
          d="M24 118 L24 58 C24 42 36 30 54 20 C72 30 84 42 84 58 L84 118 Z"
          fill="none"
          stroke="rgba(158, 89, 70, 0.34)"
          strokeWidth={1.6}
        />
        {/* Lantern dot at the apex */}
        <Circle cx={54} cy={33} fill="rgba(212, 169, 70, 0.9)" r={3.2} />
      </Svg>

      <View style={styles.crown}>
        <Crown
          color={isPremium ? palette.gold : palette.terracottaDeep}
          fill={isPremium ? palette.gold : 'transparent'}
          size={30}
          strokeWidth={2}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: ARCH_WIDTH,
    height: ARCH_HEIGHT,
    alignSelf: 'center',
    alignItems: 'center',
  },
  crown: {
    position: 'absolute',
    top: 58,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
