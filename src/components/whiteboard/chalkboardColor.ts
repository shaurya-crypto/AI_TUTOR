// Design system ink colors (Botanical Intelligence)
export const INK_PRIMARY = '#171817'
export const INK_SECONDARY = '#555852'
export const INK_MUTED = '#7A7C75'
export const INK_BOTANICAL = '#52715D'
export const INK_CORAL = '#C85A43'
export const INK_CORAL_SOFT = '#F6E5DF'
export const INK_BLUE = '#0284C7'
export const INK_AMBER = '#D97706'
export const INK_PURPLE = '#7C3AED'
export const INK_ROSE = '#E11D48'
export const INK_CYAN = '#0891B2'
export const INK_EMERALD = '#059669'
export const BORDER_SUBTLE = '#E5E3DB'
export const CANVAS_BG = '#FFFFFF'

export const resolveChalkColor = (colorInput?: string, fallback = INK_PRIMARY): string => {
  if (!colorInput) return fallback
  const c = colorInput.trim().toLowerCase()
  if (c === 'coral' || c === 'red' || c === 'orange') return INK_CORAL
  if (c === 'botanical' || c === 'green' || c === 'sage') return INK_BOTANICAL
  if (c === 'blue' || c === 'sky') return INK_BLUE
  if (c === 'cyan') return INK_CYAN
  if (c === 'amber' || c === 'yellow' || c === 'gold') return INK_AMBER
  if (c === 'purple' || c === 'violet' || c === 'lavender') return INK_PURPLE
  if (c === 'rose' || c === 'pink') return INK_ROSE
  if (c === 'emerald' || c === 'mint') return INK_EMERALD
  if (c === 'muted' || c === 'gray' || c === 'grey') return INK_MUTED
  if (c === 'secondary' || c === 'dark_gray') return INK_SECONDARY
  if (c === 'primary' || c === 'white' || c === 'chalk_white' || c === 'black') return INK_PRIMARY
  if (c.startsWith('#') || c.startsWith('rgb')) return colorInput
  return fallback
}
