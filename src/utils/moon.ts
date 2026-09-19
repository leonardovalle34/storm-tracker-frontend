const ICONS: Record<string, string> = {
  'New Moon': '🌑',
  'Waxing Crescent': '🌒',
  'First Quarter': '🌓',
  'Waxing Gibbous': '🌔',
  'Full Moon': '🌕',
  'Waning Gibbous': '🌖',
  'Last Quarter': '🌗',
  'Waning Crescent': '🌘',
}

export const moonIcon = (phaseName: string): string => ICONS[phaseName] ?? '🌙'
export const isKnownPhase = (phaseName: string): boolean => phaseName in ICONS
