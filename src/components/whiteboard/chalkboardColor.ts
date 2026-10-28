import { anaxlyTheme } from '@/config/theme'

// Design system ink colors wired directly to the Anaxly Single Source of Truth Theme Engine
export const INK_PRIMARY = anaxlyTheme.ink.primary
export const INK_SECONDARY = anaxlyTheme.ink.secondary
export const INK_MUTED = anaxlyTheme.ink.muted
export const INK_BOTANICAL = anaxlyTheme.accent.sage
export const INK_CORAL = anaxlyTheme.accent.warm
export const INK_CORAL_SOFT = anaxlyTheme.accent.warmSoft
export const INK_BLUE = anaxlyTheme.accent.primary
export const INK_AMBER = anaxlyTheme.accent.ochre
export const INK_PURPLE = anaxlyTheme.chalkboard.chalkLavender
export const INK_ROSE = anaxlyTheme.chalkboard.chalkRose
export const INK_CYAN = anaxlyTheme.chalkboard.chalkBlue
export const INK_EMERALD = anaxlyTheme.chalkboard.chalkBotanical
export const BORDER_SUBTLE = anaxlyTheme.canvas.borderSubtle
export const CANVAS_BG = anaxlyTheme.canvas.surface

export const resolveChalkColor = (colorInput?: string, fallback = INK_PRIMARY): string => {
  if (!colorInput) return fallback
  const c = colorInput.trim().toLowerCase()
  if (c === 'coral' || c === 'red' || c === 'orange' || c === 'warm' || c === 'terracotta') return INK_CORAL
  if (c === 'botanical' || c === 'green' || c === 'sage' || c === 'emerald') return INK_BOTANICAL
  if (c === 'blue' || c === 'sky' || c === 'indigo' || c === 'navy') return INK_BLUE
  if (c === 'cyan') return INK_CYAN
  if (c === 'amber' || c === 'yellow' || c === 'gold' || c === 'ochre') return INK_AMBER
  if (c === 'purple' || c === 'violet' || c === 'lavender') return INK_PURPLE
  if (c === 'rose' || c === 'pink') return INK_ROSE
  if (c === 'muted' || c === 'gray' || c === 'grey') return INK_MUTED
  if (c === 'secondary' || c === 'dark_gray') return INK_SECONDARY
  if (c === 'primary' || c === 'white' || c === 'chalk_white' || c === 'black') return INK_PRIMARY
  if (c.startsWith('#') || c.startsWith('rgb')) return colorInput
  return fallback
}
