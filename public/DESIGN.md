---
name: Botanical Intelligence
colors:
  surface: '#FFFFFF'
  surface-dim: '#dbdad8'
  surface-bright: '#fbf9f7'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f3f1'
  surface-container: '#efeeeb'
  surface-container-high: '#e9e8e6'
  surface-container-highest: '#e4e2e0'
  on-surface: '#1b1c1b'
  on-surface-variant: '#57423e'
  inverse-surface: '#30312f'
  inverse-on-surface: '#f2f0ee'
  outline: '#8a726c'
  outline-variant: '#ddc0ba'
  surface-tint: '#a23e29'
  primary: '#9f3c27'
  on-primary: '#ffffff'
  primary-container: '#bf533d'
  on-primary-container: '#fffbff'
  inverse-primary: '#ffb4a4'
  secondary: '#466552'
  on-secondary: '#ffffff'
  secondary-container: '#c8ebd2'
  on-secondary-container: '#4c6b57'
  tertiary: '#006860'
  on-tertiary: '#ffffff'
  tertiary-container: '#008379'
  on-tertiary-container: '#f3fffc'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdad3'
  primary-fixed-dim: '#ffb4a4'
  on-primary-fixed: '#3e0500'
  on-primary-fixed-variant: '#822715'
  secondary-fixed: '#c8ebd2'
  secondary-fixed-dim: '#adcfb7'
  on-secondary-fixed: '#022112'
  on-secondary-fixed-variant: '#2f4d3b'
  tertiary-fixed: '#8cf4e8'
  tertiary-fixed-dim: '#6fd8cc'
  on-tertiary-fixed: '#00201d'
  on-tertiary-fixed-variant: '#00504a'
  background: '#fbf9f7'
  on-background: '#1b1c1b'
  surface-variant: '#e4e2e0'
  canvas: '#F8F6F0'
  ink-primary: '#171817'
  ink-secondary: '#555852'
  ink-muted: '#7A7C75'
  accent-hover: '#A94734'
  border-subtle: '#E5E3DB'
typography:
  display-hero:
    fontFamily: Newsreader
    fontSize: 4.5rem
    fontWeight: '400'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Newsreader
    fontSize: 3rem
    fontWeight: '400'
    lineHeight: '1.15'
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: Newsreader
    fontSize: 2.25rem
    fontWeight: '400'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Newsreader
    fontSize: 2rem
    fontWeight: '400'
    lineHeight: '1.25'
  headline-sm:
    fontFamily: Geist
    fontSize: 1.25rem
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Geist
    fontSize: 1.125rem
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Geist
    fontSize: 1rem
    fontWeight: '400'
    lineHeight: '1.5'
  label-md:
    fontFamily: Geist
    fontSize: 0.875rem
    fontWeight: '500'
    lineHeight: '1.4'
  label-micro:
    fontFamily: Geist
    fontSize: 0.75rem
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 2rem
  margin: 3rem
  space-xs: 0.5rem
  space-sm: 0.75rem
  space-md: 1rem
  space-lg: 2rem
  space-xl: 3rem
---

You are an expert UI/UX designer and frontend engineer. You are building components for a premium education application called "AI Tutor". 
You must strictly follow the "Botanical Intelligence" Design System outlined below. Do not use generic SaaS aesthetics, cyberpunk neon, heavy glassmorphism, or dark mode unless explicitly asked.
1. CORE PHILOSOPHY & LAYOUT
- Vibe: Premium education technology. Warm, editorial, calm, and intelligent. 
- Hierarchy: Rely on large, confident typography rather than boxing everything into heavy cards.
- Layout: Asymmetric compositions, generous whitespace (p-8 to p-12 padding), and soft geometry (16px to 24px corner radii for main containers).
2. COLOR SYSTEM (Use these exact hex codes or map them to Tailwind)
- Canvas (Background): #F8F6F0 (Warm Ivory/Soft Paper). The background should NEVER be pure white or grey.
- Surface (Elevated Cards/Modals): #FFFFFF (Clean White)
- Primary Ink (Headlines/Main Text): #171817 (Deep Charcoal)
- Secondary Ink (Labels/Subtitles): #555852
- Muted Ink (Placeholders): #7A7C75
- Primary Accent (Buttons/Active States): #C85A43 (Refined Coral-Red). Hover state: #A94734.
- Secondary Accent (Success/Live States): #52715D (Botanical Green).
- Borders & Dividers: #E5E3DB (Warm, low-contrast)
3. TYPOGRAPHY SYSTEM
- Display / Headlines: `Instrument Serif` (or `Fraunces` / `DM Serif Display`). Used for brand marks, page headings (text-4xl to text-7xl), and large hero text. Apply tight tracking and leading-[1.1].
- UI & Body Content: `Geist Sans` (or `Inter`). Used for section headings, body copy, form labels, buttons, and metadata. 
- Micro-copy: text-xs, uppercase, tracking-wider (0.05em), text-[#7A7C75].
- Readability: Constrain line-lengths (max-w-prose) for paragraphs. Never center-align long blocks of text.
4. BACKGROUNDS & MATERIALS
- The Canvas Background must include an extremely subtle, 2% to 4% opacity abstract botanical/leaf linework pattern overlaying the #F8F6F0 base. It should read as 95% quiet negative space. No glowing blobs or mesh gradients.
- Glassmorphism is heavily restricted. Do not use blurred cards for main content. Only use subtle backdrop-blur (bg-white/80 or bg-white/90) for floating overlays like tooltips, sticky headers, or active audio status badges.
- Shadows must be soft, diffused, and barely noticeable (e.g., box-shadow: 0 20px 40px -15px rgba(23, 24, 23, 0.05)).
5. COMPONENTS & INTERACTION
- Primary Buttons: Solid #C85A43 background, white text, rounded-xl or rounded-lg, px-6 py-3. Hover: smooth transition to #A94734 and scale-[0.98] on active. No drop shadows on primary buttons; rely on color contrast.
- Form Inputs: Clean white surface, #E5E3DB border, #171817 text, text-base size. Focus state uses a #171817 ring (no default blue rings).
- Icons: Use minimal, thin line icons (like Lucide with strokeWidth={1.5}). Icon colors should match their adjacent text.
- Motion: Animations should be smooth, quiet, and intentional (custom cubic-beziers). Use subtle vertical fades (translate-y-4 to translate-y-0) for entering elements. No bouncing or heavy spring physics.
Ensure all generated components and pages adhere strictly to these rules.