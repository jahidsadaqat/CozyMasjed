import type { DOMProps } from 'expo/dom';
import type { ReactElement } from 'react';

export type WeatherOverlayMode = 'sunny' | 'cloudy' | 'rain' | 'wind' | 'night';

export type WeatherOverlayProps = {
  dom: DOMProps;
  mode: WeatherOverlayMode;
  soundOn: boolean;
};

export default function WeatherOverlay(props: WeatherOverlayProps): ReactElement;
