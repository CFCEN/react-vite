/**
 * Local Dev Workspace — Design Tokens
 * Style: Data-Dense Dashboard (professional developer tool)
 * Fonts: IBM Plex Sans (UI) + JetBrains Mono (code/paths)
 */

export type ThemeMode = 'light' | 'dark';

export const brand = {
  name: 'Local Dev Workspace',
  /** Teal primary — professional, not purple */
  primary: '#0F766E',
  primaryHover: '#0D9488',
  primaryActive: '#115E59',
  primaryDark: '#2DD4BF',
  cta: '#16A34A',
  ctaDark: '#22C55E',
} as const;

export const lightColors = {
  colorPrimary: brand.primary,
  colorSuccess: '#16A34A',
  colorWarning: '#D97706',
  colorError: '#DC2626',
  colorInfo: '#0284C7',
  colorBgBase: '#F8FAFC',
  colorBgContainer: '#FFFFFF',
  colorBgElevated: '#FFFFFF',
  colorBgLayout: '#F1F5F9',
  colorText: '#0F172A',
  colorTextSecondary: '#475569',
  colorTextTertiary: '#64748B',
  colorTextQuaternary: '#94A3B8',
  colorBorder: '#E2E8F0',
  colorBorderSecondary: '#F1F5F9',
  colorFillSecondary: '#F1F5F9',
  colorFillTertiary: '#F8FAFC',
  colorLink: brand.primary,
} as const;

export const darkColors = {
  colorPrimary: brand.primaryDark,
  colorSuccess: '#22C55E',
  colorWarning: '#FBBF24',
  colorError: '#F87171',
  colorInfo: '#38BDF8',
  colorBgBase: '#0F172A',
  colorBgContainer: '#1E293B',
  colorBgElevated: '#1E293B',
  colorBgLayout: '#0F172A',
  colorText: '#F8FAFC',
  colorTextSecondary: '#94A3B8',
  colorTextTertiary: '#64748B',
  colorTextQuaternary: '#475569',
  colorBorder: '#334155',
  colorBorderSecondary: '#1E293B',
  colorFillSecondary: '#334155',
  colorFillTertiary: '#1E293B',
  colorLink: brand.primaryDark,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  xs: 2,
  sm: 4,
  md: 6,
  lg: 8,
  xl: 12,
} as const;

export const fontSize = {
  xs: 12,
  sm: 13,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 20,
  heading: 24,
} as const;

export const controlHeight = {
  sm: 28,
  md: 32,
  lg: 36,
} as const;

export const fontFamily = {
  sans: `'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`,
  mono: `'JetBrains Mono', 'SF Mono', 'Fira Code', ui-monospace, monospace`,
} as const;

export const motion = {
  fast: '150ms',
  base: '200ms',
  slow: '300ms',
  easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

export const layout = {
  siderWidth: 220,
  siderCollapsedWidth: 64,
  headerHeight: 48,
  contentMaxWidth: 1440,
  contentPadding: 24,
  breakpoint: 992,
} as const;

/** Semantic status colors for process / git / index */
export const statusColors = {
  running: { light: '#16A34A', dark: '#22C55E' },
  stopped: { light: '#64748B', dark: '#94A3B8' },
  error: { light: '#DC2626', dark: '#F87171' },
  starting: { light: '#0284C7', dark: '#38BDF8' },
  warning: { light: '#D97706', dark: '#FBBF24' },
} as const;
