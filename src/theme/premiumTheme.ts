import { palette } from './palette';

/**
 * Tokens for the premium and settings surfaces.
 *
 * Everything here is derived from the existing Cozy Masjid palette — the
 * paywall is meant to feel like the same room, only lit a little warmer.
 */
export const premiumTheme = {
  scrim: 'rgba(52, 42, 36, 0.44)',
  sheet: 'rgba(250, 246, 238, 0.99)',
  card: 'rgba(255, 251, 244, 0.98)',
  cardSelected: '#FFF4E0',
  hairline: 'rgba(78, 59, 49, 0.10)',
  hairlineStrong: 'rgba(78, 59, 49, 0.20)',
  goldEdge: 'rgba(212, 169, 70, 0.70)',
  goldSoft: '#F4E4C2',
  glass: 'rgba(255, 251, 244, 0.72)',
  success: '#4C7C63',
  successSoft: '#E2EDE5',
  danger: '#A84E42',
  dangerSoft: '#F6E3DE',
  infoSoft: '#EDE7DC',
} as const;

export const premiumGradients = {
  crest: ['#F9EBD0', '#F0D3A6', '#E0AE78'] as const,
  cta: ['#5C4536', '#3E2E25'] as const,
  gold: ['#E9C87C', '#D4A946'] as const,
  lifetime: ['#D08A69', '#A55E48'] as const,
} as const;

export const premiumShadow = {
  shadowColor: palette.ink,
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.20,
  shadowRadius: 22,
  elevation: 10,
} as const;

export const cardShadow = {
  shadowColor: palette.ink,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.10,
  shadowRadius: 10,
  elevation: 3,
} as const;
