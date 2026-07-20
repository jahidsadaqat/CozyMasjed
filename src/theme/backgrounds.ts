export const backgroundOptions = [
  {
    id: 'midnight-aurora',
    name: 'Midnight aurora',
    source: require('../../assets/backgrounds/midnight-aurora.png') as number,
    thumbnailSource: require('../../assets/background-thumbnails/midnight-aurora.png') as number,
    fallbackColor: '#1D5680',
  },
  {
    id: 'desert-sunrise',
    name: 'Desert sunrise',
    source: require('../../assets/backgrounds/desert-sunrise.png') as number,
    thumbnailSource: require('../../assets/background-thumbnails/desert-sunrise.png') as number,
    fallbackColor: '#F5B277',
  },
  {
    id: 'lavender-dawn',
    name: 'Lavender dawn',
    source: require('../../assets/backgrounds/lavender-dawn.png') as number,
    thumbnailSource: require('../../assets/background-thumbnails/lavender-dawn.png') as number,
    fallbackColor: '#A9A6D5',
  },
  {
    id: 'ramadan-twilight',
    name: 'Ramadan twilight',
    source: require('../../assets/backgrounds/ramadan-twilight.png') as number,
    thumbnailSource: require('../../assets/background-thumbnails/ramadan-twilight.png') as number,
    fallbackColor: '#6E3F8F',
  },
  {
    id: 'emerald-oasis',
    name: 'Emerald oasis',
    source: require('../../assets/backgrounds/emerald-oasis.png') as number,
    thumbnailSource: require('../../assets/background-thumbnails/emerald-oasis.png') as number,
    fallbackColor: '#5FC4AF',
  },
  {
    id: 'pearl-winter',
    name: 'Pearl winter',
    source: require('../../assets/backgrounds/pearl-winter.png') as number,
    thumbnailSource: require('../../assets/background-thumbnails/pearl-winter.png') as number,
    fallbackColor: '#A9C5ED',
  },
] as const;

export type BackgroundId = (typeof backgroundOptions)[number]['id'];

export const defaultBackgroundId: BackgroundId = 'midnight-aurora';

export function isBackgroundId(value: unknown): value is BackgroundId {
  return typeof value === 'string' && backgroundOptions.some((option) => option.id === value);
}

export function getBackgroundOption(id: BackgroundId) {
  return backgroundOptions.find((option) => option.id === id) ?? backgroundOptions[0];
}

const legacyBackgroundIds: Readonly<Record<string, BackgroundId>> = {
  '#a8ded4': 'midnight-aurora',
  '#b8d5e7': 'pearl-winter',
  '#c9c3e0': 'lavender-dawn',
  '#e3bec4': 'ramadan-twilight',
  '#e8bd92': 'desert-sunrise',
  '#b8cba9': 'emerald-oasis',
};

export function backgroundIdFromLegacyColor(value: unknown): BackgroundId {
  if (typeof value !== 'string') return defaultBackgroundId;
  return legacyBackgroundIds[value.toLowerCase()] ?? defaultBackgroundId;
}
