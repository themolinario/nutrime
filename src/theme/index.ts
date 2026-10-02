import { Platform } from 'react-native';

import type { IconName } from '../components/Icon';

/**
 * NutriMy's palette: a warm paper ground with a deep garden green for anything
 * chosen or done, and a terracotta accent for what still needs attention.
 */
export const colors = {
  /** Page background — warm, not clinical white. */
  bg: '#FBF6EE',
  bgSunken: '#F3ECE0',
  surface: '#FFFFFF',
  surfaceMuted: '#FAF6F0',

  green: '#1F6B4A',
  greenDeep: '#14432F',
  greenSoft: '#E4F0E8',
  greenBorder: '#C3DFCD',

  terracotta: '#D2603A',
  terracottaSoft: '#FBEAE3',

  amber: '#E9A020',
  amberSoft: '#FDF1DC',

  plum: '#6B4A7A',
  plumSoft: '#F0E9F3',

  text: '#1B241E',
  textMuted: '#6E7C72',
  textFaint: '#9BA79F',

  border: '#E7DFD2',
  borderStrong: '#D6CBB8',

  white: '#FFFFFF',
  danger: '#B3341F',
} as const;

/** Accent per meal, so each card is recognisable at a glance. */
export const mealAccents: Record<string, { tint: string; soft: string; icon: IconName }> = {
  colazione: { tint: '#E9A020', soft: '#FDF1DC', icon: 'sunny-outline' },
  'meta-mattina': { tint: '#5C9A55', soft: '#E9F2E5', icon: 'nutrition-outline' },
  spuntino: { tint: '#5C9A55', soft: '#E9F2E5', icon: 'nutrition-outline' },
  pranzo: { tint: '#D2603A', soft: '#FBEAE3', icon: 'restaurant-outline' },
  merenda: { tint: '#B0662F', soft: '#F7EADD', icon: 'cafe-outline' },
  'meta-pomeriggio': { tint: '#B0662F', soft: '#F7EADD', icon: 'cafe-outline' },
  cena: { tint: '#1F6B4A', soft: '#E4F0E8', icon: 'moon-outline' },
  'dopo-cena': { tint: '#6B4A7A', soft: '#F0E9F3', icon: 'moon-outline' },
  'spuntino-serale': { tint: '#6B4A7A', soft: '#F0E9F3', icon: 'moon-outline' },
  'arco-della-giornata': { tint: '#4A6B8A', soft: '#E6EDF3', icon: 'time-outline' },
};

export const defaultAccent: { tint: string; soft: string; icon: IconName } = {
  tint: colors.green,
  soft: colors.greenSoft,
  icon: 'ellipse-outline',
};

export function accentFor(mealKey: string) {
  return mealAccents[mealKey] ?? defaultAccent;
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999,
} as const;

/** Bricolage Grotesque for titles (quirky, warm), Figtree for reading (round, friendly). */
export const fonts = {
  display: 'BricolageGrotesque_800ExtraBold',
  displaySemi: 'BricolageGrotesque_600SemiBold',
  body: 'Figtree_400Regular',
  bodyMedium: 'Figtree_500Medium',
  bodySemi: 'Figtree_600SemiBold',
  bodyBold: 'Figtree_700Bold',
} as const;

export const shadow = {
  card: Platform.select({
    ios: {
      shadowColor: '#4A3B24',
      shadowOpacity: 0.07,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 5 },
    },
    android: { elevation: 2 },
    default: {},
  }),
  raised: Platform.select({
    ios: {
      shadowColor: '#4A3B24',
      shadowOpacity: 0.14,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 10 },
    },
    android: { elevation: 6 },
    default: {},
  }),
} as const;
