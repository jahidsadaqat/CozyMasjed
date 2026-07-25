export const weatherModes = ['sunny', 'cloudy', 'rainy', 'windy', 'night'] as const;

export type WeatherMode = (typeof weatherModes)[number];

export const defaultWeatherMode: WeatherMode = 'sunny';

export function isWeatherMode(value: unknown): value is WeatherMode {
  return typeof value === 'string' && weatherModes.includes(value as WeatherMode);
}

export type WeatherVisualProfile = {
  label: string;
  backgroundTint: string;
  tintMix: number;
  exposure: number;
  saturation: number;
  sceneExposure: number;
  shellTextureLift: number;
  assetTextureLift: number;
  ambientIntensity: number;
  ambientColor: string;
  hemisphereIntensity: number;
  hemisphereSkyColor: string;
  hemisphereGroundColor: string;
  directionalIntensity: number;
  directionalColor: string;
  fillIntensity: number;
  fillColor: string;
  godRayIntensity: number;
  lampsActive: boolean;
};

export const weatherVisualProfiles: Record<WeatherMode, WeatherVisualProfile> = {
  sunny: {
    label: 'Sunny',
    backgroundTint: '#FFF1D5',
    tintMix: 0.24,
    exposure: 1.24,
    saturation: 1.02,
    sceneExposure: 1.06,
    shellTextureLift: 0.06,
    assetTextureLift: 0,
    ambientIntensity: 0.48,
    ambientColor: '#FFF8EC',
    hemisphereIntensity: 0.42,
    hemisphereSkyColor: '#FFF4DC',
    hemisphereGroundColor: '#B98A65',
    directionalIntensity: 1.45,
    directionalColor: '#FFD59A',
    fillIntensity: 0.24,
    fillColor: '#FFF1D6',
    godRayIntensity: 1,
    lampsActive: false,
  },
  cloudy: {
    label: 'Cloudy',
    backgroundTint: '#AAB8C0',
    tintMix: 0.32,
    exposure: 0.82,
    saturation: 0.72,
    sceneExposure: 0.98,
    shellTextureLift: 0.06,
    assetTextureLift: 0.02,
    ambientIntensity: 0.43,
    ambientColor: '#EEE8DF',
    hemisphereIntensity: 0.36,
    hemisphereSkyColor: '#DFE5E6',
    hemisphereGroundColor: '#8E7768',
    directionalIntensity: 0.86,
    directionalColor: '#E9E1D6',
    fillIntensity: 0.25,
    fillColor: '#DCE4E8',
    godRayIntensity: 0.3,
    lampsActive: true,
  },
  rainy: {
    label: 'Rain',
    backgroundTint: '#617A91',
    tintMix: 0.42,
    exposure: 0.72,
    saturation: 0.58,
    sceneExposure: 0.9,
    shellTextureLift: 0.055,
    assetTextureLift: 0.035,
    ambientIntensity: 0.35,
    ambientColor: '#CDD5D9',
    hemisphereIntensity: 0.3,
    hemisphereSkyColor: '#B9CBD6',
    hemisphereGroundColor: '#705E54',
    directionalIntensity: 0.62,
    directionalColor: '#BFD2DE',
    fillIntensity: 0.22,
    fillColor: '#E5D1B5',
    godRayIntensity: 0.12,
    lampsActive: true,
  },
  windy: {
    label: 'Windy',
    backgroundTint: '#D6E3DD',
    tintMix: 0.18,
    exposure: 1.08,
    saturation: 0.94,
    sceneExposure: 1,
    shellTextureLift: 0.06,
    assetTextureLift: 0,
    ambientIntensity: 0.44,
    ambientColor: '#F5F3E9',
    hemisphereIntensity: 0.38,
    hemisphereSkyColor: '#EAF2EC',
    hemisphereGroundColor: '#A88B70',
    directionalIntensity: 1.12,
    directionalColor: '#F5E6CC',
    fillIntensity: 0.28,
    fillColor: '#DDECE7',
    godRayIntensity: 0.62,
    lampsActive: false,
  },
  night: {
    label: 'Night',
    backgroundTint: '#0C2554',
    tintMix: 0.72,
    exposure: 0.42,
    saturation: 0.68,
    sceneExposure: 0.86,
    shellTextureLift: 0.04,
    assetTextureLift: 0.045,
    ambientIntensity: 0.26,
    ambientColor: '#8798B7',
    hemisphereIntensity: 0.24,
    hemisphereSkyColor: '#879FC8',
    hemisphereGroundColor: '#433B43',
    directionalIntensity: 0.5,
    directionalColor: '#9FB7DE',
    fillIntensity: 0.24,
    fillColor: '#FFC77D',
    godRayIntensity: 0.34,
    lampsActive: true,
  },
};
