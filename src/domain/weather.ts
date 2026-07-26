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
  topTrimIntensity: number;
  practicalLightIntensity: number;
  lampsActive: boolean;
};

export const weatherVisualProfiles: Record<WeatherMode, WeatherVisualProfile> = {
  sunny: {
    label: 'Sunny',
    backgroundTint: '#FFF1D5',
    tintMix: 0.14,
    exposure: 1.08,
    saturation: 1.02,
    sceneExposure: 1.14,
    shellTextureLift: 0,
    assetTextureLift: 0.004,
    ambientIntensity: 0.52,
    ambientColor: '#FFF0DC',
    hemisphereIntensity: 0.46,
    hemisphereSkyColor: '#FFF4E4',
    hemisphereGroundColor: '#8A5B3E',
    directionalIntensity: 1.45,
    directionalColor: '#FFD08A',
    fillIntensity: 0.26,
    fillColor: '#BFD3E5',
    godRayIntensity: 0.18,
    topTrimIntensity: 0,
    practicalLightIntensity: 0.38,
    lampsActive: false,
  },
  cloudy: {
    label: 'Cloudy',
    backgroundTint: '#AAB8C0',
    tintMix: 0.22,
    exposure: 0.9,
    saturation: 0.82,
    sceneExposure: 1.07,
    shellTextureLift: 0,
    assetTextureLift: 0.008,
    ambientIntensity: 0.46,
    ambientColor: '#E8E3DC',
    hemisphereIntensity: 0.42,
    hemisphereSkyColor: '#DFE8ED',
    hemisphereGroundColor: '#66564F',
    directionalIntensity: 0.82,
    directionalColor: '#EBDCCB',
    fillIntensity: 0.28,
    fillColor: '#BACAD6',
    godRayIntensity: 0.08,
    topTrimIntensity: 0.38,
    practicalLightIntensity: 0.68,
    lampsActive: false,
  },
  rainy: {
    label: 'Rain',
    backgroundTint: '#617A91',
    tintMix: 0.32,
    exposure: 0.78,
    saturation: 0.68,
    sceneExposure: 1.04,
    shellTextureLift: 0,
    assetTextureLift: 0.012,
    ambientIntensity: 0.4,
    ambientColor: '#CAD5DF',
    hemisphereIntensity: 0.38,
    hemisphereSkyColor: '#B9CCDA',
    hemisphereGroundColor: '#4B4141',
    directionalIntensity: 0.64,
    directionalColor: '#BCD0DE',
    fillIntensity: 0.3,
    fillColor: '#FFD09A',
    godRayIntensity: 0,
    topTrimIntensity: 0.54,
    practicalLightIntensity: 0.84,
    lampsActive: true,
  },
  windy: {
    label: 'Windy',
    backgroundTint: '#D6E3DD',
    tintMix: 0.12,
    exposure: 1.02,
    saturation: 0.94,
    sceneExposure: 1.1,
    shellTextureLift: 0,
    assetTextureLift: 0.004,
    ambientIntensity: 0.48,
    ambientColor: '#ECEBE2',
    hemisphereIntensity: 0.43,
    hemisphereSkyColor: '#E6EFEB',
    hemisphereGroundColor: '#735D49',
    directionalIntensity: 1.12,
    directionalColor: '#F2D7B2',
    fillIntensity: 0.25,
    fillColor: '#BBD1CC',
    godRayIntensity: 0.12,
    topTrimIntensity: 0,
    practicalLightIntensity: 0.42,
    lampsActive: false,
  },
  night: {
    label: 'Night',
    backgroundTint: '#0C2554',
    tintMix: 0.52,
    exposure: 0.52,
    saturation: 0.76,
    sceneExposure: 1.01,
    shellTextureLift: 0,
    assetTextureLift: 0.014,
    ambientIntensity: 0.32,
    ambientColor: '#A6B7D2',
    hemisphereIntensity: 0.34,
    hemisphereSkyColor: '#839EC9',
    hemisphereGroundColor: '#2F2833',
    directionalIntensity: 0.46,
    directionalColor: '#91AED2',
    fillIntensity: 0.3,
    fillColor: '#FFC77D',
    godRayIntensity: 0,
    topTrimIntensity: 0.68,
    practicalLightIntensity: 0.94,
    lampsActive: true,
  },
};
