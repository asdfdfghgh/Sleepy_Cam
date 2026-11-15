/**
 * SleepyCam AI Robot Studio & Electric Mint Palette
 * Palette: Studio Silver-Grey (#cecbcb / #9a9a9a) + Matte Visor Black (#0a0a0a / #111317) + Electric Mint (#00ffc6)
 */
export const DESIGN_TOKENS = {
  colors: {
    canvasDark: '#111317',
    surfaceDark: '#16181d',
    elevatedDark: '#1f222a',
    canvasLight: '#cecbcb',
    surfaceLight: '#ffffff',
    accentCyan: '#00ffc6',
    accentTeal: '#00d9aa',
    accentDeepTeal: '#007a5f',
    accentMint: '#00ffc6',
    warningAmber: '#F59E0B',
    alertCoral: '#EF4444'
  },
  radii: {
    sm: '8px',
    md: '16px',
    lg: '9999px'
  },
  chartColors: {
    fatigueLine: '#00d9aa',
    fatigueAreaStart: 'rgba(0, 255, 198, 0.34)',
    fatigueAreaEnd: 'rgba(0, 255, 198, 0.0)',
    deviationLine: '#6b7280',
    earLine: '#00ffc6',
    perclosBar: '#00d9aa',
    categories: {
      'LOW FATIGUE INDICATORS': '#00d9aa',
      'MILD FATIGUE INDICATORS': '#00ffc6',
      'MODERATE FATIGUE INDICATORS': '#F59E0B',
      'HIGH FATIGUE INDICATORS': '#F97316',
      'VERY HIGH FATIGUE INDICATORS': '#EF4444'
    } as Record<string, string>
  }
} as const;
