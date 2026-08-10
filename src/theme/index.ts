import type { ThemeConfig } from 'antd';
import { theme as antdTheme } from 'antd';
import {
  darkColors,
  fontFamily,
  fontSize,
  lightColors,
  radius,
  type ThemeMode,
} from './tokens';

export * from './tokens';

const sharedComponents = {
  Layout: {
    headerHeight: 48,
    siderBg: 'transparent',
    bodyBg: 'transparent',
    headerBg: 'transparent',
  },
  Menu: {
    itemBorderRadius: radius.md,
    itemMarginInline: 8,
    itemMarginBlock: 2,
    iconSize: 16,
    collapsedIconSize: 16,
  },
  Table: {
    cellPaddingBlock: 10,
    cellPaddingInline: 12,
    headerBorderRadius: radius.md,
  },
  Button: {
    borderRadius: radius.md,
    controlHeight: 32,
    paddingInline: 14,
  },
  Input: {
    borderRadius: radius.md,
    controlHeight: 32,
  },
  Select: {
    borderRadius: radius.md,
    controlHeight: 32,
  },
  Card: {
    borderRadiusLG: radius.lg,
    paddingLG: 16,
  },
  Tag: {
    borderRadiusSM: radius.sm,
  },
  Breadcrumb: {
    fontSize: fontSize.sm,
  },
  Tooltip: {
    borderRadius: radius.sm,
  },
} as const satisfies NonNullable<ThemeConfig['components']>;

function buildTheme(mode: ThemeMode): ThemeConfig {
  const colors = mode === 'dark' ? darkColors : lightColors;

  return {
    algorithm: mode === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    cssVar: { key: 'ldw' },
    token: {
      ...colors,
      borderRadius: radius.md,
      borderRadiusLG: radius.lg,
      borderRadiusSM: radius.sm,
      borderRadiusXS: radius.xs,
      fontFamily: fontFamily.sans,
      fontFamilyCode: fontFamily.mono,
      fontSize: fontSize.md,
      fontSizeSM: fontSize.sm,
      fontSizeLG: fontSize.lg,
      fontSizeHeading1: 28,
      fontSizeHeading2: 24,
      fontSizeHeading3: 20,
      fontSizeHeading4: 16,
      fontSizeHeading5: 14,
      controlHeight: 32,
      controlHeightSM: 28,
      controlHeightLG: 36,
      wireframe: false,
      motionDurationFast: '0.15s',
      motionDurationMid: '0.2s',
      motionDurationSlow: '0.3s',
    },
    components: {
      ...sharedComponents,
      Layout: {
        ...sharedComponents.Layout,
        siderBg: colors.colorBgContainer,
        headerBg: colors.colorBgContainer,
        bodyBg: colors.colorBgLayout,
        triggerBg: colors.colorBgContainer,
      },
      Menu: {
        ...sharedComponents.Menu,
        itemBg: 'transparent',
        subMenuItemBg: 'transparent',
        itemSelectedBg: mode === 'dark' ? 'rgba(45, 212, 191, 0.12)' : 'rgba(15, 118, 110, 0.08)',
        itemHoverBg: mode === 'dark' ? 'rgba(148, 163, 184, 0.08)' : 'rgba(15, 23, 42, 0.04)',
        itemSelectedColor: colors.colorPrimary,
        itemColor: colors.colorTextSecondary,
        iconSize: 16,
      },
      Table: {
        ...sharedComponents.Table,
        headerBg: mode === 'dark' ? '#1E293B' : '#F8FAFC',
        rowHoverBg: mode === 'dark' ? 'rgba(148, 163, 184, 0.06)' : 'rgba(15, 23, 42, 0.03)',
        borderColor: colors.colorBorder,
      },
    },
  };
}

export const lightTheme = buildTheme('light');
export const darkTheme = buildTheme('dark');

export function getThemeConfig(mode: ThemeMode): ThemeConfig {
  return mode === 'dark' ? darkTheme : lightTheme;
}

/** Apply CSS variables + data-theme on <html> for Less/CSS consumers */
export function applyDocumentTheme(mode: ThemeMode): void {
  const root = document.documentElement;
  root.setAttribute('data-theme', mode);
  root.style.colorScheme = mode;

  const colors = mode === 'dark' ? darkColors : lightColors;
  const map: Record<string, string> = {
    '--ldw-color-primary': colors.colorPrimary,
    '--ldw-color-success': colors.colorSuccess,
    '--ldw-color-warning': colors.colorWarning,
    '--ldw-color-error': colors.colorError,
    '--ldw-color-info': colors.colorInfo,
    '--ldw-bg-base': colors.colorBgBase,
    '--ldw-bg-container': colors.colorBgContainer,
    '--ldw-bg-elevated': colors.colorBgElevated,
    '--ldw-bg-layout': colors.colorBgLayout,
    '--ldw-text': colors.colorText,
    '--ldw-text-secondary': colors.colorTextSecondary,
    '--ldw-text-tertiary': colors.colorTextTertiary,
    '--ldw-text-quaternary': colors.colorTextQuaternary,
    '--ldw-border': colors.colorBorder,
    '--ldw-border-secondary': colors.colorBorderSecondary,
    '--ldw-fill-secondary': colors.colorFillSecondary,
    '--ldw-font-sans': fontFamily.sans,
    '--ldw-font-mono': fontFamily.mono,
  };

  Object.entries(map).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}
