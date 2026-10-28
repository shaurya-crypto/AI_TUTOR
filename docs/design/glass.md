# Aristotle Material & Elevation System

Materials in Aristotle AI Tutor are modeled after fine parchment, pressed book covers, and soft ambient daylight, rather than the cold, glossy plastic of 2020 glassmorphism.

---

## 1. Material Philosophy: Tactile Paper Surfaces
*   **Opaque Tactility Over Translucency:** Main interactive cards, dialogs, and speech bubbles are solid pure white (`#FFFFFF`) or warm parchment (`#FAF9F5`).
*   **Restrained Atmospheric Blur:** Translucency is reserved exclusively for fixed navigational headers and floating companion toolbars that pass over scrollable content.

---

## 2. Elevation Levels

### Level 0: The Base Parchment Canvas
*   **Background:** `#FAF9F5` (or `#FAF8F5`).
*   **Texture:** 24px Cartesian grid in `#E7E5E0` at 40% opacity.
*   **Usage:** Base page background for all authentication, onboarding, and classroom layouts.

### Level 1: Grounded White Surface
*   **Background:** `#FFFFFF`.
*   **Border:** `1px solid #E5E3DB` (or `border-neutral-200/90`).
*   **Shadow:** None or micro-shadow `shadow-[0_2px_8px_rgba(0,0,0,0.02)]`.
*   **Usage:** Text inputs, discrete OTP digit cells, option cards, and buttons.

### Level 2: Elevated Editorial Cards & Bubbles
*   **Background:** `#FFFFFF`.
*   **Border:** `1px solid #E5E3DB`.
*   **Shadow:** `box-shadow: 0 4px 20px rgba(31, 28, 24, 0.04)` (diffused warm ambient shadow, never pitch black).
*   **Radius:** `rounded-2xl` (16px) or `rounded-3xl` (24px).
*   **Usage:** Auth container cards, Sobi companion speech bubbles, and modal dialogs.

### Level 3: Frosted Ambient Glass (Headers & Floating Bars)
*   **Background:** `#FAF9F5` at 85% opacity (`bg-[#FAF9F5]/85` or `bg-white/80`).
*   **Backdrop Blur:** `backdrop-blur-md` (12px blur).
*   **Border:** Hairline bottom separator `border-b border-[#E5E3DB]/80`.
*   **Usage:** Sticky top navigation bar, floating mute/skip toolbar, and whiteboard tool palettes.

---

## 3. Anti-Patterns
*   No glowing neon borders.
*   No chromatic or rainbow gradients.
*   No deep saturated blurs that obscure underlying educational diagrams.
