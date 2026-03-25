/**
 * Design tokens sourced from Figma CRM UI Kit
 * https://www.figma.com/design/QOLRep6ZQf81QNTBenkbN4/CRM-UI-Kit-for-SaaS-Dashboards
 *
 * 규칙: 컴포넌트에서 hex를 직접 쓰지 말고 이 파일의 변수 또는
 *       CSS 변수(var(--crm-*))를 참조하세요.
 *
 * Tailwind 유틸리티 사용 예시:
 *   bg-crm-primary, text-crm-danger, border-crm-outline
 *   bg-crm-badge-success, bg-crm-bg-surface 등
 */

export const crmColors = {
  // Brand
  primary:     'var(--crm-primary)',       // #5E81F4
  primaryDeep: 'var(--crm-primary-deep)',  // #4D4CAC
  secondary:   'var(--crm-secondary)',     // #8181A5
  purple:      'var(--crm-purple)',        // #9698D6
  danger:      'var(--crm-danger)',        // #FF808B
  success:     'var(--crm-success)',       // #7CE7AC
  warning:     'var(--crm-warning)',       // #F4BE5E
  info:        'var(--crm-info)',          // #2CE5F6
  infoAlt:     'var(--crm-info-alt)',      // #40E1FA

  // Background surfaces
  bg: {
    dark:    'var(--crm-bg-dark)',    // #1C1D21
    light:   'var(--crm-bg-light)',   // #F0F0F3
    white:   'var(--crm-bg-white)',   // #FFFFFF
    surface: 'var(--crm-bg-surface)', // #F5F5FA
    base:    'var(--crm-bg-base)',    // #F6F6F6
  },

  outline: 'var(--crm-outline)', // #ECECF2

  // Chart series — 데이터 시리즈 순서대로 사용
  chart: {
    blue:   'var(--crm-chart-blue)',   // #16B1FF
    red:    'var(--crm-chart-red)',    // #FF4C51
    green:  'var(--crm-chart-green)', // #56CA00
    orange: 'var(--crm-chart-orange)', // #FFB400
  },

  // Badge backgrounds — 10% tint of brand color over white
  badge: {
    danger:  'var(--crm-badge-danger-bg)',
    success: 'var(--crm-badge-success-bg)',
    primary: 'var(--crm-badge-primary-bg)',
    info:    'var(--crm-badge-info-bg)',
    warning: 'var(--crm-badge-warning-bg)',
  },
} as const;

export const crmTypography = {
  fontFamily: 'var(--crm-font)', // Pretendard, sans-serif

  heading: {
    h1: { fontSize: '32px', lineHeight: '42px', fontWeight: 700 },
    h2: { fontSize: '26px', lineHeight: '38px', fontWeight: 700 },
    h3: { fontSize: '20px', lineHeight: '32px', fontWeight: 700 },
    h4: { fontSize: '18px', lineHeight: '27px', fontWeight: 700 },
    h5: { fontSize: '16px', lineHeight: '24px', fontWeight: 700 },
  },

  body: {
    smRegular: { fontSize: '12px', lineHeight: '18px', fontWeight: 400 },
    smBold:    { fontSize: '12px', lineHeight: '18px', fontWeight: 700 },
    mdLight:   { fontSize: '14px', lineHeight: '21px', fontWeight: 300 },
    mdRegular: { fontSize: '14px', lineHeight: '21px', fontWeight: 400 },
    mdBold:    { fontSize: '14px', lineHeight: '21px', fontWeight: 700 },
  },

  button: {
    sm:      { fontSize: '12px', lineHeight: 1, fontWeight: 700 },
    md:      { fontSize: '14px', lineHeight: 1, fontWeight: 700 },
    mdBlack: { fontSize: '14px', lineHeight: 1, fontWeight: 900 },
  },
} as const;

export const theme = {
  colors: crmColors,
  typography: crmTypography,
} as const;

export type CrmColors = typeof crmColors;
export type CrmTypography = typeof crmTypography;
