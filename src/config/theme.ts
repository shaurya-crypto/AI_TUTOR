/**
 * Anaxly Universal Design System & Theme Engine
 * 
 * Single Source of Truth for all colors, surface tones, typography tokens,
 * borders, and chalkboard aesthetics across the entire application.
 * 
 * Changing any value in this file instantly propagates across the entire website
 * via CSS custom properties and Tailwind utility classes.
 */

export interface ColorTokenGroup {
  base: string
  surface: string
  soft: string
  borderSubtle: string
  borderStrong: string
}

export interface InkTokenGroup {
  primary: string
  secondary: string
  muted: string
  hairline: string
}

export interface AccentTokenGroup {
  primary: string
  primaryHover: string
  primarySoft: string
  primaryBorder: string
  warm: string
  warmHover: string
  warmSoft: string
  warmBorder: string
  ochre: string
  ochreHover: string
  ochreSoft: string
  ochreBorder: string
  sage: string
  sageHover: string
  sageSoft: string
  sageBorder: string
}

export interface ChalkboardTokenGroup {
  feltBg: string
  borderFrame: string
  headerBg: string
  roughBg: string
  chalkWhite: string
  chalkBotanical: string
  chalkAmber: string
  chalkCoral: string
  chalkBlue: string
  chalkLavender: string
  chalkRose: string
}

export interface AnaxlyThemeConfig {
  name: string
  description: string
  canvas: ColorTokenGroup
  ink: InkTokenGroup
  accent: AccentTokenGroup
  chalkboard: ChalkboardTokenGroup
}

/**
 * Anaxly Royal Scholastic Palette:
 * Blends authoritative Royal Prussian Indigo (#1F3852) with Academic Cobalt (#255D88),
 * Luminous Celestial Azure (#3B7CAE), Deep Scholar Sage (#2E6347), and warm Tuscan Vellum (#FAF8F4) / Royal Navy.
 */
export const anaxlyTheme: AnaxlyThemeConfig = {
  name: 'Anaxly Royal Scholastic Blue',
  description: 'Premium academic elegance with Prussian Navy, Cobalt Blue, Celestial Azure, and Tuscan Vellum (Zero Orange).',
  
  // Environment & Canvas Paper
  canvas: {
    base: '#FAF8F4',          // Warm Tuscan Vellum Parchment (distinct from Aristotle #F8F6F0)
    surface: '#FFFFFF',       // Crisp elevated card and modal surface
    soft: '#F4F1EA',          // Soft section backgrounds & pill containers
    borderSubtle: '#E2E6EA',  // Delicate cool-tinted hairline paper dividers
    borderStrong: '#CBD5E1',  // Active card borders and input outlines
  },

  // Typography & Editorial Inks (Blue-Slate scholastic tint)
  ink: {
    primary: '#0F172A',       // Deep Royal Obsidian Slate (rich scholastic navy-tinted charcoal)
    secondary: '#334155',     // Deep Slate Gray for subtitles & explanatory paragraphs
    muted: '#64748B',         // Cool Archival Slate for metadata & timestamps
    hairline: '#94A3B8',      // Fine footer captions & subtle watermarks
  },

  // Premium Scholastic Blue Accents (Zero Orange)
  accent: {
    // Primary Brand Accent: Royal Prussian Navy (Matches Login & Onboarding)
    primary: '#1F3852',
    primaryHover: '#162A3E',
    primarySoft: '#EBF2F7',
    primaryBorder: '#C2D6E7',

    // Secondary Focus Accent: Academic Cobalt Blue (Replaces all orange/terracotta)
    warm: '#255D88',
    warmHover: '#1C486B',
    warmSoft: '#EEF5FA',
    warmBorder: '#C8DEEE',

    // Illuminating Accent: Luminous Azure Blue (Replaces all amber/orange)
    ochre: '#3B7CAE',
    ochreHover: '#2E648F',
    ochreSoft: '#F0F6FA',
    ochreBorder: '#D2E4F2',

    // Mastery & Security Accent: Deep Scholar Sage
    sage: '#2E6347',
    sageHover: '#224A35',
    sageSoft: '#EDF5F0',
    sageBorder: '#C2DEC9',
  },

  // Digital Chalkboard Stage Palette (Zero Orange)
  chalkboard: {
    feltBg: '#13211B',        // Deep forest slate chalkboard
    borderFrame: '#233930',   // Machined oak chalkboard wooden bezel
    headerBg: '#0F1A15',      // Concept header bar background
    roughBg: '#172720',       // Right-margin scratch work background
    chalkWhite: '#FFFFFF',    // Crisp natural chalk white
    chalkBotanical: '#68B084',// Sage botanical chalk for intuitions & proofs
    chalkAmber: '#7EC8E3',    // Celestial Ice Blue chalk (replaces orange amber)
    chalkCoral: '#4A90E2',    // Royal Slate Blue chalk (replaces orange coral)
    chalkBlue: '#67A8E8',     // Scholastic cyan-blue chalk for examples & student answers
    chalkLavender: '#C0A3F5', // Lavender chalk for advanced theorem callouts
    chalkRose: '#93C5FD',     // Sky Blue highlight chalk
  },
}

/**
 * Returns a CSS string containing all root variable declarations derived from anaxlyTheme.
 * Injected into :root in globals.css.
 */
export function generateThemeCssVariables(): string {
  const { canvas, ink, accent, chalkboard } = anaxlyTheme
  return `
  --canvas-base: ${canvas.base};
  --canvas-surface: ${canvas.surface};
  --canvas-soft: ${canvas.soft};
  --border-subtle: ${canvas.borderSubtle};
  --border-strong: ${canvas.borderStrong};

  --ink-primary: ${ink.primary};
  --ink-secondary: ${ink.secondary};
  --ink-muted: ${ink.muted};
  --ink-hairline: ${ink.hairline};

  --accent-primary: ${accent.primary};
  --accent-primary-hover: ${accent.primaryHover};
  --accent-primary-soft: ${accent.primarySoft};
  --accent-primary-border: ${accent.primaryBorder};

  --accent-warm: ${accent.warm};
  --accent-warm-hover: ${accent.warmHover};
  --accent-warm-soft: ${accent.warmSoft};
  --accent-warm-border: ${accent.warmBorder};

  --accent-ochre: ${accent.ochre};
  --accent-ochre-hover: ${accent.ochreHover};
  --accent-ochre-soft: ${accent.ochreSoft};
  --accent-ochre-border: ${accent.ochreBorder};

  --accent-sage: ${accent.sage};
  --accent-sage-hover: ${accent.sageHover};
  --accent-sage-soft: ${accent.sageSoft};
  --accent-sage-border: ${accent.sageBorder};

  --chalkboard-felt: ${chalkboard.feltBg};
  --chalkboard-border: ${chalkboard.borderFrame};
  --chalkboard-header: ${chalkboard.headerBg};
  --chalkboard-rough: ${chalkboard.roughBg};
  --chalk-white: ${chalkboard.chalkWhite};
  --chalk-botanical: ${chalkboard.chalkBotanical};
  --chalk-amber: ${chalkboard.chalkAmber};
  --chalk-coral: ${chalkboard.chalkCoral};
  --chalk-blue: ${chalkboard.chalkBlue};
  --chalk-lavender: ${chalkboard.chalkLavender};
  --chalk-rose: ${chalkboard.chalkRose};

  /* Backward Compatibility Aliases for Smooth Migration */
  --canvas-ivory: var(--canvas-base);
  --surface-white: var(--canvas-surface);
  --surface-soft: var(--canvas-soft);
  --coral-primary: var(--accent-warm);
  --coral-hover: var(--accent-warm-hover);
  --coral-soft: var(--accent-warm-soft);
  --coral-border: var(--accent-warm-border);
  --botanical-primary: var(--accent-sage);
  --botanical-dark: var(--accent-sage-hover);
  --botanical-soft: var(--accent-sage-soft);
  --botanical-border: var(--accent-sage-border);
  `
}
