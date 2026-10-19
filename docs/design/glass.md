# Glass & Material System

Glass is a supporting material in the AI Tutor design language, NOT the entire visual identity. It is used to create subtle depth without becoming a distraction.

## Principles
*   **No Heavy Glassmorphism:** Avoid massive blurred cards everywhere. The main authentication panel should feel like a premium physical surface (`bg-white`), not a stereotypical glass UI.
*   **Warm Neutrals:** Borders and backgrounds should use warm ivory/white tones, not cold blue/grey.

## Material Levels

### Glass Level 0 (Base Surface)
*   **Usage:** Standard cards, main auth container, primary content areas.
*   **Specs:** `bg-white`, solid, `border border-[#E5E3DB]`. No blur.

### Glass Level 1 (Subtle Translucency)
*   **Usage:** Sticky headers, subtle floating action bars that scroll over content.
*   **Specs:** 
    *   Background: `bg-white/80` (or `bg-[#F8F6F0]/80`)
    *   Blur: `backdrop-blur-md` (12px blur)
    *   Border: `border-b border-[#E5E3DB]/50`

### Glass Level 2 (Floating Overlays)
*   **Usage:** Dropdown menus, tooltips, small floating UI elements (like the mic status indicator).
*   **Specs:**
    *   Background: `bg-white/90`
    *   Blur: `backdrop-blur-lg` (16px blur)
    *   Border: `border border-[#E5E3DB]`
    *   Shadow: Soft diffused shadow (see Design Principles).

## Anti-Patterns
*   No glowing borders on glass.
*   No rainbow or neon glass.
*   Do not stack Glass Level 1 on top of Glass Level 2 (legibility collapses).
