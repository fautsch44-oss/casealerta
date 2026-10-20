// CaseAlerta — tokens del lienzo de TRAZO (Claude Design "CaseAlerta — Pantallas v1")
export const colors = {
  navy: '#0A2A6B',
  blue: '#1F4FA0',
  red: '#C8102E',
  gold: '#D4A84B',
  ink: '#0F2A5C',
  muted: '#5B6478',
  body: '#3D4E78',
  bg: '#F3F6FB',
  card: '#FFFFFF',
  line: '#D6E0F2',
  lineSoft: '#E3E8F0',
  blueSoft: '#E8EEFA',
  redSoft: '#FCE8EB',
  goldSoft: '#FFF4DB',
  amber: '#9A6400',
  green: '#1E7A46',
  greenSoft: '#E3F5EA',
  onDark: '#FFFFFF',
  onDarkMuted: '#D6E0F2',
} as const;

export const fonts = {
  display: 'Cinzel_700Bold',
  regular: 'PublicSans_500Medium',
  semibold: 'PublicSans_600SemiBold',
  bold: 'PublicSans_700Bold',
  black: 'PublicSans_800ExtraBold',
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 10, md: 16, lg: 20, xl: 28, pill: 999 } as const;
export const touch = 44;

export const shadow = {
  card: { shadowColor: colors.ink, shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  cta: { shadowColor: colors.red, shadowOpacity: 0.3, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
} as const;

export type Semaphore = 'action' | 'waiting' | 'approved' | 'neutral';
export const semaphore: Record<Semaphore, { fg: string; bg: string }> = {
  action: { fg: colors.red, bg: colors.redSoft },
  waiting: { fg: colors.amber, bg: colors.goldSoft },
  approved: { fg: colors.green, bg: colors.greenSoft },
  neutral: { fg: colors.blue, bg: colors.blueSoft },
};
