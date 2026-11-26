/**
 * FieldSutra Design System Tokens
 * Restrained Deep Navy, Slate Neutral, and Signal Teal palette for B2B SaaS.
 */

export const colors = {
  brand: {
    navy950: '#0B1120',
    navy900: '#0F172A',
    navy800: '#1E293B',
    teal700: '#0F766E',
    teal600: '#0D9488',
    teal500: '#14B8A6',
    teal100: '#CCFBF1',
    teal50: '#F0FDFA',
  },
  neutral: {
    white: '#FFFFFF',
    slate50: '#F8FAFC',
    slate100: '#F1F5F9',
    slate200: '#E2E8F0',
    slate300: '#CBD5E1',
    slate400: '#94A3B8',
    slate500: '#64748B',
    slate600: '#475569',
    slate700: '#334155',
    slate800: '#1E293B',
    slate900: '#0F172A',
  },
  semantic: {
    success: '#059669',
    successBg: '#ECFDF5',
    warning: '#D97706',
    warningBg: '#FFFBEB',
    danger: '#E11D48',
    dangerBg: '#FFF1F2',
    info: '#0284C7',
    infoBg: '#F0F9FF',
  },
} as const;

export const typography = {
  fontFamily: {
    sans: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: '"JetBrains Mono", "Fira Code", ui-monospace, SFMono-Regular, monospace',
  },
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
  },
  fontWeight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.625,
  },
} as const;

export const spacing = {
  0: '0px',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
} as const;

export const borderRadius = {
  none: '0px',
  sm: '4px',
  md: '6px',
  lg: '8px',
  xl: '12px',
  full: '9999px',
} as const;

export const shadows = {
  none: 'none',
  xs: '0 1px 2px 0 rgba(15, 23, 42, 0.05)',
  sm: '0 1px 3px 0 rgba(15, 23, 42, 0.08), 0 1px 2px -1px rgba(15, 23, 42, 0.04)',
  md: '0 4px 6px -1px rgba(15, 23, 42, 0.08), 0 2px 4px -2px rgba(15, 23, 42, 0.04)',
  lg: '0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -4px rgba(15, 23, 42, 0.04)',
} as const;

export const componentTokens = {
  buttons: {
    heightSm: '32px',
    heightMd: '38px',
    heightLg: '44px',
    radius: borderRadius.md,
    primaryBg: colors.brand.teal600,
    primaryHover: colors.brand.teal700,
    primaryText: colors.neutral.white,
    secondaryBg: colors.neutral.white,
    secondaryBorder: colors.neutral.slate300,
    secondaryText: colors.neutral.slate900,
    dangerBg: colors.semantic.danger,
  },
  cards: {
    bg: colors.neutral.white,
    border: colors.neutral.slate200,
    radius: borderRadius.lg,
    padding: spacing[5],
    shadow: shadows.xs,
  },
  tables: {
    headerBg: colors.neutral.slate50,
    headerText: colors.neutral.slate600,
    rowBorder: colors.neutral.slate200,
    rowHoverBg: colors.neutral.slate50,
    cellPaddingX: spacing[4],
    cellPaddingY: spacing[3],
  },
  formElements: {
    height: '38px',
    radius: borderRadius.md,
    border: colors.neutral.slate300,
    focusRing: colors.brand.teal600,
    errorBorder: colors.semantic.danger,
    placeholder: colors.neutral.slate400,
  },
  navigation: {
    sidebarWidth: '256px',
    sidebarCollapsedWidth: '72px',
    sidebarBg: colors.brand.navy900,
    sidebarText: colors.neutral.slate300,
    sidebarActiveBg: colors.brand.navy800,
    sidebarActiveAccent: colors.brand.teal500,
    topNavHeight: '60px',
  },
  modals: {
    backdrop: 'rgba(11, 17, 32, 0.55)',
    bg: colors.neutral.white,
    radius: borderRadius.xl,
    shadow: shadows.lg,
    maxWidthSm: '420px',
    maxWidthMd: '560px',
    maxWidthLg: '760px',
  },
  notifications: {
    radius: borderRadius.lg,
    shadow: shadows.md,
    successBorder: colors.semantic.success,
    warningBorder: colors.semantic.warning,
    dangerBorder: colors.semantic.danger,
    infoBorder: colors.semantic.info,
  },
} as const;

export const tokens = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  componentTokens,
} as const;
