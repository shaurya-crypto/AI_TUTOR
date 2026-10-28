# Aristotle Design Principles

The overarching design philosophy for the Aristotle AI Tutor platform.

---

## Principle 1: Socratic & Scholarly Dignity
The interface is designed for school students (Classes 6 to 12 CBSE, ICSE, IB) and their parents. It avoids noisy gamification, juvenile cartoon clutter, or cold enterprise SaaS monotony. It feels like an authentic personal tutor guiding the student through deep concepts.

## Principle 2: Warm Classical Paper Canvas
Every view lives on a warm alabaster paper canvas (`#FAF9F5`), structured by a hairline 24px Cartesian grid and framed with warm paper borders (`#E5E3DB`). The student feels like they are opening a beautifully typeset mathematical manuscript.

## Principle 3: Intentional Color Semantics
*   **Deep Walnut & Espresso Ink (`#1F1C18`, `#2C241E`):** Carries the structural weight: confident typography, primary buttons, and focused borders.
*   **Botanical Green (`#52715D`, `#F0F7F1`):** Signifies security, verification, understanding, and live tutor presence.
*   **Terracotta Coral (`#C85A43`, `#FFF8F6`):** Highlights brand moments, crucial calls to action, and alerts.
*   Colors are never applied decoratively; every hue communicates meaning.

## Principle 4: Physical Tactility & Soft Geometry
*   **Small (Badges, OTP Cells, Micro Buttons):** `rounded-xl` (12px)
*   **Medium (Pill Buttons, Text Inputs):** `rounded-2xl` (16px)
*   **Large (Cards, Speech Bubbles, Dialogs):** `rounded-3xl` (24px)
*   Buttons and inputs have subtle physical elevation (`shadow-[0_2px_8px_rgba(0,0,0,0.03)]`) that responds with micro-scale feedback (`active:scale-[0.99]`).

## Principle 5: Discrete Security & Frictionless Flow
*   Authentication favors 6-digit one-time codes over passwords to reduce student friction.
*   The 6-digit OTP entry utilizes discrete interactive cells with auto-advance, backspace navigation, paste distribution, and instant auto-submit.
*   Rate limiting, brute-force lockout, and disposable email rejection are enforced silently server-side.

## Principle 6: Animated Companion Integration
*   Sobi, the vector companion bot, provides empathetic spatial grounding during onboarding and class sessions.
*   Speech bubbles feature crisp white paper cards with downward or side-pointing tails, real-time voice pronunciation buttons, and dynamic facial expressions (`attentive-left`, `joyful-wide`, `downward-gaze`).

## Principle 7: Zero Emojis Invariant
*   No unicode emojis are permitted anywhere in code, copy, templates, or database records.
*   All visual cues use precise Lucide SVG iconography or classical typographical bullets (`&bull;`).

## Principle 8: Restrained Motion Choreography
*   Transitions use smooth ease-out curves (`motion/react` with durations between 0.2s and 0.35s).
*   Avoid jarring bounce effects or distracting particle bursts.
