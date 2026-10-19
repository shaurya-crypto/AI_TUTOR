# Background System

The authentication pages (and main app background) must NOT use a plain boring solid color, nor should they use generic AI gradients.

## Selected Concept: Botanical Intelligence
The background is an extremely subtle, warm ivory field (`#F8F6F0`) featuring very minimal abstract botanical geometry.

### Visual Elements
*   **Base:** Solid `#F8F6F0`.
*   **Artwork:** Barely-visible, thin, organic editorial linework representing abstract leaves or botanical curves. 
*   **Opacity:** The artwork should sit at roughly `2%` to `4%` opacity (e.g., using the Primary Ink color `#171817` at `opacity-5`).
*   **Negative Space:** 95% of the background remains visually quiet. The linework originates from the corners or edges and gracefully fades into the canvas.

### Anti-Patterns (Do NOT use)
*   No glowing blobs or mesh gradients.
*   No particles or sparkles.
*   No 3D rendered generic assets.
*   No dark mode on the Auth pages (unless specifically toggled by the user, but the default brand experience is the warm ivory).

### Implementation
The background should be implemented as an optimized SVG overlaid on the `body` or a fixed `div` with `pointer-events-none`. 

*Example CSS approach:*
```css
.bg-botanical {
  background-color: #F8F6F0;
  background-image: url('/assets/bg-botanical-lines.svg');
  background-position: top right;
  background-repeat: no-repeat;
  background-size: cover;
}
```
