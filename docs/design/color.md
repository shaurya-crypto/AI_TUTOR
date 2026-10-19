# Semantic Color System

The AI Tutor palette is built around a warm, editorial aesthetic. It feels human, trustworthy, and intelligent without resorting to generic SaaS blues or cyberpunk purples.

## 1. Environment & Neutrals
The base is a warm ivory, avoiding sterile absolute whites or heavy greys.

*   **Background (Canvas):** `#F8F6F0` - Warm ivory/soft paper.
*   **Surface (Cards/Modals):** `#FFFFFF` - Clean white for elevated elements.
*   **Border (Subtle):** `#E5E3DB` - Warm, low-contrast divider.
*   **Focus Ring / Highlight:** `#F1EBDD` - Extremely soft warm highlight.

## 2. Typography (Ink)
We use deep charcoals instead of pure `#000000` to reduce eye strain and maintain the editorial feel.

*   **Primary Ink:** `#171817` - Headlines, primary body text.
*   **Secondary Ink:** `#555852` - Subtitles, metadata, form labels.
*   **Muted Text:** `#7A7C75` - Placeholders, disabled text, micro-copy.

## 3. Accents
Accents are used sparingly (accounting for 5-8% of the UI).

### Primary Accent: Coral
Coral represents human action, brand moments, and primary interactions.
*   **Primary Coral:** `#C85A43` - Main CTA buttons, active tabs.
*   **Coral Hover/Dark:** `#A94734` - Button hover states.
*   **Soft Coral (Surface):** `#F6E5DF` - Coral tinted backgrounds for subtle highlights.

### Secondary Accent: Botanical Green
Green represents "live", "connected", "successful", and active learning states.
*   **Botanical Green:** `#52715D` - Success badges, live tutoring active indicators.
*   **Deep Green:** `#3E5D4B` - Hover states for green actions.
*   **Soft Green (Surface):** `#E8F0EA` - Success banners, active class backgrounds.

## Accessibility Notes
*   Ensure `#171817` and `#555852` are used on `#F8F6F0` to maintain WCAG AA (4.5:1) contrast.
*   `#C85A43` (Coral) on `#FFFFFF` passes contrast for large text and UI components.
*   Do not use raw hex values in components; use semantic Tailwind classes mapped to these tokens.
