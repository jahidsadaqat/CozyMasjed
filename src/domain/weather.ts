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
  ambientIntensity: number;
  ambientColor: string;
  hemisphereIntensity: number;
  hemisphereSkyColor: string;
  hemisphereGroundColor: string;
  directionalIntensity: number;
  directionalColor: string;
  godRayIntensity: number;
  lampsActive: boolean;
};

export const weatherVisualProfiles: Record<WeatherMode, WeatherVisualProfile> = {
  sunny: {
    label: 'Sunny',
    backgroundTint: '#FFF1D5',
    tintMix: 0.1,
    exposure: 1.1,
    saturation: 1.03,
    ambientIntensity: 0.62,
    ambientColor: '#FFFFFF',
    hemisphereIntensity: 0.54,
    hemisphereSkyColor: '#FFF8EA',
    hemisphereGroundColor: '#D9B08C',
    directionalIntensity: 1.36,
    directionalColor: '#FFF0D4',
    godRayIntensity: 1,
    lampsActive: false,
  },
  cloudy: {
    label: 'Cloudy',
    backgroundTint: '#AAB8C0',
    tintMix: 0.32,
    exposure: 0.82,
    saturation: 0.55,
    ambientIntensity: 0.57,
    ambientColor: '#EEF2F4',
    hemisphereIntensity: 0.47,
    hemisphereSkyColor: '#DFE8EC',
    hemisphereGroundColor: '#A79689',
    directionalIntensity: 0.72,
    directionalColor: '#E7EDF0',
    godRayIntensity: 0.3,
    lampsActive: true,
  },
  rainy: {
    label: 'Rain',
    backgroundTint: '#617A91',
    tintMix: 0.42,
    exposure: 0.62,
    saturation: 0.45,
    ambientIntensity: 0.48,
    ambientColor: '#C9D6E2',
    hemisphereIntensity: 0.4,
    hemisphereSkyColor: '#B7CAD9',
    hemisphereGroundColor: '#776E68',
    directionalIntensity: 0.48,
    directionalColor: '#C6D7E5',
    godRayIntensity: 0.12,
    lampsActive: true,
  },
  windy: {
    label: 'Windy',
    backgroundTint: '#D6E3DD',
    tintMix: 0.14,
    exposure: 0.98,
    saturation: 0.92,
    ambientIntensity: 0.6,
    ambientColor: '#FAFCF8',
    hemisphereIntensity: 0.51,
    hemisphereSkyColor: '#EAF4ED',
    hemisphereGroundColor: '#BBA78F',
    directionalIntensity: 1.08,
    directionalColor: '#F4F7E9',
    godRayIntensity: 0.62,
    lampsActive: false,
  },
  night: {
    label: 'Night',
    backgroundTint: '#0C2554',
    tintMix: 0.72,
    exposure: 0.36,
    saturation: 0.5,
    ambientIntensity: 0.35,
    ambientColor: '#A7B8D8',
    hemisphereIntensity: 0.32,
    hemisphereSkyColor: '#9FB4DB',
    hemisphereGroundColor: '#625A68',
    directionalIntensity: 0.42,
    directionalColor: '#C8D7F5',
    godRayIntensity: 0.34,
    lampsActive: true,
  },
};
