# Design Principles

The overall design language for the AI Tutor.

## Principle 1: Editorial Hierarchy
Large, confident typography (`Instrument Serif`) creates the hierarchy. We rely on text size and weight before relying on cards, gradients, or decoration.

## Principle 2: Warm Minimalism
The UI feels warm through the use of the ivory background (`#F8F6F0`), deep ink typography, and subtle coral accents. It is minimal but not sterile. Do NOT use excessive beige/brown.

## Principle 3: Color Has Meaning
*   **Coral** = Primary Action / Brand.
*   **Green** = Live / Connected / Success.
Do not randomly decorate the UI with colors. If it's Coral, it means the user should click it or it's a major brand moment.

## Principle 4: White Space is a Feature
Use generous padding (e.g., `p-8` to `p-12` on desktop). Never fill empty areas simply because they are available. Allow the layout to breathe.

## Principle 5: Soft Geometry (Radius)
Use restrained corner radii. 
*   **Small (Inputs, Badges):** 8px (`rounded-lg`)
*   **Medium (Cards):** 16px (`rounded-2xl`)
*   **Large (Major Containers):** 24px (`rounded-3xl`)
Avoid making everything a giant pill. Buttons should feel tactile (`rounded-xl` or `rounded-lg`), not aggressively circular unless they are icon-only.

## Principle 6: Subtle Depth (Shadows)
Shadows should feel soft, natural, and barely noticeable. 
*   Avoid heavy black drop shadows.
*   Use shadows only for elevated controls (dropdowns, floating panels, auth card).
*   *Example:* `box-shadow: 0 10px 40px -10px rgba(23, 24, 23, 0.08);`

## Principle 7: No Generic AI Aesthetics
Never use purple-blue gradients, glowing neural networks, floating AI particles, or futuristic grid backgrounds. The product should feel like a premium education tool, not a cyberpunk hacker dashboard.

## Principle 8: Motion Choreography
Animations should be smooth, quiet, and intentional.
*   Use custom cubic-beziers (e.g., `cubic-bezier(0.32, 0.72, 0, 1)`).
*   Avoid bouncing or excessive spring physics.
*   Fade elements in with a slight vertical translation (`translate-y-4 opacity-0` to `translate-y-0 opacity-100`).
